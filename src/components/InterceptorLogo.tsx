import React from 'react';

interface InterceptorLogoProps {
  size?: number;
  className?: string;
  showSquircle?: boolean;
}

export const InterceptorLogo: React.FC<InterceptorLogoProps> = ({
  size = 18,
  className = '',
  showSquircle = false,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${className}`}
      aria-label="Interceptor Logo"
    >
      <defs>
        <linearGradient id="interceptorGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="75%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        <linearGradient id="interceptorCore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>

        <radialGradient id="interceptorGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Optional Dark Squircle Background */}
      {showSquircle && (
        <>
          <rect
            x="1"
            y="1"
            width="30"
            height="30"
            rx="7"
            fill="#141517"
            stroke="#2e3136"
            strokeWidth="0.75"
          />
          <circle cx="16" cy="16" r="12" fill="url(#interceptorGlow)" />
        </>
      )}

      {/* Central Vertical Pillar ("I") */}
      <rect
        x="14.5"
        y="5.5"
        width="3"
        height="21"
        rx="0.75"
        fill="url(#interceptorGold)"
      />
      <rect
        x="15.25"
        y="7"
        width="1.5"
        height="18"
        rx="0.5"
        fill="url(#interceptorCore)"
        opacity="0.9"
      />

      {/* Converging Kinetic Chevrons ("X" Intercept Wings) */}
      {/* Left Chevrons */}
      <polygon
        points="6.5,6.5 13.5,13.5 12,16 13.5,18.5 6.5,25.5 12,17.5 10.5,16 12,14.5"
        fill="url(#interceptorGold)"
      />

      {/* Right Chevrons */}
      <polygon
        points="25.5,6.5 18.5,13.5 20,16 18.5,18.5 25.5,25.5 20,17.5 21.5,16 20,14.5"
        fill="url(#interceptorGold)"
      />

      {/* Diagonal Intercept Crossbar */}
      <polygon
        points="12,17.5 20,13.5 20.75,14.5 12.75,18.5"
        fill="#fef08a"
        opacity="0.95"
      />
    </svg>
  );
};
