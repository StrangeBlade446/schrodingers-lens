import React, { useMemo, useState } from 'react';
import {
  Mail,
  GripVertical,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  X,
  Send,
  Users,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import type { Candidate, JobDescription, PipelineStage } from '../types/ats';
import { PIPELINE_STAGES } from '../data/initialData';
import { ScoreRing } from './ScoreRing';

interface HiringPipelineProps {
  candidates: Candidate[];
  jobDescription: JobDescription;
  onStageChange: (id: string, stage: PipelineStage) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onBulkEmailSent: (recipientCount: number, subject: string) => void;
}

const COLUMN_TOP_RULES: Record<PipelineStage, string> = {
  Applied: 'border-t-[#64748B]',
  Shortlisted: 'border-t-[#047857]',
  Interview: 'border-t-[#B45309]',
  Offer: 'border-t-[#1D4ED8]',
  Rejected: 'border-t-[#BE123C]',
};

const COLUMN_BADGE_ACCENTS: Record<PipelineStage, string> = {
  Applied: 'text-[#334155] bg-[#F4F5F8] border-[#D8DCE8]',
  Shortlisted: 'text-[#047857] bg-[#ECFDF5] border-[#A7F3D0]',
  Interview: 'text-[#854D0E] bg-[#FEFCE8] border-[#FDE047]',
  Offer: 'text-[#1E40AF] bg-[#EFF6FF] border-[#BFDBFE]',
  Rejected: 'text-[#BE123C] bg-[#FFF1F2] border-[#FECDD3]',
};

export const HiringPipeline: React.FC<HiringPipelineProps> = ({
  candidates,
  jobDescription,
  onStageChange,
  onOpenCandidate,
  onBulkEmailSent,
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  const shortlistedCandidates = useMemo(
    () => candidates.filter((c) => c.stage === 'Shortlisted'),
    [candidates]
  );

  const [selectedTemplateId, setSelectedTemplateId] = useState('tech-screen');

  const emailTemplates = useMemo(
    () => [
      {
        id: 'tech-screen',
        label: 'Technical Screen Invite',
        subject: `Next Steps: ${jobDescription.title} Interview Invitation`,
        body: `Hi {{Candidate Name}},\n\nThank you for applying for the ${jobDescription.title} (${jobDescription.location} · ${jobDescription.jobType || 'Hybrid'}) role. Our engineering hiring team reviewed your profile and would love to invite you to a 45-minute technical screening interview this week.\n\nPlease reply with two preferred time slots between 11:00 AM and 5:00 PM IST.\n\nBest regards,\nSchrodinger's Lens Hiring Team`,
      },
      {
        id: 'coding-task',
        label: 'Take-Home Challenge',
        subject: `${jobDescription.title} — Short Practical Architecture Exercise`,
        body: `Hi {{Candidate Name}},\n\nWe were impressed by your background in ${jobDescription.requiredSkills.slice(0, 3).join(', ')}. As our next step for ${jobDescription.title}, we'd like to share a 90-minute practical build exercise.\n\nReply to confirm when you'd like us to dispatch the repository link.\n\nBest regards,\nSchrodinger's Lens Hiring Team`,
      },
      {
        id: 'final-loop',
        label: 'Final Panel Loop',
        subject: `Final Round Schedule — ${jobDescription.title}`,
        body: `Hi {{Candidate Name}},\n\nCongratulations on advancing to our final panel loop for ${jobDescription.title}! We have two 45-minute sessions covering System Design and Cross-Functional Collaboration.\n\nLet us know your availability over the next 3 business days.\n\nBest regards,\nSchrodinger's Lens Hiring Team`,
      },
      {
        id: 'offer-call',
        label: 'Offer Discussion',
        subject: `Exciting Update Regarding ${jobDescription.title}`,
        body: `Hi {{Candidate Name}},\n\nOur hiring panel had great feedback from your recent evaluation for ${jobDescription.title}. We would love to schedule a brief call to discuss next steps and compensation details.\n\nWhen works best for a 20-minute sync tomorrow?\n\nBest regards,\nSchrodinger's Lens Hiring Team`,
      },
    ],
    [jobDescription]
  );

  const [emailSubject, setEmailSubject] = useState(
    `Next Steps: ${jobDescription.title} Interview Invitation`
  );
  const [emailBody, setEmailBody] = useState(
    `Hi {{Candidate Name}},\n\nThank you for applying for the ${jobDescription.title} (${jobDescription.location} · ${jobDescription.jobType || 'Hybrid'}) role. Our engineering hiring team reviewed your profile and would love to invite you to a 45-minute technical screening interview this week.\n\nPlease reply with two preferred time slots between 11:00 AM and 5:00 PM IST.\n\nBest regards,\nSchrodinger's Lens Hiring Team`
  );

  const openEmailModal = () => {
    const firstTpl = emailTemplates[0];
    setSelectedTemplateId(firstTpl.id);
    setEmailSubject(firstTpl.subject);
    setEmailBody(firstTpl.body);
    setEmailModalOpen(true);
  };

  const applyEmailTemplate = (tplId: string) => {
    const found = emailTemplates.find((t) => t.id === tplId);
    if (!found) return;
    setSelectedTemplateId(found.id);
    setEmailSubject(found.subject);
    setEmailBody(found.body);
  };

  const candidatesByStage = useMemo(() => {
    const grouped: Record<PipelineStage, Candidate[]> = {
      Applied: [],
      Shortlisted: [],
      Interview: [],
      Offer: [],
      Rejected: [],
    };
    candidates.forEach((c) => {
      grouped[c.stage].push(c);
    });
    PIPELINE_STAGES.forEach((st) => {
      grouped[st].sort((a, b) => b.matchScore - a.matchScore);
    });
    return grouped;
  }, [candidates]);

  const handleSendBulkEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (shortlistedCandidates.length === 0) return;
    onBulkEmailSent(shortlistedCandidates.length, emailSubject.trim() || 'Interview Invitation');
    setEmailModalOpen(false);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-5">
      {/* Pipeline Header Bar */}
      <div className="bg-white border border-[#E2E4EC] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-[#111936]">
            Interactive Hiring Pipeline
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Drag candidate cards across stages or use quick-move controls to update pipeline status in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={openEmailModal}
          disabled={shortlistedCandidates.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:bg-[#E2E4EC] disabled:text-slate-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
        >
          <Mail className="w-4 h-4" />
          Bulk Email Shortlisted
          <span className="px-1.5 py-0.5 rounded bg-white/20 tabular-nums text-[11px]">
            {shortlistedCandidates.length}
          </span>
        </button>
      </div>

      {/* 5-Column Kanban Board with Royal Top Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-start">
        {PIPELINE_STAGES.map((stage, stageIdx) => {
          const items = candidatesByStage[stage];
          const isDropTarget = dragOverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStage !== stage) setDragOverStage(stage);
              }}
              onDragLeave={() => {
                if (dragOverStage === stage) setDragOverStage(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const droppedId = e.dataTransfer.getData('text/plain') || draggedId;
                if (droppedId) {
                  onStageChange(droppedId, stage);
                }
                setDraggedId(null);
                setDragOverStage(null);
              }}
              className={`rounded-xl border border-t-[3px] ${COLUMN_TOP_RULES[stage]} transition-colors min-h-[460px] flex flex-col ${
                isDropTarget
                  ? 'bg-[#EFF6FF] border-x-[#1D4ED8] border-b-[#1D4ED8]'
                  : 'bg-[#F3F2EE] border-x-[#E2E4EC] border-b-[#E2E4EC]'
              }`}
            >
              {/* Column Header */}
              <div className="px-3.5 py-2.5 border-b border-[#E2E4EC] bg-white rounded-t-lg flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold uppercase tracking-wide text-[#111936]">
                  {stage}
                </span>
                <span
                  className={`px-2 py-0.5 text-xs font-bold tabular-nums rounded border ${COLUMN_BADGE_ACCENTS[stage]}`}
                >
                  {items.length}
                </span>
              </div>

              {/* Column Cards (Crisp, Compact, Tactile Density) */}
              <div className="p-2 space-y-2 flex-1">
                {items.length === 0 ? (
                  <div className="h-24 rounded-lg border border-dashed border-[#C2C7D6] bg-white/50 flex items-center justify-center text-xs text-slate-500 px-3 text-center">
                    Drop candidate here to move to {stage}
                  </div>
                ) : (
                  items.map((candidate) => {
                    const prevStage = stageIdx > 0 ? PIPELINE_STAGES[stageIdx - 1] : null;
                    const nextStage =
                      stageIdx < PIPELINE_STAGES.length - 1 ? PIPELINE_STAGES[stageIdx + 1] : null;

                    return (
                      <article
                        key={candidate.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(candidate.id);
                          e.dataTransfer.setData('text/plain', candidate.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverStage(null);
                        }}
                        onClick={() => onOpenCandidate(candidate)}
                        className={`bg-white border border-[#E2E4EC] hover:border-[#94A0B8] rounded-lg p-2.5 space-y-2 cursor-pointer transition-colors ${
                          draggedId === candidate.id ? 'opacity-50' : 'opacity-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-1.5 min-w-0">
                            <GripVertical
                              className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0 cursor-grab"
                              aria-hidden="true"
                            />
                            <div className="min-w-0">
                              <h3 className="text-xs font-bold text-[#111936] truncate">
                                {candidate.fullName}
                              </h3>
                              <p className="text-[11px] text-slate-500 truncate tabular-nums">
                                {candidate.city} · {candidate.yearsOfExperience.toFixed(1)}y exp
                              </p>
                            </div>
                          </div>
                          <ScoreRing score={candidate.matchScore} size={32} />
                        </div>

                        {candidate.isAiGenerated ? (
                          <div
                            title={candidate.rejectionReason || 'Auto-rejected: AI-Generated Resume detected'}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BE123C] bg-[#FFF1F2] border border-[#FECDD3] rounded px-1.5 py-0.5"
                          >
                            <Bot className="w-3 h-3 text-[#BE123C]" />
                            AI Resume (Auto-Rejected)
                          </div>
                        ) : (
                          <div
                            title={`ATS Compatibility Score: ${candidate.atsFriendlinessScore ?? 95}%`}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded px-1.5 py-0.5"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-[#047857]" />
                            ATS-Friendly ({candidate.atsFriendlinessScore ?? 95}%)
                          </div>
                        )}

                        {candidate.isAiGenerated && candidate.rejectionReason && (
                          <p className="text-[10px] text-[#BE123C] line-clamp-2 italic bg-[#FFF1F2]/60 p-1 rounded border border-[#FECDD3]/50">
                            {candidate.rejectionReason}
                          </p>
                        )}

                        {candidate.isDuplicate && (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] bg-[#FEF3C7] border border-[#FCD34D] rounded px-1.5 py-0.5">
                            <AlertTriangle className="w-3 h-3 text-[#B45309]" />
                            Duplicate
                          </div>
                        )}

                        <div className="text-[11px] text-slate-600 flex items-center justify-between tabular-nums">
                          <span>CGPA {candidate.cgpa.toFixed(2)}</span>
                          <span>Class {candidate.graduationYear}</span>
                        </div>

                        {/* Accessible Quick-Move Controls */}
                        <div
                          className="pt-1.5 border-t border-[#E2E4EC] flex items-center justify-between gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            {prevStage && (
                              <button
                                type="button"
                                onClick={() => onStageChange(candidate.id, prevStage)}
                                title={`Move back to ${prevStage}`}
                                aria-label={`Move ${candidate.fullName} back to ${prevStage}`}
                                className="p-1 rounded border border-[#E2E4EC] text-slate-500 hover:text-[#111936] hover:border-[#94A0B8] hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                              >
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            )}
                            {nextStage && (
                              <button
                                type="button"
                                onClick={() => onStageChange(candidate.id, nextStage)}
                                title={`Advance to ${nextStage}`}
                                aria-label={`Advance ${candidate.fullName} to ${nextStage}`}
                                className="p-1 rounded border border-[#E2E4EC] text-slate-500 hover:text-[#1D4ED8] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] cursor-pointer transition-colors"
                              >
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <select
                            value={candidate.stage}
                            onChange={(e) =>
                              onStageChange(candidate.id, e.target.value as PipelineStage)
                            }
                            aria-label={`Quick stage move for ${candidate.fullName}`}
                            className="text-[11px] font-medium text-[#111936] bg-[#FAF9F6] border border-[#E2E4EC] rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] cursor-pointer"
                          >
                            {PIPELINE_STAGES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bulk Email Shortlisted Composer Modal */}
      {emailModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111936]/50"
          role="dialog"
          aria-modal="true"
          aria-label="Bulk Email Shortlisted Candidates"
        >
          <div className="bg-white border border-[#C2C7D6] rounded-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E4EC] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#111936]">
                    Bulk Email Shortlisted Candidates
                  </h3>
                  <p className="text-xs text-slate-500">
                    Send personalized outreach to {shortlistedCandidates.length} shortlisted applicant
                    {shortlistedCandidates.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-[#111936] hover:bg-[#FAF9F6] cursor-pointer"
                aria-label="Close email composer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBulkEmail} className="p-6 space-y-4">
              {/* Recipients */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-[#111936] inline-flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Recipients ({shortlistedCandidates.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC] max-h-28 overflow-y-auto">
                  {shortlistedCandidates.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E2E4EC] text-xs text-[#111936]"
                    >
                      <span className="font-semibold">{c.fullName}</span>
                      <span className="text-slate-500">&lt;{c.email}&gt;</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Outreach Template Presets */}
              <div>
                <span className="block text-xs font-semibold text-[#111936] mb-1.5">
                  Outreach Template
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {emailTemplates.map((tpl) => {
                    const active = selectedTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyEmailTemplate(tpl.id)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
                            : 'bg-[#FAF9F6] border-[#E2E4EC] text-slate-700 hover:border-[#B8BDCE]'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="bulk-email-subject" className="block text-xs font-semibold text-[#111936] mb-1">
                  Subject Line
                </label>
                <input
                  id="bulk-email-subject"
                  type="text"
                  required
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              {/* Body */}
              <div>
                <label htmlFor="bulk-email-body" className="block text-xs font-semibold text-[#111936] mb-1">
                  Message Template
                </label>
                <textarea
                  id="bulk-email-body"
                  rows={7}
                  required
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm leading-relaxed bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#111936] bg-white border border-[#E2E4EC] hover:border-[#B8BDCE] hover:bg-[#FAF9F6] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send to {shortlistedCandidates.length} Shortlisted
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
