import type { VapiClient } from './vapiImport';
import { logVoiceDebug, logVoiceDebugVapi } from './voiceDebugLog';

export type LocalMicDiagnostics = {
  hasCall: boolean;
  localAudioEnabled: boolean | null;
  vapiIsMuted: boolean | null;
  trackState: string | null;
  permissionOk: boolean;
  permissionError?: string;
};

let micPermissionGranted = false;

/** Ask for mic access once per page load (Start Session click) before Vapi joins Daily. */
export async function preflightMicrophoneAccess(): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (micPermissionGranted) {
    return { ok: true };
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'Microphone API not available in this browser' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    micPermissionGranted = true;
    logVoiceDebugVapi('mic preflight: permission granted');
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    logVoiceDebugVapi('mic preflight: denied or failed', { error }, 'error');
    return { ok: false, error };
  }
}

export function resetMicPermissionCache() {
  micPermissionGranted = false;
}

/** Ensure Nina's mic is published to the Daily room (no repeated getUserMedia). */
export async function ensureVapiLocalMicrophone(vapi: VapiClient): Promise<LocalMicDiagnostics> {
  vapi.setMuted(false);

  const call = vapi.getDailyCallObject();
  if (!call) {
    return {
      hasCall: false,
      localAudioEnabled: null,
      vapiIsMuted: vapi.isMuted(),
      trackState: null,
      permissionOk: micPermissionGranted,
    };
  }

  try {
    call.setLocalAudio(true);
  } catch (e) {
    logVoiceDebug('vapi', 'setLocalAudio failed', {
      level: 'warn',
      detail: e instanceof Error ? e.message : String(e),
    });
  }

  const local = call.participants()?.local;
  const trackState = String(local?.tracks?.audio?.state ?? 'none');

  const diag: LocalMicDiagnostics = {
    hasCall: true,
    localAudioEnabled: call.localAudio(),
    vapiIsMuted: vapi.isMuted(),
    trackState,
    permissionOk: micPermissionGranted,
  };

  logVoiceDebugVapi('local mic check', { ...diag }, diag.localAudioEnabled ? 'info' : 'warn');

  return diag;
}

export function isCustomerAudioTimeoutReason(reason: string): boolean {
  return /did-not-receive-customer-audio|customer-audio/i.test(reason);
}

export function sessionEndMessageForCustomerAudioTimeout(): string {
  return (
    "Eden couldn't hear your microphone. Allow mic access for this site in your browser " +
    '(lock icon in the address bar), then start the session again.'
  );
}
