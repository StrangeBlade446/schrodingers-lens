import { ArrowDown, ArrowRight, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { INK_PLATES, type InkPlate } from '../data/studioData';
import {
  addPointerStroke,
  computeInkOpacity,
  DEFAULT_INK_CONFIG,
  getChoreographedSweepPoint,
  spawnInkDroplets,
  stepInkState,
  type InkBlob,
  type InkDroplet,
  type InkEngineState,
} from '../utils/inkPhysics';

interface InkRevealHeroProps {
  onStartProject: () => void;
  onBrowseWork: () => void;
}

const WORDMARK = 'SCHRODINGER';
const PAPER_BG = '#F7F7F5';
const INK_BLACK = '#0A0A0A';

/** Traces an organic multi-lobe liquid ink blob path onto a 2D canvas context. */
function traceOrganicBlob(ctx: CanvasRenderingContext2D, blob: InkBlob, scale = 1) {
  const count = blob.lobePhases.length;
  const rBase = blob.currentRadius * scale;
  const pts: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const harmonic =
      1 +
      blob.lobeAmps[i] * Math.sin(theta * 2 + blob.lobePhases[i]) +
      blob.lobeAmps[(i + 2) % count] * 0.45 * Math.cos(theta * 3 - blob.lobePhases[i]);
    const localR = rBase * harmonic;
    pts.push({
      x: Math.cos(theta) * localR * blob.aspect,
      y: Math.sin(theta) * localR,
    });
  }

  ctx.save();
  ctx.translate(blob.x, blob.y);
  ctx.rotate(blob.rotation);
  ctx.beginPath();

  const last = pts[count - 1];
  const first = pts[0];
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);

  for (let i = 0; i < count; i++) {
    const curr = pts[i];
    const next = pts[(i + 1) % count];
    ctx.quadraticCurveTo(curr.x, curr.y, (curr.x + next.x) / 2, (curr.y + next.y) / 2);
  }
  ctx.closePath();
  ctx.restore();
}

/** Traces a painterly elongated ink droplet. */
function traceDroplet(ctx: CanvasRenderingContext2D, drop: InkDroplet) {
  ctx.save();
  ctx.translate(drop.x, drop.y);
  ctx.rotate(drop.angle);
  ctx.beginPath();
  ctx.ellipse(0, 0, drop.radius * drop.elongation, drop.radius * 0.78, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.restore();
}

/** Draws the monumental wordmark centered in the canvas with exact optical sizing. */
function drawWordmark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  color: string,
  fontSize: number
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `900 ${fontSize}px "Archivo", "Plus Jakarta Sans", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const tracking = -fontSize * 0.042;
  const chars = WORDMARK.split('');
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + tracking * (chars.length - 1);

  let cursorX = width / 2 - totalWidth / 2;
  const centerY = height * 0.52;

  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i], cursorX + widths[i] / 2, centerY);
    cursorX += widths[i] + tracking;
  }
  ctx.restore();
}

/** Renders the static pigment artwork + inverted white wordmark onto an offscreen plate cache. */
function renderRevealPlateCache(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  plate: InkPlate,
  width: number,
  height: number,
  fontSize: number
) {
  ctx.clearRect(0, 0, width, height);

  if (img && img.complete && img.naturalWidth > 0) {
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const viewAspect = width / height;

    let drawW = width;
    let drawH = height;

    if (viewAspect > imgAspect) {
      drawH = drawW / imgAspect;
    } else {
      drawW = drawH * imgAspect;
    }

    const dx = (width - drawW) / 2;
    const dy = (height - drawH) / 2;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(0, height * 0.85, width, height * 0.15);
    if (plate.id === 'ultramarine-flame') {
      grad.addColorStop(0, '#1324B8');
      grad.addColorStop(0.42, '#8F1377');
      grad.addColorStop(0.72, '#EC1C53');
      grad.addColorStop(1, '#F97316');
    } else {
      grad.addColorStop(0, '#7F1D1D');
      grad.addColorStop(0.45, '#D97706');
      grad.addColorStop(0.75, '#0F766E');
      grad.addColorStop(1, '#1E1B4B');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  // Inverted crisp pure-white wordmark painted directly into the reveal plate cache
  drawWordmark(ctx, width, height, '#FFFFFF', fontSize);
}

/** Renders the static paper background + stark obsidian wordmark into an offscreen base cache. */
function renderBasePaperCache(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fontSize: number
) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = PAPER_BG;
  ctx.fillRect(0, 0, width, height);
  drawWordmark(ctx, width, height, INK_BLACK, fontSize);
}

export function InkRevealHero({ onStartProject, onBrowseWork }: InkRevealHeroProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Offscreen cached layers for zero-lag compositing
  const baseCacheRef = useRef<HTMLCanvasElement | null>(null);
  const plateCacheRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const engineRef = useRef<InkEngineState>({ blobs: [], droplets: [], nextId: 1 });
  const prevPointerRef = useRef<{ x: number; y: number } | null>(null);
  const isVisibleRef = useRef<boolean>(true);
  const dirtyRef = useRef<boolean>(true);
  const scheduleLoopRef = useRef<(() => void) | null>(null);

  const choreoRef = useRef<{
    active: boolean;
    startMs: number;
    durationMs: number;
    lastPoint: { x: number; y: number } | null;
  }>({
    active: true,
    startMs: 0,
    durationMs: 1350,
    lastPoint: null,
  });

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const activePlateRef = useRef<InkPlate>(INK_PLATES[0]);
  const fontSizeRef = useRef<number>(180);
  const sizeRef = useRef<{ width: number; height: number; dpr: number }>({
    width: 1440,
    height: 836,
    dpr: 1,
  });

  const [activePlateId, setActivePlateId] = useState<string>(INK_PLATES[0].id);
  const [hasInk, setHasInk] = useState<boolean>(true);
  const [activeMarkCount, setActiveMarkCount] = useState<number>(0);

  const activePlate = INK_PLATES.find((p) => p.id === activePlateId) ?? INK_PLATES[0];

  const rebuildStaticCaches = useCallback(() => {
    const baseCanvas = baseCacheRef.current;
    const plateCanvas = plateCacheRef.current;
    if (!baseCanvas || !plateCanvas) return;

    const baseCtx = baseCanvas.getContext('2d');
    const plateCtx = plateCanvas.getContext('2d');
    if (!baseCtx || !plateCtx) return;

    const { width, height } = sizeRef.current;
    renderBasePaperCache(baseCtx, width, height, fontSizeRef.current);

    const plate = activePlateRef.current;
    const img = imagesRef.current[plate.id] ?? null;
    renderRevealPlateCache(plateCtx, img, plate, width, height, fontSizeRef.current);
    dirtyRef.current = true;
    scheduleLoopRef.current?.();
  }, []);

  useEffect(() => {
    activePlateRef.current = activePlate;
    rebuildStaticCaches();
  }, [activePlate, rebuildStaticCaches]);

  // Preload both pigment plate images and rebuild reveal cache when decoded
  useEffect(() => {
    for (const plate of INK_PLATES) {
      if (!imagesRef.current[plate.id]) {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          if (activePlateRef.current.id === plate.id) {
            rebuildStaticCaches();
          }
        };
        img.src = plate.imageSrc;
        imagesRef.current[plate.id] = img;
      }
    }
  }, [rebuildStaticCaches]);

  const seedStaticShowcase = useCallback((width: number, height: number, nowMs: number) => {
    let state: InkEngineState = { blobs: [], droplets: [], nextId: 1 };
    let prev: { x: number; y: number } | null = null;
    const steps = 22;
    for (let i = 0; i <= steps; i++) {
      const pt = getChoreographedSweepPoint(i / steps, width, height);
      state = addPointerStroke(state, prev, pt, nowMs, DEFAULT_INK_CONFIG);
      prev = pt;
    }
    const extraDrops = [
      ...spawnInkDroplets(state.nextId, width * 0.21, height * 0.58, -18, 28, nowMs),
      ...spawnInkDroplets(state.nextId + 4, width * 0.44, height * 0.41, 22, -24, nowMs),
      ...spawnInkDroplets(state.nextId + 8, width * 0.72, height * 0.57, 26, 20, nowMs),
    ];
    state = {
      ...state,
      droplets: [...state.droplets, ...extraDrops],
      nextId: state.nextId + 12,
    };
    engineRef.current = state;
    dirtyRef.current = true;
    setHasInk(true);
    setActiveMarkCount(state.blobs.length + state.droplets.length);
    scheduleLoopRef.current?.();
  }, []);

  const triggerReplayStroke = useCallback(() => {
    const now = performance.now();
    engineRef.current = { blobs: [], droplets: [], nextId: 1 };
    prevPointerRef.current = null;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      seedStaticShowcase(sizeRef.current.width, sizeRef.current.height, now);
      choreoRef.current.active = false;
      return;
    }
    choreoRef.current = {
      active: true,
      startMs: now,
      durationMs: 1350,
      lastPoint: null,
    };
    dirtyRef.current = true;
    setHasInk(true);
    scheduleLoopRef.current?.();
  }, [seedStaticShowcase]);

  const clearCanvas = useCallback(() => {
    choreoRef.current.active = false;
    engineRef.current = { blobs: [], droplets: [], nextId: 1 };
    prevPointerRef.current = null;
    dirtyRef.current = true;
    setHasInk(false);
    setActiveMarkCount(0);
    scheduleLoopRef.current?.();
  }, []);

  // Main canvas setup, offscreen cache sizing, and demand-aware animation loop
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const baseCache = document.createElement('canvas');
    const plateCache = document.createElement('canvas');
    const maskCanvas = document.createElement('canvas');
    const compositeCanvas = document.createElement('canvas');

    baseCacheRef.current = baseCache;
    plateCacheRef.current = plateCache;
    maskCanvasRef.current = maskCanvas;
    compositeCanvasRef.current = compositeCanvas;

    const ctx = canvas.getContext('2d');
    const baseCtx = baseCache.getContext('2d');
    const plateCtx = plateCache.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    const compCtx = compositeCanvas.getContext('2d');
    if (!ctx || !baseCtx || !plateCtx || !maskCtx || !compCtx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const recalcWordmarkSize = (width: number) => {
      ctx.save();
      const testSize = 100;
      ctx.font = `900 ${testSize}px "Archivo", "Plus Jakarta Sans", system-ui, sans-serif`;
      const tracking = -testSize * 0.042;
      const chars = WORDMARK.split('');
      const baseWidth =
        chars.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        tracking * (chars.length - 1);
      ctx.restore();

      const targetWidth = width < 640 ? width * 0.91 : width * 0.87;
      fontSizeRef.current = Math.max(46, Math.min(286, (targetWidth / baseWidth) * testSize));
    };

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(320, Math.round(rect.width));
      const height = Math.max(520, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      sizeRef.current = { width, height, dpr };

      for (const c of [canvas, baseCache, plateCache, maskCanvas, compositeCanvas]) {
        c.width = Math.round(width * dpr);
        c.height = Math.round(height * dpr);
      }

      for (const c2d of [ctx, baseCtx, plateCtx, maskCtx, compCtx]) {
        c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      recalcWordmarkSize(width);
      rebuildStaticCaches();
    };

    syncSize();

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        recalcWordmarkSize(sizeRef.current.width);
        rebuildStaticCaches();
      });
    }

    const resizeObserver = new ResizeObserver(() => {
      syncSize();
    });
    resizeObserver.observe(container);

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        isVisibleRef.current = entries[0]?.isIntersecting ?? true;
        if (isVisibleRef.current) {
          dirtyRef.current = true;
          scheduleLoopRef.current?.();
        }
      },
      { threshold: 0.02 }
    );
    visibilityObserver.observe(container);

    const startNow = performance.now();
    if (reducedMotion) {
      choreoRef.current.active = false;
      seedStaticShowcase(sizeRef.current.width, sizeRef.current.height, startNow);
    } else {
      choreoRef.current = {
        active: true,
        startMs: startNow + 80,
        durationMs: 1350,
        lastPoint: null,
      };
    }

    let timerId: number | null = null;
    let rafId: number | null = null;
    let disposed = false;
    let lastFrameMs = startNow;
    let lastUiSyncMs = startNow;

    const drawCurrentScene = (nowMs: number) => {
      const { width, height } = sizeRef.current;
      const state = engineRef.current;
      const totalMarks = state.blobs.length + state.droplets.length;

      // 1. Blit pre-rendered gallery paper + stark black wordmark
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(baseCache, 0, 0, width, height);

      // 2. Subtle cool-gray brush wake shadow beneath the vivid ink
      for (const blob of state.blobs) {
        if (!blob.isMist) continue;
        const opacity = computeInkOpacity(nowMs - blob.createdAt, blob.ttlMs);
        if (opacity <= 0.01) continue;
        ctx.fillStyle = `rgba(210, 214, 224, ${(opacity * 0.36).toFixed(3)})`;
        traceOrganicBlob(ctx, blob, 1.12);
        ctx.fill();
      }

      if (totalMarks > 0) {
        // 3. Build fluid mask on maskCanvas
        maskCtx.clearRect(0, 0, width, height);

        for (const blob of state.blobs) {
          if (blob.isMist) continue;
          const opacity = computeInkOpacity(nowMs - blob.createdAt, blob.ttlMs);
          if (opacity <= 0.01) continue;
          maskCtx.fillStyle = `rgba(0, 0, 0, ${opacity.toFixed(3)})`;
          traceOrganicBlob(maskCtx, blob, 1);
          maskCtx.fill();
        }

        for (const drop of state.droplets) {
          const opacity = computeInkOpacity(nowMs - drop.createdAt, drop.ttlMs);
          if (opacity <= 0.01) continue;
          maskCtx.fillStyle = `rgba(0, 0, 0, ${opacity.toFixed(3)})`;
          traceDroplet(maskCtx, drop);
          maskCtx.fill();
        }

        // 4. Composite pre-rendered pigment artwork + inverted white wordmark through fluid mask
        compCtx.clearRect(0, 0, width, height);
        compCtx.globalCompositeOperation = 'source-over';
        compCtx.drawImage(plateCache, 0, 0, width, height);
        compCtx.globalCompositeOperation = 'destination-in';
        compCtx.drawImage(maskCanvas, 0, 0, width, height);
        compCtx.globalCompositeOperation = 'source-over';

        // 5. Blit masked pigment reveal onto visible canvas
        ctx.drawImage(compositeCanvas, 0, 0, width, height);
      }
    };

    const tick = () => {
      rafId = null;
      if (disposed || !isVisibleRef.current) return;

      const nowMs = performance.now();
      const dtMs = nowMs - lastFrameMs;
      lastFrameMs = nowMs;

      const { width, height } = sizeRef.current;
      let needsAnotherFrame = false;

      // Advance opening choreographed stroke if active
      if (choreoRef.current.active) {
        needsAnotherFrame = true;
        if (nowMs >= choreoRef.current.startMs) {
          const progress = (nowMs - choreoRef.current.startMs) / choreoRef.current.durationMs;
          if (progress >= 1) {
            const endPt = getChoreographedSweepPoint(1, width, height);
            engineRef.current = addPointerStroke(
              engineRef.current,
              choreoRef.current.lastPoint,
              endPt,
              nowMs,
              DEFAULT_INK_CONFIG
            );
            const finishDrops = spawnInkDroplets(
              engineRef.current.nextId,
              width * 0.25,
              height * 0.62,
              -20,
              24,
              nowMs
            );
            engineRef.current = {
              ...engineRef.current,
              droplets: [...engineRef.current.droplets, ...finishDrops],
              nextId: engineRef.current.nextId + finishDrops.length,
            };
            choreoRef.current.active = false;
          } else {
            const pt = getChoreographedSweepPoint(progress, width, height);
            engineRef.current = addPointerStroke(
              engineRef.current,
              choreoRef.current.lastPoint,
              pt,
              nowMs,
              DEFAULT_INK_CONFIG
            );
            choreoRef.current.lastPoint = pt;
          }
          dirtyRef.current = true;
        }
      }

      // Advance fluid physics while marks exist
      const hasMarksBefore =
        engineRef.current.blobs.length > 0 || engineRef.current.droplets.length > 0;
      if (!reducedMotion && hasMarksBefore) {
        engineRef.current = stepInkState(engineRef.current, dtMs, nowMs, DEFAULT_INK_CONFIG);
        dirtyRef.current = true;
        if (engineRef.current.blobs.length > 0 || engineRef.current.droplets.length > 0) {
          needsAnotherFrame = true;
        }
      }

      if (dirtyRef.current) {
        drawCurrentScene(nowMs);
        dirtyRef.current = false;
      }

      const totalMarks = engineRef.current.blobs.length + engineRef.current.droplets.length;
      if (nowMs - lastUiSyncMs > 300 || totalMarks === 0) {
        lastUiSyncMs = nowMs;
        setActiveMarkCount(totalMarks);
        setHasInk(totalMarks > 0);
      }

      if (needsAnotherFrame) {
        timerId = window.setTimeout(() => {
          timerId = null;
          if (!disposed && isVisibleRef.current && rafId === null) {
            rafId = window.requestAnimationFrame(tick);
          }
        }, 28);
      }
    };

    const scheduleLoop = () => {
      if (disposed || !isVisibleRef.current) return;
      if (rafId === null && timerId === null) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    scheduleLoopRef.current = scheduleLoop;
    scheduleLoop();

    return () => {
      disposed = true;
      scheduleLoopRef.current = null;
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (timerId !== null) window.clearTimeout(timerId);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
    };
  }, [rebuildStaticCaches, seedStaticShowcase]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    choreoRef.current.active = false;

    const now = performance.now();
    engineRef.current = addPointerStroke(
      engineRef.current,
      prevPointerRef.current,
      { x, y },
      now,
      DEFAULT_INK_CONFIG
    );
    prevPointerRef.current = { x, y };
    dirtyRef.current = true;
    setHasInk(true);
    scheduleLoopRef.current?.();
  }, []);

  const handlePointerLeave = useCallback(() => {
    prevPointerRef.current = null;
  }, []);

  const handleSelectPlate = (plateId: string) => {
    setActivePlateId(plateId);
    if (engineRef.current.blobs.length === 0) {
      triggerReplayStroke();
    }
  };

  return (
    <section
      id="main"
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      data-testid="ink-reveal-hero"
      data-active-plate={activePlate.id}
      data-active-marks={activeMarkCount}
      className="relative w-full min-h-[calc(100vh)] pt-16 overflow-hidden select-none touch-pan-y bg-[#F7F7F5] border-b border-black/[0.08]"
    >
      {/* Semantic headline for accessibility & SEO matching the monumental canvas wordmark */}
      <h1 className="sr-only">Schrodinger's Lens — Quantum ATS & Holistic Multi-Parameter Candidate Evaluation</h1>

      {/* Interactive dual-layer Ink Reveal Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="ink-reveal-canvas"
        aria-label="Interactive ink reveal canvas spelling SCHRODINGER. Move your pointer across the canvas to unveil quantum talent evaluation patterns."
        className="absolute inset-0 w-full h-full block cursor-crosshair"
      />

      {/* Editorial Corner Framing Overlay (pointer-events-none so hover paints seamlessly underneath) */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-6 md:px-10 min-h-[calc(100vh-4rem)] flex flex-col justify-between py-8 md:py-10 pointer-events-none">
        {/* Top Row: Manifesto Left + Minimal Studio Index Right */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="max-w-sm space-y-4 pointer-events-auto">
            <p className="font-mono text-xs text-[#6E6E6A] tracking-[0.04em]">
              ©26 · Quantum Talent Intelligence · Production ATS
            </p>
            <p className="text-[15px] leading-relaxed text-[#1E1E1C] font-medium text-balance">
              Where superficial keywords are discarded. We evaluate candidates holistically: project uniqueness, innovation, societal impact, and automated AI resume rejection.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={onStartProject}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-[0.04em] uppercase text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] active:scale-[0.98] transition-all duration-150 whitespace-nowrap cursor-pointer shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
              >
                <span>Launch ATS Platform</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Minimal Reference-Inspired Right Index */}
          <div className="hidden md:flex flex-col items-end gap-2 text-xs text-[#5A5A56] pointer-events-auto">
            <a
              href="#work"
              className="group inline-flex items-center gap-2.5 hover:text-[#0A0A0A] transition-colors whitespace-nowrap"
            >
              <span className="w-4 h-px bg-black/25 group-hover:w-6 group-hover:bg-[#0A0A0A] transition-all duration-200" />
              <span>Intelligence Modules</span>
            </a>
            <a
              href="#story"
              className="group inline-flex items-center gap-2.5 hover:text-[#0A0A0A] transition-colors whitespace-nowrap"
            >
              <span className="w-4 h-px bg-black/25 group-hover:w-6 group-hover:bg-[#0A0A0A] transition-all duration-200" />
              <span>Philosophy &amp; Pillars</span>
            </a>
            <a
              href="#enquire"
              className="group inline-flex items-center gap-2.5 hover:text-[#0A0A0A] transition-colors whitespace-nowrap"
            >
              <span className="w-4 h-px bg-black/25 group-hover:w-6 group-hover:bg-[#0A0A0A] transition-all duration-200" />
              <span>Enterprise Intake</span>
            </a>
          </div>
        </div>

        {/* Bottom Row: Browse Scroll Action Left + Pigment Switcher & Roam Cue Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-6">
          <button
            type="button"
            onClick={onBrowseWork}
            className="group inline-flex items-center gap-3 text-xs font-medium text-[#4A4A48] hover:text-[#0A0A0A] transition-colors pointer-events-auto cursor-pointer self-start py-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A0A0A]"
          >
            <span className="w-5 h-px bg-black/35 group-hover:w-7 group-hover:bg-[#0A0A0A] transition-all duration-200" />
            <span className="whitespace-nowrap">Explore Architecture</span>
            <ArrowDown
              className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-y-0.5"
              aria-hidden="true"
            />
          </button>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[#5A5A56] pointer-events-auto">
            <div
              className="flex items-center gap-1 p-0.5 bg-black/[0.04] rounded-md"
              role="group"
              aria-label="Pigment artwork selection"
            >
              {INK_PLATES.map((plate) => {
                const isSelected = plate.id === activePlate.id;
                return (
                  <button
                    key={plate.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => handleSelectPlate(plate.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#FFFFFF] text-[#0A0A0A] shadow-xs'
                        : 'text-[#5A5A56] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {plate.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={triggerReplayStroke}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#4A4A48] hover:text-[#0A0A0A] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Replay stroke</span>
              </button>

              {hasInk && (
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-xs font-medium text-[#4A4A48] hover:text-[#0A0A0A] underline underline-offset-4 decoration-black/25 hover:decoration-black transition-colors whitespace-nowrap cursor-pointer"
                >
                  Clear ink
                </button>
              )}

              <span className="hidden lg:inline text-[#6E6E6A] whitespace-nowrap">
                Roam pointer to unveil
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
