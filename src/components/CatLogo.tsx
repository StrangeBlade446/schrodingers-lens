import React from 'react';

interface CatLogoProps {
  className?: string;
  withBadge?: boolean;
}

const KRAKEN_PATH =
  'M49.86 7.72 L33.23 17.32 L33.37 18.32 L38.25 32.08 L38.1 32.51 L31.94 25.2 L25.06 22.34 L24.06 22.62 L13.45 28.79 L13.45 43.41 L18.32 48.71 L25.35 46.27 L27.78 40.83 L27.64 40.25 L24.63 38.39 L24.06 38.53 L21.91 39.97 L20.62 37.96 L20.19 36.81 L22.62 32.66 L23.2 32.08 L28.07 33.95 L32.51 41.97 L32.08 46.13 L31.8 46.42 L18.47 53.44 L13.45 60.32 L13.45 71.07 L24.06 77.23 L24.77 77.23 L33.52 74.22 L33.8 73.79 L35.24 68.49 L35.67 65.91 L32.8 61.47 L31.65 61.47 L28.5 62.04 L29.36 67.49 L28.64 67.92 L24.06 68.92 L21.62 65.91 L21.48 65.19 L24.63 59.6 L33.23 56.74 L40.83 52.72 L45.13 47.13 L45.56 46.85 L45.84 47.28 L45.7 48.14 L40.68 58.31 L38.53 67.06 L38.53 80.53 L41.97 87.41 L42.4 87.84 L50.0 92.14 L60.89 85.83 L63.19 79.53 L60.89 70.64 L54.3 68.35 L53.87 69.06 L52.72 73.36 L55.73 74.65 L56.16 79.1 L52.29 80.96 L50.86 81.39 L47.71 76.52 L47.42 75.8 L47.85 69.35 L53.44 61.18 L66.77 56.74 L75.23 59.6 L78.52 65.48 L75.8 68.92 L71.21 67.92 L70.5 67.49 L71.36 62.04 L68.2 61.47 L67.06 61.47 L64.19 65.91 L64.19 66.77 L66.2 74.08 L75.08 77.23 L76.09 77.09 L86.41 71.07 L86.41 60.32 L81.39 53.44 L68.06 46.42 L67.77 46.13 L67.34 42.26 L67.63 41.4 L71.79 33.95 L75.08 32.66 L76.8 32.23 L79.67 36.81 L79.24 37.96 L77.95 39.97 L75.8 38.53 L75.23 38.39 L72.22 40.25 L72.07 40.83 L74.51 46.27 L81.53 48.71 L86.41 43.41 L86.41 28.79 L75.23 22.34 L74.8 22.34 L67.92 25.2 L61.75 32.51 L61.61 32.08 L66.48 18.32 L66.63 17.32 Z M61.47 38.68 L59.75 42.55 L58.31 43.55 L55.3 43.55 L53.87 42.98 L53.44 42.55 L59.32 37.96 Z M38.39 38.68 L40.54 37.96 L46.42 42.55 L45.99 42.98 L44.55 43.55 L41.54 43.55 L40.11 42.55 Z';

export const CatLogo: React.FC<CatLogoProps> = ({ className = 'w-4 h-4', withBadge = false }) => {
  if (withBadge) {
    return (
      <div className={`relative flex items-center justify-center bg-[#FDBC02] rounded-lg overflow-hidden p-1 shadow-sm ${className}`}>
        <svg
          viewBox="0 0 100 100"
          fill="#0A0A0A"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-hidden="true"
        >
          <path fillRule="evenodd" clipRule="evenodd" d={KRAKEN_PATH} />
        </svg>
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path fillRule="evenodd" clipRule="evenodd" d={KRAKEN_PATH} />
    </svg>
  );
};

export const AppLogo = CatLogo;
export default CatLogo;
