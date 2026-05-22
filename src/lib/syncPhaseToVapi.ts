import { getVapiInstance } from './vapiClient';
import { buildPhaseContextMessage } from './vapiPhaseContext';
import { logVoiceDebug } from './voiceDebugLog';
import { useSessionStore } from '../store/sessionStore';
import type { SessionPhase } from '../types/session';

/** Phases where the UI changed without a tool result — Eden should speak next. */
export function shouldPromptEdenAfterTransition(
  prevPhase: SessionPhase,
  nextPhase: SessionPhase,
): boolean {
  /* playing → song_feedback: syncSongEndedToVapi() pushes immediately with a stronger banner */
  if (nextPhase === 'wrap_up' && prevPhase !== 'wrap_up' && prevPhase !== 'goodbye') {
    return true;
  }
  return false;
}

let lastPhaseContextPayload = '';

export function resetPhaseContextDedupe() {
  lastPhaseContextPayload = '';
}

export function pushPhaseContextToVapi(options?: { triggerResponse?: boolean }) {
  const vapi = getVapiInstance();
  if (!vapi) return;

  const state = useSessionStore.getState();
  const content = buildPhaseContextMessage({
    phase: state.phase,
    screen: state.screen,
    offeredSong: state.offeredSong,
    favoriteSongs: state.favoriteSongs,
    currentSong: state.currentSong,
    moodNote: state.moodNote,
  });

  if (content === lastPhaseContextPayload && !options?.triggerResponse) {
    return;
  }
  lastPhaseContextPayload = content;

  logVoiceDebug(
    'sync',
    `[APP STATE] → Vapi (${options?.triggerResponse ? 'trigger' : 'silent'})`,
    {
      detail: { phase: state.phase, screen: state.screen },
    },
  );
  vapi.send({
    type: 'add-message',
    message: {
      role: 'system',
      content,
    },
    triggerResponseEnabled: options?.triggerResponse ?? false,
  });
}
