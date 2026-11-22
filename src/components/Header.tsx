import { Menu, X, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { CatLogo } from './CatLogo';

interface HeaderProps {
  activeSection: string;
  onStartProject: () => void;
  onToggleSentinelChat?: () => void;
}

const NAV_ITEMS = [
  { id: 'main', label: 'Main', href: '#main' },
  { id: 'work', label: 'Intelligence', href: '#work' },
  { id: 'story', label: 'Philosophy', href: '#story' },
  { id: 'enquire', label: 'Intake', href: '#enquire' },
];

export function Header({ activeSection, onStartProject, onToggleSentinelChat }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-[#F7F7F5]/85 backdrop-blur-md border-b border-black/[0.06]">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark with CatLogo */}
        <a
          href="#main"
          className="group flex items-center gap-2.5 font-display text-base md:text-lg font-black tracking-[-0.03em] text-[#0A0A0A] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A0A0A]"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0A0A0A] text-[#F7F7F5] flex items-center justify-center p-1.5 transition-transform duration-200 group-hover:scale-105">
            <CatLogo className="w-full h-full text-current" />
          </div>
          <span className="tracking-tight">SCHRODINGER'S LENS</span>
        </a>

        {/* Zone 2: Clean single-line navigation links */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <a
                key={item.id}
                href={item.href}
                className={`relative py-1 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A0A0A] ${
                  isActive
                    ? 'text-[#0A0A0A]'
                    : 'text-[#5A5A56] hover:text-[#0A0A0A]'
                }`}
              >
                {item.label}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#0A0A0A] transition-transform duration-200 origin-left ${
                    isActive ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {onToggleSentinelChat && (
            <button
              type="button"
              onClick={onToggleSentinelChat}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5A5A56] hover:text-[#0A0A0A] border border-black/10 rounded-full hover:bg-black/5 transition-all duration-150"
            >
              <span>Sentinel AI</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onStartProject();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold tracking-[0.02em] text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] active:scale-[0.98] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
          >
            <span>Launch ATS</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 text-[#0A0A0A] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile slide-down panel */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#F7F7F5] border-t border-black/10 px-6 py-5 space-y-4">
          <nav aria-label="Mobile navigation" className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={handleNavClick}
                className="py-2 text-base font-medium text-[#0A0A0A] border-b border-black/[0.06] last:border-b-0"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onStartProject();
            }}
            className="w-full py-3 text-xs font-bold uppercase tracking-wider text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] transition-colors"
          >
            Launch ATS Platform
          </button>
        </div>
      )}
    </header>
  );
}
