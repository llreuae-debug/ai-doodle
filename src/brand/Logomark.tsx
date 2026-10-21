interface Props {
  size?: number;
  className?: string;
}

/** Ai Doodle mark: a pen squiggle ending at the pen tip. */
export function Logomark({ size = 48, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="2" y="2" width="44" height="44" rx="12" fill="#7F56D9" />
      <path d="M11 31C14 19 20 17 23 25C26 33 32 33 36.5 18" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="36.5" cy="17.5" r="3.2" fill="#fff" />
    </svg>
  );
}
