import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { STUDIO_PROJECTS } from '../data/studioData';
import {
  filterProjectsByCategory,
  getCategoryCounts,
  type ProjectCategory,
  type StudioProject,
} from '../utils/projectFilters';

interface WorkShowcaseProps {
  onSelectProject: (project: StudioProject) => void;
}

const CATEGORIES: ProjectCategory[] = ['All', 'Identity', 'Motion', 'Digital'];

function ProjectImage({ src, alt, title }: { src: string; alt: string; title: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#ECECE8] to-[#DFDFDA] p-8 text-center">
        <span className="font-display text-xl font-bold tracking-tight text-[#0A0A0A]">
          {title}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
    />
  );
}

export function WorkShowcase({ onSelectProject }: WorkShowcaseProps) {
  const [activeCategory, setActiveCategory] = useState<ProjectCategory>('All');
  const counts = getCategoryCounts(STUDIO_PROJECTS);
  const visibleProjects = filterProjectsByCategory(STUDIO_PROJECTS, activeCategory);

  return (
    <section
      id="work"
      aria-labelledby="work-heading"
      className="py-24 md:py-32 border-b border-black/[0.08] bg-[#F7F7F5]"
    >
      <div className="max-w-[1440px] mx-auto px-6 md:px-10">
        {/* Section Header + Interactive Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 md:pb-16 border-b border-black/[0.08]">
          <div className="max-w-2xl space-y-4">
            <p className="text-xs font-mono font-medium tracking-[0.04em] text-[#6E6E6A]">
              Talent Intelligence Architecture · 2026 Engine
            </p>
            <h2
              id="work-heading"
              className="font-display text-[clamp(2rem,3.6vw,3.25rem)] font-extrabold leading-[1.06] tracking-[-0.03em] text-[#0A0A0A] text-balance"
            >
              Multi-parameter evaluation engineered for holistic depth.
            </h2>
          </div>

          <div
            role="group"
            aria-label="Filter intelligence modules by discipline"
            className="flex flex-wrap items-center gap-1 p-1 bg-black/[0.045] rounded-lg self-start lg:self-end"
          >
            {CATEGORIES.map((category) => {
              const isSelected = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setActiveCategory(category)}
                  className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0A0A0A] ${
                    isSelected
                      ? 'bg-[#FFFFFF] text-[#0A0A0A] shadow-xs'
                      : 'text-[#5A5A56] hover:text-[#0A0A0A]'
                  }`}
                >
                  {category}{' '}
                  <span className="font-mono tabular-nums text-[11px] opacity-65">
                    ({counts[category]})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Asymmetric Editorial Showcase Grid */}
        <div
          data-testid="projects-grid"
          data-visible-count={visibleProjects.length}
          className="mt-12 md:mt-16 grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-14"
        >
          {visibleProjects.map((project, index) => {
            const isHeroSpan = activeCategory === 'All' && index === 0;
            return (
              <article
                key={project.id}
                className={`group flex flex-col ${
                  isHeroSpan
                    ? 'lg:col-span-8'
                    : index === 1 && activeCategory === 'All'
                      ? 'lg:col-span-4'
                      : 'lg:col-span-6'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectProject(project)}
                  aria-label={`View module architecture: ${project.title}`}
                  className="text-left flex flex-col h-full cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0A0A0A]"
                >
                  <div
                    className={`relative w-full overflow-hidden bg-[#EAEAE6] border border-black/[0.06] ${
                      isHeroSpan
                        ? 'aspect-[16/10]'
                        : index === 1 && activeCategory === 'All'
                          ? 'aspect-[4/3] lg:aspect-[4/5]'
                          : 'aspect-[4/3]'
                    }`}
                  >
                    <ProjectImage
                      src={project.image}
                      alt={project.imageAlt}
                      title={project.title}
                    />
                  </div>

                  <div className="pt-5 flex flex-col flex-1 justify-between gap-4">
                    <div className="space-y-2.5">
                      {/* Clean metadata */}
                      <div className="flex items-center gap-2 text-xs text-[#6E6E6A]">
                        <span>{project.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{project.client}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{project.year}</span>
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <h3 className="font-display text-xl md:text-2xl font-bold tracking-[-0.02em] text-[#0A0A0A] group-hover:text-[#1E40AF] transition-colors duration-150">
                          {project.title}
                        </h3>
                        <ArrowUpRight
                          className="w-5 h-5 shrink-0 text-[#6E6E6A] group-hover:text-[#0A0A0A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-150 mt-0.5"
                          aria-hidden="true"
                        />
                      </div>

                      <p className="text-[15px] leading-relaxed text-[#4A4A48] max-w-xl">
                        {project.summary}
                      </p>
                    </div>

                    <p className="pt-3 border-t border-black/[0.08] font-mono text-xs font-semibold text-[#0A0A0A] tabular-nums">
                      {project.metric}
                    </p>
                  </div>
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
