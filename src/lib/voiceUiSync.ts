import type { VoiceUiState } from '../types/session';

/** Eden speech from Vapi `speech-update` is the ground truth for speaking vs thinking.
 * Transcript finals and model-output often fire mid-utterance and must not flip the orb to thinking.
 */

let edenSpeakingByVapi = false;
/** Until Eden finishes her opening line, show thinking — not listening (assistant-speaks-first). */
let awaitingFirstEdenGreeting = false;

export function resetEdenSpeechGate() {
  edenSpeakingByVapi = false;
  awaitingFirstEdenGreeting = false;
}

export function armAwaitingFirstEdenGreeting() {
  awaitingFirstEdenGreeting = true;
}

export function clearAwaitingFirstEdenGreeting() {
  awaitingFirstEdenGreeting = false;
}

export function isAwaitingFirstEdenGreeting(): boolean {
  return awaitingFirstEdenGreeting;
}

/** Suppress a brief "listening" flash before Eden's first greeting. */
export function resolveVoiceUiState(next: VoiceUiState): VoiceUiState {
  if (next === 'listening' && awaitingFirstEdenGreeting) return 'thinking';
  return next;
}

/** User started speaking (barge-in) — allow thinking/listening without treating as Eden TTS end. */
export function clearEdenSpeechGateForUserTurn() {
  edenSpeakingByVapi = false;
}

export function onEdenVapiSpeechStart() {
  edenSpeakingByVapi = true;
}

export function onEdenVapiSpeechStopped() {
  edenSpeakingByVapi = false;
}

export function edenSpeechActiveFromVapi(): boolean {
  return edenSpeakingByVapi;
}
