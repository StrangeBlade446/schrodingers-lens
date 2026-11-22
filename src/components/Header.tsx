import { ArrowUpRight, Sparkles } from 'lucide-react';
import { CatLogo } from './CatLogo';

interface HeaderProps {
  activeSection?: string;
  onStartProject: () => void;
  onToggleSentinelChat?: () => void;
}

export function Header({ onStartProject, onToggleSentinelChat }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#F7F7F5]/85 backdrop-blur-md border-b border-black/[0.06] h-16">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-full flex items-center justify-between gap-8">
        {/* Brand wordmark with CatLogo */}
        <button
          type="button"
          onClick={onStartProject}
          className="group flex items-center gap-2.5 font-display text-base md:text-lg font-black tracking-[-0.03em] text-[#0A0A0A] whitespace-nowrap shrink-0 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A0A0A]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] text-[#F7F7F5] flex items-center justify-center p-1.5 transition-transform duration-200 group-hover:scale-105 shadow-sm">
            <CatLogo className="w-full h-full text-current" />
          </div>
          <span className="tracking-tight">SCHRODINGER'S LENS</span>
        </button>

        {/* Feature quick-links */}
        <nav aria-label="Quick navigation" className="hidden lg:flex items-center gap-6">
          <button
            type="button"
            onClick={onStartProject}
            className="text-xs font-medium text-[#5A5A56] hover:text-[#0A0A0A] transition-colors cursor-pointer"
          >
            Multi-Parameter Screening
          </button>
          <button
            type="button"
            onClick={onStartProject}
            className="text-xs font-medium text-[#5A5A56] hover:text-[#0A0A0A] transition-colors cursor-pointer"
          >
            AI Resume Rejection
          </button>
          <button
            type="button"
            onClick={onStartProject}
            className="text-xs font-medium text-[#5A5A56] hover:text-[#0A0A0A] transition-colors cursor-pointer"
          >
            Quantum Finalist Matrix
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {onToggleSentinelChat && (
            <button
              type="button"
              onClick={onToggleSentinelChat}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] hover:text-[#0A0A0A] border border-black/10 rounded-full hover:bg-black/5 transition-all duration-150 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
              <span>Sentinel AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={onStartProject}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-[0.02em] text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
          >
            <span>Launch ATS</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
