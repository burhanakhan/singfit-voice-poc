import { VoiceLineMicIcon } from './VoiceLineMicIcon';
import './VoiceListeningMicBadge.css';

type Props = {
  className?: string;
  size?: 'sm' | 'md';
};

/** Outline mic (center) + crescent arcs that pulse inward but stop at mic edge */
export function VoiceListeningMicBadge({ className, size = 'sm' }: Props) {
  const dim = size === 'sm' ? 26 : 38;
  const micHeight = size === 'sm' ? 14 : 18;

  return (
    <span
      className={`voice-listen-badge voice-listen-badge--${size}${className ? ` ${className}` : ''}`}
      style={{ width: dim, height: dim }}
      aria-hidden
    >
      <svg className="voice-listen-badge__arcs" viewBox="0 0 48 48" width={dim} height={dim}>
        <g fill="none" stroke="currentColor" strokeLinecap="round">
          <circle className="voice-listen-badge__arc voice-listen-badge__arc--outer" cx="24" cy="24" r="19" />
          <circle className="voice-listen-badge__arc voice-listen-badge__arc--mid" cx="24" cy="24" r="16" />
          <circle className="voice-listen-badge__arc voice-listen-badge__arc--edge" cx="24" cy="24" r="12.5" />
        </g>
      </svg>
      <VoiceLineMicIcon variant="outline" height={micHeight} className="voice-listen-badge__mic" />
    </span>
  );
}
