import { requestPlayerPlaybackStart } from './playerPlaybackControl';

/** Wait for Eden's post-pick intro before starting the MP3. */

let awaitingIntro = false;
let introSpeechStartedAt = 0;
let lastIntroTranscript = '';
let introGateEpoch = 0;
const introListeners = new Set<() => void>();

function notifyIntroListeners() {
  introListeners.forEach((l) => l());
}

export function subscribeIntroGate(listener: () => void): () => void {
  introListeners.add(listener);
  return () => introListeners.delete(listener);
}

const MIN_INTRO_SPEECH_MS = 2000;
const MIN_INTRO_CHARS = 24;

const FILLER_INTRO_RE =
  /\b(?:just a sec|one sec|one moment|give me a moment|hold on|this will take|just a moment|let me)\b/i;

export function markAwaitingSongIntro() {
  awaitingIntro = true;
  introSpeechStartedAt = 0;
  lastIntroTranscript = '';
}

export function markSongIntroComplete() {
  if (!awaitingIntro) return;
  awaitingIntro = false;
  introSpeechStartedAt = 0;
  lastIntroTranscript = '';
  introGateEpoch += 1;
  notifyIntroListeners();
}

export function getIntroGateEpoch(): number {
  return introGateEpoch;
}

export function isAwaitingSongIntro(): boolean {
  return awaitingIntro;
}

export function resetSongIntroGate() {
  awaitingIntro = false;
  introSpeechStartedAt = 0;
  lastIntroTranscript = '';
}

export function noteIntroSpeechStarted() {
  if (!awaitingIntro) return;
  introSpeechStartedAt = Date.now();
}

export function noteIntroAssistantFinal(text: string) {
  if (!awaitingIntro) return;
  const t = text.trim();
  if (t) lastIntroTranscript = t;
  tryCompleteIntroAfterSpeech();
}

function introQualifies(): boolean {
  const text = lastIntroTranscript.trim();
  if (text.length < MIN_INTRO_CHARS) return false;
  if (FILLER_INTRO_RE.test(text)) return false;
  return true;
}

function tryCompleteIntroAfterSpeech(): boolean {
  if (!awaitingIntro) return false;
  if (!introSpeechStartedAt) return false;
  const spokenMs = Date.now() - introSpeechStartedAt;
  if (spokenMs < MIN_INTRO_SPEECH_MS) return false;
  if (!introQualifies()) return false;
  markSongIntroComplete();
  requestPlayerPlaybackStart();
  return true;
}

/** Returns true when intro gate may release playback. */
export function noteIntroSpeechStopped(): boolean {
  if (!awaitingIntro) return true;
  if (tryCompleteIntroAfterSpeech()) return true;
  window.setTimeout(() => {
    tryCompleteIntroAfterSpeech();
  }, 80);
  return false;
}
