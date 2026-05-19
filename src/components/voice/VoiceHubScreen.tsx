import { useSessionStore } from '../../store/sessionStore';
import { TranscriptPanel } from './TranscriptPanel';
import { activeVoiceUi, VoiceOrb, voiceStatusLabel } from './VoiceOrb';
import { VoiceStatusIcon } from './VoiceStatusIcon';
import './VoiceHubScreen.css';

type Props = {
  onEndSession: () => void;
};

export function VoiceHubScreen({ onEndSession }: Props) {
  const voiceUi = useSessionStore((s) => s.voiceUi);
  const participantSpeaking = useSessionStore((s) => s.participantSpeaking);
  const statusMode = activeVoiceUi(voiceUi);

  return (
    <div className="voice-hub" data-voice-ui={voiceUi}>
      <div className="voice-hub-orb">
        <VoiceOrb state={voiceUi} participantSpeaking={participantSpeaking} />
      </div>

      <div className="voice-hub-panel">
        <TranscriptPanel />
        <div className="voice-hub-actions">
          <button type="button" className="end-session-btn" onClick={onEndSession}>
            End Session
          </button>
        </div>
      </div>

      <div className="voice-hub-eden-slot" aria-live="polite">
        <VoiceStatusIcon className="voice-hub-eden-slot__icon" />
        <span className="voice-hub-eden-slot__label">{voiceStatusLabel(statusMode)}</span>
      </div>
    </div>
  );
}
