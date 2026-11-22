import React from 'react';
import type { PipelineStage } from '../types/ats';

const STAGE_STYLES: Record<PipelineStage, string> = {
  Applied: 'bg-[#F4F5F8] text-[#334155] border-[#D8DCE8]',
  Shortlisted: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]',
  Interview: 'bg-[#FEFCE8] text-[#854D0E] border-[#FDE047]',
  Offer: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
  Rejected: 'bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]',
};

interface StageBadgeProps {
  stage: PipelineStage;
  className?: string;
}

export const StageBadge: React.FC<StageBadgeProps> = ({ stage, className = '' }) => {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-md border whitespace-nowrap shrink-0 ${STAGE_STYLES[stage]} ${className}`}
    >
      {stage}
    </span>
  );
};
