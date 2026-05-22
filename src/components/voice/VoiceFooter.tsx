import { useSessionStore } from '../../store/sessionStore';
import { activeVoiceUi, voiceStatusLabel } from './VoiceOrb';
import { VoiceStatusIcon } from './VoiceStatusIcon';
import './VoiceFooter.css';

/** Bottom status bar — follows live `voiceUi` (Vapi + session store) */
export function VoiceFooter() {
  const voiceUi = useSessionStore((s) => s.voiceUi);
  const vapiCallStatus = useSessionStore((s) => s.vapiCallStatus);
  const sessionEndOverlay = useSessionStore((s) => s.sessionEndOverlay);

  const mode = activeVoiceUi(voiceUi);
  const statusText =
    sessionEndOverlay != null
      ? 'Ending session…'
      : vapiCallStatus === 'connecting'
        ? 'Connecting…'
        : vapiCallStatus === 'error' || vapiCallStatus === 'idle'
          ? 'Voice paused'
          : voiceStatusLabel(mode);

  return (
    <div
      className={`voice-footer voice-footer--${sessionEndOverlay ? 'idle' : mode}`}
      data-voice-ui={voiceUi}
      aria-live="polite"
    >
      <VoiceStatusIcon className="voice-footer-icon" />
      <span>{statusText}</span>
    </div>
  );
}
