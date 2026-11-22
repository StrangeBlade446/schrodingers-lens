import React, { useMemo, useState } from 'react';
import {
  Trophy,
  Download,
  UploadCloud,
  Sparkles,
  GitCompareArrows,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Trash2,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import type { ActiveModule, Candidate, JobDescription, PipelineStage } from '../types/ats';
import { PIPELINE_STAGES } from '../data/initialData';
import { ScoreRing } from './ScoreRing';

interface RankListScreenProps {
  candidates: Candidate[];
  jobDescription: JobDescription;
  onNavigate: (module: ActiveModule) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onSmartShortlist: () => void;
  onCompareTopThree: (ids: string[]) => void;
  onRequestClearCandidates: () => void;
}

const STAGE_SELECT_STYLES: Record<PipelineStage, string> = {
  Applied: 'bg-[#F4F5F8] text-[#334155] border-[#D8DCE8]',
  Shortlisted: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Interview: 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047]',
  Offer: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  Rejected: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
};

export const RankListScreen: React.FC<RankListScreenProps> = ({
  candidates,
  jobDescription,
  onNavigate,
  onOpenCandidate,
  onStageChange,
  onSmartShortlist,
  onCompareTopThree,
  onRequestClearCandidates,
}) => {
  const [scope, setScope] = useState<'all' | 'uploaded'>('all');
  const [cutoffScore, setCutoffScore] = useState<number>(0);

  const uploadedCandidates = useMemo(
    () => candidates.filter((c) => c.source === 'uploaded'),
    [candidates]
  );

  const rankedList = useMemo(() => {
    const base = scope === 'uploaded' ? uploadedCandidates : candidates;
    return [...base]
      .filter((c) => c.matchScore >= cutoffScore)
      .sort((a, b) => b.matchScore - a.matchScore || b.cgpa - a.cgpa);
  }, [candidates, uploadedCandidates, scope, cutoffScore]);

  const topThree = rankedList.slice(0, 3);

  const handleExportCsv = () => {
    const header = [
      'Rank',
      'Candidate Name',
      'Email',
      'Resume Type',
      'AI Match Score',
      'CGPA',
      '10th %',
      '12th %',
      'Experience (Yrs)',
      'City',
      'Stage',
      'Rejection Reason',
      'Resume File',
    ];
    const rows = rankedList.map((c, idx) => [
      idx + 1,
      `"${c.fullName.replace(/"/g, '""')}"`,
      c.email,
      c.isAiGenerated ? 'AI-Generated' : (c.resumeType ?? 'ATS-Friendly'),
      c.matchScore,
      c.cgpa.toFixed(2),
      c.tenthPercent.toFixed(1),
      c.twelfthPercent.toFixed(1),
      c.yearsOfExperience.toFixed(1),
      `"${c.city}"`,
      c.stage,
      `"${(c.rejectionReason ?? '').replace(/"/g, '""')}"`,
      `"${c.resumeFileName.replace(/"/g, '""')}"`,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${jobDescription.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-rank-list.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onNavigate('overview')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Role Overview
          </button>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#EAB308]" />
            <h2 className="font-display text-lg font-bold text-[#111936]">
              Candidate Rank List — {jobDescription.title}
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Ranked leaderboard generated from candidate names extracted from uploaded resumes and evaluated against this JD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {topThree.length >= 2 && (
            <button
              type="button"
              onClick={() => onCompareTopThree(topThree.map((c) => c.id))}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              Compare Top {topThree.length}
            </button>
          )}
          <button
            type="button"
            onClick={onSmartShortlist}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Shortlist (≥ 80)
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={rankedList.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#111936] bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] hover:bg-[#FAF9F6] disabled:opacity-50 rounded-lg cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          {candidates.length > 0 && (
            <button
              type="button"
              onClick={onRequestClearCandidates}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] rounded-lg cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove All
            </button>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg self-start">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              scope === 'all' ? 'bg-[#111936] text-white' : 'text-slate-600 hover:text-[#111936]'
            }`}
          >
            All Ranked Candidates ({candidates.length})
          </button>
          <button
            type="button"
            onClick={() => setScope('uploaded')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              scope === 'uploaded' ? 'bg-[#111936] text-white' : 'text-slate-600 hover:text-[#111936]'
            }`}
          >
            Uploaded Resumes Only ({uploadedCandidates.length})
          </button>
        </div>

        <div className="flex items-center gap-3 min-w-[240px]">
          <label htmlFor="rank-cutoff" className="text-xs font-semibold text-[#111936] whitespace-nowrap">
            Min Score Cutoff:
          </label>
          <input
            id="rank-cutoff"
            type="range"
            min={0}
            max={95}
            step={5}
            value={cutoffScore}
            onChange={(e) => setCutoffScore(Number(e.target.value))}
            className="flex-1 accent-[#1D4ED8] cursor-pointer"
          />
          <span className="text-xs tabular-nums font-bold text-[#1D4ED8] w-10 text-right">
            {cutoffScore}%
          </span>
        </div>
      </div>

      {/* Top 3 Podium Cards — Rank #1 holds authoritative visual anchor */}
      {topThree.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topThree.map((cand, idx) => {
            const medalStyles =
              idx === 0
                ? 'border-[#FDE047] border-t-[3px] border-t-[#EAB308] bg-[#FEFCE8]/40'
                : idx === 1
                  ? 'border-[#E2E4EC] border-t-[3px] border-t-[#111936]'
                  : 'border-[#E2E4EC] border-t-[3px] border-t-[#B45309]';
            const badgeStyle =
              idx === 0
                ? 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047]'
                : idx === 1
                  ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                  : 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]';

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
                className={`rounded-xl border p-5 space-y-3 cursor-pointer hover:border-[#94A0B8] transition-colors bg-white ${medalStyles}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-bold tabular-nums ${badgeStyle}`}
                      >
                        RANK #{idx + 1}
                      </span>
                      {cand.isAiGenerated ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]">
                          <Bot className="w-2.5 h-2.5" />
                          AI Auto-Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          ATS-Friendly
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-base font-bold text-[#111936] mt-1.5">
                      {cand.fullName}
                    </h3>
                    <p className="text-xs text-slate-600 truncate">{cand.currentRole}</p>
                  </div>
                  <ScoreRing score={cand.matchScore} size={46} />
                </div>

                <div className="text-xs text-slate-600 flex items-center justify-between tabular-nums pt-2 border-t border-[#E2E4EC]">
                  <span>CGPA {cand.cgpa.toFixed(2)}</span>
                  <span>{cand.yearsOfExperience.toFixed(1)} yrs</span>
                  <span>{cand.city}</span>
                </div>

                <p className="text-xs text-slate-500 truncate">
                  Resume: {cand.resumeFileName}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Ranked List */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
        {rankedList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="font-display text-sm font-semibold text-[#111936]">
              {candidates.length === 0
                ? 'No candidates in this workspace yet'
                : scope === 'uploaded' && uploadedCandidates.length === 0
                  ? 'No bulk resumes uploaded for this role yet'
                  : 'No candidates meet the selected score cutoff'}
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {candidates.length === 0 || (scope === 'uploaded' && uploadedCandidates.length === 0)
                ? 'Upload multiple PDF or DOCX resumes in Upload Resumes to generate a rank list from extracted candidate names.'
                : 'Lower the score cutoff slider or switch to All Ranked Candidates.'}
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              {cutoffScore > 0 && (
                <button
                  type="button"
                  onClick={() => setCutoffScore(0)}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:bg-[#FAF9F6] text-[#111936] cursor-pointer"
                >
                  Reset Cutoff
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('upload')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Upload Resumes
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E4EC]">
            {rankedList.map((cand, index) => (
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
                className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center text-xs font-bold tabular-nums shrink-0 ${
                      index === 0
                        ? 'bg-[#FEFCE8] border-[#FDE047] text-[#854D0E]'
                        : 'bg-[#FAF9F6] border-[#E2E4EC] text-[#111936]'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-[#111936]">{cand.fullName}</span>
                      {cand.isAiGenerated ? (
                        <span
                          title={cand.rejectionReason}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold rounded bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]"
                        >
                          <Bot className="w-3 h-3 text-[#BE123C]" />
                          AI Resume (Auto-Rejected)
                        </span>
                      ) : (
                        <span
                          title={`ATS Friendliness: ${cand.atsFriendlinessScore ?? 95}%`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#047857]" />
                          ATS-Friendly
                        </span>
                      )}
                      {cand.source === 'uploaded' && (
                        <span className="px-1.5 py-0.5 text-[11px] font-semibold rounded bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]">
                          Uploaded
                        </span>
                      )}
                      {cand.isDuplicate && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D]">
                          <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                          Duplicate
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 mt-0.5">
                      <span className="inline-flex items-center gap-1 truncate max-w-[240px]">
                        <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                        {cand.resumeFileName}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{cand.college}</span>
                      <span aria-hidden="true">·</span>
                      <span>{cand.city}</span>
                    </div>
                  </div>
                </div>

                <div
                  className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-11 sm:pl-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-right hidden md:block">
                    <div className="text-xs tabular-nums text-[#111936] font-semibold">
                      CGPA {cand.cgpa.toFixed(2)} · {cand.yearsOfExperience.toFixed(1)}y
                    </div>
                    <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                      {cand.matchedSkills.slice(0, 3).join(', ') || 'Evaluated'}
                    </div>
                  </div>

                  <select
                    value={cand.stage}
                    onChange={(e) => onStageChange(cand.id, e.target.value as PipelineStage)}
                    aria-label={`Change stage for ${cand.fullName}`}
                    className={`px-2 py-1 text-xs font-semibold rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] ${STAGE_SELECT_STYLES[cand.stage]}`}
                  >
                    {PIPELINE_STAGES.map((st) => (
                      <option key={st} value={st} className="bg-white text-[#111936]">
                        {st}
                      </option>
                    ))}
                  </select>

                  <ScoreRing score={cand.matchScore} size={38} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
