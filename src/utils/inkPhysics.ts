export interface InkBlob {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseRadius: number;
  currentRadius: number;
  createdAt: number;
  ttlMs: number;
  rotation: number;
  aspect: number;
  lobePhases: number[];
  lobeAmps: number[];
  isMist: boolean;
}

export interface InkDroplet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  elongation: number;
  angle: number;
  createdAt: number;
  ttlMs: number;
}

export interface InkEngineState {
  blobs: InkBlob[];
  droplets: InkDroplet[];
  nextId: number;
}

export interface InkConfig {
  minRadius: number;
  maxRadius: number;
  blobTtlMs: number;
  dropletTtlMs: number;
  bloomDurationMs: number;
  maxBlobs: number;
  maxDroplets: number;
  stepPx: number;
}

export const DEFAULT_INK_CONFIG: InkConfig = {
  minRadius: 19,
  maxRadius: 51,
  blobTtlMs: 13500,
  dropletTtlMs: 11500,
  bloomDurationMs: 240,
  maxBlobs: 120,
  maxDroplets: 52,
  stepPx: 12,
};

/** Deterministic pseudo-random in [0, 1) from an integer seed */
export function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return x - Math.floor(x);
}

/** Computes organic brush radius based on pointer velocity (px/frame equivalent). */
export function computeBrushRadius(speed: number, config: InkConfig = DEFAULT_INK_CONFIG): number {
  const clampedSpeed = Math.max(0, Math.min(speed, 90));
  // Deliberate medium motion creates bold wide brush strokes; ultra-fast flicks taper slightly
  const normalized = clampedSpeed / 90;
  const bellCurve = Math.sin(Math.min(1, normalized * 1.15) * Math.PI * 0.65);
  const radius = config.minRadius + (config.maxRadius - config.minRadius) * (0.42 + 0.58 * bellCurve);
  return Math.round(radius * 10) / 10;
}

/** Interpolates points along a pointer segment so rapid movement never gaps. */
export function interpolateStrokeSegment(
  prev: { x: number; y: number },
  curr: { x: number; y: number },
  stepPx: number = DEFAULT_INK_CONFIG.stepPx
): Array<{ x: number; y: number }> {
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  const dist = Math.hypot(dx, dy);
  const safeStep = Math.max(4, stepPx);

  if (dist <= safeStep) {
    return [{ x: curr.x, y: curr.y }];
  }

  const steps = Math.min(28, Math.ceil(dist / safeStep));
  const points: Array<{ x: number; y: number }> = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    points.push({
      x: prev.x + dx * t,
      y: prev.y + dy * t,
    });
  }
  return points;
}

/** Creates an organic deformed fluid blob with harmonic lobe offsets. */
export function createInkBlob(
  id: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  nowMs: number,
  config: InkConfig = DEFAULT_INK_CONFIG,
  isMist = false
): InkBlob {
  const speed = Math.hypot(vx, vy);
  const rawRadius = computeBrushRadius(speed, config);
  const jitter = 0.86 + seededUnit(id * 17 + 3) * 0.28;
  const baseRadius = rawRadius * jitter * (isMist ? 1.28 : 1);
  const angle = speed > 0.5 ? Math.atan2(vy, vx) : seededUnit(id * 29) * Math.PI * 2;
  const aspect = 1 + Math.min(0.45, speed * 0.008) + seededUnit(id * 31) * 0.14;

  const lobeCount = 7;
  const lobePhases: number[] = [];
  const lobeAmps: number[] = [];
  for (let i = 0; i < lobeCount; i++) {
    lobePhases.push(seededUnit(id * 41 + i * 7) * Math.PI * 2);
    lobeAmps.push(0.11 + seededUnit(id * 53 + i * 11) * 0.14);
  }

  return {
    id,
    x,
    y,
    vx: vx * 0.045,
    vy: vy * 0.045,
    baseRadius,
    currentRadius: baseRadius * 0.45,
    createdAt: nowMs,
    ttlMs: isMist ? config.blobTtlMs * 0.72 : config.blobTtlMs,
    rotation: angle,
    aspect,
    lobePhases,
    lobeAmps,
    isMist,
  };
}

/** Spawns detached painterly droplets flung off the brush stroke. */
export function spawnInkDroplets(
  startId: number,
  x: number,
  y: number,
  vx: number,
  vy: number,
  nowMs: number,
  config: InkConfig = DEFAULT_INK_CONFIG
): InkDroplet[] {
  const speed = Math.hypot(vx, vy);
  if (speed < 6) {
    return [];
  }

  const count = speed > 28 ? 2 : 1;
  const baseAngle = Math.atan2(vy, vx);
  const droplets: InkDroplet[] = [];

  for (let i = 0; i < count; i++) {
    const seed = startId + i * 13;
    const side = seededUnit(seed * 3 + 1) > 0.5 ? 1 : -1;
    const spreadAngle = baseAngle + side * (0.55 + seededUnit(seed * 5) * 1.1);
    const offsetDist = 22 + seededUnit(seed * 7) * 48;
    const launchSpeed = 0.6 + seededUnit(seed * 11) * 1.6;
    const radius = 3 + seededUnit(seed * 19) * 7;

    droplets.push({
      id: startId + i,
      x: x + Math.cos(spreadAngle) * offsetDist,
      y: y + Math.sin(spreadAngle) * offsetDist,
      vx: Math.cos(spreadAngle) * launchSpeed,
      vy: Math.sin(spreadAngle) * launchSpeed,
      radius,
      elongation: 1.15 + seededUnit(seed * 23) * 0.75,
      angle: spreadAngle,
      createdAt: nowMs,
      ttlMs: config.dropletTtlMs * (0.75 + seededUnit(seed * 29) * 0.4),
    });
  }

  return droplets;
}

/** Returns normalized opacity (0..1) for an ink mark over its lifetime. */
export function computeInkOpacity(ageMs: number, ttlMs: number): number {
  if (ageMs <= 0) return 1;
  if (ageMs >= ttlMs) return 0;
  const life = ageMs / ttlMs;
  // Hold vivid opacity for first 65% of life, then dissolve softly
  if (life < 0.65) return 1;
  const fadeProgress = (life - 0.65) / 0.35;
  return Math.max(0, 1 - fadeProgress * fadeProgress);
}

/** Advances ink simulation state by dtMs and prunes expired marks. */
export function stepInkState(
  state: InkEngineState,
  dtMs: number,
  nowMs: number,
  config: InkConfig = DEFAULT_INK_CONFIG
): InkEngineState {
  const clampedDt = Math.max(0, Math.min(dtMs, 64));
  const frameFactor = clampedDt / 16.67;
  const damping = Math.pow(0.92, frameFactor);

  const blobs: InkBlob[] = [];
  for (const blob of state.blobs) {
    const age = nowMs - blob.createdAt;
    if (age >= blob.ttlMs) continue;

    const bloomT = Math.min(1, Math.max(0, age / config.bloomDurationMs));
    const easedBloom = 1 - Math.pow(1 - bloomT, 3);
    const currentRadius = blob.baseRadius * (0.45 + 0.55 * easedBloom);

    blobs.push({
      ...blob,
      x: blob.x + blob.vx * frameFactor,
      y: blob.y + blob.vy * frameFactor,
      vx: blob.vx * damping,
      vy: blob.vy * damping,
      currentRadius,
    });
  }

  const droplets: InkDroplet[] = [];
  for (const drop of state.droplets) {
    const age = nowMs - drop.createdAt;
    if (age >= drop.ttlMs) continue;

    droplets.push({
      ...drop,
      x: drop.x + drop.vx * frameFactor,
      y: drop.y + drop.vy * frameFactor,
      vx: drop.vx * Math.pow(0.94, frameFactor),
      vy: drop.vy * Math.pow(0.94, frameFactor),
    });
  }

  return {
    blobs: blobs.slice(-config.maxBlobs),
    droplets: droplets.slice(-config.maxDroplets),
    nextId: state.nextId,
  };
}

/** Adds pointer stroke samples (interpolated) and droplets into ink state. */
export function addPointerStroke(
  state: InkEngineState,
  prev: { x: number; y: number } | null,
  curr: { x: number; y: number },
  nowMs: number,
  config: InkConfig = DEFAULT_INK_CONFIG
): InkEngineState {
  const start = prev ?? curr;
  const vx = curr.x - start.x;
  const vy = curr.y - start.y;
  const points = interpolateStrokeSegment(start, curr, config.stepPx);

  let nextId = state.nextId;
  const newBlobs: InkBlob[] = [];
  const newDroplets: InkDroplet[] = [];

  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    // Occasional soft translucent wake halo behind the main stroke
    if (i % 3 === 0) {
      newBlobs.push(createInkBlob(nextId++, pt.x - vx * 0.12, pt.y - vy * 0.12, vx, vy, nowMs, config, true));
    }
    newBlobs.push(createInkBlob(nextId++, pt.x, pt.y, vx, vy, nowMs, config, false));

    if (i === points.length - 1 && Math.hypot(vx, vy) > 10 && nextId % 2 === 0) {
      const spawned = spawnInkDroplets(nextId, pt.x, pt.y, vx, vy, nowMs, config);
      nextId += spawned.length;
      newDroplets.push(...spawned);
    }
  }

  return {
    blobs: [...state.blobs, ...newBlobs].slice(-config.maxBlobs),
    droplets: [...state.droplets, ...newDroplets].slice(-config.maxDroplets),
    nextId,
  };
}

/** Generates an artistic diagonal S-curve sweep across the central wordmark. */
export function getChoreographedSweepPoint(
  progress: number,
  width: number,
  height: number
): { x: number; y: number } {
  const t = Math.max(0, Math.min(1, progress));
  // Smooth ease-in-out
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  const x = width * (0.14 + 0.72 * eased);
  const wave = Math.sin(eased * Math.PI * 1.65) * height * 0.085;
  const diagonalLift = (0.5 - eased) * height * 0.16;
  const y = height * 0.51 + diagonalLift - wave;

  return { x, y };
}
