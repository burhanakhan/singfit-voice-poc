import './VoiceSpeakingBars.css';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Staircase bars — each pulses on its own beat (Eden speaking) */
export function VoiceSpeakingBars({ className, size = 'md' }: Props) {
  return (
    <div
      className={`voice-speaking-bars voice-speaking-bars--${size}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}
