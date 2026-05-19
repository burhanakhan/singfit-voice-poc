import { downloadTranscript } from './transcript';
import { destroySharedVapi } from './vapiClient';
import { useSessionStore } from '../store/sessionStore';

let goodbyeFinalizeTimer: ReturnType<typeof setTimeout> | undefined;

const GOODBYE_SILENCE_MS = 1400;

export function clearGoodbyeFinalizeTimer() {
  if (goodbyeFinalizeTimer !== undefined) {
    window.clearTimeout(goodbyeFinalizeTimer);
    goodbyeFinalizeTimer = undefined;
  }
}

/** Eden started speaking again during goodbye — wait for the next pause. */
export function onGoodbyeAssistantSpeechStarted() {
  const { phase } = useSessionStore.getState();
  if (phase !== 'goodbye') return;
  clearGoodbyeFinalizeTimer();
}

/** Eden finished a goodbye utterance — go home after a short silence. */
export function onGoodbyeAssistantSpeechStopped() {
  const { phase } = useSessionStore.getState();
  if (phase !== 'goodbye') return;

  clearGoodbyeFinalizeTimer();
  goodbyeFinalizeTimer = window.setTimeout(() => {
    goodbyeFinalizeTimer = undefined;
    if (useSessionStore.getState().phase === 'goodbye') {
      finalizeSessionToHome();
    }
  }, GOODBYE_SILENCE_MS);
}

export function finalizeSessionToHome() {
  clearGoodbyeFinalizeTimer();

  const store = useSessionStore.getState();
  if (store.screen === 'home') return;

  const { transcript } = store;
  destroySharedVapi();

  if (transcript.length > 2) {
    downloadTranscript(transcript);
  }

  useSessionStore.setState({
    screen: 'home',
    phase: 'starting',
    voiceUi: 'idle',
    participantSpeaking: false,
    vapiConnected: false,
    vapiCallStatus: 'idle',
    vapiCallError: null,
    offeredSong: null,
    offeredHistory: [],
    favoriteSongs: [],
    currentSong: null,
    transcript: [],
    moodNote: null,
  });
}
