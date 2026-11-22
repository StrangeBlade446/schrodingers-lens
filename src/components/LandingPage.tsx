import React, { useEffect, useRef, useState } from 'react';
import { CatLogo } from './CatLogo';
import type { ActiveModule } from '../types/ats';

interface LandingPageProps {
  totalJobs: number;
  totalCandidates: number;
  onGetStarted: (targetModule?: ActiveModule) => void;
  sentinelChatOpen?: boolean;
  onToggleSentinelChat?: () => void;
}

const HERO_VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4';

const HERO_POSTER_URL =
  'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg';

interface FeatureTrigger {
  id: string;
  label: string;
  target: ActiveModule;
  previewLine1: string;
  previewLine2: string;
}

const FEATURE_TRIGGERS: FeatureTrigger[] = [
  {
    id: 'f1',
    label: 'AI Resume Screening',
    target: 'upload',
    previewLine1: 'Multi-file PDF & DOCX screening against a locked requisition baseline',
    previewLine2: 'with transparent skill scoring.',
  },
  {
    id: 'f2',
    label: 'Verified Skill Gates',
    target: 'jobs',
    previewLine1: 'Real-world skill verification and Google Maps location grounding',
    previewLine2: 'built directly into every job profile.',
  },
  {
    id: 'f3',
    label: 'Rank List Podium',
    target: 'ranklist',
    previewLine1: 'Ranked top-candidate leaderboard highlighting verified technical alignment',
    previewLine2: 'for instant shortlist calibration.',
  },
  {
    id: 'f4',
    label: 'Hiring Pipeline',
    target: 'pipeline',
    previewLine1: 'Interactive stage transitions, structured email templates, and side-by-side',
    previewLine2: 'decision matrices across roles.',
  },
];

const SOLUTIONS_MENU: Array<{ label: string; detail: string; target: ActiveModule }> = [
  { label: 'Candidate Dashboard', detail: 'Search, filter & cross-role match', target: 'dashboard' },
  { label: 'Rank List Podium', detail: 'Top weighted scores at a glance', target: 'ranklist' },
  { label: 'Hiring Pipeline', detail: 'Stage triage & outreach emails', target: 'pipeline' },
  { label: 'Side-by-Side Compare', detail: 'Direct finalist capability matrix', target: 'compare' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  totalJobs,
  totalCandidates,
  onGetStarted,
  sentinelChatOpen = false,
  onToggleSentinelChat,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const foot2Ref = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<FeatureTrigger | null>(null);

  // Sync looping background video cleanly with prefers-reduced-motion
  useEffect(() => {
    const q =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    const v = videoRef.current;
    if (!q || !v) return;

    const sync = () => {
      if (q.matches) {
        v.pause();
      } else {
        const playPromise = v.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Autoplay fallback handled gracefully by poster frame
          });
        }
      }
    };

    sync();
    if (q.addEventListener) {
      q.addEventListener('change', sync);
      return () => q.removeEventListener('change', sync);
    }
    q.addListener(sync);
    return () => q.removeListener(sync);
  }, []);

  // Retire initial entrance classes once final footer span completes (or safety timer)
  useEffect(() => {
    const footEl = foot2Ref.current;
    let timerId = 0;

    const done = () => {
      window.clearTimeout(timerId);
      if (footEl) {
        footEl.removeEventListener('animationend', done);
      }
      document.documentElement.classList.add('sl-entered');
    };

    if (footEl) {
      footEl.addEventListener('animationend', done);
    }
    timerId = window.setTimeout(done, 4000);

    return () => {
      window.clearTimeout(timerId);
      if (footEl) {
        footEl.removeEventListener('animationend', done);
      }
    };
  }, []);

  // Close interactive dropdowns on outside click or Escape
  useEffect(() => {
    if (!solutionsOpen && !mobileMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSolutionsOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSolutionsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [solutionsOpen, mobileMenuOpen]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty('--mx', `${xPct.toFixed(1)}%`);
    el.style.setProperty('--my', `${yPct.toFixed(1)}%`);
  };

  const launchModule = (mod: ActiveModule) => {
    setMobileMenuOpen(false);
    setSolutionsOpen(false);
    onGetStarted(mod);
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      style={
        {
          '--mx': '50%',
          '--my': '48%',
        } as React.CSSProperties
      }
      className="sl-landing relative h-dvh w-full overflow-hidden bg-[#0B1126] text-[#FAF9F6] font-sora flex flex-col justify-between select-none"
    >
      {/* 1. Looping Light-Painting Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover object-center z-0 pointer-events-none select-none bg-[#0B1126]"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        poster={HERO_POSTER_URL}
        src={HERO_VIDEO_URL}
      />

      {/* 2. Imperial Navy Radial & Edge Veil + Interactive Optical Lens Glow */}
      <div className="sl-veil absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(460px circle at var(--mx) var(--my), rgba(29, 78, 216, 0.18), rgba(234, 179, 8, 0.08) 42%, transparent 72%)',
        }}
        aria-hidden="true"
      />

      {/* 3. Clean 3-Zone Top Bar */}
      <header className="relative z-30 w-full max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 pt-5 sm:pt-7 flex items-center justify-between gap-6">
        {/* Brand Lockup: 4-Path Geometric Slash + SCHRODINGER'S LENS */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            launchModule('jobs');
          }}
          className="sl-anim-brand inline-flex items-center gap-2.5 text-[#FAF9F6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308] rounded-md px-1 py-0.5 whitespace-nowrap shrink-0"
        >
          <svg
            className="w-6 h-[17px] shrink-0"
            viewBox="0 0 23 17"
            aria-hidden="true"
          >
            <path d="M8.15 0.9 L4.55 0.9 L0.5 9.3 L4.1 9.3 Z" fill="#EAB308" />
            <path d="M17.0 0 L13.4 0 L6.15 16.4 L9.75 16.4 Z" fill="#FAF9F6" />
            <path d="M22.9 0 L19.3 0 L15.0 7.6 L18.6 7.6 Z" fill="#3B82F6" />
            <path d="M22.6 6.9 L19.0 6.9 L14.05 16.4 L17.65 16.4 Z" fill="#FAF9F6" />
          </svg>
          <span
            className="text-sm sm:text-[15px] uppercase tracking-[0.18em] text-[#FAF9F6]"
            style={{ fontVariationSettings: "'wght' 531" }}
          >
            Schrodinger&apos;s Lens
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav
          className={`${sentinelChatOpen ? 'hidden' : 'hidden lg:flex'} items-center gap-8 text-[13.5px] text-[#FAF9F6]`}
          aria-label="Primary sections"
        >
          <button
            type="button"
            onClick={() => launchModule('jobs')}
            className="sl-anim-nav-1 hover:text-[#EAB308] transition-colors cursor-pointer whitespace-nowrap"
            style={{ fontVariationSettings: "'wght' 506" }}
          >
            Job Hub
          </button>

          <button
            type="button"
            onClick={() => launchModule('upload')}
            className="sl-anim-nav-2 hover:text-[#EAB308] transition-colors cursor-pointer whitespace-nowrap"
            style={{ fontVariationSettings: "'wght' 506" }}
          >
            Screen Resumes
          </button>

          {/* Interactive Solutions Dropdown */}
          <div ref={dropdownRef} className="relative sl-anim-nav-3">
            <button
              type="button"
              onClick={() => setSolutionsOpen((prev) => !prev)}
              aria-expanded={solutionsOpen}
              className="inline-flex items-center gap-1.5 hover:text-[#EAB308] transition-colors cursor-pointer whitespace-nowrap"
              style={{ fontVariationSettings: "'wght' 506" }}
            >
              <span>Workspace</span>
              <svg
                className={`w-2.5 h-1.5 stroke-current fill-none transition-transform duration-200 ${
                  solutionsOpen ? 'rotate-180 text-[#EAB308]' : ''
                }`}
                viewBox="0 0 9 6"
                aria-hidden="true"
              >
                <path
                  d="M0.7 1.1 L4.5 4.6 L8.3 1.1"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {solutionsOpen && (
              <div className="sl-navpanel absolute right-0 top-[calc(100%+12px)] w-64 rounded-2xl border border-[#2F407A]/70 p-2 shadow-2xl z-50">
                {SOLUTIONS_MENU.map((item) => (
                  <button
                    key={item.target}
                    type="button"
                    onClick={() => launchModule(item.target)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer group"
                  >
                    <div className="text-xs font-semibold text-[#FAF9F6] group-hover:text-[#EAB308] transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-[#CBD5E1]/80 mt-0.5">{item.detail}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop Right Actions */}
        <div className="hidden lg:flex items-center gap-4 shrink-0">
          {!sentinelChatOpen && (
            <button
              type="button"
              onClick={() => launchModule('dashboard')}
              className="sl-anim-login inline-flex items-center gap-2 text-[13.5px] text-[#FAF9F6] hover:text-[#EAB308] transition-colors cursor-pointer whitespace-nowrap"
              style={{ fontVariationSettings: "'wght' 506" }}
            >
              <span>Open Candidates</span>
              <svg
                className="w-2.5 h-2.5 stroke-current fill-none"
                viewBox="0 0 10 9"
                aria-hidden="true"
              >
                <path
                  d="M0 4.5 H9.1 M5.4 0.9 L9.2 4.5 L5.4 8.1"
                  strokeWidth="1.2"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                />
              </svg>
            </button>
          )}

          {onToggleSentinelChat && (
            <button
              type="button"
              onClick={onToggleSentinelChat}
              aria-pressed={sentinelChatOpen}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                sentinelChatOpen
                  ? 'bg-[#1D4ED8] text-white border border-[#EAB308]'
                  : 'bg-[#111936]/75 hover:bg-[#1D4ED8]/80 text-[#FAF9F6] border border-[#EAB308]/60'
              }`}
            >
              <CatLogo className="w-4 h-4 text-[#EAB308]" />
              <span>Schrodinger&apos;s cat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => launchModule('jobs')}
            className="sl-anim-pill px-5 py-2.5 rounded-full border border-[#EAB308]/65 bg-[#111936]/45 hover:bg-[#1D4ED8]/75 hover:border-[#FAF9F6]/80 text-[13.5px] text-[#FAF9F6] transition-all cursor-pointer whitespace-nowrap"
            style={{ fontVariationSettings: "'wght' 581" }}
          >
            Enter Workspace
          </button>
        </div>

        {/* Mobile / Tablet Top Controls */}
        <div className="lg:hidden flex items-center gap-2 shrink-0">
          {onToggleSentinelChat && (
            <button
              type="button"
              onClick={onToggleSentinelChat}
              aria-pressed={sentinelChatOpen}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium border cursor-pointer ${
                sentinelChatOpen
                  ? 'bg-[#1D4ED8] text-white border-[#EAB308]'
                  : 'bg-[#111936]/65 text-[#FAF9F6] border-[#EAB308]/60'
              }`}
            >
              <CatLogo className="w-4 h-4 text-[#EAB308]" />
              <span>Schrodinger&apos;s cat</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            className="inline-flex items-center justify-center w-11 h-11 rounded-full border border-[#EAB308]/60 bg-[#111936]/55 backdrop-blur-md text-[#FAF9F6] cursor-pointer"
          >
            <svg
              className="w-5 h-3.5 stroke-current fill-none"
              viewBox="0 0 22 14"
              aria-hidden="true"
            >
              <path
                d={mobileMenuOpen ? 'M4 2 L18 12' : 'M1 1 H21'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              {!mobileMenuOpen && (
                <path d="M1 7 H21" strokeWidth="1.5" strokeLinecap="round" />
              )}
              <path
                d={mobileMenuOpen ? 'M4 12 L18 2' : 'M1 13 H21'}
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Glass Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-[#0B1126]/55 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="sl-navpanel fixed top-20 right-5 w-[min(290px,84vw)] rounded-2xl border border-[#2F407A]/75 p-3 z-40 lg:hidden shadow-2xl">
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => launchModule('jobs')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#FAF9F6] hover:bg-white/10 cursor-pointer"
              >
                Job Hub
              </button>
              <button
                type="button"
                onClick={() => launchModule('upload')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#FAF9F6] hover:bg-white/10 cursor-pointer"
              >
                Screen Resumes
              </button>
              <button
                type="button"
                onClick={() => launchModule('dashboard')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#FAF9F6] hover:bg-white/10 cursor-pointer"
              >
                Candidate Dashboard
              </button>
              <button
                type="button"
                onClick={() => launchModule('ranklist')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#FAF9F6] hover:bg-white/10 cursor-pointer"
              >
                Rank List Podium
              </button>
              <button
                type="button"
                onClick={() => launchModule('pipeline')}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#FAF9F6] hover:bg-white/10 cursor-pointer"
              >
                Hiring Pipeline
              </button>
            </div>
            <button
              type="button"
              onClick={() => launchModule('jobs')}
              className="mt-2 w-full py-2.5 rounded-full border border-[#EAB308]/65 bg-[#1D4ED8]/80 text-sm font-medium text-white text-center cursor-pointer"
            >
              Enter Workspace
            </button>
          </div>
        </>
      )}

      {/* 4. Hero Composition Centerpiece */}
      <main className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 max-w-5xl mx-auto w-full">
        <h1 className="text-[#FAF9F6] tracking-[-0.015em] leading-[1.08] text-[clamp(1.9rem,4.1vw,3.3rem)]">
          <span
            className="sl-anim-h1a block text-balance"
            style={{ fontVariationSettings: "'wght' 424" }}
          >
            Precision Talent Intelligence
          </span>
          <span
            className="sl-anim-h1b block text-balance mt-0.5"
            style={{ fontVariationSettings: "'wght' 424" }}
          >
            Observed Before Every Hire.
          </span>
        </h1>

        <p
          className="mt-4 sm:mt-5 text-[#CBD5E1] text-[clamp(0.95rem,1.45vw,1.2rem)] leading-relaxed max-w-2xl min-h-[3.2em] transition-opacity duration-200"
          style={{ fontVariationSettings: "'wght' 446" }}
        >
          <span className="sl-anim-sub1 block">
            {hoveredFeature
              ? hoveredFeature.previewLine1
              : "Schrodinger's Lens aligns multi-file resumes with verified real-world skills"}
          </span>
          <span className="sl-anim-sub2 block">
            {hoveredFeature
              ? hoveredFeature.previewLine2
              : 'and structured AI scoring across your entire hiring pipeline.'}
          </span>
        </p>

        {/* Signature Frosted Royal Glass CTA (Warm Gold -> Cobalt Royal Blue refraction) */}
        <button
          type="button"
          onClick={() => launchModule('jobs')}
          className="sl-cta sl-anim-cta group mt-6 sm:mt-8 inline-flex items-center gap-3.5 px-7 sm:px-9 py-3.5 sm:py-4 text-[#FAF9F6] text-base sm:text-lg cursor-pointer whitespace-nowrap"
          style={{ fontVariationSettings: "'wght' 497" }}
        >
          <span>Get started today</span>
          <svg
            className="w-4 h-3 stroke-current fill-none transition-transform duration-200 group-hover:translate-x-1 text-[#EAB308]"
            viewBox="0 0 16 11"
            aria-hidden="true"
          >
            <path
              d="M0 5.5 H14.6 M10.3 1.2 L14.9 5.5 L10.3 9.8"
              strokeWidth="1.6"
              strokeLinecap="square"
              strokeLinejoin="miter"
            />
          </svg>
        </button>

        {/* Four Interactive Feature Chevrons */}
        <ul
          className="mt-8 sm:mt-11 grid grid-cols-2 md:flex md:flex-wrap items-center justify-center gap-x-8 lg:gap-x-10 gap-y-3.5 max-w-4xl"
          onMouseLeave={() => setHoveredFeature(null)}
        >
          {FEATURE_TRIGGERS.map((feat, idx) => (
            <li key={feat.id} className={`sl-anim-f${idx + 1}`}>
              <button
                type="button"
                onClick={() => launchModule(feat.target)}
                onMouseEnter={() => setHoveredFeature(feat)}
                onFocus={() => setHoveredFeature(feat)}
                onBlur={() => setHoveredFeature(null)}
                className="group inline-flex items-center gap-2.5 text-[13px] sm:text-[14px] text-[#E2EBF5] hover:text-[#EAB308] transition-colors cursor-pointer whitespace-nowrap"
                style={{ fontVariationSettings: "'wght' 534" }}
              >
                <svg
                  className="w-2.5 h-4 stroke-[#EAB308]/90 group-hover:translate-x-0.5 transition-transform fill-none shrink-0"
                  viewBox="0 0 11 20"
                  aria-hidden="true"
                >
                  <path
                    d="M1.15 1.15 L9.6 10 L1.15 18.85"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{feat.label}</span>
              </button>
            </li>
          ))}
        </ul>

        {/* Vertical Optical Divider Rule */}
        <span
          className="sl-rule sl-anim-rule block w-px h-9 sm:h-12 mt-6 sm:mt-8"
          aria-hidden="true"
        />
      </main>

      {/* 5. Quiet Two-Line Editorial Footer */}
      <footer className="relative z-20 pb-5 sm:pb-7 px-5 text-center text-[#E2E8F0] text-xs sm:text-[13.5px] leading-relaxed">
        <span
          className="sl-anim-foot1 block"
          style={{ fontVariationSettings: "'wght' 521" }}
        >
          Trusted precision screening across technical requisitions.
        </span>
        <span
          ref={foot2Ref}
          className="sl-anim-foot2 block text-[#CBD5E1]/90 tabular-nums mt-0.5"
          style={{ fontVariationSettings: "'wght' 521" }}
        >
          <span className="text-[#EAB308]">{totalJobs} Active Roles</span>
          {' · '}
          <span className="text-[#34D399]">{totalCandidates} Screened Candidates</span>
          {' · '}
          2026
        </span>
      </footer>
    </div>
  );
};
