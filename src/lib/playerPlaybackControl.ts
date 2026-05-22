/** Lets voice router / intro gate nudge the player gate to call audio.play(). */

import { isAwaitingSongIntro } from './playerIntroGate';
import { edenSpeechActiveFromVapi } from './voiceUiSync';
import { useSessionStore } from '../store/sessionStore';

let requestStart: (() => void) | null = null;

export function registerPlayerPlaybackStart(fn: () => void) {
  requestStart = fn;
}

export function unregisterPlayerPlaybackStart() {
  requestStart = null;
}

export function edenAllowsPlayerPlayback(): boolean {
  const { vapiConnected, voiceUi } = useSessionStore.getState();
  if (isAwaitingSongIntro()) return false;
  if (!vapiConnected) return true;
  return voiceUi === 'listening' && !edenSpeechActiveFromVapi();
}

export function requestPlayerPlaybackStart() {
  if (!edenAllowsPlayerPlayback()) return;
  requestStart?.();
}
