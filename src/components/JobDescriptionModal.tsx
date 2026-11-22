import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { JobDescription, JobTemplate, JobType } from '../types/ats';
import { JOB_TEMPLATES, JOB_TYPE_OPTIONS } from '../data/initialData';
import { findLocalCanonicalSkill } from '../data/realWorldSkills';
import { SentinelJdAssistant } from './SentinelJdAssistant';
import { GoogleLocationField } from './GoogleLocationField';
import { VerifiedSkillInput } from './VerifiedSkillInput';

interface JobDescriptionModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialJob?: JobDescription | null;
  existingCandidateCount?: number;
  mapsAvailable: boolean;
  onClose: () => void;
  onCreate: (payload: Omit<JobDescription, 'id' | 'createdAt' | 'status'>) => void;
  onUpdate: (updated: JobDescription, rescorePool: boolean) => void;
}

function mergeUniqueSkills(existing: string[], additions: string[]): string[] {
  const seen = new Set(existing.map((s) => s.trim().toLowerCase()));
  const next = [...existing];
  for (const raw of additions) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const canonical = findLocalCanonicalSkill(trimmed)?.skill ?? trimmed;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(canonical);
  }
  return next;
}

export const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({
  open,
  mode,
  initialJob,
  existingCandidateCount = 0,
  mapsAvailable,
  onClose,
  onCreate,
  onUpdate,
}) => {
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [location, setLocation] = useState('');
  const [locationPlaceId, setLocationPlaceId] = useState<string | undefined>(undefined);
  const [isLocationVerified, setIsLocationVerified] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [jobType, setJobType] = useState<JobType>('Hybrid');
  const [experienceRange, setExperienceRange] = useState('2–5 years');
  const [minCgpa, setMinCgpa] = useState(7.5);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([
    'TypeScript',
    'React',
    'Node.js',
    'PostgreSQL',
    'Docker',
  ]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([
    'AWS',
    'Redis',
    'GraphQL',
  ]);
  const [newRequiredSkill, setNewRequiredSkill] = useState('');
  const [newPreferredSkill, setNewPreferredSkill] = useState('');
  const [requiredSkillDraftError, setRequiredSkillDraftError] = useState<string | null>(null);
  const [preferredSkillDraftError, setPreferredSkillDraftError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'Active' | 'Paused'>('Active');
  const [rescorePool, setRescorePool] = useState(true);

  useEffect(() => {
    if (!open) return;
    setNewRequiredSkill('');
    setNewPreferredSkill('');
    setRequiredSkillDraftError(null);
    setPreferredSkillDraftError(null);
    setLocationError(null);
    if (mode === 'edit' && initialJob) {
      setTitle(initialJob.title);
      setDepartment(initialJob.department);
      setLocation(initialJob.location || '');
      setLocationPlaceId(initialJob.locationPlaceId);
      setIsLocationVerified(Boolean(initialJob.locationPlaceId));
      setJobType(initialJob.jobType || 'Hybrid');
      setExperienceRange(initialJob.experienceRange);
      setMinCgpa(initialJob.minCgpa);
      setRequiredSkills([...initialJob.requiredSkills]);
      setPreferredSkills([...initialJob.preferredSkills]);
      setDescription(initialJob.description);
      setStatus(initialJob.status);
      setRescorePool(true);
    } else {
      setTitle('');
      setDepartment('Engineering');
      setLocation('');
      setLocationPlaceId(undefined);
      setIsLocationVerified(false);
      setJobType('Hybrid');
      setExperienceRange('2–5 years');
      setMinCgpa(7.5);
      setRequiredSkills(['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker']);
      setPreferredSkills(['AWS', 'Redis', 'GraphQL']);
      setDescription('');
      setStatus('Active');
      setRescorePool(false);
    }
  }, [open, mode, initialJob]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleApplyTemplate = (tpl: JobTemplate) => {
    setTitle(tpl.title);
    setDepartment(tpl.department);
    setLocation(tpl.location || '');
    setLocationPlaceId(tpl.locationPlaceId);
    setIsLocationVerified(Boolean(tpl.locationPlaceId));
    setLocationError(null);
    setJobType(tpl.jobType);
    setExperienceRange(tpl.experienceRange);
    setMinCgpa(tpl.minCgpa);
    setRequiredSkills([...tpl.requiredSkills]);
    setPreferredSkills([...tpl.preferredSkills]);
    setDescription(tpl.description);
  };

  const handleRemoveSkill = (kind: 'required' | 'preferred', skill: string) => {
    if (kind === 'required') {
      setRequiredSkills((prev) => prev.filter((s) => s !== skill));
    } else {
      setPreferredSkills((prev) => prev.filter((s) => s !== skill));
    }
  };

  const handleApplyAiDescription = (nextDescription: string, applyMode: 'replace' | 'append') => {
    if (applyMode === 'replace') {
      setDescription(nextDescription);
      return;
    }
    setDescription((prev) =>
      prev.trim() ? `${prev.trim()}\n\n${nextDescription}` : nextDescription
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (!location.trim()) {
      setLocationError('Please specify a job location.');
      return;
    }

    if (newRequiredSkill.trim()) {
      setRequiredSkillDraftError(
        'Click Add to verify this required skill against real-world options, or clear the input box before saving.'
      );
      return;
    }

    if (newPreferredSkill.trim()) {
      setPreferredSkillDraftError(
        'Click Add to verify this preferred skill against real-world options, or clear the input box before saving.'
      );
      return;
    }

    const parsedRequired = [...requiredSkills];
    const parsedPreferred = [...preferredSkills];
    const normalizedCgpa = Math.max(0, Math.min(10, Number(minCgpa) || 7.5));
    const finalDescription =
      description.trim() ||
      `Hiring a ${title.trim()} (${jobType}) to join our ${department.trim() || 'Engineering'} team in ${location.trim()}.`;

    if (mode === 'edit' && initialJob) {
      onUpdate(
        {
          ...initialJob,
          title: title.trim(),
          department: department.trim() || 'Engineering',
          location: location.trim(),
          locationPlaceId: isLocationVerified ? locationPlaceId : undefined,
          jobType,
          experienceRange: experienceRange.trim() || '2–5 years',
          minCgpa: normalizedCgpa,
          requiredSkills: parsedRequired,
          preferredSkills: parsedPreferred,
          description: finalDescription,
          status,
        },
        rescorePool
      );
      onClose();
      return;
    }

    onCreate({
      title: title.trim(),
      department: department.trim() || 'Engineering',
      location: location.trim(),
      locationPlaceId: isLocationVerified ? locationPlaceId : undefined,
      jobType,
      experienceRange: experienceRange.trim() || '2–5 years',
      minCgpa: normalizedCgpa,
      requiredSkills: parsedRequired,
      preferredSkills: parsedPreferred,
      description: finalDescription,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111936]/50"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'edit' ? 'Update Job Description' : 'Create New Job Description'}
    >
      <div className="bg-white border border-[#C2C7D6] rounded-xl w-full max-w-3xl overflow-hidden max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-[#E2E4EC] bg-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-display text-base font-bold text-[#111936]">
              {mode === 'edit' ? 'Update Job Description' : 'Create Job Description'}
            </h3>
            <p className="text-xs text-[#64748B]">
              {mode === 'edit'
                ? 'Use Sentinel AI JD Intelligence or manually refine role skills, Google location, & job type'
                : 'Pre-fill from a template, verify a real Google Maps location, and select job type'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111936] hover:bg-[#FAF9F6] cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto bg-white">
          {mode === 'create' && (
            <div>
              <span className="block text-xs font-semibold text-[#111936] mb-1.5">
                Load from Template
              </span>
              <div className="flex flex-wrap gap-1.5">
                {JOB_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl)}
                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-[#E2E4EC] bg-[#FAF9F6] hover:bg-[#FEFCE8] hover:border-[#FDE047] hover:text-[#854D0E] text-[#111936] transition-colors cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="modal-jd-title" className="block text-xs font-semibold text-[#334155] mb-1">
                Role Title
              </label>
              <input
                id="modal-jd-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Engineer"
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="modal-jd-dept" className="block text-xs font-semibold text-[#334155] mb-1">
                Department
              </label>
              <input
                id="modal-jd-dept"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
              />
            </div>

            <div>
              <GoogleLocationField
                value={location}
                placeId={locationPlaceId}
                isVerified={isLocationVerified}
                validationError={locationError}
                mapsAvailable={mapsAvailable}
                onChangeLocation={(next) => {
                  setLocation(next.location);
                  setLocationPlaceId(next.placeId);
                  setIsLocationVerified(next.verified);
                  if (next.location.trim()) {
                    setLocationError(null);
                  }
                }}
              />
            </div>

            <div>
              <label htmlFor="modal-jd-jobtype" className="block text-xs font-semibold text-[#334155] mb-1">
                Job Type
              </label>
              <select
                id="modal-jd-jobtype"
                value={jobType}
                onChange={(e) => setJobType(e.target.value as JobType)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent cursor-pointer"
              >
                {JOB_TYPE_OPTIONS.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(['Hybrid', 'Work from Home', 'Online', 'Office'] as JobType[]).map((quickType) => (
                  <button
                    key={quickType}
                    type="button"
                    onClick={() => setJobType(quickType)}
                    className={`px-2 py-0.5 text-[11px] font-medium rounded border transition-colors cursor-pointer ${
                      jobType === quickType
                        ? 'bg-[#111936] text-white border-[#111936]'
                        : 'bg-[#FAF9F6] text-[#4B5563] border-[#E2E4EC] hover:border-[#B8BDCE]'
                    }`}
                  >
                    {quickType}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="modal-jd-exp" className="block text-xs font-semibold text-[#334155] mb-1">
                Experience Range
              </label>
              <input
                id="modal-jd-exp"
                type="text"
                value={experienceRange}
                onChange={(e) => setExperienceRange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="modal-jd-cgpa" className="block text-xs font-semibold text-[#334155] mb-1">
                Minimum CGPA
              </label>
              <input
                id="modal-jd-cgpa"
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={minCgpa}
                onChange={(e) => setMinCgpa(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono-tabular bg-white border border-[#E2E4EC] rounded-lg text-[#111936] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
              />
            </div>
          </div>

          {mode === 'edit' && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[#FAF9F6] border border-[#E2E4EC]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#334155]">Requisition Status:</span>
                <div className="inline-flex rounded-md border border-[#E2E4EC] bg-white p-0.5">
                  {(['Active', 'Paused'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        status === st
                          ? st === 'Active'
                            ? 'bg-[#047857] text-white'
                            : 'bg-[#111936] text-white'
                          : 'text-[#64748B] hover:text-[#111936]'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {existingCandidateCount > 0 && (
                <label className="inline-flex items-center gap-2 text-xs font-medium text-[#334155] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rescorePool}
                    onChange={(e) => setRescorePool(e.target.checked)}
                    className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D4ED8] focus:ring-[#1D4ED8] cursor-pointer"
                  />
                  Re-score{' '}
                  <span className="font-mono-tabular font-semibold">{existingCandidateCount}</span>{' '}
                  existing candidate{existingCandidateCount === 1 ? '' : 's'}
                </label>
              )}
            </div>
          )}

          {/* Option 1: Sentinel AI Job Description Intelligence */}
          <SentinelJdAssistant
            title={title}
            department={department}
            location={location}
            jobType={jobType}
            experienceRange={experienceRange}
            minCgpa={minCgpa}
            requiredSkills={requiredSkills}
            preferredSkills={preferredSkills}
            description={description}
            onAddRequiredSkill={(skill) =>
              setRequiredSkills((prev) => mergeUniqueSkills(prev, [skill]))
            }
            onAddPreferredSkill={(skill) =>
              setPreferredSkills((prev) => mergeUniqueSkills(prev, [skill]))
            }
            onAddAllRequiredSkills={(skills) =>
              setRequiredSkills((prev) => mergeUniqueSkills(prev, skills))
            }
            onAddAllPreferredSkills={(skills) =>
              setPreferredSkills((prev) => mergeUniqueSkills(prev, skills))
            }
            onApplyDescription={handleApplyAiDescription}
          />

          {/* Option 2: Real-World Verified Skill Authoring (Required + Preferred) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <VerifiedSkillInput
              id="modal-req-skill-input"
              label="Required Skills"
              variant="required"
              skills={requiredSkills}
              roleTitle={title}
              department={department}
              placeholder="Search or type real skill (e.g. TypeScript, Kafka)"
              draftValue={newRequiredSkill}
              onDraftChange={(val) => {
                setNewRequiredSkill(val);
                if (requiredSkillDraftError) setRequiredSkillDraftError(null);
              }}
              onAddVerifiedSkills={(added) =>
                setRequiredSkills((prev) => mergeUniqueSkills(prev, added))
              }
              onRemoveSkill={(skill) => handleRemoveSkill('required', skill)}
              externalError={requiredSkillDraftError}
            />

            <VerifiedSkillInput
              id="modal-pref-skill-input"
              label="Preferred Skills"
              variant="preferred"
              skills={preferredSkills}
              roleTitle={title}
              department={department}
              placeholder="Search or type real skill (e.g. Redis, Terraform)"
              draftValue={newPreferredSkill}
              onDraftChange={(val) => {
                setNewPreferredSkill(val);
                if (preferredSkillDraftError) setPreferredSkillDraftError(null);
              }}
              onAddVerifiedSkills={(added) =>
                setPreferredSkills((prev) => mergeUniqueSkills(prev, added))
              }
              onRemoveSkill={(skill) => handleRemoveSkill('preferred', skill)}
              externalError={preferredSkillDraftError}
            />
          </div>

          <div>
            <label htmlFor="modal-jd-desc" className="block text-xs font-semibold text-[#334155] mb-1">
              Job Description Details
            </label>
            <textarea
              id="modal-jd-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe role responsibilities, stack, and qualifications..."
              className="w-full px-3 py-2 text-sm bg-white border border-[#E2E4EC] rounded-lg text-[#111936] placeholder:text-[#7B849E] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8] focus:border-transparent"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#334155] bg-white border border-[#E2E4EC] hover:bg-[#FAF9F6] hover:border-[#B8BDCE] rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1D4ED8] hover:bg-[#1E40AF] rounded-lg cursor-pointer"
            >
              {mode === 'edit' ? 'Save Job Description' : 'Create & Open Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
