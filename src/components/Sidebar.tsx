import React from 'react';
import {
  Briefcase,
  LayoutDashboard,
  FileUp,
  Users,
  Trophy,
  Kanban,
  GitCompareArrows,
  X,
} from 'lucide-react';
import type { ActiveModule, JobDescription } from '../types/ats';

interface SidebarProps {
  activeModule: ActiveModule;
  onSelectModule: (module: ActiveModule) => void;
  candidateCount: number;
  jobCount: number;
  compareCount: number;
  jobDescription: JobDescription;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  compactHalfScreen?: boolean;
}

const ROLE_NAV_ITEMS: Array<{
  id: ActiveModule;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'overview',
    label: 'Role Overview',
    description: 'Options, charts & activity',
    icon: LayoutDashboard,
  },
  {
    id: 'upload',
    label: 'Upload Resumes',
    description: 'Ingest multiple resumes & JD',
    icon: FileUp,
  },
  {
    id: 'dashboard',
    label: 'Candidate Dashboard',
    description: 'Filter, rank & shortlist',
    icon: Users,
  },
  {
    id: 'ranklist',
    label: 'Candidate Rank List',
    description: 'Ranked names & podium',
    icon: Trophy,
  },
  {
    id: 'pipeline',
    label: 'Hiring Pipeline',
    description: 'Kanban stages & templates',
    icon: Kanban,
  },
  {
    id: 'compare',
    label: 'Side-by-Side Compare',
    description: 'Matrix & AI recommendation',
    icon: GitCompareArrows,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  candidateCount,
  jobCount,
  compareCount,
  jobDescription,
  mobileOpen,
  onCloseMobile,
  compactHalfScreen = false,
}) => {
  const navContent = (
    <div className="flex flex-col h-full bg-[#111936] text-[#F8FAFC] border-r border-[#1F2A52] w-64 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#1F2A52] shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectModule('jobs');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308] rounded"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] border border-[#EAB308]/60 flex items-center justify-center text-white font-display font-bold text-sm tracking-tight shrink-0">
            SL
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-white whitespace-nowrap truncate">
            Schrodinger&apos;s Lens
          </span>
        </button>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-[#1A254B]"
          aria-label="Close navigation menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Primary screens">
        <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wide text-[#94A3C4]">
          Main Hub
        </p>
        <button
          type="button"
          onClick={() => {
            onSelectModule('jobs');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308] cursor-pointer ${
            activeModule === 'jobs'
              ? 'bg-[#1A2650] text-white'
              : 'text-[#CBD5E1] hover:bg-[#172144] hover:text-white'
          }`}
        >
          <span
            className={`w-1 h-6 rounded-full shrink-0 transition-colors ${
              activeModule === 'jobs' ? 'bg-[#EAB308]' : 'bg-transparent'
            }`}
            aria-hidden="true"
          />
          <Briefcase
            className={`w-4 h-4 shrink-0 ${
              activeModule === 'jobs' ? 'text-[#EAB308]' : 'text-[#8E9DC0]'
            }`}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-sm truncate tracking-[0.01em] ${
                  activeModule === 'jobs' ? 'font-semibold text-white' : 'font-medium'
                }`}
              >
                All Job Descriptions
              </span>
              <span
                className={`text-xs tabular-nums shrink-0 ${
                  activeModule === 'jobs' ? 'text-[#EAB308] font-semibold' : 'text-[#8E9DC0]'
                }`}
              >
                {jobCount}
              </span>
            </div>
            <p className="text-xs text-[#8E9DC0] truncate">Roles &amp; JD templates</p>
          </div>
        </button>

        <p className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-[#94A3C4]">
          Active Role Screens
        </p>
        {ROLE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectModule(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAB308] cursor-pointer ${
                isActive
                  ? 'bg-[#1A2650] text-white'
                  : 'text-[#CBD5E1] hover:bg-[#172144] hover:text-white'
              }`}
            >
              <span
                className={`w-1 h-6 rounded-full shrink-0 transition-colors ${
                  isActive ? 'bg-[#EAB308]' : 'bg-transparent'
                }`}
                aria-hidden="true"
              />
              <Icon
                className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#EAB308]' : 'text-[#8E9DC0]'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-sm truncate tracking-[0.01em] ${
                      isActive ? 'font-semibold text-white' : 'font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.id === 'dashboard' && (
                    <span
                      className={`text-xs tabular-nums shrink-0 ${
                        isActive ? 'text-[#EAB308] font-semibold' : 'text-[#8E9DC0]'
                      }`}
                    >
                      {candidateCount}
                    </span>
                  )}
                  {item.id === 'compare' && compareCount > 0 && (
                    <span className="text-xs tabular-nums text-[#EAB308] font-semibold shrink-0">
                      {compareCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8E9DC0] truncate">{item.description}</p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active Requisition Context */}
      <div className="p-4 border-t border-[#1F2A52] bg-[#0D142C]">
        <div className="flex items-start gap-2.5">
          <Briefcase className="w-4 h-4 text-[#EAB308] mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-[#94A3C4]">Selected Role</p>
            <p className="text-sm font-semibold text-white truncate mt-0.5 tracking-[0.01em]">
              {jobDescription.title}
            </p>
            <p className="text-xs text-[#8E9DC0] truncate mt-0.5">
              {jobDescription.department} · {jobDescription.location} · {jobDescription.jobType || 'Hybrid'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {!compactHalfScreen && (
        <aside className="hidden lg:block shrink-0 h-screen sticky top-0 z-20">{navContent}</aside>
      )}

      {mobileOpen && (
        <div
          className={`fixed inset-0 z-50 ${compactHalfScreen ? 'flex' : 'lg:hidden flex'}`}
        >
          <div
            className="fixed inset-0 bg-[#111936]/55"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{navContent}</div>
        </div>
      )}
    </>
  );
};
