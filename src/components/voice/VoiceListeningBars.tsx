import './VoiceListeningBars.css';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Symmetric voice-activity bars — Nina speaking / speech detected */
export function VoiceListeningBars({ className, size = 'sm' }: Props) {
  const count = size === 'md' ? 7 : 5;
  return (
    <div
      className={`voice-listening-bars voice-listening-bars--${size}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
