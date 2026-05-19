import './VoiceThinkingDots.css';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Three bouncing dots — Eden thinking (orb + bottom badge) */
export function VoiceThinkingDots({ className, size = 'md' }: Props) {
  return (
    <div
      className={`voice-thinking-dots voice-thinking-dots--${size}${className ? ` ${className}` : ''}`}
      aria-hidden
    >
      <span />
      <span />
      <span />
    </div>
  );
}
