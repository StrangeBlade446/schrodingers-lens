import { Header } from './Header';
import { InkRevealHero } from './InkRevealHero';
import type { ActiveModule } from '../types/ats';

export interface LandingPageProps {
  totalJobs: number;
  totalCandidates: number;
  onGetStarted: (targetModule?: ActiveModule) => void;
  sentinelChatOpen?: boolean;
  onToggleSentinelChat?: () => void;
}

export function LandingPage({
  totalJobs,
  totalCandidates,
  onGetStarted,
  sentinelChatOpen,
  onToggleSentinelChat,
}: LandingPageProps) {
  const handleLaunchATS = () => {
    onGetStarted('overview');
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#F7F7F5] text-[#0A0A0A] font-sans antialiased selection:bg-[#0A0A0A] selection:text-[#F7F7F5] flex flex-col fixed inset-0">
      <Header
        onStartProject={handleLaunchATS}
        onToggleSentinelChat={onToggleSentinelChat}
      />

      <main className="flex-1 w-full h-[calc(100vh-4rem)] mt-16 overflow-hidden">
        <InkRevealHero onStartProject={handleLaunchATS} />
      </main>

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
          onClick={handleLaunchATS}
          className="text-white hover:text-emerald-300 font-bold tracking-tight transition-colors cursor-pointer"
        >
          Enter ATS &rarr;
        </button>
      </div>
    </div>
  );
}
