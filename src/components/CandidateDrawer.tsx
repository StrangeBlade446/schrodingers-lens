import React, { useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  GitCompareArrows,
  Compass,
  ArrowRightLeft,
  FolderGit2,
  Award,
  Sparkles,
  Layers,
  Bot,
  XCircle,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { AlternativeRoleFit, Candidate, PipelineStage } from '../types/ats';
import { ScoreRing } from './ScoreRing';
import { StageBadge } from './StageBadge';

interface CandidateDrawerProps {
  candidate: Candidate | null;
  activeJobTitle: string;
  alternativeFit: AlternativeRoleFit | null;
  onClose: () => void;
  onStageChange: (id: string, stage: PipelineStage) => void;
  isSelectedForCompare: boolean;
  onToggleCompare: (id: string) => void;
  onTransferToAlternativeRole: (candidate: Candidate, target: AlternativeRoleFit) => void;
}

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  candidate,
  activeJobTitle,
  alternativeFit,
  onClose,
  onStageChange,
  isSelectedForCompare,
  onToggleCompare,
  onTransferToAlternativeRole,
}) => {
  useEffect(() => {
    if (!candidate) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [candidate, onClose]);

  return (
    <AnimatePresence>
      {candidate && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#111936]/45"
            aria-hidden="true"
          />

          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-xl bg-white h-full border-l border-[#C2C7D6] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`${candidate.fullName} profile`}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E2E4EC] flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-start gap-4 min-w-0">
                <ScoreRing score={candidate.matchScore} size={52} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-display text-lg font-bold text-[#111936] truncate">
                      {candidate.fullName}
                    </h2>
                    <StageBadge stage={candidate.stage} />
                    {candidate.isAiGenerated ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded-md bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]">
                        <Bot className="w-3.5 h-3.5" />
                        AI Resume (Auto-Rejected)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md bg-[#ECFDF5] text-[#047857] border border-[#A7F3D0]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        ATS-Friendly
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5 truncate">{candidate.currentRole}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1.5">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {candidate.city}
                    </span>
                    <span className="tabular-nums">
                      {candidate.yearsOfExperience.toFixed(1)} yrs exp
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Applied {candidate.appliedAt}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-[#111936] hover:bg-[#FAF9F6] cursor-pointer shrink-0"
                aria-label="Close candidate details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Authenticity & ATS Compatibility Status Card */}
              {candidate.isAiGenerated ? (
                <div className="p-4 rounded-xl bg-[#FFF1F2] border-2 border-[#FECDD3] space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#FFE4E6] text-[#BE123C]">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#BE123C]">
                          AI-Generated Resume Detected (Auto-Rejected)
                        </h3>
                        <p className="text-[11px] text-[#9F1239] mt-0.5">
                          Synthetic confidence: <span className="font-bold tabular-nums">{candidate.aiDetectionScore ?? 90}%</span> · ATS Friendliness: <span className="font-bold tabular-nums">{candidate.atsFriendlinessScore ?? 25}%</span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[#BE123C] text-white">
                      Stage: Rejected
                    </span>
                  </div>

                  <div className="p-3 bg-white/85 rounded-lg border border-[#FECDD3] text-xs text-[#9F1239] space-y-1">
                    <p className="font-bold text-[#881337]">Automated Rejection Rationale:</p>
                    <p className="leading-relaxed">
                      {candidate.rejectionReason || 'High probability of synthetic LLM generation detected across vocabulary, structure, and template tokens.'}
                    </p>
                  </div>

                  {candidate.aiDetectionReasons && candidate.aiDetectionReasons.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-bold text-[#881337]">Detected Synthetic Artifacts:</p>
                      <ul className="space-y-1 text-xs text-[#9F1239]">
                        {candidate.aiDetectionReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <XCircle className="w-3.5 h-3.5 text-[#BE123C] shrink-0 mt-0.5" />
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#D1FAE5] text-[#047857]">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#047857]">
                          ATS-Friendly Resume Verified
                        </h3>
                        <p className="text-[11px] text-[#065F46] mt-0.5">
                          Authentic Human Authorship · ATS Compatibility: <span className="font-bold tabular-nums">{candidate.atsFriendlinessScore ?? 96}%</span>
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#047857] text-white">
                      Verified Genuine
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-[#065F46]">
                    <div className="flex items-center gap-1.5 bg-white/60 p-2 rounded border border-[#A7F3D0]/60">
                      <CheckCircle2 className="w-3 h-3 text-[#047857] shrink-0" />
                      <span>Parseable Layout & Sections</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/60 p-2 rounded border border-[#A7F3D0]/60">
                      <CheckCircle2 className="w-3 h-3 text-[#047857] shrink-0" />
                      <span>Linear Career Progression</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/60 p-2 rounded border border-[#A7F3D0]/60">
                      <CheckCircle2 className="w-3 h-3 text-[#047857] shrink-0" />
                      <span>Clean Contact Data & No Prompts</span>
                    </div>
                  </div>
                </div>
              )}
              {candidate.isDuplicate && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] text-xs text-[#B45309]">
                  <AlertTriangle className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Potential Duplicate Submission Flagged</p>
                    <p className="mt-0.5">
                      {candidate.duplicateReason || 'Contact details overlap with another candidate in the active pipeline.'}
                    </p>
                  </div>
                </div>
              )}

              {alternativeFit && (
                <div className="p-4 rounded-xl bg-[#FEFCE8] border border-[#FDE047] space-y-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Compass className="w-4 h-4 text-[#854D0E] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-[#854D0E]">
                          Stronger Fit in Another Field: {alternativeFit.roleTitle}
                        </p>
                        <p className="text-xs text-[#854D0E] mt-0.5">
                          Applied under <strong>{activeJobTitle}</strong> ({candidate.matchScore}% match), but scores{' '}
                          <strong className="tabular-nums">{alternativeFit.score}%</strong> (+{alternativeFit.scoreDelta} pts) for{' '}
                          <strong>{alternativeFit.roleTitle}</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-[#854D0E]/90 leading-relaxed">
                    {alternativeFit.reason}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-[#854D0E] font-semibold truncate">
                      Matched: {alternativeFit.matchedSkills.slice(0, 5).join(', ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onTransferToAlternativeRole(candidate, alternativeFit)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#111936] hover:bg-[#1D4ED8] text-white transition-colors shrink-0 cursor-pointer"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Route to {alternativeFit.roleTitle}
                    </button>
                  </div>
                </div>
              )}

              {/* Contact & File */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-[#111936] truncate">{candidate.email}</span>
                </div>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-[#111936] tabular-nums">{candidate.phone}</span>
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
                  <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-[#111936] truncate">{candidate.resumeFileName}</span>
                </div>
              </div>

              {/* AI Fit Rationale */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500">AI Fit Rationale</h3>
                <p className="text-sm leading-relaxed text-[#111936] bg-[#FAF9F6] border border-[#E2E4EC] rounded-lg p-4">
                  {candidate.aiSummary}
                </p>
              </section>

              {/* Sentient Holistic Multi-Parameter Evaluation */}
              <section className="space-y-3 p-4 rounded-xl bg-[#FAF9F6] border border-[#E2E4EC]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                    <h3 className="text-xs font-bold text-[#111936] uppercase tracking-wide">
                      Holistic Multi-Parameter Evaluation
                    </h3>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-[#1D4ED8]">
                    {candidate.matchScore} / 100
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Pillar 1: Technical Skills */}
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span className="font-medium">1. Technical Skills</span>
                      <span className="tabular-nums font-semibold text-[#111936]">
                        {candidate.scoreBreakdown?.skillsScore ?? Math.min(30, Math.round(candidate.matchScore * 0.3))}/30 pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2E4EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#1D4ED8] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((candidate.scoreBreakdown?.skillsScore ?? Math.min(30, Math.round(candidate.matchScore * 0.3)))) / 30) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 2: Projects & Systems */}
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span className="font-medium">2. Projects (Uniqueness, Innovation, Impact, Feasibility, Practicality)</span>
                      <span className="tabular-nums font-semibold text-[#111936]">
                        {candidate.scoreBreakdown?.projectsScore ?? Math.min(25, Math.round(candidate.matchScore * 0.25))}/25 pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2E4EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0284C7] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((candidate.scoreBreakdown?.projectsScore ?? Math.min(25, Math.round(candidate.matchScore * 0.25)))) / 25) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 3: Experience & Role Trajectory */}
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span className="font-medium">3. Experience & Role Trajectory</span>
                      <span className="tabular-nums font-semibold text-[#111936]">
                        {candidate.scoreBreakdown?.experienceScore ?? Math.min(20, Math.round(candidate.matchScore * 0.2))}/20 pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2E4EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#059669] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((candidate.scoreBreakdown?.experienceScore ?? Math.min(20, Math.round(candidate.matchScore * 0.2)))) / 20) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 4: Academic Rigor & Consistency */}
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span className="font-medium">4. Longitudinal Academics (CGPA + 12th + 10th)</span>
                      <span className="tabular-nums font-semibold text-[#111936]">
                        {candidate.scoreBreakdown?.academicsScore ?? Math.min(15, Math.round(candidate.matchScore * 0.15))}/15 pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2E4EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#D97706] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((candidate.scoreBreakdown?.academicsScore ?? Math.min(15, Math.round(candidate.matchScore * 0.15)))) / 15) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pillar 5: Achievements & Honors */}
                  <div>
                    <div className="flex justify-between items-center text-slate-600 mb-1">
                      <span className="font-medium">5. Achievements & Extracurriculars</span>
                      <span className="tabular-nums font-semibold text-[#111936]">
                        {candidate.scoreBreakdown?.achievementsScore ?? Math.min(10, Math.round(candidate.matchScore * 0.1))}/10 pts
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#E2E4EC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#7C3AED] rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (((candidate.scoreBreakdown?.achievementsScore ?? Math.min(10, Math.round(candidate.matchScore * 0.1)))) / 10) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Role-Specific Subjective Weights */}
                {candidate.scoreBreakdown?.weightsApplied && (
                  <div className="pt-2 border-t border-[#E2E4EC] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Role Subjective Weights
                      </span>
                      <span className="text-slate-400 text-[10px]">Job-tuned significance</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed italic">
                      {candidate.scoreBreakdown.weightsApplied.weightRationale}
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-0.5">
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Skills</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.skillsWeight}%</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Projects</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.projectsWeight}%</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Experience</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.experienceWeight}%</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Academics</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.academicsWeight}%</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Achievements</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.achievementsWeight}%</span>
                      </div>
                      <div className="bg-[#F8FAFC] py-1 px-1.5 rounded border border-[#E2E8F0]">
                        <span className="text-slate-400 block">Extra-Curr</span>
                        <span className="font-bold text-slate-700">{candidate.scoreBreakdown.weightsApplied.extracurricularWeight}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Projects Analyzed Deep-Dive */}
              {((candidate.detailedProjects && candidate.detailedProjects.length > 0) || (candidate.projects && candidate.projects.length > 0)) && (
                <section className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FolderGit2 className="w-4 h-4 text-slate-500" />
                      <h3 className="text-xs font-semibold text-slate-500">
                        Project Analysis (Uniqueness, Innovation, Impact, Feasibility, Practicality)
                      </h3>
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">
                      {(candidate.detailedProjects || candidate.projects)?.length} analyzed
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {(candidate.detailedProjects || candidate.projects)!.map((proj: any, idx) => {
                      const u = proj.uniquenessScore ?? 7.0;
                      const inn = proj.innovationScore ?? 7.0;
                      const soc = proj.societalImpactScore ?? 6.5;
                      const feas = proj.feasibilityScore ?? 7.5;
                      const prac = proj.practicalityScore ?? 7.0;

                      return (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg border border-[#E2E4EC] bg-white space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs font-bold text-[#111936]">{proj.title}</h4>
                          </div>

                          {proj.description && (
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {proj.description}
                            </p>
                          )}

                          {/* 5 Deep Dimensions Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                            <div className="p-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                              <span className="text-[10px] text-slate-500 block">Uniqueness</span>
                              <span className="text-xs font-bold text-[#1E40AF]">{u}/10</span>
                            </div>
                            <div className="p-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                              <span className="text-[10px] text-slate-500 block">Innovation</span>
                              <span className="text-xs font-bold text-[#0284C7]">{inn}/10</span>
                            </div>
                            <div className="p-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                              <span className="text-[10px] text-slate-500 block">Societal Impact</span>
                              <span className="text-xs font-bold text-[#059669]">{soc}/10</span>
                            </div>
                            <div className="p-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                              <span className="text-[10px] text-slate-500 block">Feasibility</span>
                              <span className="text-xs font-bold text-[#D97706]">{feas}/10</span>
                            </div>
                            <div className="p-1.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-center">
                              <span className="text-[10px] text-slate-500 block">Practicality</span>
                              <span className="text-xs font-bold text-[#7C3AED]">{prac}/10</span>
                            </div>
                          </div>

                          {proj.analysisSummary && (
                            <p className="text-[11px] text-slate-500 italic pt-0.5">
                              {proj.analysisSummary}
                            </p>
                          )}

                          {proj.technologies && proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {proj.technologies.map((t: string) => (
                                <span
                                  key={t}
                                  className="px-2 py-0.5 text-[10px] font-medium rounded bg-[#F1F5F9] text-slate-700 border border-[#E2E8F0]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Achievements & Honors */}
              {candidate.achievements && candidate.achievements.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h3 className="text-xs font-semibold text-slate-500">
                      Key Achievements & Honors ({candidate.achievements.length})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {candidate.achievements.map((achieve, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-[#FEFCE8] border border-[#FEF08A] text-xs text-[#854D0E]"
                      >
                        <Award className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>{achieve}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Extracurricular Leadership & Activities */}
              {candidate.extracurriculars && candidate.extracurriculars.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-xs font-semibold text-slate-500">
                      Extracurricular Leadership & Community Impact ({candidate.extracurriculars.length})
                    </h3>
                  </div>
                  <div className="space-y-1.5">
                    {candidate.extracurriculars.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-2.5 rounded-lg bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46]"
                      >
                        <Compass className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Academic Credentials */}
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <h3 className="text-xs font-semibold text-slate-500">Longitudinal Academic Rigor</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                    {candidate.college}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-lg border border-[#E2E4EC] bg-white">
                    <div className="text-[11px] text-slate-500">CGPA</div>
                    <div className="text-base font-bold tabular-nums text-[#111936] mt-0.5">
                      {candidate.cgpa.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E2E4EC] bg-white">
                    <div className="text-[11px] text-slate-500">Class 12th</div>
                    <div className="text-base font-bold tabular-nums text-[#111936] mt-0.5">
                      {candidate.twelfthPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E2E4EC] bg-white">
                    <div className="text-[11px] text-slate-500">Class 10th</div>
                    <div className="text-base font-bold tabular-nums text-[#111936] mt-0.5">
                      {candidate.tenthPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="p-3 rounded-lg border border-[#E2E4EC] bg-white">
                    <div className="text-[11px] text-slate-500">Grad Year</div>
                    <div className="text-base font-bold tabular-nums text-[#111936] mt-0.5">
                      {candidate.graduationYear}
                    </div>
                  </div>
                </div>
                {candidate.scoreBreakdown?.academicsBreakdown && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] text-[11px]">
                    <span className="text-slate-500">Longitudinal Consistency:</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {candidate.scoreBreakdown.academicsBreakdown.consistencyLabel}
                    </span>
                  </div>
                )}
              </section>

              {/* Holistic AI Qualitative Assessment */}
              {candidate.holisticAnalysis && (
                <section className="space-y-2 p-3.5 rounded-xl bg-white border border-[#E2E4EC]">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <h3 className="text-xs font-bold text-[#111936]">Holistic AI Qualitative Assessment</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed italic">
                    "{candidate.holisticAnalysis.roleSubjectiveFitSummary}"
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-800 space-y-1">
                      <span className="font-semibold block text-emerald-900 text-[11px]">Standout Strengths</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {candidate.holisticAnalysis.overallStrengths.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-100 text-amber-800 space-y-1">
                      <span className="font-semibold block text-amber-900 text-[11px]">Considerations / Gaps</span>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {candidate.holisticAnalysis.potentialRisksOrGaps.map((g, i) => (
                          <li key={i}>{g}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              )}

              {/* Matched Skills vs Skill Gaps */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">
                    Matched Skills ({candidate.matchedSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.matchedSkills.length > 0 ? (
                      candidate.matchedSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#047857]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#047857]" />
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No direct JD skill matches</span>
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">
                    Skill Gaps ({candidate.missingSkills.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.missingSkills.length > 0 ? (
                      candidate.missingSkills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#FEF3C7] border border-[#FCD34D] text-xs font-semibold text-[#B45309]"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#047857] font-semibold">
                        Zero required skill gaps
                      </span>
                    )}
                  </div>
                </section>
              </div>

              {/* Full Skill Inventory */}
              <section className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-500">All Extracted Skills</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {candidate.skills.join(' · ')}
                </p>
              </section>
            </div>

            {/* Footer Stage Action Bar */}
            <div className="px-6 py-4 border-t border-[#E2E4EC] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onToggleCompare(candidate.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  isSelectedForCompare
                    ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                    : 'bg-white border-[#E2E4EC] text-[#111936] hover:border-[#B8BDCE]'
                }`}
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                {isSelectedForCompare ? 'In Comparison' : 'Compare'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onStageChange(candidate.id, 'Rejected')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#FECDD3] bg-white hover:bg-[#FFF1F2] text-[#BE123C] transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => onStageChange(candidate.id, 'Shortlisted')}
                  className="px-3 py-2 text-xs font-semibold rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] hover:bg-[#D1FAE5] text-[#047857] transition-colors cursor-pointer"
                >
                  Shortlist
                </button>
                <button
                  type="button"
                  onClick={() => onStageChange(candidate.id, 'Interview')}
                  className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white transition-colors cursor-pointer"
                >
                  Move to Interview
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
