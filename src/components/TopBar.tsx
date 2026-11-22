import React from 'react';
import { ArrowLeft, Menu } from 'lucide-react';
import { CatLogo } from './CatLogo';
import type { ActiveModule, JobDescription } from '../types/ats';

interface TopBarProps {
  activeModule: ActiveModule;
  jobDescription: JobDescription;
  allJobDescriptions: JobDescription[];
  onSwitchJob: (jobId: string) => void;
  onOpenMobileNav: () => void;
  canGoBack: boolean;
  previousLabel?: string;
  onGoBack: () => void;
  sentinelChatOpen: boolean;
  onToggleSentinelChat: () => void;
}

const MODULE_TITLES: Record<ActiveModule, string> = {
  jobs: 'All Job Descriptions',
  overview: 'Role Overview',
  upload: 'Upload Resumes',
  dashboard: 'Candidate Dashboard',
  ranklist: 'Candidate Rank List',
  pipeline: 'Hiring Pipeline',
  compare: 'Side-by-Side Comparison',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeModule,
  jobDescription,
  allJobDescriptions,
  onSwitchJob,
  onOpenMobileNav,
  canGoBack,
  previousLabel,
  onGoBack,
  sentinelChatOpen,
  onToggleSentinelChat,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#E2E4EC] px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-10 shrink-0">
      {/* Left: Nav Toggle, Back Arrow, Persistent Schrodinger's cat Toggle & Screen Title */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileNav}
          className={`${
            sentinelChatOpen ? '' : 'lg:hidden'
          } p-2 -ml-1 rounded-lg text-[#111936] hover:bg-[#FAF9F6] cursor-pointer`}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onGoBack}
          disabled={!canGoBack}
          title={canGoBack && previousLabel ? `Back to ${previousLabel}` : 'No previous page'}
          aria-label={canGoBack && previousLabel ? `Back to ${previousLabel}` : 'Go back'}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E4EC] bg-white hover:border-[#94A0B8] hover:bg-[#FAF9F6] text-xs font-medium text-[#111936] disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#111936]" />
          <span className="hidden md:inline">Back</span>
        </button>

        <button
          type="button"
          onClick={onToggleSentinelChat}
          aria-pressed={sentinelChatOpen}
          title={sentinelChatOpen ? "Close Schrodinger's cat split chat" : "Ask Schrodinger's cat"}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
            sentinelChatOpen
              ? 'bg-[#1D4ED8] text-white border border-[#1E40AF] ring-2 ring-[#EAB308]/75'
              : 'bg-[#111936] text-[#FAF9F6] hover:bg-[#1D4ED8] border border-[#EAB308]/60'
          }`}
        >
          <CatLogo className="w-4 h-4 text-[#EAB308]" />
          <span>Schrodinger&apos;s cat</span>
        </button>

        <div className="min-w-0 flex items-center gap-2 text-sm">
          {activeModule !== 'jobs' ? (
            <>
              <select
                value={jobDescription.id}
                onChange={(e) => onSwitchJob(e.target.value)}
                aria-label="Switch active job description"
                className="hidden sm:block max-w-[230px] truncate px-2.5 py-1 text-xs font-semibold text-[#111936] bg-[#FAF9F6] border border-[#E2E4EC] hover:border-[#B8BDCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
              >
                {allJobDescriptions.map((jd) => (
                  <option key={jd.id} value={jd.id}>
                    {jd.title}
                  </option>
                ))}
              </select>
              <span className="hidden sm:inline text-[#C2C7D6]" aria-hidden="true">
                /
              </span>
            </>
          ) : null}

          <h1 className="font-display font-bold text-[#111936] truncate whitespace-nowrap">
            {MODULE_TITLES[activeModule]}
          </h1>
          {activeModule !== 'jobs' && (
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap truncate">
              <span>· {jobDescription.location}</span>
              <span className="px-1.5 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[10px] font-semibold text-[#1E40AF]">
                {jobDescription.jobType || 'Hybrid'}
              </span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
