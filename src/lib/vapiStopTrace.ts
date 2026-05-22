import { markIntentionalVapiStop } from './vapiIntentionalDisconnect';
import { logVoiceDebug } from './voiceDebugLog';

/** Log every app-initiated Vapi stop (debug builds only) with a short stack. */
export function traceVapiStop(reason: string): void {
  markIntentionalVapiStop();
  const stack = new Error(`vapi.stop: ${reason}`).stack;
  logVoiceDebug('stop', reason, {
    level: 'warn',
    detail: { stack: stack?.split('\n').slice(1, 5).join(' | ') ?? '' },
    mirrorConsole: true,
  });
}
