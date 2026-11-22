import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  CLIENT_TESTIMONIALS,
  STUDIO_CAPABILITIES,
  STUDIO_METRICS,
} from '../data/studioData';

export function StorySection() {
  const [expandedIndex, setExpandedIndex] = useState<string>(STUDIO_CAPABILITIES[0].index);

  return (
    <section
      id="story"
      aria-labelledby="story-heading"
      className="py-24 md:py-32 border-b border-black/[0.08] bg-[#FFFFFF]"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10 space-y-20 md:space-y-24">
        {/* Top Editorial Split: Platform Philosophy + Capabilities */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Manifesto Column */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-mono font-medium tracking-[0.04em] text-[#6E6E6A]">
              Platform Philosophy &amp; Core Pillars
            </p>
            <h2
              id="story-heading"
              className="font-display text-[clamp(2rem,3.4vw,3rem)] font-extrabold leading-[1.08] tracking-[-0.03em] text-[#0A0A0A] text-balance"
            >
              Resume screening should observe the complete depth of human potential.
            </h2>
            <p className="text-[16px] leading-[1.7] text-[#4A4A48] max-w-prose">
              Schrodinger's Lens is an AI applicant evaluation platform built for high-conviction engineering organizations. We replace superficial keyword matching with deep holistic analysis—weighing project uniqueness, innovation, societal impact, feasibility, academic progression, and automated synthetic AI resume rejection.
            </p>

            {/* Concrete Studio Proof Metrics */}
            <dl className="grid grid-cols-3 gap-6 pt-8 border-t border-black/[0.08]">
              {STUDIO_METRICS.map((metric) => (
                <div key={metric.label} className="space-y-1.5">
                  <dt className="font-display text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] tabular-nums">
                    {metric.value}
                  </dt>
                  <dd className="text-xs leading-snug text-[#5A5A56]">{metric.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Right Numbered Editorial Capabilities List */}
          <div className="lg:col-span-7 border-t border-black/[0.1]">
            {STUDIO_CAPABILITIES.map((cap) => {
              const isOpen = expandedIndex === cap.index;
              return (
                <div key={cap.index} className="border-b border-black/[0.1]">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() =>
                      setExpandedIndex((prev) => (prev === cap.index ? '' : cap.index))
                    }
                    className="w-full py-6 flex items-center justify-between gap-6 text-left cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A]"
                  >
                    <div className="flex items-baseline gap-5">
                      <span className="font-mono text-sm text-[#6E6E6A] tabular-nums shrink-0">
                        {cap.index}
                      </span>
                      <span className="font-display text-xl md:text-2xl font-bold tracking-[-0.02em] text-[#0A0A0A] group-hover:text-[#1E40AF] transition-colors duration-150">
                        {cap.title}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-[#5A5A56] transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-[#0A0A0A]' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isOpen && (
                    <div className="pb-7 pl-0 sm:pl-12 pr-4 space-y-5">
                      <p className="text-[15px] leading-relaxed text-[#4A4A48] max-w-2xl">
                        {cap.summary}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                        <div className="space-y-1">
                          <span className="text-[#6E6E6A] font-semibold block">Deliverables &amp; Controls</span>
                          <span className="text-[#0A0A0A]">{cap.deliverables.join(' · ')}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[#6E6E6A] font-semibold block">
                            Screening Cadence · Benchmark
                          </span>
                          <span className="text-[#0A0A0A]">
                            {cap.timeline} — {cap.benchmark}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Attributable Client Endorsements */}
        <div className="pt-14 border-t border-black/[0.08] grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
          {CLIENT_TESTIMONIALS.map((item) => (
            <figure key={item.author} className="space-y-5 flex flex-col justify-between">
              <blockquote className="text-lg md:text-[19px] leading-[1.6] text-[#141412] font-normal">
                “{item.quote}”
              </blockquote>
              <figcaption className="pt-4 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-semibold text-[#0A0A0A]">{item.author}</span>
                  <span className="text-[#6E6E6A]">
                    {' '}
                    · {item.role}, {item.organization}
                  </span>
                </div>
                <span className="font-mono font-medium text-[#1E40AF] tabular-nums shrink-0">
                  {item.outcome}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
