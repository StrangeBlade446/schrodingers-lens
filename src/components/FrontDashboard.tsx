import React, { useMemo } from 'react';
import {
  UploadCloud,
  Users,
  Trophy,
  ArrowRight,
  ArrowLeft,
  GitCompareArrows,
  Kanban,
  BarChart3,
  Layers,
  Clock,
  Trash2,
  Pencil,
} from 'lucide-react';
import type {
  ActiveModule,
  ActivityEvent,
  Candidate,
  JobDescription,
  PipelineStage,
} from '../types/ats';
import { PIPELINE_STAGES } from '../data/initialData';
import { ScoreRing } from './ScoreRing';
import { StageBadge } from './StageBadge';

interface FrontDashboardProps {
  candidates: Candidate[];
  jobDescription: JobDescription;
  activityLog: ActivityEvent[];
  onNavigate: (module: ActiveModule) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onRequestClearCandidates: () => void;
  onRequestEditJob: () => void;
}

const STAGE_BAR_COLORS: Record<PipelineStage, string> = {
  Applied: 'bg-[#64748B]',
  Shortlisted: 'bg-[#047857]',
  Interview: 'bg-[#B45309]',
  Offer: 'bg-[#1D4ED8]',
  Rejected: 'bg-[#BE123C]',
};

export const FrontDashboard: React.FC<FrontDashboardProps> = ({
  candidates,
  jobDescription,
  activityLog,
  onNavigate,
  onOpenCandidate,
  onRequestClearCandidates,
  onRequestEditJob,
}) => {
  const uploadedCount = useMemo(
    () => candidates.filter((c) => c.source === 'uploaded').length,
    [candidates]
  );

  const topThree = useMemo(
    () => [...candidates].sort((a, b) => b.matchScore - a.matchScore || b.cgpa - a.cgpa).slice(0, 3),
    [candidates]
  );

  const shortlistedCount = useMemo(
    () => candidates.filter((c) => c.stage === 'Shortlisted').length,
    [candidates]
  );
  const interviewOrOfferCount = useMemo(
    () => candidates.filter((c) => c.stage === 'Interview' || c.stage === 'Offer').length,
    [candidates]
  );

  const scoreBuckets = useMemo(() => {
    const buckets = [
      { label: '90–100', sub: 'Top Tier', min: 90, max: 100, count: 0, color: '#047857' },
      { label: '80–89', sub: 'Strong', min: 80, max: 89, count: 0, color: '#1D4ED8' },
      { label: '70–79', sub: 'Moderate', min: 70, max: 79, count: 0, color: '#64748B' },
      { label: '< 70', sub: 'Review', min: 0, max: 69, count: 0, color: '#B45309' },
    ];
    candidates.forEach((c) => {
      const bucket = buckets.find((b) => c.matchScore >= b.min && c.matchScore <= b.max);
      if (bucket) bucket.count += 1;
    });
    const maxCount = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, maxCount };
  }, [candidates]);

  const stageCounts = useMemo(() => {
    const total = Math.max(1, candidates.length);
    return PIPELINE_STAGES.map((stage) => {
      const count = candidates.filter((c) => c.stage === stage).length;
      return {
        stage,
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  }, [candidates]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Role Command Banner */}
      <section className="bg-white border border-[#E2E4EC] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <button
            type="button"
            onClick={() => onNavigate('jobs')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Job Descriptions
          </button>
          <h2 className="font-display text-2xl font-bold text-[#111936] tracking-tight text-balance">
            {jobDescription.title} — Role Workspace
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed tabular-nums">
            {jobDescription.department} · {jobDescription.location} ·{' '}
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-xs font-semibold text-[#1E40AF]">
              {jobDescription.jobType || 'Hybrid'}
            </span>{' '}
            · {jobDescription.experienceRange} · Min CGPA {jobDescription.minCgpa.toFixed(1)}
          </p>
        </div>

        {/* Authoritative Primary Metric Strip & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
          <div className="flex items-center gap-5 px-5 py-4 rounded-xl bg-[#FAF9F6] border border-[#E2E4EC]">
            <div className="pr-5 border-r border-[#E2E4EC]">
              <div className="text-[11px] font-semibold text-[#047857]">Qualified (Review+)</div>
              <div className="text-2xl font-extrabold tabular-nums text-[#047857] leading-tight mt-0.5">
                {shortlistedCount + interviewOrOfferCount}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              <div>
                <div className="text-[11px] font-medium text-slate-500">Total Screened</div>
                <div className="text-base font-bold tabular-nums text-[#111936]">
                  {candidates.length}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-medium text-slate-500">Uploaded</div>
                <div className="text-base font-bold tabular-nums text-[#1D4ED8]">
                  {uploadedCount}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-col gap-2">
            <button
              type="button"
              onClick={onRequestEditJob}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111936] bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] hover:bg-[#FAF9F6] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              Update JD
            </button>
            {candidates.length > 0 && (
              <button
                type="button"
                onClick={onRequestClearCandidates}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove All Candidates
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Dedicated Screen Navigation Cards */}
      <section aria-label="Role workflow screens" className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-[#E2E4EC] hover:border-[#1D4ED8] rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-semibold tabular-nums text-[#1E40AF]">
                .pdf / .docx bulk
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-[#111936]">
              Upload Resumes
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Select multiple PDF/DOCX resumes or a whole folder to parse candidate profiles against this locked JD.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('upload')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Upload Resumes
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC] text-[#111936] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs font-semibold tabular-nums text-slate-600">
                {candidates.length} profiles
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-[#111936]">
              Candidate Dashboard
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Filter by CGPA, 10th/12th %, skills, city, and experience, or run Smart Shortlist across applicants.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#111936] hover:bg-[#1A2650] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Candidate Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] rounded-xl p-5 flex flex-col justify-between gap-4 transition-colors">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-[#047857] flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-semibold text-[#047857]">
                Leaderboard
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-[#111936]">
              Candidate Rank List
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Dedicated ranked leaderboard built from parsed resume names with podium cards and CSV export.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('ranklist')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#047857] hover:bg-[#065F46] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Go to Rank List Screen
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Secondary Screen Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('pipeline')}
          className="bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] rounded-xl p-4 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#FEFCE8] border border-[#FDE047] text-[#854D0E] flex items-center justify-center shrink-0">
              <Kanban className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[#111936]">
                Interactive Hiring Pipeline (Kanban)
              </p>
              <p className="text-xs text-slate-500">
                Drag-and-drop stages &amp; bulk email shortlisted candidates with templates
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('compare')}
          className="bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] rounded-xl p-4 flex items-center justify-between gap-4 text-left cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
              <GitCompareArrows className="w-4 h-4" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-[#111936]">
                Side-by-Side Comparison Matrix
              </p>
              <p className="text-xs text-slate-500">
                Compare 2–3 finalists across academics, skills &amp; AI recommendation
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      </div>

      {/* Visual Analytics Graphics */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#1D4ED8]" />
              <h3 className="font-display text-sm font-bold text-[#111936]">
                AI Match Score Distribution
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Filter pool →
            </button>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2 items-end h-44">
            {scoreBuckets.buckets.map((bucket) => {
              const heightPct = Math.max(10, Math.round((bucket.count / scoreBuckets.maxCount) * 100));
              return (
                <button
                  key={bucket.label}
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="group flex flex-col items-center justify-end h-full gap-2 cursor-pointer rounded-lg p-1"
                >
                  <span className="text-xs font-bold tabular-nums text-[#111936]">
                    {bucket.count}
                  </span>
                  <div className="w-full flex-1 flex items-end bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg overflow-hidden p-1">
                    <div
                      className="w-full rounded transition-all duration-200 group-hover:opacity-85"
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: bucket.color,
                      }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-semibold tabular-nums text-[#111936]">
                      {bucket.label}
                    </div>
                    <div className="text-[11px] text-slate-500">{bucket.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#047857]" />
              <h3 className="font-display text-sm font-bold text-[#111936]">
                Pipeline Stage Funnel
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('pipeline')}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              Manage stages →
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {stageCounts.map(({ stage, count, pct }) => (
              <div key={stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#111936]">{stage}</span>
                  <span className="tabular-nums text-slate-600">
                    <strong className="text-[#111936]">{count}</strong> ({pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-[#FAF9F6] border border-[#E2E4EC] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-200 ${STAGE_BAR_COLORS[stage]}`}
                    style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Split: Top 3 Ranked Preview + Live Session Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <section className="lg:col-span-7 bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E4EC] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#EAB308]" />
              <h3 className="font-display text-sm font-bold text-[#111936]">
                Top Ranked Candidates
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ranklist')}
              className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
            >
              View Full Rank List →
            </button>
          </div>
          <div className="divide-y divide-[#E2E4EC]">
            {topThree.length === 0 ? (
              <div className="p-8 text-center space-y-2.5">
                <p className="text-sm font-semibold text-[#111936]">
                  Workspace candidate pool is empty
                </p>
                <p className="text-xs text-slate-500">
                  Upload resumes in bulk to evaluate and rank new applicants for this role.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('upload')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload Resumes
                </button>
              </div>
            ) : (
              topThree.map((cand, idx) => {
                const isFirst = idx === 0;
                return (
                  <div
                    key={cand.id}
                    onClick={() => onOpenCandidate(cand)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onOpenCandidate(cand);
                      }
                    }}
                    className={`px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isFirst
                        ? 'bg-[#FEFCE8]/55 hover:bg-[#FEFCE8]'
                        : 'hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-md tabular-nums text-xs font-bold flex items-center justify-center shrink-0 border ${
                          isFirst
                            ? 'bg-[#FEFCE8] border-[#FDE047] text-[#854D0E]'
                            : 'bg-[#FAF9F6] border-[#E2E4EC] text-slate-700'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#111936] truncate">{cand.fullName}</p>
                        <p className="text-xs text-slate-500 truncate">{cand.currentRole}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StageBadge stage={cand.stage} />
                      <ScoreRing score={cand.matchScore} size={36} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E4EC] flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-display text-sm font-bold text-[#111936]">
              Live Workspace Activity
            </h3>
          </div>
          <div className="divide-y divide-[#E2E4EC] max-h-60 overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="p-6 text-xs text-slate-400 text-center">
                Actions such as resume uploads, stage changes, and shortlists will appear here live.
              </div>
            ) : (
              activityLog.slice(0, 8).map((ev) => (
                <div key={ev.id} className="px-5 py-3 text-xs space-y-0.5">
                  <div className="flex items-center justify-between gap-2 text-slate-400 tabular-nums">
                    <span className="truncate font-medium text-slate-500">{ev.roleTitle}</span>
                    <span className="shrink-0">{ev.timestamp}</span>
                  </div>
                  <p className="text-[#111936] font-medium">{ev.message}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
