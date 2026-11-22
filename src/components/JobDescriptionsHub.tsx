import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Briefcase,
  MapPin,
  Users,
  ArrowRight,
  UploadCloud,
  Trophy,
  Sparkles,
  Check,
  Copy,
  Trash2,
  Pencil,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  Laptop,
} from 'lucide-react';
import type { ActiveModule, Candidate, JobDescription, JobTemplate, JobType } from '../types/ats';
import { JOB_TEMPLATES, JOB_TYPE_OPTIONS } from '../data/initialData';

interface JobDescriptionsHubProps {
  jobDescriptions: JobDescription[];
  activeJobId: string;
  candidatesByJob: Record<string, Candidate[]>;
  onSelectJobAndNavigate: (jobId: string, targetModule: ActiveModule) => void;
  onCreateJobFromTemplate: (template: JobTemplate) => void;
  onRequestCreateJob: () => void;
  onRequestEditJob: (job: JobDescription) => void;
  onToggleJobStatus: (jobId: string) => void;
  onRequestClearCandidates: (jobId: string) => void;
}

function getJobTypeBadgeClass(jobType: JobType | string): string {
  switch (jobType) {
    case 'Work from Home':
    case 'Remote':
    case 'Online':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    case 'Office':
    case 'On-Site':
      return 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047]';
    case 'Hybrid':
    default:
      return 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]';
  }
}

export const JobDescriptionsHub: React.FC<JobDescriptionsHubProps> = ({
  jobDescriptions,
  activeJobId,
  candidatesByJob,
  onSelectJobAndNavigate,
  onCreateJobFromTemplate,
  onRequestCreateJob,
  onRequestEditJob,
  onToggleJobStatus,
  onRequestClearCandidates,
}) => {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(jobDescriptions.map((j) => j.department))).sort()],
    [jobDescriptions]
  );

  const availableJobTypes = useMemo(() => {
    const present = new Set(jobDescriptions.map((j) => j.jobType || 'Hybrid'));
    JOB_TYPE_OPTIONS.forEach((opt) => present.add(opt));
    return ['All', ...Array.from(present)];
  }, [jobDescriptions]);

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobDescriptions.filter((jd) => {
      if (deptFilter !== 'All' && jd.department !== deptFilter) return false;
      const jdType = jd.jobType || 'Hybrid';
      if (jobTypeFilter !== 'All' && jdType !== jobTypeFilter) return false;
      if (!q) return true;
      return (
        jd.title.toLowerCase().includes(q) ||
        jd.department.toLowerCase().includes(q) ||
        jd.location.toLowerCase().includes(q) ||
        jdType.toLowerCase().includes(q) ||
        jd.requiredSkills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [jobDescriptions, search, deptFilter, jobTypeFilter]);

  const portfolioStats = useMemo(() => {
    let totalCandidates = 0;
    let totalShortlisted = 0;
    let scoreSum = 0;
    jobDescriptions.forEach((jd) => {
      const list = candidatesByJob[jd.id] ?? [];
      totalCandidates += list.length;
      totalShortlisted += list.filter(
        (c) => c.stage === 'Shortlisted' || c.stage === 'Interview' || c.stage === 'Offer'
      ).length;
      scoreSum += list.reduce((acc, c) => acc + c.matchScore, 0);
    });
    const avgScore = totalCandidates > 0 ? Math.round(scoreSum / totalCandidates) : 0;
    return { totalCandidates, totalShortlisted, avgScore };
  }, [jobDescriptions, candidatesByJob]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Main Hero Command Header */}
      <section className="bg-white border border-[#E2E4EC] rounded-xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <p className="text-xs font-semibold text-[#1D4ED8] tracking-wide">
            Schrodinger&apos;s Lens · Multi-Requisition Workspace
          </p>
          <h2 className="font-display text-2xl font-bold text-[#111936] tracking-tight text-balance">
            All Job Descriptions &amp; Role Workspaces
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Select any open Job Description below to enter its dedicated workspace—upload resumes, inspect the Candidate Dashboard, view the Candidate Rank List, or manage its Kanban pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 shrink-0">
          <div className="grid grid-cols-3 gap-5 px-5 py-3.5 rounded-xl bg-[#FAF9F6] border border-[#E2E4EC]">
            <div>
              <div className="text-[11px] font-medium text-slate-500">Open Roles</div>
              <div className="text-lg font-bold tabular-nums text-[#111936]">
                {jobDescriptions.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Applicants</div>
              <div className="text-lg font-bold tabular-nums text-[#1D4ED8]">
                {portfolioStats.totalCandidates}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-500">Avg Fit</div>
              <div className="text-lg font-bold tabular-nums text-[#047857]">
                {portfolioStats.avgScore}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onRequestCreateJob}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Job Description
          </button>
        </div>
      </section>

      {/* Quick Start JD Templates Shelf */}
      <section className="bg-white border border-[#E2E4EC] rounded-xl p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#EAB308]" />
            <h3 className="font-display text-sm font-bold text-[#111936]">
              One-Click Job Description Templates
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Click any template to create a live role workspace immediately
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {JOB_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onCreateJobFromTemplate(tpl)}
              className="group text-left p-3.5 rounded-lg border border-[#E2E4EC] bg-[#FAF9F6] hover:bg-white hover:border-[#1D4ED8] transition-colors cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded bg-[#FEFCE8] border border-[#FDE047] text-[11px] font-semibold text-[#854D0E]">
                  {tpl.category}
                </span>
                <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1D4ED8] transition-colors" />
              </div>
              <p className="text-xs font-bold text-[#111936] truncate">{tpl.label}</p>
              <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                <span className="truncate">{tpl.requiredSkills.slice(0, 2).join(' · ')}</span>
                <span className="shrink-0 font-semibold text-[#1E40AF]">{tpl.jobType}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Search, Job Type, Department & View Mode Bar */}
      <div className="flex flex-col gap-3 bg-white border border-[#E2E4EC] rounded-xl p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role, skill, Google location, or job type..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg text-[#111936] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
              />
            </div>

            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              aria-label="Filter by job type"
              className="px-3 py-2 text-xs font-semibold bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg text-[#111936] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
            >
              {availableJobTypes.map((jt) => (
                <option key={jt} value={jt}>
                  {jt === 'All' ? 'All Job Types' : jt}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="inline-flex items-center rounded-lg border border-[#E2E4EC] bg-[#FAF9F6] p-0.5 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-[#111936] text-white'
                  : 'text-slate-600 hover:text-[#111936]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#111936] text-white'
                  : 'text-slate-600 hover:text-[#111936]'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              Table
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {departments.map((dept) => {
            const active = deptFilter === dept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setDeptFilter(dept)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#111936] border-[#111936] text-white'
                    : 'bg-white border-[#E2E4EC] text-slate-600 hover:border-[#B8BDCE] hover:text-[#111936]'
                }`}
              >
                {dept}
              </button>
            );
          })}
        </div>
      </div>

      {/* Job Descriptions Grid / Table */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white border border-[#E2E4EC] rounded-xl p-10 text-center space-y-2">
          <p className="font-display text-sm font-semibold text-[#111936]">
            No job descriptions match your search
          </p>
          <p className="text-xs text-slate-500">
            Clear your search or filters, or create a new role from a template above.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E2E4EC] text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-3 px-4">Role &amp; Department</th>
                  <th className="py-3 px-4">Location (Google Verified)</th>
                  <th className="py-3 px-4">Job Type</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Min CGPA</th>
                  <th className="py-3 px-4">Applicants</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E4EC] text-xs">
                {filteredJobs.map((jd) => {
                  const pool = candidatesByJob[jd.id] ?? [];
                  const isSelected = jd.id === activeJobId;
                  const jdType = jd.jobType || 'Hybrid';
                  return (
                    <tr
                      key={jd.id}
                      className={isSelected ? 'bg-[#FAF9F6]' : 'hover:bg-[#FAF9F6] transition-colors'}
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#111936] text-sm flex items-center gap-1.5">
                          <span>{jd.title}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-[#FEFCE8] text-[#854D0E] border border-[#FDE047]">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{jd.department}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[#111936] font-medium">
                          {jd.locationPlaceId ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                          ) : (
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          )}
                          {jd.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${getJobTypeBadgeClass(
                            jdType
                          )}`}
                        >
                          <Laptop className="w-3 h-3" />
                          {jdType}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums text-slate-700 whitespace-nowrap">
                        {jd.experienceRange}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-semibold text-[#111936]">
                        {jd.minCgpa.toFixed(1)}
                      </td>
                      <td className="py-3.5 px-4 tabular-nums font-bold text-[#1D4ED8]">
                        {pool.length}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => onToggleJobStatus(jd.id)}
                          className={`px-2 py-0.5 text-[11px] font-semibold rounded border cursor-pointer ${
                            jd.status === 'Active'
                              ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                              : 'bg-[#FAF9F6] text-slate-600 border-[#E2E4EC]'
                          }`}
                        >
                          {jd.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onRequestEditJob(jd)}
                            className="px-2.5 py-1 rounded border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] text-[#111936] font-medium cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onSelectJobAndNavigate(jd.id, 'overview')}
                            className="px-2.5 py-1 rounded bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredJobs.map((jd) => {
            const pool = candidatesByJob[jd.id] ?? [];
            const isSelected = jd.id === activeJobId;
            const shortlistedCount = pool.filter(
              (c) => c.stage === 'Shortlisted' || c.stage === 'Interview' || c.stage === 'Offer'
            ).length;
            const avgMatch =
              pool.length > 0
                ? Math.round(pool.reduce((s, c) => s + c.matchScore, 0) / pool.length)
                : 0;
            const topCandidate = [...pool].sort((a, b) => b.matchScore - a.matchScore)[0];
            const jdType = jd.jobType || 'Hybrid';

            return (
              <article
                key={jd.id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                  isSelected
                    ? 'border-[#1D4ED8] border-t-2 border-t-[#111936]'
                    : 'border-[#E2E4EC] hover:border-[#B8BDCE]'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-500">{jd.department}</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-[#FEFCE8] text-[#854D0E] border border-[#FDE047]">
                            <Check className="w-3 h-3 text-[#854D0E]" />
                            Active Workspace
                          </span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-bold text-[#111936] mt-0.5">
                        {jd.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleJobStatus(jd.id)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border cursor-pointer shrink-0 transition-colors ${
                        jd.status === 'Active'
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                          : 'bg-[#FAF9F6] text-slate-600 border-[#E2E4EC] hover:border-[#B8BDCE]'
                      }`}
                    >
                      {jd.status}
                    </button>
                  </div>

                  {/* Separate Structured Columns: Location | Job Type | Experience | Min CGPA */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Location
                      </div>
                      <div className="text-xs font-semibold text-[#111936] flex items-center gap-1 mt-0.5 truncate" title={jd.location}>
                        {jd.locationPlaceId ? (
                          <CheckCircle2 className="w-3 h-3 text-[#047857] shrink-0" />
                        ) : (
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        )}
                        <span className="truncate">{jd.location}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Job Type
                      </div>
                      <div className="mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[11px] font-semibold whitespace-nowrap ${getJobTypeBadgeClass(
                            jdType
                          )}`}
                        >
                          {jdType}
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Experience
                      </div>
                      <div className="text-xs font-semibold text-[#111936] flex items-center gap-1 mt-0.5 tabular-nums truncate">
                        <Briefcase className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{jd.experienceRange}</span>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Min CGPA
                      </div>
                      <div className="text-xs font-bold text-[#111936] mt-0.5 tabular-nums">
                        {jd.minCgpa.toFixed(1)}
                      </div>
                    </div>
                  </div>

                  {/* Required Skills as flat-tinted high-contrast tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {jd.requiredSkills.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2 py-0.5 rounded bg-[#EFF6FF] border border-[#BFDBFE] text-[11px] font-semibold text-[#1E40AF]"
                      >
                        {skill}
                      </span>
                    ))}
                    {jd.requiredSkills.length > 6 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E2E4EC] text-[11px] font-medium text-slate-600 tabular-nums">
                        +{jd.requiredSkills.length - 6} more
                      </span>
                    )}
                  </div>

                  {/* Live Role Metrics Strip */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
                    <div>
                      <div className="text-[11px] text-slate-500">Applicants</div>
                      <div className="text-sm font-bold tabular-nums text-[#111936]">
                        {pool.length}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Shortlisted+</div>
                      <div className="text-sm font-bold tabular-nums text-[#047857]">
                        {shortlistedCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500">Avg / Top Fit</div>
                      <div className="text-sm font-bold tabular-nums text-[#1D4ED8]">
                        {pool.length > 0 ? `${avgMatch}%` : '—'}{' '}
                        {topCandidate ? (
                          <span className="text-xs font-medium text-slate-500">
                            (Top {topCandidate.matchScore})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Interactive Screen Navigation Actions */}
                <div className="pt-2 border-t border-[#E2E4EC] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectJobAndNavigate(jd.id, 'upload')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] text-[#111936] cursor-pointer transition-colors"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-[#1D4ED8]" />
                      Upload Resumes
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectJobAndNavigate(jd.id, 'dashboard')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] text-[#111936] cursor-pointer transition-colors"
                    >
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      Candidates
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectJobAndNavigate(jd.id, 'ranklist')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] text-[#111936] cursor-pointer transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5 text-[#047857]" />
                      Rank List
                    </button>
                    <button
                      type="button"
                      onClick={() => onRequestEditJob(jd)}
                      aria-label={`Update job description for ${jd.title}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:border-[#B8BDCE] hover:bg-[#FAF9F6] text-[#111936] cursor-pointer transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                      Edit JD
                    </button>
                    {pool.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onRequestClearCandidates(jd.id)}
                        title={`Remove all ${pool.length} candidates from ${jd.title}`}
                        aria-label={`Remove all candidates from ${jd.title}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[#E2E4EC] bg-white hover:bg-[#FFF1F2] hover:text-[#BE123C] hover:border-[#FECDD3] text-slate-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Pool
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectJobAndNavigate(jd.id, 'overview')}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#111936] hover:bg-[#1A2650] text-white'
                        : 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white'
                    }`}
                  >
                    Open Workspace
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
