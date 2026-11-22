import React from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, size = 40 }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const strokeWidth = 3.5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const tone =
    clamped >= 80
      ? { stroke: '#047857', text: 'text-[#047857]', track: '#D1FAE5' }
      : clamped >= 65
        ? { stroke: '#1D4ED8', text: 'text-[#1E40AF]', track: '#DBEAFE' }
        : { stroke: '#B45309', text: 'text-[#B45309]', track: '#FEF3C7' };

  return (
    <div className="inline-flex items-center gap-2 shrink-0">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={tone.track}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={tone.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-200 ease-out"
          />
        </svg>
        <span className={`absolute text-[11px] font-bold tabular-nums ${tone.text}`}>
          {clamped}
        </span>
      </div>
    </div>
  );
};
