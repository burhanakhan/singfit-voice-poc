/** Studio player transport — Ionicons paths (studioButton #5FB7C6), matches StudioPlayer.tsx */
const STUDIO_BTN = '#5FB7C6';
const STUDIO_BTN_DISABLED = '#bec6c6';

const VIEW = '0 0 512 512';

/** ionicons play-skip-back */
const SKIP_BACK_D =
  'M112 64a16 16 0 0116 16v136.43L360.77 77.11a35.13 35.13 0 0135.77-.44c12 6.8 19.46 20 19.46 34.33v290c0 14.37-7.46 27.53-19.46 34.33a35.14 35.14 0 01-35.77-.45L128 295.57V432a16 16 0 01-32 0V80a16 16 0 0116-16z';

/** ionicons play-skip-forward */
const SKIP_FORWARD_D =
  'M400 64a16 16 0 00-16 16v136.43L151.23 77.11a35.13 35.13 0 00-35.77-.44C103.46 83.47 96 96.63 96 111v290c0 14.37 7.46 27.53 19.46 34.33a35.14 35.14 0 0035.77-.45L384 295.57V432a16 16 0 0032 0V80a16 16 0 00-16-16z';

/** ionicons play-circle */
const PLAY_CIRCLE_D =
  'M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm74.77 217.3l-114.45 69.14a10.78 10.78 0 01-16.32-9.31V186.87a10.78 10.78 0 0116.32-9.31l114.45 69.14a10.89 10.89 0 010 18.6z';

/** ionicons pause-circle */
const PAUSE_CIRCLE_D =
  'M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48zm-32 272a16 16 0 01-32 0V192a16 16 0 0132 0zm96 0a16 16 0 01-32 0V192a16 16 0 0132 0z';

type IconProps = { size?: number; className?: string; disabled?: boolean };

function TransportIcon({
  d,
  fill,
  size,
  className,
}: {
  d: string;
  fill: string;
  size: number;
  className?: string;
}) {
  return (
    <svg className={className} width={size} height={size} viewBox={VIEW} aria-hidden>
      <path fill={fill} d={d} />
    </svg>
  );
}

export function TransportSkipBack({ size = 38, className, disabled = false }: IconProps) {
  return (
    <TransportIcon
      className={className}
      size={size}
      fill={disabled ? STUDIO_BTN_DISABLED : STUDIO_BTN}
      d={SKIP_BACK_D}
    />
  );
}

export function TransportSkipForward({ size = 38, className }: IconProps) {
  return <TransportIcon className={className} size={size} fill={STUDIO_BTN} d={SKIP_FORWARD_D} />;
}

export function TransportPlayCircle({ size = 48, className }: IconProps) {
  return <TransportIcon className={className} size={size} fill={STUDIO_BTN} d={PLAY_CIRCLE_D} />;
}

export function TransportPauseCircle({ size = 48, className }: IconProps) {
  return <TransportIcon className={className} size={size} fill={STUDIO_BTN} d={PAUSE_CIRCLE_D} />;
}
