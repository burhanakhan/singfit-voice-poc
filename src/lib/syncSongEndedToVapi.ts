import { getVapiInstance } from './vapiClient';
import { buildPhaseContextMessage } from './vapiPhaseContext';
import { disableSingAlongMode } from './singAlongMode';
import { stopPlayingSilenceKeepalive } from './vapiPlayingSilence';
import { logVoiceDebug } from './voiceDebugLog';
import { resetPhaseContextDedupe } from './syncPhaseToVapi';
import { useSessionStore } from '../store/sessionStore';

const SONG_END_BANNER =
  'CRITICAL — SONG JUST ENDED: playback stopped, currentSong is null, screen is voice hub (song feedback). ' +
  'Do NOT say the song is playing, continuing, or that you will start another song. ' +
  'Do NOT call select_favorite_song or confirm_offered_song. ' +
  'Ask Nina one question only: how did singing that song feel? ' +
  'No filler ("one moment", "just a sec", "give me a moment"). Then wait for her answer.';

/** Force Eden off stale "now playing" context immediately after the track ends. */
export function syncSongEndedToVapi() {
  disableSingAlongMode();
  stopPlayingSilenceKeepalive();
  resetPhaseContextDedupe();

  const vapi = getVapiInstance();
  if (!vapi) return;

  const state = useSessionStore.getState();
  const context = buildPhaseContextMessage({
    phase: state.phase,
    screen: state.screen,
    offeredSong: state.offeredSong,
    favoriteSongs: state.favoriteSongs,
    currentSong: null,
    moodNote: state.moodNote,
  });

  logVoiceDebug('sync', 'song ended → force Vapi phase sync', {
    detail: { phase: state.phase },
  });

  vapi.send({
    type: 'add-message',
    message: {
      role: 'system',
      content: `${SONG_END_BANNER}\n\n${context}`,
    },
    triggerResponseEnabled: true,
  });
}
