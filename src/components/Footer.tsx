import { CatLogo } from './CatLogo';

export function Footer() {
  return (
    <footer className="border-t border-black/[0.08] bg-[#F7F7F5] py-12">
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#6E6E6A]">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <a
            href="#main"
            className="flex items-center gap-2 font-display text-sm font-black tracking-[-0.03em] text-[#0A0A0A]"
          >
            <div className="w-5 h-5 rounded bg-[#0A0A0A] text-[#F7F7F5] flex items-center justify-center p-0.5">
              <CatLogo className="w-full h-full text-current" />
            </div>
            <span>SCHRODINGER'S LENS</span>
          </a>
          <span>© 2026 Quantum Talent Intelligence ATS</span>
          <span>San Francisco · Bengaluru · London · Tokyo</span>
        </div>

        <nav aria-label="Footer navigation" className="flex flex-wrap items-center gap-6">
          <a href="#main" className="hover:text-[#0A0A0A] transition-colors">
            Main
          </a>
          <a href="#work" className="hover:text-[#0A0A0A] transition-colors">
            Intelligence
          </a>
          <a href="#story" className="hover:text-[#0A0A0A] transition-colors">
            Philosophy
          </a>
          <a href="#enquire" className="hover:text-[#0A0A0A] transition-colors">
            Intake
          </a>
          <a
            href="mailto:enterprise@schrodingerslens.ai"
            className="text-[#0A0A0A] font-medium hover:underline underline-offset-4"
          >
            enterprise@schrodingerslens.ai
          </a>
        </nav>
      </div>
    </footer>
  );
}
