import { isDebugMode } from './debugMode';
import { isFinalizeInProgress } from './sessionFinalizeGuard';
import { vapiLimitSessionEndOverlayMessage } from './vapiSessionLimits';
import { sessionEndMessageFromVapiError } from './vapiErrorParse';
import { resetPhaseContextDedupe } from './syncPhaseToVapi';
import { logVoiceDebugLifecycle } from './voiceDebugLog';
import { useSessionStore } from '../store/sessionStore';

export type SessionEndPreviewScenario = 'inactivity' | 'max_duration' | 'unknown' | 'voice_error';

/** Seconds shown on the end-of-session overlay before returning home. */
export const SESSION_END_COUNTDOWN_SEC = 5;

/** Standard countdown line on every session-end popup. */
export function sessionEndCountdownLabel(secondsLeft: number): string {
  return `Back to home screen in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}…`;
}

let endFlowScheduled = false;

export function resetSessionEndFlow() {
  endFlowScheduled = false;
  resetPhaseContextDedupe();
}

export function describeVapiEndedReason(endedReason: string): string {
  const r = endedReason.trim();
  const known: Record<string, string> = {
    'customer-ended-call': 'stopped by app',
    'assistant-ended-call': 'ended by Eden',
    'silence-timed-out': 'inactivity timeout',
    'exceeded-max-duration': 'call length limit',
    'manually-canceled': 'canceled',
    'call.in-progress.error-assistant-did-not-receive-customer-audio':
      'mic not received by Eden (~15s)',
  };
  if (known[r]) return known[r];
  if (/meeting has ended|ejected/i.test(r)) return 'voice connection closed';
  return r.replace(/-/g, ' ');
}

export function unknownSessionEndMessage(_endedReason?: string): string {
  return 'Something weird happened.';
}

export function voiceFailureEndMessage(error: unknown): string {
  return sessionEndMessageFromVapiError(error);
}

/**
 * Show overlay + countdown, then `finalizeSessionToHome` (called from overlay UI).
 * Keeps UI aligned with Vapi — no reconnect / stay-on-screen options.
 */
export function beginGracefulSessionEnd(overlayMessage: string, transcriptMessage?: string) {
  const store = useSessionStore.getState();
  if (store.screen === 'home' || isFinalizeInProgress() || endFlowScheduled) return;

  endFlowScheduled = true;
  const transcript = transcriptMessage ?? overlayMessage;
  store.addTranscript('system', transcript);
  logVoiceDebugLifecycle('graceful session end → overlay', {
    overlayMessage,
    transcript,
    screen: store.screen,
    phase: store.phase,
    vapiCallStatus: store.vapiCallStatus,
  });
  store.setSessionEndOverlay(overlayMessage);
}

export function isSessionEndFlowActive(): boolean {
  return endFlowScheduled || Boolean(useSessionStore.getState().sessionEndOverlay);
}

/** Debug only (`?sfdbg=…`): show session-end popup + countdown without waiting for Vapi. */
export function devPreviewSessionEndOverlay(scenario: SessionEndPreviewScenario) {
  if (!isDebugMode()) return;

  resetSessionEndFlow();
  endFlowScheduled = true;

  let overlay: string;
  switch (scenario) {
    case 'inactivity':
      overlay = vapiLimitSessionEndOverlayMessage('silence-timed-out');
      break;
    case 'max_duration':
      overlay = vapiLimitSessionEndOverlayMessage('exceeded-max-duration');
      break;
    case 'unknown':
      overlay = unknownSessionEndMessage('ejected');
      break;
    case 'voice_error':
      overlay = voiceFailureEndMessage('Sample: Meeting has ended');
      break;
    default:
      overlay = unknownSessionEndMessage();
  }

  logVoiceDebugLifecycle(`dev preview session-end: ${scenario}`, { overlay });
  useSessionStore.getState().setSessionEndOverlay(overlay);
}

export function clearSessionEndOverlay() {
  resetSessionEndFlow();
  useSessionStore.getState().setSessionEndOverlay(null);
}
