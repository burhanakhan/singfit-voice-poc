import { isDebugMode } from './debugMode';
import { downloadTranscript } from './transcript';
import { destroySharedVapi } from './vapiClient';
import {
  isVapiAutoEndReason,
  vapiAutoEndSystemMessage,
  vapiLimitSessionEndOverlayMessage,
  type VapiAutoEndReason,
} from './vapiSessionLimits';
import { sessionEndMessageFromVapiError } from './vapiErrorParse';
import { stopPlayingSilenceKeepalive } from './vapiPlayingSilence';
import {
  isCustomerAudioTimeoutReason,
  resetMicPermissionCache,
  sessionEndMessageForCustomerAudioTimeout,
} from './vapiMic';
import { wasIntentionalVapiStopRecent } from './vapiIntentionalDisconnect';
import { clearLastVapiDailyError, getLastVapiDailyError } from './vapiDailyErrorState';
import {
  beginGracefulSessionEnd,
  clearSessionEndOverlay,
  describeVapiEndedReason,
  isSessionEndFlowActive,
  resetSessionEndFlow,
  unknownSessionEndMessage,
} from './sessionEndSync';
import { disableSingAlongMode } from './singAlongMode';
import { resetMusicChoiceGuard } from './musicChoiceGuard';
import { edenSpeechActiveFromVapi } from './voiceUiSync';
import {
  downloadVoiceDebugLog,
  logVoiceDebugLifecycle,
  markVoiceDebugSessionEnded,
} from './voiceDebugLog';
import { useSessionStore } from '../store/sessionStore';

import { isFinalizeInProgress, runWithFinalizeGuard } from './sessionFinalizeGuard';

let goodbyeFinalizeTimer: ReturnType<typeof setTimeout> | undefined;
let goodbyeMaxWaitTimer: ReturnType<typeof setTimeout> | undefined;

const GOODBYE_SILENCE_MS = 2200;
const GOODBYE_MIN_SPOKEN_MS = 2800;
const GOODBYE_MIN_CHARS = 40;
const GOODBYE_MAX_WAIT_MS = 15000;

const GOODBYE_FILLER_ONLY_RE =
  /^(?:one\s+moment|just\s+a\s+(?:sec|moment)|this\s+will|give\s+me\s+a\s+moment|hang\s+on)[.!?,]*$/i;

let goodbyeSpeechStartedAt = 0;
let goodbyeTranscriptChars = 0;

export function clearGoodbyeFinalizeTimer() {
  if (goodbyeFinalizeTimer !== undefined) {
    window.clearTimeout(goodbyeFinalizeTimer);
    goodbyeFinalizeTimer = undefined;
  }
}

/** Eden started speaking again during goodbye — wait for the next pause. */
export function resetGoodbyeFinalizeState() {
  goodbyeSpeechStartedAt = 0;
  goodbyeTranscriptChars = 0;
  clearGoodbyeFinalizeTimer();
  if (goodbyeMaxWaitTimer !== undefined) {
    window.clearTimeout(goodbyeMaxWaitTimer);
    goodbyeMaxWaitTimer = undefined;
  }
}

function isSubstantiveGoodbyeTranscript(text: string): boolean {
  const t = text.trim();
  if (t.length < GOODBYE_MIN_CHARS) return false;
  if (GOODBYE_FILLER_ONLY_RE.test(t)) return false;
  return true;
}

export function noteGoodbyeAssistantTranscript(text: string) {
  if (useSessionStore.getState().phase !== 'goodbye') return;
  if (isSubstantiveGoodbyeTranscript(text)) {
    goodbyeTranscriptChars = Math.max(goodbyeTranscriptChars, text.length);
  }
}

export function onGoodbyeAssistantSpeechStarted() {
  const { phase } = useSessionStore.getState();
  if (phase !== 'goodbye') return;
  clearGoodbyeFinalizeTimer();
  goodbyeSpeechStartedAt = Date.now();
  if (goodbyeMaxWaitTimer === undefined) {
    goodbyeMaxWaitTimer = window.setTimeout(() => {
      goodbyeMaxWaitTimer = undefined;
      if (useSessionStore.getState().phase !== 'goodbye') return;
      if (edenStillSpeakingGoodbye()) {
        onGoodbyeAssistantSpeechStarted();
        return;
      }
      logVoiceDebugLifecycle('goodbye: max wait — finalize', {});
      finalizeSessionToHome();
    }, GOODBYE_MAX_WAIT_MS);
  }
}

/** Eden finished a goodbye utterance — go home after she has had time to finish. */
function edenStillSpeakingGoodbye(): boolean {
  const { phase, voiceUi } = useSessionStore.getState();
  if (phase !== 'goodbye') return false;
  return voiceUi === 'speaking' || edenSpeechActiveFromVapi();
}

export function onGoodbyeAssistantSpeechStopped() {
  const { phase } = useSessionStore.getState();
  if (phase !== 'goodbye') return;

  if (edenStillSpeakingGoodbye()) {
    logVoiceDebugLifecycle('goodbye: Eden still speaking — wait', {});
    return;
  }

  const spokenMs = goodbyeSpeechStartedAt ? Date.now() - goodbyeSpeechStartedAt : 0;
  const substantive = goodbyeTranscriptChars >= GOODBYE_MIN_CHARS;
  const longEnough = substantive && spokenMs >= GOODBYE_MIN_SPOKEN_MS;

  if (!longEnough) {
    logVoiceDebugLifecycle('goodbye: wait for fuller farewell', {
      spokenMs,
      goodbyeTranscriptChars,
    });
    return;
  }

  clearGoodbyeFinalizeTimer();
  const delay = GOODBYE_SILENCE_MS;
  goodbyeFinalizeTimer = window.setTimeout(() => {
    goodbyeFinalizeTimer = undefined;
    if (useSessionStore.getState().phase === 'goodbye') {
      finalizeSessionToHome();
    }
  }, delay);
}

/** Safety net — never leave Nina on Eden screen more than a few seconds after goodbye. */
export function scheduleGoodbyeHomeFallback(ms = GOODBYE_MAX_WAIT_MS) {
  if (goodbyeMaxWaitTimer !== undefined) {
    window.clearTimeout(goodbyeMaxWaitTimer);
  }
  goodbyeMaxWaitTimer = window.setTimeout(() => {
    goodbyeMaxWaitTimer = undefined;
    if (useSessionStore.getState().phase === 'goodbye') {
      logVoiceDebugLifecycle('goodbye: fallback finalize', {});
      finalizeSessionToHome();
    }
  }, ms);
}

/** Vapi ended due to silence or max-duration — same popup + countdown as other session ends. */
export function finalizeSessionDueToVapiLimit(reason: VapiAutoEndReason) {
  logVoiceDebugLifecycle('Vapi auto end limit', { reason });
  beginGracefulSessionEnd(
    vapiLimitSessionEndOverlayMessage(reason),
    vapiAutoEndSystemMessage(reason),
  );
}

/** Call when Vapi sends `status-update` with status `ended`. */
export function onVapiCallEnded(endedReason: string | undefined) {
  const reason = String(endedReason ?? '').trim();
  if (isVapiAutoEndReason(reason)) {
    stopPlayingSilenceKeepalive();
    finalizeSessionDueToVapiLimit(reason);
    return;
  }

  if (isFinalizeInProgress() || isSessionEndFlowActive()) return;

  const store = useSessionStore.getState();
  if (store.screen === 'home') return;

  if (reason === 'customer-ended-call') {
    if (wasIntentionalVapiStopRecent()) {
      logVoiceDebugLifecycle('Vapi ended after app stop() — no overlay', { endedReason: reason });
      clearLastVapiDailyError();
      return;
    }
    const dailyErr = getLastVapiDailyError();
    const overlay = dailyErr
      ? sessionEndMessageFromVapiError(dailyErr)
      : 'The voice connection closed. If this keeps happening, capture the debug log (look for stop / error lines).';
    clearLastVapiDailyError();
    logVoiceDebugLifecycle('customer-ended-call with Daily error → overlay', { overlay });
    beginGracefulSessionEnd(overlay);
    return;
  }

  const overlay = isCustomerAudioTimeoutReason(reason)
    ? sessionEndMessageForCustomerAudioTimeout()
    : unknownSessionEndMessage(reason || undefined);

  logVoiceDebugLifecycle('unexpected Vapi call end → overlay', {
    endedReason: reason || '(none)',
    described: reason ? describeVapiEndedReason(reason) : undefined,
    overlay,
  });
  beginGracefulSessionEnd(overlay);
}

export function finalizeSessionToHome() {
  resetGoodbyeFinalizeState();
  resetMusicChoiceGuard();

  const store = useSessionStore.getState();
  if (store.screen === 'home') {
    clearSessionEndOverlay();
    return;
  }
  if (isFinalizeInProgress()) return;

  runWithFinalizeGuard(() => {
    disableSingAlongMode();
    stopPlayingSilenceKeepalive();
    resetMicPermissionCache();
    resetSessionEndFlow();
    useSessionStore.setState({ sessionEndOverlay: null });
    const { transcript } = store;
    logVoiceDebugLifecycle('finalizeSessionToHome', { transcriptLines: transcript.length });
    destroySharedVapi();

    if (transcript.length > 2) {
      downloadTranscript(transcript);
    }

    if (isDebugMode()) {
      markVoiceDebugSessionEnded('finalizeSessionToHome');
      downloadVoiceDebugLog();
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
      offerKickerIndex: 0,
      favoriteSongs: [],
      currentSong: null,
      playerAudioPaused: false,
      transcript: [],
      moodNote: null,
    });
  });
}
