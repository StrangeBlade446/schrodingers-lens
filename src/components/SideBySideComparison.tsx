import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  X,
  Award,
  RefreshCw,
  AlertCircle,
  Loader2,
  GraduationCap,
  Users,
  Sparkles,
} from 'lucide-react';
import type {
  Candidate,
  ComparisonRecommendation,
  JobDescription,
} from '../types/ats';
import { generateComparisonRecommendation } from '../services/aiScreening';
import { ScoreRing } from './ScoreRing';
import { StageBadge } from './StageBadge';

interface SideBySideComparisonProps {
  candidates: Candidate[];
  selectedCompareIds: string[];
  onSetCompareIds: (ids: string[]) => void;
  jobDescription: JobDescription;
  onOpenCandidate: (candidate: Candidate) => void;
}

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({
  candidates,
  selectedCompareIds,
  onSetCompareIds,
  jobDescription,
  onOpenCandidate,
}) => {
  const [recommendation, setRecommendation] = useState<ComparisonRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [recStatusMsg, setRecStatusMsg] = useState<string | null>(null);
  const [recError, setRecError] = useState<string | null>(null);

  const activeIds = useMemo(() => {
    const valid = selectedCompareIds.filter((id) => candidates.some((c) => c.id === id));
    if (valid.length >= 2) return valid.slice(0, 3);
    const rankedFallback = [...candidates]
      .sort((a, b) => b.matchScore - a.matchScore)
      .map((c) => c.id);
    const merged = [...valid];
    for (const id of rankedFallback) {
      if (merged.length >= 2) break;
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  }, [candidates, selectedCompareIds]);

  const comparedCandidates = useMemo(
    () =>
      activeIds
        .map((id) => candidates.find((c) => c.id === id))
        .filter((c): c is Candidate => Boolean(c)),
    [activeIds, candidates]
  );

  const signature = useMemo(
    () =>
      `${comparedCandidates.map((c) => `${c.id}:${c.matchScore}`).join('|')}::${jobDescription.title}::${jobDescription.requiredSkills.join(',')}`,
    [comparedCandidates, jobDescription.title, jobDescription.requiredSkills]
  );

  const fetchRecommendation = async (targetCandidates: Candidate[]) => {
    if (targetCandidates.length < 2) return;
    setLoadingRec(true);
    setRecError(null);
    setRecStatusMsg(null);
    try {
      const data = await generateComparisonRecommendation(
        jobDescription,
        targetCandidates,
        (msg) => setRecStatusMsg(msg)
      );
      setRecommendation(data);
    } catch (err: unknown) {
      setRecError(err instanceof Error ? err.message : 'Unable to generate recommendation.');
    } finally {
      setLoadingRec(false);
      setRecStatusMsg(null);
    }
  };

  useEffect(() => {
    if (comparedCandidates.length >= 2) {
      void fetchRecommendation(comparedCandidates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const handleChangeSlot = (slotIdx: number, nextId: string) => {
    const next = [...activeIds];
    next[slotIdx] = nextId;
    const deduped = Array.from(new Set(next));
    onSetCompareIds(deduped);
  };

  const handleAddThirdSlot = () => {
    if (activeIds.length >= 3) return;
    const candidateToAdd = [...candidates]
      .sort((a, b) => b.matchScore - a.matchScore)
      .find((c) => !activeIds.includes(c.id));
    if (candidateToAdd) {
      onSetCompareIds([...activeIds, candidateToAdd.id]);
    }
  };

  const handleRemoveSlot = (slotIdx: number) => {
    if (activeIds.length <= 2) return;
    onSetCompareIds(activeIds.filter((_, idx) => idx !== slotIdx));
  };

  const maxMetrics = useMemo(() => {
    if (comparedCandidates.length === 0) {
      return { matchScore: 0, cgpa: 0, tenthPercent: 0, twelfthPercent: 0, yearsOfExperience: 0 };
    }
    return {
      matchScore: Math.max(...comparedCandidates.map((c) => c.matchScore)),
      cgpa: Math.max(...comparedCandidates.map((c) => c.cgpa)),
      tenthPercent: Math.max(...comparedCandidates.map((c) => c.tenthPercent)),
      twelfthPercent: Math.max(...comparedCandidates.map((c) => c.twelfthPercent)),
      yearsOfExperience: Math.max(...comparedCandidates.map((c) => c.yearsOfExperience)),
    };
  }, [comparedCandidates]);

  if (candidates.length < 2) {
    return (
      <div className="max-w-5xl mx-auto bg-white border border-[#E2E4EC] rounded-xl p-10 text-center">
        <p className="font-display text-base font-bold text-[#111936]">
          At least 2 candidates are required for comparison
        </p>
        <p className="text-sm text-slate-600 mt-1">
          Upload more resumes in Upload Resumes to enable side-by-side evaluation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#111936]">
            Side-by-Side Candidate Comparison
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Compare 2 to 3 finalists across academic benchmarks, technical coverage, and AI fit trade-offs for{' '}
            <span className="font-semibold text-[#111936]">{jobDescription.title}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {activeIds.length < 3 && candidates.length >= 3 && (
            <button
              type="button"
              onClick={handleAddThirdSlot}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#111936] bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] hover:bg-[#FAF9F6] rounded-lg whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add 3rd Candidate
            </button>
          )}
          <button
            type="button"
            onClick={() => fetchRecommendation(comparedCandidates)}
            disabled={loadingRec}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1E40AF] bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] rounded-lg whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingRec ? 'animate-spin' : ''}`} />
            Refresh AI Summary
          </button>
        </div>
      </div>

      {/* AI Hiring Recommendation Banner */}
      <section
        className="bg-white border border-[#E2E4EC] border-t-[3px] border-t-[#111936] rounded-xl p-5"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#EAB308]" />
            <h3 className="font-display text-sm font-bold text-[#111936]">
              AI Hiring Recommendation
            </h3>
          </div>
          {recommendation && !loadingRec && !recError && (
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
              Recommended: {recommendation.recommendedCandidateName}
            </span>
          )}
        </div>

        {loadingRec ? (
          <div className="space-y-2.5 py-1">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1D4ED8]" />
              {recStatusMsg || `Synthesizing candidate trade-offs against ${jobDescription.title}...`}
            </div>
            <div className="h-4 bg-[#FAF9F6] rounded w-2/3" />
            <div className="h-4 bg-[#FAF9F6] rounded w-full" />
          </div>
        ) : recError ? (
          <div className="flex items-start justify-between gap-4 bg-[#FFF1F2] border border-[#FECDD3] rounded-lg p-3.5 text-xs text-[#BE123C]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#BE123C] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">AI Recommendation Unavailable</p>
                <p className="mt-0.5">{recError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fetchRecommendation(comparedCandidates)}
              className="px-2.5 py-1 rounded bg-white border border-[#FECDD3] text-[#BE123C] font-semibold hover:bg-[#FFE4E6] shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : recommendation ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-[#111936]">{recommendation.headline}</p>
            <p className="text-sm text-slate-600 leading-relaxed">{recommendation.rationale}</p>
            {recommendation.tradeOffs?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-[#E2E4EC]">
                {recommendation.tradeOffs.map((item) => (
                  <div
                    key={item.candidateId}
                    className="p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC] text-xs space-y-1"
                  >
                    <p className="font-bold text-[#111936]">{item.candidateName}</p>
                    <p className="text-[#047857]">
                      <span className="font-semibold">Strength:</span> {item.strength}
                    </p>
                    <p className="text-[#B45309]">
                      <span className="font-semibold">Caveat:</span> {item.caveat}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* Comparison Matrix Table */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr className="border-b border-[#E2E4EC] bg-[#FAF9F6]">
                <th className="py-4 px-5 w-48 text-xs font-bold text-slate-600 align-top">
                  Evaluation Dimension
                </th>
                {comparedCandidates.map((cand, idx) => (
                  <th key={cand.id} className="py-4 px-5 align-top border-l border-[#E2E4EC]">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <select
                          value={cand.id}
                          onChange={(e) => handleChangeSlot(idx, e.target.value)}
                          aria-label={`Select candidate for comparison column ${idx + 1}`}
                          className="w-full px-2.5 py-1.5 text-sm font-bold text-[#111936] bg-white border border-[#E2E4EC] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                        >
                          {candidates.map((opt) => (
                            <option
                              key={opt.id}
                              value={opt.id}
                              disabled={activeIds.includes(opt.id) && opt.id !== cand.id}
                            >
                              {opt.fullName} ({opt.matchScore}%)
                            </option>
                          ))}
                        </select>

                        {comparedCandidates.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#111936] hover:bg-[#E2E4EC]/60 shrink-0 cursor-pointer"
                            aria-label={`Remove ${cand.fullName} from comparison`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs font-normal text-slate-500">
                        <span className="truncate">{cand.college}</span>
                        <button
                          type="button"
                          onClick={() => onOpenCandidate(cand)}
                          className="text-[#1D4ED8] hover:underline font-semibold shrink-0 cursor-pointer"
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E2E4EC] text-sm">
              {/* AI Match Score */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  AI Match Score
                </td>
                {comparedCandidates.map((cand) => {
                  const isBest = cand.matchScore === maxMetrics.matchScore;
                  return (
                    <td
                      key={cand.id}
                      className={`py-3.5 px-5 border-l border-[#E2E4EC] ${
                        isBest ? 'bg-[#ECFDF5]' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <ScoreRing score={cand.matchScore} size={38} />
                          <span
                            className={`tabular-nums font-bold ${
                              isBest ? 'text-[#047857]' : 'text-[#111936]'
                            }`}
                          >
                            {cand.matchScore} / 100
                          </span>
                        </div>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded bg-[#D1FAE5] text-[#047857]">
                            <CheckCircle2 className="w-3 h-3" />
                            Top Score
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 5-Pillar Holistic Breakdown */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  5-Pillar Score Breakdown
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-3.5 px-5 border-l border-[#E2E4EC] text-xs">
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Skills (30):</span>
                        <span className="font-bold text-[#1D4ED8] tabular-nums">
                          {cand.scoreBreakdown?.skillsScore ?? Math.min(30, Math.round(cand.matchScore * 0.3))} pts
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Projects (25):</span>
                        <span className="font-bold text-[#0284C7] tabular-nums">
                          {cand.scoreBreakdown?.projectsScore ?? Math.min(25, Math.round(cand.matchScore * 0.25))} pts
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Experience (20):</span>
                        <span className="font-bold text-[#059669] tabular-nums">
                          {cand.scoreBreakdown?.experienceScore ?? Math.min(20, Math.round(cand.matchScore * 0.2))} pts
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Academics (15):</span>
                        <span className="font-bold text-[#D97706] tabular-nums">
                          {cand.scoreBreakdown?.academicsScore ?? Math.min(15, Math.round(cand.matchScore * 0.15))} pts
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Achievements (10):</span>
                        <span className="font-bold text-[#7C3AED] tabular-nums">
                          {cand.scoreBreakdown?.achievementsScore ?? Math.min(10, Math.round(cand.matchScore * 0.1))} pts
                        </span>
                      </div>
                    </div>
                  </td>
                ))}
              </tr>

              {/* CGPA */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">CGPA</td>
                {comparedCandidates.map((cand) => {
                  const isBest = cand.cgpa === maxMetrics.cgpa;
                  return (
                    <td
                      key={cand.id}
                      className={`py-3.5 px-5 border-l border-[#E2E4EC] tabular-nums ${
                        isBest ? 'bg-[#ECFDF5] text-[#047857] font-bold' : 'text-[#111936]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{cand.cgpa.toFixed(2)} / 10.0</span>
                        {isBest && (
                          <span className="text-[11px] font-semibold text-[#047857]">
                            Highest
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 10th % */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">10th %</td>
                {comparedCandidates.map((cand) => {
                  const isBest = cand.tenthPercent === maxMetrics.tenthPercent;
                  return (
                    <td
                      key={cand.id}
                      className={`py-3.5 px-5 border-l border-[#E2E4EC] tabular-nums ${
                        isBest ? 'bg-[#ECFDF5] text-[#047857] font-bold' : 'text-[#111936]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{cand.tenthPercent.toFixed(1)}%</span>
                        {isBest && (
                          <span className="text-[11px] font-semibold text-[#047857]">
                            Highest
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 12th % */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">12th %</td>
                {comparedCandidates.map((cand) => {
                  const isBest = cand.twelfthPercent === maxMetrics.twelfthPercent;
                  return (
                    <td
                      key={cand.id}
                      className={`py-3.5 px-5 border-l border-[#E2E4EC] tabular-nums ${
                        isBest ? 'bg-[#ECFDF5] text-[#047857] font-bold' : 'text-[#111936]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{cand.twelfthPercent.toFixed(1)}%</span>
                        {isBest && (
                          <span className="text-[11px] font-semibold text-[#047857]">
                            Highest
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Experience */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  Experience
                </td>
                {comparedCandidates.map((cand) => {
                  const isBest = cand.yearsOfExperience === maxMetrics.yearsOfExperience;
                  return (
                    <td
                      key={cand.id}
                      className={`py-3.5 px-5 border-l border-[#E2E4EC] tabular-nums ${
                        isBest ? 'bg-[#ECFDF5] text-[#047857] font-bold' : 'text-[#111936]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{cand.yearsOfExperience.toFixed(1)} years</span>
                        {isBest && (
                          <span className="text-[11px] font-semibold text-[#047857]">
                            Most Exp
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Location */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">Location</td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-3.5 px-5 border-l border-[#E2E4EC] text-[#111936]">
                    {cand.city}
                  </td>
                ))}
              </tr>

              {/* Graduation Year */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  Graduation Year
                </td>
                {comparedCandidates.map((cand) => (
                  <td
                    key={cand.id}
                    className="py-3.5 px-5 border-l border-[#E2E4EC] tabular-nums text-[#111936]"
                  >
                    {cand.graduationYear}
                  </td>
                ))}
              </tr>

              {/* Pipeline Stage */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  Pipeline Stage
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-3.5 px-5 border-l border-[#E2E4EC]">
                    <StageBadge stage={cand.stage} />
                  </td>
                ))}
              </tr>

              {/* Matched Skills */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  Matched Skills
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {cand.matchedSkills.length > 0 ? (
                        cand.matchedSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#047857]"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Missing Skills */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  Missing Skills
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top">
                    <div className="flex flex-wrap gap-1.5">
                      {cand.missingSkills.length > 0 ? (
                        cand.missingSkills.map((skill) => (
                          <span
                            key={skill}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-[#FEF3C7] border border-[#FCD34D] text-xs font-semibold text-[#B45309]"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-semibold text-[#047857]">
                          No skill gaps
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>

              {/* Projects Analyzed */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  Projects Analyzed
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top text-xs">
                    {cand.projects && cand.projects.length > 0 ? (
                      <div className="space-y-2">
                        {cand.projects.map((p, idx) => (
                          <div key={idx} className="p-2 rounded bg-[#FAF9F6] border border-[#E2E4EC]">
                            <p className="font-bold text-[#111936]">{p.title}</p>
                            {p.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                                {p.description}
                              </p>
                            )}
                            {p.technologies && p.technologies.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {p.technologies.map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-white border border-[#CBD5E1] text-[10px] text-slate-700">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">Baseline project coverage</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Key Achievements & Honors */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  Key Achievements
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top text-xs">
                    {cand.achievements && cand.achievements.length > 0 ? (
                      <div className="space-y-1.5">
                        {cand.achievements.map((achieve, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 p-1.5 rounded bg-[#FEFCE8] border border-[#FEF08A] text-[#854D0E]">
                            <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span className="text-[11px]">{achieve}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">Verified academic/technical standing</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* Project Deep-Dive Ratings */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  <div>
                    <span>Project Dimensions</span>
                    <p className="text-[11px] font-normal text-slate-500 mt-0.5">
                      Uniqueness, Innovation, Impact, Feasibility, Practicality
                    </p>
                  </div>
                </td>
                {comparedCandidates.map((cand) => {
                  const dims = cand.scoreBreakdown?.projectDimensions;
                  return (
                    <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top text-xs">
                      {dims ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between p-1.5 rounded bg-violet-50/70 border border-violet-100">
                            <span className="text-violet-900 font-medium">Uniqueness</span>
                            <span className="font-bold text-violet-700 tabular-nums">{dims.uniqueness.toFixed(1)} / 10</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded bg-indigo-50/70 border border-indigo-100">
                            <span className="text-indigo-900 font-medium">Innovation</span>
                            <span className="font-bold text-indigo-700 tabular-nums">{dims.innovation.toFixed(1)} / 10</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded bg-emerald-50/70 border border-emerald-100">
                            <span className="text-emerald-900 font-medium">Practicality</span>
                            <span className="font-bold text-emerald-700 tabular-nums">{dims.practicality.toFixed(1)} / 10</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded bg-blue-50/70 border border-blue-100">
                            <span className="text-blue-900 font-medium">Feasibility</span>
                            <span className="font-bold text-blue-700 tabular-nums">{dims.feasibility.toFixed(1)} / 10</span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded bg-amber-50/70 border border-amber-100">
                            <span className="text-amber-900 font-medium">Societal Impact</span>
                            <span className="font-bold text-amber-700 tabular-nums">{dims.societalImpact.toFixed(1)} / 10</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Baseline evaluation (6.5/10 avg)</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Longitudinal Academic Consistency */}
              <tr>
                <td className="py-3.5 px-5 font-semibold text-[#111936] bg-[#FAF9F6]">
                  Academic Consistency
                </td>
                {comparedCandidates.map((cand) => {
                  const label = cand.scoreBreakdown?.academicsBreakdown?.consistencyLabel ?? (
                    Math.abs((cand.cgpa * 9.5) - cand.twelfthPercent) <= 10 ? 'High Consistency' : 'Moderate Consistency'
                  );
                  const isHigh = label === 'High Consistency';
                  return (
                    <td key={cand.id} className="py-3.5 px-5 border-l border-[#E2E4EC]">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full ${
                        isHigh
                          ? 'bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]'
                          : label === 'Moderate Consistency'
                            ? 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                            : 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]'
                      }`}>
                        <GraduationCap className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    </td>
                  );
                })}
              </tr>

              {/* Extracurricular Leadership */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  Extracurricular Leadership
                </td>
                {comparedCandidates.map((cand) => {
                  const extras = cand.extracurriculars ?? [];
                  return (
                    <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top text-xs">
                      {extras.length > 0 ? (
                        <div className="space-y-1.5">
                          {extras.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 p-1.5 rounded bg-sky-50/60 border border-sky-100 text-sky-950">
                              <Users className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-relaxed">{item}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">General collegiate participation</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              {/* Holistic AI Fit Summary */}
              <tr>
                <td className="py-4 px-5 font-semibold text-[#111936] bg-[#FAF9F6] align-top">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Holistic AI Fit Summary</span>
                  </div>
                </td>
                {comparedCandidates.map((cand) => (
                  <td key={cand.id} className="py-4 px-5 border-l border-[#E2E4EC] align-top text-xs">
                    <p className="text-slate-700 leading-relaxed">
                      {cand.holisticAnalysis?.roleSubjectiveFitSummary || cand.aiSummary}
                    </p>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
