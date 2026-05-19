import type { VoiceUiState } from '../../types/session';
import { VoiceLineMicIcon } from './VoiceLineMicIcon';
import { VoiceListeningBars } from './VoiceListeningBars';
import { VoiceSpeakingBars } from './VoiceSpeakingBars';
import { VoiceThinkingDots } from './VoiceThinkingDots';
import './VoiceOrb.css';

type Props = {
  state: VoiceUiState;
  participantSpeaking?: boolean;
};

export type ActiveVoiceUi = 'listening' | 'speaking' | 'thinking';

export function activeVoiceUi(state: VoiceUiState): ActiveVoiceUi {
  if (state === 'speaking' || state === 'thinking') return state;
  return 'listening';
}

export function voiceStatusLabel(state: VoiceUiState | ActiveVoiceUi): string {
  if (state === 'listening') return 'Listening…';
  if (state === 'speaking') return 'Eden is speaking…';
  if (state === 'thinking') return 'Eden is thinking…';
  return 'Ready';
}

/** @deprecated use voiceStatusLabel */
export const voiceSlotLabel = voiceStatusLabel;

export function VoiceOrb({ state, participantSpeaking = false }: Props) {
  const showActiveListening = state === 'listening' && participantSpeaking;
  return (
    <div className="voice-orb-wrap">
      <div className="voice-orb-stage" style={{ color: orbColor(state) }}>
        <div className="voice-orb-rings" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="voice-orb-ring-pulse" style={{ animationDelay: `${i * 0.65}s` }} />
          ))}
        </div>
        <div className={`voice-orb voice-orb--${state}`}>
          {state === 'speaking' && <VoiceSpeakingBars size="md" />}
          {state === 'thinking' && <VoiceThinkingDots size="md" />}
          {showActiveListening && <VoiceListeningBars size="md" />}
          {(state === 'listening' || state === 'idle') && !showActiveListening && (
            <VoiceLineMicIcon className="voice-orb-mic" height={40} />
          )}
        </div>
      </div>
      <h1 className="voice-orb-eden">Eden</h1>
      <p className="voice-orb-activity">{voiceStatusLabel(state)}</p>
      {state === 'listening' && (
        <p className="voice-duplex">
          <VoiceLineMicIcon className="voice-duplex-mic" height={13} />
          <span>Full-duplex — speak anytime</span>
        </p>
      )}
      {state === 'speaking' && (
        <p className="voice-duplex voice-duplex--interrupt">
          <span>Interrupt anytime to respond</span>
        </p>
      )}
    </div>
  );
}

function orbColor(state: VoiceUiState): string {
  if (state === 'listening') return 'var(--sf-listening)';
  if (state === 'thinking') return 'var(--sf-thinking)';
  if (state === 'speaking') return 'var(--sf-speaking)';
  return '#888';
}
