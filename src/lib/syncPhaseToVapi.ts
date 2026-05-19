import { getVapiInstance } from './vapiClient';
import { buildPhaseContextMessage } from './vapiPhaseContext';
import { useSessionStore } from '../store/sessionStore';
import type { SessionPhase } from '../types/session';

/** Phases where the UI changed without a tool result — Eden should speak next. */
export function shouldPromptEdenAfterTransition(
  prevPhase: SessionPhase,
  nextPhase: SessionPhase,
): boolean {
  if (prevPhase === 'playing' && nextPhase === 'song_feedback') {
    return true;
  }
  if (
    nextPhase === 'wrap_up' &&
    prevPhase !== 'wrap_up' &&
    prevPhase !== 'goodbye' &&
    prevPhase !== 'continue_or_end'
  ) {
    return true;
  }
  return false;
}

export function pushPhaseContextToVapi(options?: { triggerResponse?: boolean }) {
  const vapi = getVapiInstance();
  if (!vapi) return;

  const state = useSessionStore.getState();
  vapi.send({
    type: 'add-message',
    message: {
      role: 'system',
      content: buildPhaseContextMessage({
        phase: state.phase,
        screen: state.screen,
        offeredSong: state.offeredSong,
        favoriteSongs: state.favoriteSongs,
        currentSong: state.currentSong,
        moodNote: state.moodNote,
      }),
    },
    triggerResponseEnabled: options?.triggerResponse ?? false,
  });
}
