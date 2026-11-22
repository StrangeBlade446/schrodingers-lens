import { useCallback, useEffect, useState } from 'react';
import { EnquirySection } from './EnquirySection';
import { Footer } from './Footer';
import { Header } from './Header';
import { InkRevealHero } from './InkRevealHero';
import { ProjectModal } from './ProjectModal';
import { StorySection } from './StorySection';
import { WorkShowcase } from './WorkShowcase';
import type { StudioProject } from '../utils/projectFilters';
import type { ActiveModule } from '../types/ats';

export interface LandingPageProps {
  totalJobs: number;
  totalCandidates: number;
  onGetStarted: (targetModule?: ActiveModule) => void;
  sentinelChatOpen?: boolean;
  onToggleSentinelChat?: () => void;
}

const SECTION_IDS = ['main', 'work', 'story', 'enquire'];

export function LandingPage({
  totalJobs,
  totalCandidates,
  onGetStarted,
  sentinelChatOpen,
  onToggleSentinelChat,
}: LandingPageProps) {
  const [activeSection, setActiveSection] = useState<string>('main');
  const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null);
  const [preselectedScope, setPreselectedScope] = useState<string | undefined>(undefined);

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveSection(visible[0].target.id);
        }
      },
      {
        rootMargin: '-30% 0px -50% 0px',
        threshold: [0.1, 0.3, 0.6],
      }
    );

    for (const el of elements) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleStartProject = useCallback(() => {
    onGetStarted('overview');
  }, [onGetStarted]);

  const handleBrowseWork = useCallback(() => {
    scrollToSection('work');
  }, [scrollToSection]);

  const handleDiscussSimilar = useCallback(
    (scope: string) => {
      setSelectedProject(null);
      setPreselectedScope(scope);
      scrollToSection('enquire');
    },
    [scrollToSection]
  );

  return (
    <div className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A] font-sans antialiased selection:bg-[#0A0A0A] selection:text-[#F7F7F5]">
      <Header
        activeSection={activeSection}
        onStartProject={handleStartProject}
        onToggleSentinelChat={onToggleSentinelChat}
      />

      <main>
        <InkRevealHero
          onStartProject={handleStartProject}
          onBrowseWork={handleBrowseWork}
        />
        <WorkShowcase onSelectProject={setSelectedProject} />
        <StorySection />
        <EnquirySection
          preselectedScope={preselectedScope}
          onLaunchPlatform={handleStartProject}
        />
      </main>

      <Footer />

      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
        onDiscussSimilar={handleDiscussSimilar}
        onLaunchModule={(mod) => onGetStarted(mod)}
      />

      {/* Floating Status Bar & Quick Jump to Workspace */}
      <div className="fixed bottom-5 right-5 z-30 hidden sm:flex items-center gap-3 bg-[#0A0A0A]/90 backdrop-blur-md text-[#F7F7F5] px-4 py-2.5 rounded-full border border-white/10 shadow-xl text-xs font-medium">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-stone-300 font-mono">
            {totalJobs} Jobs · {totalCandidates} Candidates Active
          </span>
        </span>
        <span className="w-px h-3.5 bg-white/20" />
        <button
          type="button"
          onClick={() => onGetStarted('overview')}
          className="text-white hover:text-emerald-300 font-bold tracking-tight transition-colors cursor-pointer"
        >
          Enter ATS &rarr;
        </button>
      </div>
    </div>
  );
}
