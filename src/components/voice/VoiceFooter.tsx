import { useSessionStore } from '../../store/sessionStore';
import { activeVoiceUi, voiceStatusLabel } from './VoiceOrb';
import { VoiceStatusIcon } from './VoiceStatusIcon';
import './VoiceFooter.css';

/** Bottom status bar — follows live `voiceUi` (Vapi + session store) */
export function VoiceFooter() {
  const voiceUi = useSessionStore((s) => s.voiceUi);
  const mode = activeVoiceUi(voiceUi);

  return (
    <div
      className={`voice-footer voice-footer--${mode}`}
      data-voice-ui={voiceUi}
      aria-live="polite"
    >
      <VoiceStatusIcon className="voice-footer-icon" />
      <span>{voiceStatusLabel(mode)}</span>
    </div>
  );
}
