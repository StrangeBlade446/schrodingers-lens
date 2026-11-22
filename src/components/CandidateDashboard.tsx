import React, { useMemo, useState } from 'react';
import {
  Search,
  RotateCcw,
  Sparkles,
  GitCompareArrows,
  ArrowUpDown,
  AlertTriangle,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Trash2,
  UploadCloud,
  ArrowUpRight,
  ArrowRightLeft,
  Compass,
  X,
  Bot,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import type {
  AlternativeRoleFit,
  Candidate,
  FilterState,
  JobDescription,
  PipelineStage,
} from '../types/ats';
import { PIPELINE_STAGES } from '../data/initialData';
import { evaluateBestAlternativeRole } from '../services/aiScreening';
import { ScoreRing } from './ScoreRing';

type SortKey = 'matchScore' | 'fullName' | 'cgpa' | 'tenthPercent' | 'yearsOfExperience' | 'graduationYear';

interface CandidateDashboardProps {
  candidates: Candidate[];
  activeJobDescription: JobDescription;
  allJobDescriptions: JobDescription[];
  filters: FilterState;
  onChangeFilters: (next: FilterState) => void;
  onResetFilters: () => void;
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
  onGoToCompare: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onSmartShortlist: () => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onRequestClearCandidates: () => void;
  onGoToUpload: () => void;
  onTransferToAlternativeRole: (candidate: Candidate, target: AlternativeRoleFit) => void;
}

const STAGE_SELECT_STYLES: Record<PipelineStage, string> = {
  Applied: 'bg-[#F4F5F8] text-[#334155] border-[#D8DCE8]',
  Shortlisted: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Interview: 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047]',
  Offer: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  Rejected: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
};

export const CandidateDashboard: React.FC<CandidateDashboardProps> = ({
  candidates,
  activeJobDescription,
  allJobDescriptions,
  filters,
  onChangeFilters,
  onResetFilters,
  selectedCompareIds,
  onToggleCompare,
  onGoToCompare,
  onStageChange,
  onSmartShortlist,
  onOpenCandidate,
  onRequestClearCandidates,
  onGoToUpload,
  onTransferToAlternativeRole,
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('matchScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(candidates.map((c) => c.city))).sort();
  }, [candidates]);

  const uniqueGradYears = useMemo(() => {
    return Array.from(new Set(candidates.map((c) => c.graduationYear))).sort((a, b) => b - a);
  }, [candidates]);

  const popularSkills = useMemo(() => {
    const counts = new Map<string, number>();
    candidates.forEach((c) => {
      c.skills.forEach((skill) => {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 14)
      .map(([skill]) => skill);
  }, [candidates]);

  const alternativeFitMap = useMemo(() => {
    const map = new Map<string, AlternativeRoleFit | null>();
    candidates.forEach((c) => {
      map.set(c.id, evaluateBestAlternativeRole(c, activeJobDescription, allJobDescriptions));
    });
    return map;
  }, [candidates, activeJobDescription, allJobDescriptions]);

  const crossRoleCount = useMemo(() => {
    let count = 0;
    alternativeFitMap.forEach((fit) => {
      if (fit) count += 1;
    });
    return count;
  }, [alternativeFitMap]);

  const filteredCandidates = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const minTenth = filters.minTenth !== '' ? Number(filters.minTenth) : null;
    const minTwelfth = filters.minTwelfth !== '' ? Number(filters.minTwelfth) : null;
    const minExp = filters.minExp !== '' ? Number(filters.minExp) : null;
    const maxExp = filters.maxExp !== '' ? Number(filters.maxExp) : null;

    return candidates
      .filter((c) => {
        const altFit = alternativeFitMap.get(c.id) ?? null;
        if (filters.onlyCrossRoleFit && !altFit) return false;
        if (filters.stage !== 'All' && c.stage !== filters.stage) return false;
        if (filters.resumeAuthenticityFilter && filters.resumeAuthenticityFilter !== 'All') {
          if (filters.resumeAuthenticityFilter === 'AI-Generated' && !c.isAiGenerated) return false;
          if (filters.resumeAuthenticityFilter === 'ATS-Friendly' && c.isAiGenerated) return false;
        }
        if (c.cgpa < filters.minCgpa) return false;
        if (minTenth !== null && Number.isFinite(minTenth) && c.tenthPercent < minTenth) return false;
        if (minTwelfth !== null && Number.isFinite(minTwelfth) && c.twelfthPercent < minTwelfth) return false;
        if (minExp !== null && Number.isFinite(minExp) && c.yearsOfExperience < minExp) return false;
        if (maxExp !== null && Number.isFinite(maxExp) && c.yearsOfExperience > maxExp) return false;
        if (filters.city !== 'All' && c.city !== filters.city) return false;
        if (filters.graduationYear !== 'All' && String(c.graduationYear) !== filters.graduationYear) return false;

        if (filters.selectedSkills.length > 0) {
          const lowerSkills = new Set(c.skills.map((s) => s.toLowerCase()));
          const hasAll = filters.selectedSkills.every((req) => lowerSkills.has(req.toLowerCase()));
          if (!hasAll) return false;
        }

        if (q) {
          const tokens = q.split(/\s+/).filter(Boolean);
          const haystack = [
            c.fullName,
            c.email,
            c.phone,
            c.city,
            c.college,
            c.currentRole,
            c.stage,
            c.resumeFileName,
            c.aiSummary,
            String(c.graduationYear),
            c.cgpa.toFixed(2),
            `${c.yearsOfExperience.toFixed(1)}y`,
            altFit?.roleTitle ?? '',
            ...c.skills,
            ...c.matchedSkills,
            ...c.missingSkills,
          ]
            .join(' ')
            .toLowerCase();
          if (!tokens.every((token) => haystack.includes(token))) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortKey === 'fullName') {
          return a.fullName.localeCompare(b.fullName) * dir;
        }
        return (a[sortKey] - b[sortKey]) * dir;
      });
  }, [candidates, alternativeFitMap, filters, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'fullName' ? 'asc' : 'desc');
    }
  };

  const toggleSkillTag = (skill: string) => {
    const exists = filters.selectedSkills.includes(skill);
    onChangeFilters({
      ...filters,
      selectedSkills: exists
        ? filters.selectedSkills.filter((s) => s !== skill)
        : [...filters.selectedSkills, skill],
    });
  };

  const qualifyingSmartCount = candidates.filter(
    (c) => c.stage === 'Applied' && c.matchScore >= 80
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Top Action Bar */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && filters.search) {
                  onChangeFilters({ ...filters, search: '' });
                }
              }}
              aria-label="Search candidates by any field"
              placeholder="Search anything: candidate name, email, phone, skills, college, city, stage, resume..."
              className="w-full pl-9 pr-9 py-2 text-sm bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg text-[#111936] placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onChangeFilters({ ...filters, search: '' })}
                aria-label="Clear search"
                className="p-1 rounded-md text-slate-400 hover:text-[#111936] hover:bg-[#E2E4EC]/60 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFiltersExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#111936] bg-white border border-[#E2E4EC] rounded-lg hover:border-[#B8BDCE] hover:bg-[#FAF9F6] whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            Filters
            {filtersExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <span className="hidden sm:inline text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-[#111936] bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] hover:bg-[#FAF9F6] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filters
          </button>

          {selectedCompareIds.length >= 2 && (
            <button
              type="button"
              onClick={onGoToCompare}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              Compare Selected ({selectedCompareIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={onRequestClearCandidates}
            disabled={candidates.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] hover:bg-[#FFE4E6] disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove All
          </button>

          <button
            type="button"
            onClick={onSmartShortlist}
            disabled={candidates.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] focus-visible:ring-offset-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Shortlist (Score ≥ 80)
            {qualifyingSmartCount > 0 && (
              <span className="ml-0.5 px-1.5 py-0.2 rounded bg-white/20 tabular-nums text-[11px]">
                {qualifyingSmartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Multi-Axis Filter Panel */}
      {filtersExpanded && (
        <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 space-y-4">
          {/* Stage Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E4EC]">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg">
              {(['All', ...PIPELINE_STAGES] as const).map((stage) => {
                const active = filters.stage === stage;
                const count =
                  stage === 'All'
                    ? candidates.length
                    : candidates.filter((c) => c.stage === stage).length;
                return (
                  <button
                    key={stage}
                    type="button"
                    onClick={() => onChangeFilters({ ...filters, stage })}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#111936] text-white'
                        : 'text-slate-600 hover:text-[#111936]'
                    }`}
                  >
                    {stage}{' '}
                    <span className={`tabular-nums ml-1 ${active ? 'text-[#EAB308]' : 'text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeFilters({ ...filters, onlyCrossRoleFit: !filters.onlyCrossRoleFit })
                }
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
                  filters.onlyCrossRoleFit
                    ? 'bg-[#111936] border-[#111936] text-white'
                    : 'bg-[#FEFCE8] border-[#FDE047] text-[#854D0E] hover:bg-[#FEF9C3]'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Stronger in Other Field
                <span
                  className={`tabular-nums px-1.5 py-0.2 rounded text-[11px] ${
                    filters.onlyCrossRoleFit
                      ? 'bg-[#EAB308] text-[#111936] font-bold'
                      : 'bg-[#FDE047]/60 text-[#854D0E]'
                  }`}
                >
                  {crossRoleCount}
                </span>
              </button>

              <span className="sm:hidden text-xs font-medium text-slate-500 tabular-nums">
                Showing {filteredCandidates.length} of {candidates.length} candidates
              </span>
            </div>
          </div>

          {/* Numeric & Dropdown Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {/* Min CGPA Slider */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#111936] mb-1.5">
                <label htmlFor="filter-cgpa">Minimum CGPA</label>
                <span className="tabular-nums text-[#1D4ED8] font-bold">
                  {filters.minCgpa.toFixed(1)} / 10.0
                </span>
              </div>
              <input
                id="filter-cgpa"
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={filters.minCgpa}
                onChange={(e) => onChangeFilters({ ...filters, minCgpa: Number(e.target.value) })}
                className="w-full accent-[#1D4ED8] cursor-pointer"
              />
            </div>

            {/* Min 10th % & 12th % */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter-10th" className="block text-xs font-semibold text-[#111936] mb-1">
                  Min 10th %
                </label>
                <input
                  id="filter-10th"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 85"
                  value={filters.minTenth}
                  onChange={(e) => onChangeFilters({ ...filters, minTenth: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm tabular-nums bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
              <div>
                <label htmlFor="filter-12th" className="block text-xs font-semibold text-[#111936] mb-1">
                  Min 12th %
                </label>
                <input
                  id="filter-12th"
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 85"
                  value={filters.minTwelfth}
                  onChange={(e) => onChangeFilters({ ...filters, minTwelfth: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm tabular-nums bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
            </div>

            {/* Years of Experience Range */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="filter-min-exp" className="block text-xs font-semibold text-[#111936] mb-1">
                  Min Exp (yrs)
                </label>
                <input
                  id="filter-min-exp"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="0"
                  value={filters.minExp}
                  onChange={(e) => onChangeFilters({ ...filters, minExp: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm tabular-nums bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
              <div>
                <label htmlFor="filter-max-exp" className="block text-xs font-semibold text-[#111936] mb-1">
                  Max Exp (yrs)
                </label>
                <input
                  id="filter-max-exp"
                  type="number"
                  min={0}
                  step={0.5}
                  placeholder="10"
                  value={filters.maxExp}
                  onChange={(e) => onChangeFilters({ ...filters, maxExp: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm tabular-nums bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>
            </div>

            {/* City Dropdown */}
            <div>
              <label htmlFor="filter-city" className="block text-xs font-semibold text-[#111936] mb-1">
                City
              </label>
              <select
                id="filter-city"
                value={filters.city}
                onChange={(e) => onChangeFilters({ ...filters, city: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="All">All Cities</option>
                {uniqueCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Graduation Year Dropdown */}
            <div>
              <label htmlFor="filter-grad" className="block text-xs font-semibold text-[#111936] mb-1">
                Graduation Year
              </label>
              <select
                id="filter-grad"
                value={filters.graduationYear}
                onChange={(e) => onChangeFilters({ ...filters, graduationYear: e.target.value })}
                className="w-full px-2.5 py-1.5 text-sm tabular-nums bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="All">All Years</option>
                {uniqueGradYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Authenticity & ATS Dropdown */}
            <div>
              <label htmlFor="filter-authenticity" className="block text-xs font-semibold text-[#111936] mb-1">
                Authenticity & ATS
              </label>
              <select
                id="filter-authenticity"
                value={filters.resumeAuthenticityFilter ?? 'All'}
                onChange={(e) =>
                  onChangeFilters({
                    ...filters,
                    resumeAuthenticityFilter: e.target.value as 'All' | 'ATS-Friendly' | 'AI-Generated',
                  })
                }
                className="w-full px-2.5 py-1.5 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              >
                <option value="All">All Formats</option>
                <option value="ATS-Friendly">ATS-Friendly Only</option>
                <option value="AI-Generated">Auto-Rejected AI</option>
              </select>
            </div>
          </div>

          {/* Multi-select Skill Filter Buttons */}
          <div className="pt-2 border-t border-[#E2E4EC]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#111936]">
                Filter by Skills (multi-select)
              </span>
              {filters.selectedSkills.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChangeFilters({ ...filters, selectedSkills: [] })}
                  className="text-xs font-semibold text-[#1D4ED8] hover:underline cursor-pointer"
                >
                  Clear skills ({filters.selectedSkills.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {popularSkills.map((skill) => {
                const active = filters.selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkillTag(skill)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#1D4ED8] border-[#1D4ED8] text-white'
                        : 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF] hover:border-[#1D4ED8]'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Cross-Role Talent Callout Banner (Warm Royal Gold Highlight) */}
      {crossRoleCount > 0 && (
        <div className="bg-[#FEFCE8] border border-[#FDE047] rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-xs text-[#854D0E]">
            <Compass className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong className="font-bold">Cross-Role Talent Detected:</strong>{' '}
              <span className="tabular-nums font-bold">{crossRoleCount}</span>{' '}
              candidate{crossRoleCount === 1 ? '' : 's'} who applied under{' '}
              <strong className="font-semibold">{activeJobDescription.title}</strong> score
              significantly higher in another field. Highlighted rows can be routed directly to that role.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeFilters({ ...filters, onlyCrossRoleFit: !filters.onlyCrossRoleFit })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-[#FDE047] text-[#854D0E] hover:bg-[#FEF9C3] whitespace-nowrap shrink-0 cursor-pointer"
          >
            {filters.onlyCrossRoleFit ? 'Show All Candidates' : `Highlight Only (${crossRoleCount})`}
          </button>
        </div>
      )}

      {/* Ranked Candidate Data Table */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
        {candidates.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="font-display text-base font-bold text-[#111936]">
              No candidates in this workspace yet
            </p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              This role workspace is ready for a new hiring cycle. Upload resumes in bulk to screen and rank candidates against the Job Description.
            </p>
            <button
              type="button"
              onClick={onGoToUpload}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload Resumes
            </button>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="p-12 text-center">
            <p className="font-display text-base font-bold text-[#111936]">
              No candidates match the active filters
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Try relaxing the CGPA threshold, experience bounds, or skill tags.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E4EC] bg-[#FAF9F6] text-xs font-bold text-slate-600">
                  <th className="py-3 pl-4 pr-2 w-10">
                    <span className="sr-only">Compare</span>
                  </th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('fullName')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      Candidate
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleSort('matchScore')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      AI Match
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('cgpa')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      CGPA
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right hidden md:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort('tenthPercent')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      10th / 12th
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('yearsOfExperience')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      Exp
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 px-3 hidden lg:table-cell">Key Skills</th>
                  <th className="py-3 px-3 text-right hidden xl:table-cell">
                    <button
                      type="button"
                      onClick={() => toggleSort('graduationYear')}
                      className="inline-flex items-center gap-1 hover:text-[#111936] cursor-pointer"
                    >
                      Grad
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </button>
                  </th>
                  <th className="py-3 pl-3 pr-4">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4EC] text-sm">
                {filteredCandidates.map((candidate) => {
                  const isChecked = selectedCompareIds.includes(candidate.id);
                  const altFit = alternativeFitMap.get(candidate.id) ?? null;
                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => onOpenCandidate(candidate)}
                      className={`transition-colors cursor-pointer group ${
                        altFit
                          ? 'bg-[#FEFCE8]/65 hover:bg-[#FEFCE8]'
                          : 'hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <td
                        className="py-3 pl-4 pr-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onToggleCompare(candidate.id)}
                          aria-label={`Select ${candidate.fullName} for comparison`}
                          className="w-4 h-4 rounded border-[#C2C7D6] text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#111936] group-hover:text-[#1D4ED8] transition-colors">
                            {candidate.fullName}
                          </span>
                          {candidate.isAiGenerated ? (
                            <span
                              title={candidate.rejectionReason || 'Auto-rejected: AI-Generated Resume detected'}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold rounded bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3] whitespace-nowrap"
                            >
                              <Bot className="w-3 h-3 text-[#BE123C]" />
                              AI Resume (Auto-Rejected)
                            </span>
                          ) : (
                            <span
                              title={`ATS-Friendly Resume Verified (Compatibility: ${candidate.atsFriendlinessScore ?? 95}%)`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0] whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3 h-3 text-[#047857]" />
                              ATS-Friendly
                            </span>
                          )}
                          {candidate.isDuplicate && (
                            <span
                              title={candidate.duplicateReason || 'Potential duplicate profile'}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-semibold rounded bg-[#FEF3C7] text-[#B45309] border border-[#FCD34D] whitespace-nowrap"
                            >
                              <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                              Duplicate
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 truncate max-w-[280px]">
                          {candidate.currentRole} · {candidate.city}
                        </div>
                        {altFit && (
                          <div
                            className="mt-1.5 flex items-center gap-1.5 flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span
                              title={altFit.reason}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-[#FEFCE8] text-[#854D0E] border border-[#FDE047] whitespace-nowrap tabular-nums"
                            >
                              <ArrowUpRight className="w-3 h-3 text-[#854D0E]" />
                              Better fit: {altFit.roleTitle} ({altFit.score}%)
                            </span>
                            <button
                              type="button"
                              onClick={() => onTransferToAlternativeRole(candidate, altFit)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-[#111936] text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <ArrowRightLeft className="w-2.5 h-2.5" />
                              Route to Role
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <ScoreRing score={candidate.matchScore} size={36} />
                          <span
                            className={`text-xs font-semibold hidden sm:inline whitespace-nowrap ${
                              candidate.matchScore >= 80
                                ? 'text-[#047857]'
                                : candidate.matchScore >= 65
                                  ? 'text-[#1D4ED8]'
                                  : 'text-[#B45309]'
                            }`}
                          >
                            {candidate.matchScore >= 80
                              ? 'Strong fit'
                              : candidate.matchScore >= 65
                                ? 'Good fit'
                                : 'Partial'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums font-semibold text-[#111936]">
                        {candidate.cgpa.toFixed(2)}
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums text-xs text-slate-600 hidden md:table-cell whitespace-nowrap">
                        {candidate.tenthPercent.toFixed(1)}% / {candidate.twelfthPercent.toFixed(1)}%
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums font-medium text-[#111936] whitespace-nowrap">
                        {candidate.yearsOfExperience.toFixed(1)}y
                      </td>

                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="text-xs text-slate-600 truncate max-w-[220px]">
                          {candidate.skills.slice(0, 4).join(' · ')}
                          {candidate.skills.length > 4 && ` +${candidate.skills.length - 4}`}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right tabular-nums text-slate-600 hidden xl:table-cell">
                        {candidate.graduationYear}
                      </td>

                      <td
                        className="py-3 pl-3 pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={candidate.stage}
                          onChange={(e) => onStageChange(candidate.id, e.target.value as PipelineStage)}
                          aria-label={`Change stage for ${candidate.fullName}`}
                          className={`px-2 py-1 text-xs font-semibold rounded-md border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] ${STAGE_SELECT_STYLES[candidate.stage]}`}
                        >
                          {PIPELINE_STAGES.map((st) => (
                            <option key={st} value={st} className="bg-white text-[#111936]">
                              {st}
                            </option>
                          ))}
                        </select>
                        {candidate.isAiGenerated && (
                          <span
                            title={candidate.rejectionReason}
                            className="block text-[10px] text-[#BE123C] font-semibold mt-0.5 whitespace-nowrap"
                          >
                            Auto-Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
