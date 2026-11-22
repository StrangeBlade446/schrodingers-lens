import React from 'react';

interface CatLogoProps {
  className?: string;
}

export const CatLogo: React.FC<CatLogoProps> = ({ className = 'w-4 h-4' }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Cat head with pointed ears */}
      <path
        d="M4.2 10.6V4.4C4.2 3.7 5.0 3.3 5.5 3.8L9.2 7.1C10.05 6.85 11.0 6.72 12 6.72C13.0 6.72 13.95 6.85 14.8 7.1L18.5 3.8C19.0 3.3 19.8 3.7 19.8 4.4V10.6C20.55 11.75 21 13.1 21 14.55C21 18.65 16.95 21.2 12 21.2C7.05 21.2 3 18.65 3 14.55C3 13.1 3.45 11.75 4.2 10.6Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Cat eyes */}
      <circle cx="9.1" cy="13.4" r="1.15" fill="currentColor" />
      <circle cx="14.9" cy="13.4" r="1.15" fill="currentColor" />
      {/* Cat nose & mouth */}
      <path
        d="M11.15 15.85H12.85L12 16.9L11.15 15.85Z"
        fill="currentColor"
      />
      <path
        d="M10.1 18.15C10.65 18.65 11.45 18.65 12 17.85C12.55 18.65 13.35 18.65 13.9 18.15"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Whiskers */}
      <path
        d="M2.2 14.4H5.3M2.5 16.6H5.5M18.7 14.4H21.8M18.5 16.6H21.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
};
