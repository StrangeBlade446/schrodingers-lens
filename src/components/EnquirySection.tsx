import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ENQUIRY_BUDGETS, ENQUIRY_SCOPES } from '../data/studioData';
import {
  formatBriefReference,
  validateEnquiryForm,
  type EnquiryFormValues,
  type EnquiryValidationErrors,
} from '../utils/projectFilters';

interface EnquirySectionProps {
  preselectedScope?: string;
  onLaunchPlatform?: () => void;
}

interface SubmittedReceipt {
  reference: string;
  name: string;
  email: string;
  scope: string;
  budget: string;
}

const INITIAL_VALUES: EnquiryFormValues = {
  name: '',
  email: '',
  company: '',
  scope: ENQUIRY_SCOPES[0],
  budget: ENQUIRY_BUDGETS[1],
  brief: '',
};

export function EnquirySection({ preselectedScope, onLaunchPlatform }: EnquirySectionProps) {
  const [values, setValues] = useState<EnquiryFormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<EnquiryValidationErrors>({});
  const [submitted, setSubmitted] = useState<SubmittedReceipt | null>(null);

  useEffect(() => {
    if (preselectedScope && ENQUIRY_SCOPES.includes(preselectedScope)) {
      setValues((prev) => ({ ...prev, scope: preselectedScope }));
      setSubmitted(null);
    }
  }, [preselectedScope]);

  const handleFieldChange = (field: keyof EnquiryFormValues, nextValue: string) => {
    setValues((prev) => ({ ...prev, [field]: nextValue }));
    if (field === 'name' || field === 'email' || field === 'brief') {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateEnquiryForm(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSubmitted({
      reference: formatBriefReference(values.name, Date.now()),
      name: values.name.trim(),
      email: values.email.trim(),
      scope: values.scope,
      budget: values.budget,
    });
  };

  const handleReset = () => {
    setValues(INITIAL_VALUES);
    setErrors({});
    setSubmitted(null);
  };

  return (
    <section
      id="enquire"
      aria-labelledby="enquire-heading"
      className="py-24 md:py-32 bg-[#F7F7F5]"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Direct Invitation & Platform Details */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-mono font-medium tracking-[0.04em] text-[#6E6E6A]">
              Enterprise Calibrations · Q2 / Q3 2026
            </p>
            <h2
              id="enquire-heading"
              className="font-display text-[clamp(2rem,3.4vw,3.15rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-[#0A0A0A] text-balance"
            >
              Calibrate your candidate screening with quantum rigor.
            </h2>
            <p className="text-[15px] leading-relaxed text-[#4A4A48] max-w-md">
              Deploy Schrodinger's Lens across your technical hiring pipeline. Eliminate superficial keyword filtering, auto-disqualify synthetic AI resumes, and surface true engineering innovation.
            </p>

            <div className="pt-6 border-t border-black/[0.08] space-y-3 text-sm">
              <div>
                <span className="text-xs text-[#6E6E6A] block">Direct enterprise desk</span>
                <a
                  href="mailto:enterprise@schrodingerslens.ai"
                  className="font-medium text-[#0A0A0A] underline underline-offset-4 decoration-black/25 hover:decoration-black transition-colors"
                >
                  enterprise@schrodingerslens.ai
                </a>
              </div>
              <div className="text-xs text-[#6E6E6A]">
                San Francisco · Bengaluru · London · Tokyo
              </div>
            </div>

            {onLaunchPlatform && (
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onLaunchPlatform}
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#1E40AF] hover:underline underline-offset-4 cursor-pointer"
                >
                  <span>Already have an account? Enter ATS Workspace &rarr;</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Validated Project Brief Form */}
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-black/[0.08] p-6 sm:p-8 md:p-10">
            {submitted ? (
              <div
                data-testid="enquiry-confirmation"
                className="py-8 space-y-6"
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-3 text-[#0A0A0A]">
                  <CheckCircle2 className="w-6 h-6 text-[#1E40AF] shrink-0" aria-hidden="true" />
                  <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">
                    Enterprise Calibration Logged
                  </h3>
                </div>

                <p className="text-[15px] leading-relaxed text-[#4A4A48] max-w-xl">
                  Thank you, <span className="font-semibold text-[#0A0A0A]">{submitted.name}</span>.
                  Our talent intelligence architects have registered your{' '}
                  <span className="font-medium text-[#0A0A0A]">{submitted.scope}</span> calibration inquiry and
                  will follow up at{' '}
                  <span className="font-medium text-[#0A0A0A]">{submitted.email}</span> within one
                  business day.
                </p>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-5 border-y border-black/[0.08] text-xs">
                  <div>
                    <dt className="text-[#6E6E6A]">Reference Number</dt>
                    <dd className="font-mono font-medium text-[#0A0A0A] mt-1 tabular-nums">
                      {submitted.reference}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6E6E6A]">Selected Scope</dt>
                    <dd className="font-medium text-[#0A0A0A] mt-1">{submitted.scope}</dd>
                  </div>
                  <div>
                    <dt className="text-[#6E6E6A]">Volume Tier</dt>
                    <dd className="font-mono font-medium text-[#0A0A0A] mt-1 tabular-nums">
                      {submitted.budget}
                    </dd>
                  </div>
                </dl>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center px-5 py-2.5 text-xs font-semibold text-[#0A0A0A] border border-black/20 rounded-full hover:bg-black/[0.04] transition-colors cursor-pointer"
                  >
                    Submit another intake brief
                  </button>

                  {onLaunchPlatform && (
                    <button
                      type="button"
                      onClick={onLaunchPlatform}
                      className="inline-flex items-center px-5 py-2.5 text-xs font-semibold text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] transition-colors cursor-pointer"
                    >
                      Enter ATS Platform
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-8">
                {/* Scope Selector */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-[#0A0A0A]">
                    Engagement Architecture
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_SCOPES.map((scope) => {
                      const active = values.scope === scope;
                      return (
                        <button
                          key={scope}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleFieldChange('scope', scope)}
                          className={`px-4 py-2 text-xs font-medium rounded-md border transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#0A0A0A] text-[#F7F7F5] border-[#0A0A0A]'
                              : 'bg-[#F7F7F5] text-[#4A4A48] border-black/10 hover:border-black/30 hover:text-[#0A0A0A]'
                          }`}
                        >
                          {scope}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Candidate Volume Tier Selector */}
                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-[#0A0A0A]">
                    Monthly Applicant Volume
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_BUDGETS.map((budget) => {
                      const active = values.budget === budget;
                      return (
                        <button
                          key={budget}
                          type="button"
                          aria-pressed={active}
                          onClick={() => handleFieldChange('budget', budget)}
                          className={`px-4 py-2 font-mono text-xs tabular-nums rounded-md border transition-colors duration-150 whitespace-nowrap cursor-pointer ${
                            active
                              ? 'bg-[#0A0A0A] text-[#F7F7F5] border-[#0A0A0A]'
                              : 'bg-[#F7F7F5] text-[#4A4A48] border-black/10 hover:border-black/30 hover:text-[#0A0A0A]'
                          }`}
                        >
                          {budget}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label
                      htmlFor="enquiry-name"
                      className="block text-xs font-semibold text-[#0A0A0A]"
                    >
                      Full name
                    </label>
                    <input
                      id="enquiry-name"
                      name="name"
                      type="text"
                      required
                      value={values.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      placeholder="Dr. Aris Thorne"
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'enquiry-name-error' : undefined}
                      className={`w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border rounded-md text-[#0A0A0A] placeholder:text-[#8E8E88] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] transition-colors ${
                        errors.name ? 'border-[#B91C1C]' : 'border-black/15'
                      }`}
                    />
                    {errors.name && (
                      <p
                        id="enquiry-name-error"
                        role="alert"
                        className="text-xs text-[#B91C1C] font-medium"
                      >
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="enquiry-email"
                      className="block text-xs font-semibold text-[#0A0A0A]"
                    >
                      Work email
                    </label>
                    <input
                      id="enquiry-email"
                      name="email"
                      type="email"
                      required
                      value={values.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="aris@company.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'enquiry-email-error' : undefined}
                      className={`w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border rounded-md text-[#0A0A0A] placeholder:text-[#8E8E88] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] transition-colors ${
                        errors.email ? 'border-[#B91C1C]' : 'border-black/15'
                      }`}
                    />
                    {errors.email && (
                      <p
                        id="enquiry-email-error"
                        role="alert"
                        className="text-xs text-[#B91C1C] font-medium"
                      >
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="enquiry-company"
                    className="block text-xs font-semibold text-[#0A0A0A]"
                  >
                    Organization or company <span className="font-normal text-[#6E6E6A]">(optional)</span>
                  </label>
                  <input
                    id="enquiry-company"
                    name="company"
                    type="text"
                    value={values.company}
                    onChange={(e) => handleFieldChange('company', e.target.value)}
                    placeholder="QuantumCloud Labs"
                    className="w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border border-black/15 rounded-md text-[#0A0A0A] placeholder:text-[#8E8E88] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="enquiry-brief"
                    className="block text-xs font-semibold text-[#0A0A0A]"
                  >
                    Hiring objectives &amp; evaluation requirements
                  </label>
                  <textarea
                    id="enquiry-brief"
                    name="brief"
                    rows={4}
                    required
                    value={values.brief}
                    onChange={(e) => handleFieldChange('brief', e.target.value)}
                    placeholder="Describe your current applicant pipeline, rejection criteria, custom parameter priorities, and timeline."
                    aria-invalid={Boolean(errors.brief)}
                    aria-describedby={errors.brief ? 'enquiry-brief-error' : undefined}
                    className={`w-full px-3.5 py-2.5 text-sm bg-[#F7F7F5] border rounded-md text-[#0A0A0A] placeholder:text-[#8E8E88] focus:outline-none focus:ring-2 focus:ring-[#0A0A0A] transition-colors resize-y ${
                      errors.brief ? 'border-[#B91C1C]' : 'border-black/15'
                    }`}
                  />
                  {errors.brief && (
                    <p
                      id="enquiry-brief-error"
                      role="alert"
                      className="text-xs text-[#B91C1C] font-medium"
                    >
                      {errors.brief}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-xs text-[#6E6E6A]">
                    No sales spam. Direct technical intake review by hiring architects.
                  </p>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold tracking-[0.03em] uppercase text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] active:scale-[0.98] transition-all duration-150 whitespace-nowrap cursor-pointer shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
                  >
                    <span>Submit Calibration Brief</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
