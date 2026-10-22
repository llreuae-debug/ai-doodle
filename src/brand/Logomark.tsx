interface Props {
  size?: number;
  className?: string;
}

/** Ai Doodle futuristic mark: neon gradient badge with a luminous pen stroke. */
export function Logomark({ size = 48, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="logo-neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9B5CFF" />
          <stop offset="50%" stopColor="#4361FF" />
          <stop offset="100%" stopColor="#00F5FF" />
        </linearGradient>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00F5FF" floodOpacity="0.4" />
        </filter>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#logo-neon-grad)" filter="url(#logo-glow)" />
      <rect x="2" y="2" width="44" height="44" rx="12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <path d="M11 31C14 19 20 17 23 25C26 33 32 33 36.5 18" stroke="#ffffff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="36.5" cy="17.5" r="3.2" fill="#ffffff" />
    </svg>
  );
}
