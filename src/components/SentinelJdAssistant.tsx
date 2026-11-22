import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Loader2,
  Plus,
  Check,
  AlertCircle,
  Wand2,
  X,
  FileText,
} from 'lucide-react';
import type { JdIntelligenceResult } from '../types/ats';
import { requestJdIntelligence } from '../services/aiScreening';

interface SentinelJdAssistantProps {
  title: string;
  department: string;
  location: string;
  jobType: string;
  experienceRange: string;
  minCgpa: number;
  requiredSkills: string[];
  preferredSkills: string[];
  description: string;
  onAddRequiredSkill: (skill: string) => void;
  onAddPreferredSkill: (skill: string) => void;
  onAddAllRequiredSkills: (skills: string[]) => void;
  onAddAllPreferredSkills: (skills: string[]) => void;
  onApplyDescription: (nextDescription: string, mode: 'replace' | 'append') => void;
}

const QUICK_PROMPTS = [
  {
    label: 'Suggest Essential Skills',
    prompt:
      'Audit this role title and recommend the most essential required skills, complementary preferred skills, and a crisp role description.',
  },
  {
    label: 'Cloud & Production Scale',
    prompt:
      'Mention essential cloud infrastructure, observability, CI/CD, and production reliability skills suited for this role at scale.',
  },
  {
    label: 'Modern Architecture & Testing',
    prompt:
      'Add modern system architecture, automated testing, security, and performance optimization skills appropriate for this role.',
  },
];

export const SentinelJdAssistant: React.FC<SentinelJdAssistantProps> = ({
  title,
  department,
  location,
  jobType,
  experienceRange,
  minCgpa,
  requiredSkills,
  preferredSkills,
  description,
  onAddRequiredSkill,
  onAddPreferredSkill,
  onAddAllRequiredSkills,
  onAddAllPreferredSkills,
  onApplyDescription,
}) => {
  const [userPrompt, setUserPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JdIntelligenceResult | null>(null);
  const [appliedDescState, setAppliedDescState] = useState<'none' | 'replaced' | 'appended'>('none');

  const normalizedRequired = useMemo(
    () => new Set(requiredSkills.map((s) => s.trim().toLowerCase())),
    [requiredSkills]
  );
  const normalizedPreferred = useMemo(
    () => new Set(preferredSkills.map((s) => s.trim().toLowerCase())),
    [preferredSkills]
  );

  const pendingRequired = useMemo(
    () =>
      (result?.suggestedRequiredSkills ?? []).filter(
        (item) => !normalizedRequired.has(item.skill.trim().toLowerCase())
      ),
    [normalizedRequired, result]
  );

  const pendingPreferred = useMemo(
    () =>
      (result?.suggestedPreferredSkills ?? []).filter(
        (item) => !normalizedPreferred.has(item.skill.trim().toLowerCase())
      ),
    [normalizedPreferred, result]
  );

  const handleAskSentinel = async (overridePrompt?: string) => {
    const promptToSend = (overridePrompt ?? userPrompt).trim();
    if (!title.trim() && !promptToSend) {
      setError('Enter a Role Title or type an instruction for Sentinel AI first.');
      return;
    }

    if (overridePrompt) {
      setUserPrompt(overridePrompt);
    }

    setIsLoading(true);
    setError(null);
    setStatusMessage('Analyzing role profile with Sentinel AI...');
    setAppliedDescState('none');

    try {
      const response = await requestJdIntelligence(
        {
          title,
          department,
          location,
          jobType,
          experienceRange,
          minCgpa,
          requiredSkills,
          preferredSkills,
          description,
          userPrompt: promptToSend,
        },
        (msg) => setStatusMessage(msg)
      );
      setResult(response);
      setStatusMessage(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to reach Sentinel AI right now. You can still add skills manually below.'
      );
      setStatusMessage(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E4EC] bg-[#FAF9F6] p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#111936] text-[#EAB308] flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-xs sm:text-sm font-bold text-[#111936]">
                Sentinel AI — Job Description Intelligence
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded bg-[#FEFCE8] text-[#854D0E] border border-[#FDE047]">
                AI Assist
              </span>
            </div>
            <p className="text-xs text-[#4B5563] mt-0.5">
              Ask Sentinel AI to suggest or add necessary required &amp; preferred skills for this role, or add your own skills manually below.
            </p>
          </div>
        </div>

        {result && (
          <button
            type="button"
            onClick={() => setResult(null)}
            className="p-1 rounded-md text-[#64748B] hover:text-[#111936] hover:bg-white cursor-pointer"
            aria-label="Clear Sentinel AI suggestions"
            title="Hide suggestions"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Prompt Input & Action */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              void handleAskSentinel();
            }
          }}
          placeholder="Ask Sentinel AI (e.g. Mention Kafka & distributed caching, or suggest skills for this role)"
          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={() => void handleAskSentinel()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5" />
              Ask Sentinel AI
            </>
          )}
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-[#64748B] mr-0.5">Quick prompts:</span>
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isLoading}
            onClick={() => void handleAskSentinel(item.prompt)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-[#E2E4EC] text-[#1E40AF] hover:bg-[#EFF6FF] hover:border-[#BFDBFE] disabled:opacity-50 transition-colors cursor-pointer"
          >
            + {item.label}
          </button>
        ))}
      </div>

      {/* Status / Error */}
      {isLoading && statusMessage && (
        <div className="flex items-center gap-2 text-xs text-[#1E40AF] bg-white border border-[#BFDBFE] rounded-lg px-3 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-xs text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Area */}
      {result && (
        <div className="space-y-3 pt-2.5 border-t border-[#E2E4EC]">
          <div className="bg-white border border-[#FDE047] rounded-lg px-3 py-2 text-xs text-[#334155]">
            <span className="font-semibold text-[#854D0E]">Sentinel Insight: </span>
            {result.summaryNote}
          </div>

          {/* Suggested Required Skills */}
          {result.suggestedRequiredSkills.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#111936]">
                  Suggested Required Skills ({result.suggestedRequiredSkills.length})
                </span>
                {pendingRequired.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onAddAllRequiredSkills(pendingRequired.map((s) => s.skill))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1D4ED8] text-white hover:bg-[#1E40AF] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add All Missing ({pendingRequired.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {result.suggestedRequiredSkills.map((item) => {
                  const alreadyAdded = normalizedRequired.has(item.skill.trim().toLowerCase());
                  return (
                    <button
                      key={`req-${item.skill}`}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => onAddRequiredSkill(item.skill)}
                      className={`text-left px-2.5 py-2 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                        alreadyAdded
                          ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] cursor-default'
                          : 'bg-white border-[#E2E4EC] hover:border-[#1D4ED8] hover:bg-[#EFF6FF] text-[#111936] cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.skill}</div>
                        <div className="text-[11px] text-[#64748B] leading-snug line-clamp-2 mt-0.5">
                          {item.reason}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          alreadyAdded
                            ? 'bg-[#D1FAE5] text-[#047857]'
                            : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE]'
                        }`}
                      >
                        {alreadyAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Add
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested Preferred Skills */}
          {result.suggestedPreferredSkills.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#111936]">
                  Suggested Preferred Skills ({result.suggestedPreferredSkills.length})
                </span>
                {pendingPreferred.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onAddAllPreferredSkills(pendingPreferred.map((s) => s.skill))
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#111936] text-white hover:bg-[#1B254B] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Add All Missing ({pendingPreferred.length})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {result.suggestedPreferredSkills.map((item) => {
                  const alreadyAdded = normalizedPreferred.has(item.skill.trim().toLowerCase());
                  return (
                    <button
                      key={`pref-${item.skill}`}
                      type="button"
                      disabled={alreadyAdded}
                      onClick={() => onAddPreferredSkill(item.skill)}
                      className={`text-left px-2.5 py-2 rounded-lg border transition-colors flex items-start justify-between gap-2 ${
                        alreadyAdded
                          ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] cursor-default'
                          : 'bg-white border-[#E2E4EC] hover:border-[#854D0E] hover:bg-[#FEFCE8] text-[#111936] cursor-pointer'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{item.skill}</div>
                        <div className="text-[11px] text-[#64748B] leading-snug line-clamp-2 mt-0.5">
                          {item.reason}
                        </div>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          alreadyAdded
                            ? 'bg-[#D1FAE5] text-[#047857]'
                            : 'bg-[#FEFCE8] text-[#854D0E] border border-[#FDE047]'
                        }`}
                      >
                        {alreadyAdded ? (
                          <>
                            <Check className="w-3 h-3" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Add
                          </>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested Narrative */}
          {result.suggestedDescription && (
            <div className="bg-white border border-[#E2E4EC] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111936]">
                  <FileText className="w-3.5 h-3.5 text-[#1D4ED8]" />
                  Suggested Role Narrative
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onApplyDescription(result.suggestedDescription, 'append');
                      setAppliedDescState('appended');
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-medium border border-[#E2E4EC] bg-[#FAF9F6] hover:bg-[#F3F4F6] text-[#334155] cursor-pointer"
                  >
                    {appliedDescState === 'appended' ? 'Appended ✓' : 'Append to JD'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onApplyDescription(result.suggestedDescription, 'replace');
                      setAppliedDescState('replaced');
                    }}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1D4ED8] hover:bg-[#1E40AF] text-white cursor-pointer"
                  >
                    {appliedDescState === 'replaced' ? 'Applied ✓' : 'Use as JD Description'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-[#4B5563] leading-relaxed whitespace-pre-line">
                {result.suggestedDescription}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
