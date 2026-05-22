import { MOOD_VOICE_HINT } from '../../lib/voiceCommands';
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
  const phase = useSessionStore((s) => s.phase);
  const participantSpeaking = useSessionStore((s) => s.participantSpeaking);
  const vapiCallStatus = useSessionStore((s) => s.vapiCallStatus);
  const sessionEndOverlay = useSessionStore((s) => s.sessionEndOverlay);

  const statusMode = activeVoiceUi(voiceUi);
  const statusText =
    sessionEndOverlay != null
      ? 'Ending session…'
      : vapiCallStatus === 'connecting'
        ? 'Connecting…'
        : vapiCallStatus === 'error' || vapiCallStatus === 'idle'
          ? 'Voice paused'
          : voiceStatusLabel(statusMode);

  return (
    <div className="voice-hub" data-voice-ui={voiceUi}>
      <div className="voice-hub-orb">
        <VoiceOrb state={voiceUi} participantSpeaking={participantSpeaking} />
      </div>

      <div className="voice-hub-panel">
        <TranscriptPanel />
        <div className="voice-hub-actions">
          {phase === 'mood_check' ? (
            <p className="voice-hub-mood-hint" role="status">
              {MOOD_VOICE_HINT}
            </p>
          ) : null}
          <button type="button" className="end-session-btn" onClick={onEndSession}>
            End Session
          </button>
        </div>
      </div>

      <div className="voice-hub-eden-slot" aria-live="polite">
        <VoiceStatusIcon className="voice-hub-eden-slot__icon" />
        <span className="voice-hub-eden-slot__label">{statusText}</span>
      </div>
    </div>
  );
}
