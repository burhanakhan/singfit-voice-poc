type Props = {
  className?: string;
  height?: number;
  /** filled = center orb; outline = bottom status badge (screen_3) */
  variant?: 'filled' | 'outline';
};

/** Minimal mic — matches DemoScreens screen_3 / screen_5 */
export function VoiceLineMicIcon({
  className,
  height = 44,
  variant = 'filled',
}: Props) {
  const width = (height * 56) / 60;
  const stroke = height < 20 ? 2.35 : 2.75;
  const outline = variant === 'outline';

  return (
    <svg
      className={className}
      viewBox="0 0 56 60"
      width={width}
      height={height}
      aria-hidden
    >
      <path
        d="M11 35a17 17 0 0 0 34 0"
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="52"
        x2="28"
        y2="58"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <line
        x1="17"
        y1="58"
        x2="39"
        y2="58"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      <rect
        x="18"
        y="0"
        width="20"
        height="45"
        rx="10"
        fill={outline ? 'none' : 'currentColor'}
        stroke={outline ? 'currentColor' : undefined}
        strokeWidth={outline ? stroke : undefined}
      />
    </svg>
  );
}
