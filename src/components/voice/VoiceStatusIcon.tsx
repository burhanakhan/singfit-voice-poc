import { useSessionStore } from '../../store/sessionStore';
import { activeVoiceUi } from './VoiceOrb';
import { VoiceListeningMicBadge } from './VoiceListeningMicBadge';
import { VoiceListeningBars } from './VoiceListeningBars';
import { VoiceSpeakingBars } from './VoiceSpeakingBars';
import { VoiceThinkingDots } from './VoiceThinkingDots';

type Props = {
  className?: string;
};

export function VoiceStatusIcon({ className }: Props) {
  const voiceUi = useSessionStore((s) => s.voiceUi);
  const participantSpeaking = useSessionStore((s) => s.participantSpeaking);
  const mode = activeVoiceUi(voiceUi);
  const showActiveListening = mode === 'listening' && participantSpeaking;

  return (
    <span className={className}>
      {showActiveListening ? (
        <VoiceListeningBars size="sm" />
      ) : mode === 'listening' ? (
        <VoiceListeningMicBadge size="sm" />
      ) : mode === 'speaking' ? (
        <VoiceSpeakingBars size="sm" />
      ) : (
        <VoiceThinkingDots size="sm" />
      )}
    </span>
  );
}
