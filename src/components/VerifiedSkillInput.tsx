import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import {
  findFuzzyCatalogSuggestions,
  findLocalCanonicalSkill,
  searchLocalSkillOptions,
} from '../data/realWorldSkills';
import { validateSkillsWithAi } from '../services/aiScreening';

interface RejectedSkillFeedback {
  input: string;
  reason: string;
  suggestions: string[];
}

interface VerifiedSkillInputProps {
  id: string;
  label: string;
  variant: 'required' | 'preferred';
  skills: string[];
  roleTitle: string;
  department: string;
  placeholder: string;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onAddVerifiedSkills: (verifiedSkills: string[]) => void;
  onRemoveSkill: (skill: string) => void;
  externalError?: string | null;
}

export const VerifiedSkillInput: React.FC<VerifiedSkillInputProps> = ({
  id,
  label,
  variant,
  skills,
  roleTitle,
  department,
  placeholder,
  draftValue,
  onDraftChange,
  onAddVerifiedSkills,
  onRemoveSkill,
  externalError,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [rejectedItems, setRejectedItems] = useState<RejectedSkillFeedback[]>([]);
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const normalizedExisting = useMemo(
    () => new Set(skills.map((s) => s.trim().toLowerCase())),
    [skills]
  );

  // Active token being typed (supports comma-separated entry)
  const activeQuery = useMemo(() => {
    const parts = draftValue.split(',');
    return (parts[parts.length - 1] ?? '').trim();
  }, [draftValue]);

  const localOptions = useMemo(
    () => searchLocalSkillOptions(activeQuery, skills, 8),
    [activeQuery, skills]
  );

  const exactLocalMatch = useMemo(
    () => (activeQuery ? findLocalCanonicalSkill(activeQuery) : null),
    [activeQuery]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (canonicalSkill: string) => {
    setRejectedItems([]);
    setServiceError(null);
    setStatusNote(null);

    if (!normalizedExisting.has(canonicalSkill.toLowerCase())) {
      onAddVerifiedSkills([canonicalSkill]);
    }

    // Remove only the last comma fragment if user typed multiple, else clear
    const parts = draftValue.split(',');
    if (parts.length > 1) {
      parts.pop();
      const remaining = parts
        .map((p) => p.trim())
        .filter(Boolean)
        .join(', ');
      onDraftChange(remaining);
    } else {
      onDraftChange('');
      setIsDropdownOpen(false);
    }
  };

  const handleSelectSuggestionChip = (rejectedInput: string, chosenSkill: string) => {
    if (!normalizedExisting.has(chosenSkill.toLowerCase())) {
      onAddVerifiedSkills([chosenSkill]);
    }
    setStatusNote(`Added verified real-world skill "${chosenSkill}".`);
    setServiceError(null);

    const remainingRejected = rejectedItems.filter(
      (item) => item.input.toLowerCase() !== rejectedInput.toLowerCase()
    );
    setRejectedItems(remainingRejected);

    const remainingDraftTokens = draftValue
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && s.toLowerCase() !== rejectedInput.toLowerCase());
    onDraftChange(remainingDraftTokens.join(', '));
  };

  const handleVerifyAndAdd = async () => {
    const rawTokens = draftValue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawTokens.length === 0) return;

    setIsDropdownOpen(false);
    setServiceError(null);
    setStatusNote(null);
    setRejectedItems([]);

    const verifiedToAdd: string[] = [];
    const normalizedAdded: string[] = [];
    const needsAiCheck: string[] = [];

    for (const token of rawTokens) {
      const local = findLocalCanonicalSkill(token);
      if (local) {
        if (!normalizedExisting.has(local.skill.toLowerCase())) {
          verifiedToAdd.push(local.skill);
          if (local.skill.toLowerCase() !== token.toLowerCase()) {
            normalizedAdded.push(`"${token}" → "${local.skill}"`);
          }
        }
      } else {
        needsAiCheck.push(token);
      }
    }

    const blocked: RejectedSkillFeedback[] = [];
    const remainingDraftTokens: string[] = [];

    if (needsAiCheck.length > 0) {
      setIsValidating(true);
      try {
        const response = await validateSkillsWithAi(needsAiCheck, {
          roleTitle,
          department,
        });

        for (const result of response.results) {
          if (result.isValid && result.canonicalName.trim()) {
            const clean = result.canonicalName.trim();
            if (!normalizedExisting.has(clean.toLowerCase())) {
              verifiedToAdd.push(clean);
              if (clean.toLowerCase() !== result.input.toLowerCase()) {
                normalizedAdded.push(`"${result.input}" → "${clean}"`);
              }
            }
          } else {
            const combinedSuggestions = Array.from(
              new Set([
                ...(result.suggestions ?? []),
                ...findFuzzyCatalogSuggestions(result.input, skills, 4),
              ])
            )
              .filter((s) => !normalizedExisting.has(s.toLowerCase()))
              .slice(0, 5);

            blocked.push({
              input: result.input,
              reason:
                result.reason ||
                `"${result.input}" is not a recognized real-world professional or technical skill.`,
              suggestions: combinedSuggestions,
            });
            remainingDraftTokens.push(result.input);
          }
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unable to verify unrecognized skill right now.';
        setServiceError(message);

        for (const token of needsAiCheck) {
          const fuzzy = findFuzzyCatalogSuggestions(token, skills, 4);
          blocked.push({
            input: token,
            reason:
              'Unrecognized in the verified skills catalog and AI verification could not complete.',
            suggestions: fuzzy,
          });
          remainingDraftTokens.push(token);
        }
      } finally {
        setIsValidating(false);
      }
    }

    if (verifiedToAdd.length > 0) {
      const deduped: string[] = [];
      const seen = new Set(skills.map((s) => s.trim().toLowerCase()));
      for (const s of verifiedToAdd) {
        const k = s.trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(s.trim());
        }
      }
      if (deduped.length > 0) {
        onAddVerifiedSkills(deduped);
      }
      if (normalizedAdded.length > 0) {
        setStatusNote(`Verified canonical skill: ${normalizedAdded.join(', ')}`);
      }
    }

    setRejectedItems(blocked);
    onDraftChange(remainingDraftTokens.join(', '));
  };

  const pillColors =
    variant === 'required'
      ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]'
      : 'bg-[#FEFCE8] border-[#FDE047] text-[#854D0E]';

  const pillCloseColors =
    variant === 'required'
      ? 'text-[#1E40AF] hover:text-[#111936]'
      : 'text-[#854D0E] hover:text-[#111936]';

  return (
    <div
      ref={containerRef}
      className="space-y-2 p-3.5 rounded-xl border border-[#E2E4EC] bg-[#FAF9F6]"
    >
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-[#111936]">
          {label} (<span className="font-mono-tabular">{skills.length}</span>)
        </label>
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#ECFDF5] border border-[#A7F3D0] text-[10px] font-semibold text-[#047857]">
          <ShieldCheck className="w-3 h-3" />
          Real-World Verified
        </span>
      </div>

      {/* Existing Skill Pills */}
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {skills.length === 0 ? (
          <span className="text-xs text-[#7B849E]">
            No {variant} skills added yet
          </span>
        ) : (
          skills.map((skill) => (
            <span
              key={skill}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${pillColors}`}
            >
              {skill}
              <button
                type="button"
                onClick={() => onRemoveSkill(skill)}
                className={`${pillCloseColors} cursor-pointer`}
                aria-label={`Remove ${variant} skill ${skill}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
      </div>

      {/* Input + Dropdown + Verify & Add Button */}
      <div className="relative pt-1">
        <div className="flex gap-1.5">
          <input
            id={id}
            type="text"
            value={draftValue}
            autoComplete="off"
            disabled={isValidating}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={(e) => {
              onDraftChange(e.target.value);
              setIsDropdownOpen(true);
              if (rejectedItems.length > 0) setRejectedItems([]);
              if (serviceError) setServiceError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                void handleVerifyAndAdd();
              } else if (e.key === 'Escape') {
                setIsDropdownOpen(false);
              }
            }}
            placeholder={placeholder}
            className={`flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-white border rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 ${
              rejectedItems.length > 0 || externalError
                ? 'border-[#F43F5E] focus:ring-[#E11D48]'
                : 'border-[#E2E4EC] focus:ring-[#1D4ED8]'
            }`}
          />
          <button
            type="button"
            disabled={isValidating || !draftValue.trim()}
            onClick={() => void handleVerifyAndAdd()}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#E2E4EC] bg-white hover:bg-[#EFF6FF] hover:border-[#BFDBFE] hover:text-[#1E40AF] text-[#111936] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
          >
            {isValidating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1D4ED8]" />
                Verifying...
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add
              </>
            )}
          </button>
        </div>

        {/* Live Real-World Skill Options Dropdown */}
        {isDropdownOpen && !isValidating && (localOptions.length > 0 || activeQuery.length > 0) && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#C2C7D6] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            <div className="px-2.5 py-1.5 bg-[#FAF9F6] border-b border-[#E2E4EC] flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
                {activeQuery ? 'Matching Real-World Skills' : 'Verified Real-World Options'}
              </span>
              <span className="text-[10px] text-[#64748B]">Click to add</span>
            </div>

            {localOptions.length > 0 ? (
              <div className="divide-y divide-[#F1F2F6]">
                {localOptions.map((option) => (
                  <button
                    key={option.skill}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectOption(option.skill);
                    }}
                    className="w-full px-2.5 py-1.5 text-left flex items-center justify-between gap-2 hover:bg-[#EFF6FF] text-xs text-[#111936] cursor-pointer transition-colors"
                  >
                    <span className="font-medium flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#047857]" />
                      {option.skill}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E2E4EC] text-[#64748B]">
                      {option.category}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-2.5 py-2 text-[11px] text-[#64748B]">
                No exact match in quick catalog for &ldquo;{activeQuery}&rdquo;.
              </div>
            )}

            {activeQuery && !exactLocalMatch && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  void handleVerifyAndAdd();
                }}
                className="w-full px-2.5 py-2 text-left bg-[#EFF6FF] hover:bg-[#DBEAFE] border-t border-[#BFDBFE] text-xs font-semibold text-[#1E40AF] flex items-center justify-between gap-2 cursor-pointer transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  Verify &amp; add &ldquo;{activeQuery}&rdquo; with AI Intelligence
                </span>
                <span className="text-[10px] font-semibold shrink-0">Enter ↵</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Banner */}
      {statusNote && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#047857] bg-[#ECFDF5] border border-[#A7F3D0] rounded-md px-2.5 py-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{statusNote}</span>
        </div>
      )}

      {/* External Submit Block Warning */}
      {externalError && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-md px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{externalError}</span>
        </div>
      )}

      {/* Service Error */}
      {serviceError && rejectedItems.length === 0 && (
        <div className="flex items-start gap-1.5 text-[11px] text-[#9F1239] bg-[#FFF1F2] border border-[#FECDD3] rounded-md px-2.5 py-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{serviceError}</span>
        </div>
      )}

      {/* Blocked Invalid / Misspelled Skill Feedback + AI Option Chips */}
      {rejectedItems.length > 0 && (
        <div className="space-y-2 rounded-lg bg-[#FFF1F2] border border-[#FECDD3] p-2.5">
          {rejectedItems.map((item) => (
            <div key={item.input} className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-1.5 text-[11px] text-[#9F1239]">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Blocked &ldquo;{item.input}&rdquo;:</span>{' '}
                    {item.reason}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRejectedItems((prev) =>
                      prev.filter((r) => r.input !== item.input)
                    );
                    const remaining = draftValue
                      .split(',')
                      .map((s) => s.trim())
                      .filter((s) => s && s.toLowerCase() !== item.input.toLowerCase());
                    onDraftChange(remaining.join(', '));
                  }}
                  className="text-[#9F1239] hover:text-[#111936] cursor-pointer shrink-0"
                  aria-label="Dismiss rejected skill notice"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {item.suggestions.length > 0 && (
                <div className="pl-5 space-y-1">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[#854D0E]">
                    Did you mean one of these real-world skills?
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {item.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSelectSuggestionChip(item.input, suggestion)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-[#FDE047] hover:bg-[#FEFCE8] text-[11px] font-semibold text-[#854D0E] cursor-pointer transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
