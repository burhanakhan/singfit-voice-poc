import { getVapiInstance } from './vapiClient';
import { logVoiceDebug } from './voiceDebugLog';

let keepaliveTimer: ReturnType<typeof setInterval> | undefined;

/**
 * While a backing track plays, Vapi may not get clear speech transcripts (singing / music).
 * Periodic mic nudges keep the local track active; primary fix is longer silenceTimeoutSeconds.
 */
export function startPlayingSilenceKeepalive() {
  stopPlayingSilenceKeepalive();
  keepaliveTimer = window.setInterval(() => {
    const vapi = getVapiInstance();
    const call = vapi?.getDailyCallObject();
    if (!call) return;
    try {
      if (!call.localAudio()) call.setLocalAudio(true);
      vapi?.setMuted(false);
    } catch {
      /* ignore */
    }
    logVoiceDebug('sync', 'playing keepalive: local mic reaffirmed');
  }, 90_000);
}

export function stopPlayingSilenceKeepalive() {
  if (keepaliveTimer !== undefined) {
    window.clearInterval(keepaliveTimer);
    keepaliveTimer = undefined;
  }
}
