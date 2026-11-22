import { ArrowRight, Play, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { StudioProject } from '../utils/projectFilters';
import type { ActiveModule } from '../types/ats';

interface ProjectModalProps {
  project: StudioProject | null;
  onClose: () => void;
  onDiscussSimilar: (scope: string) => void;
  onLaunchModule?: (module: ActiveModule) => void;
}

function mapCategoryToScope(category: StudioProject['category']): string {
  switch (category) {
    case 'Identity':
      return 'Enterprise ATS Deployment';
    case 'Motion':
      return 'AI Screening & Rejection Pilot';
    case 'Digital':
      return 'Custom Parameter Weights Consultation';
    default:
      return 'Full Pipeline Integration';
  }
}

function mapProjectToModule(projectId: string): ActiveModule {
  switch (projectId) {
    case 'holistic-evaluation-engine':
      return 'upload';
    case 'ai-detection-sentinel':
      return 'upload';
    case 'ats-friendly-certification':
      return 'jobs';
    case 'quantum-finalist-matrix':
      return 'ranklist';
    default:
      return 'overview';
  }
}

export function ProjectModal({
  project,
  onClose,
  onDiscussSimilar,
  onLaunchModule,
}: ProjectModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!project) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const targetModule = mapProjectToModule(project.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[#F7F7F5] text-[#0A0A0A] border border-black/15 shadow-2xl rounded-sm"
      >
        {/* Modal Top Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 md:px-8 py-4 bg-[#F7F7F5]/95 backdrop-blur-md border-b border-black/[0.08]">
          <div className="flex items-center gap-2 text-xs text-[#6E6E6A]">
            <span className="font-semibold text-[#0A0A0A]">{project.category}</span>
            <span aria-hidden="true">·</span>
            <span>{project.client}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{project.year}</span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close case study"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0A0A0A] hover:bg-black/[0.06] rounded-md transition-colors cursor-pointer"
          >
            <span>Close</span>
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Hero Media */}
        <div className="w-full aspect-[16/9] bg-[#EAEAE6] overflow-hidden border-b border-black/[0.08]">
          <img
            src={project.image}
            alt={project.imageAlt}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Editorial Body */}
        <div className="p-6 md:p-8 space-y-8">
          <div className="space-y-3">
            <h2
              id="case-study-modal-title"
              className="font-display text-2xl md:text-3xl font-extrabold tracking-[-0.025em] text-[#0A0A0A]"
            >
              {project.title}
            </h2>
            <p className="font-mono text-sm font-semibold text-[#1E40AF] tabular-nums">
              {project.metric}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 border-t border-black/[0.08]">
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6E6E6A]">The Challenge</h3>
              <p className="text-[15px] leading-relaxed text-[#2C2C2A]">{project.challenge}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6E6E6A]">Architecture &amp; Execution</h3>
              <p className="text-[15px] leading-relaxed text-[#2C2C2A]">{project.craftNote}</p>
            </div>
          </div>

          <div className="pt-6 border-t border-black/[0.08] flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-2">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#6E6E6A]">Key Capabilities</h3>
              <p className="text-sm font-medium text-[#0A0A0A]">
                {project.deliverables.join(' · ')}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {onLaunchModule && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onLaunchModule(targetModule);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold tracking-[0.02em] text-[#F7F7F5] bg-[#0A0A0A] rounded-full hover:bg-[#242422] transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>Launch Module in ATS</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onDiscussSimilar(mapCategoryToScope(project.category))}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-[0.02em] text-[#0A0A0A] border border-black/20 rounded-full hover:bg-black/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Calibrate Scope</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
