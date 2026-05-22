import { edenSpeechActiveFromVapi } from './voiceUiSync';
import { logVoiceDebug } from './voiceDebugLog';

type PendingSend = () => void;

const pending: PendingSend[] = [];
let flushTimer: ReturnType<typeof setTimeout> | undefined;

function scheduleFlush(delayMs = 320) {
  if (flushTimer !== undefined) window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    flushDeferredVapiSends();
  }, delayMs);
}

export function flushDeferredVapiSends() {
  if (!pending.length) return;
  const batch = pending.splice(0, pending.length);
  logVoiceDebug('sync', `flush ${batch.length} deferred Vapi send(s)`, {});
  for (const fn of batch) {
    try {
      fn();
    } catch (e) {
      console.warn('[SingFit] deferred Vapi send failed', e);
    }
  }
}

/** Queue outbound messages while Eden TTS is active to avoid cutoffs/blips. */
export function deferVapiSend(fn: () => void) {
  if (!edenSpeechActiveFromVapi()) {
    fn();
    return;
  }
  pending.push(fn);
  logVoiceDebug('sync', 'defer Vapi send (Eden speaking)', { detail: { queued: pending.length } });
  scheduleFlush(450);
}

export function clearDeferredVapiSends() {
  pending.length = 0;
  if (flushTimer !== undefined) {
    window.clearTimeout(flushTimer);
    flushTimer = undefined;
  }
}
