import React from 'react';

export interface LookupLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const LookupLogo: React.FC<LookupLogoProps> = ({ size = 24, className = '', withGlow = false }) => {
  const id = React.useId();
  const gradId = `lookup-grad-${id.replace(/:/g, '')}`;
  const coreGradId = `lookup-core-grad-${id.replace(/:/g, '')}`;
  const glowId = `lookup-glow-${id.replace(/:/g, '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 select-none ${className}`}
      aria-label="LOOKUP Logo">
      <defs>
        {/* Main shield gradient */}
        <linearGradient id={gradId} x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0EA5E9" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#6366F1" />
        </linearGradient>

        {/* Central core gradient */}
        <linearGradient id={coreGradId} x1="16" y1="16" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#BAE6FD" />
        </linearGradient>

        {/* Glow filter if enabled */}
        {withGlow && (
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>

      {/* Outer rounded squircle container */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        fill={`url(#${gradId})`}
        filter={withGlow ? `url(#${glowId})` : undefined}
      />

      {/* Subtle geometric shield / aperture overlay */}
      <rect x="3" y="3" width="42" height="42" rx="12" stroke="rgba(255, 255, 255, 0.25)" strokeWidth="1.5" />

      {/* Inner diamond viewfinder */}
      <path
        d="M24 11L37 24L24 37L11 24Z"
        fill="none"
        stroke="rgba(255, 255, 255, 0.45)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Focus crosshairs / privacy boundary indicators */}
      <circle cx="24" cy="24" r="8.5" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="2" />

      {/* Radiant central AI core */}
      <circle cx="24" cy="24" r="4" fill={`url(#${coreGradId})`} />
      <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
    </svg>
  );
};

export default LookupLogo;
