import { getVapiInstance } from './vapiClient';
import { logVoiceDebug } from './voiceDebugLog';

let singAlongActive = false;
let allowModelResponseInPlaying = false;

export function isSingAlongActive(): boolean {
  return singAlongActive;
}

export function shouldAllowModelOutputInPlaying(): boolean {
  return allowModelResponseInPlaying;
}

export function markPlayingCommandDetected(): void {
  allowModelResponseInPlaying = true;
}

export function clearPlayingCommandGate(): void {
  allowModelResponseInPlaying = false;
}

function setAssistantMuted(muted: boolean) {
  const vapi = getVapiInstance();
  if (!vapi) return;
  vapi.send({
    type: 'control',
    control: muted ? 'mute-assistant' : 'unmute-assistant',
  });
  logVoiceDebug('sync', muted ? 'Eden muted (sing-along)' : 'Eden unmuted', {});
}

/** Mute Eden during song — client tools still run; blocks auto-replies to singing. */
export function enableSingAlongMode(): void {
  clearPlayingCommandGate();
  singAlongActive = true;
  setAssistantMuted(true);
}

export function disableSingAlongMode(): void {
  if (!singAlongActive) return;
  singAlongActive = false;
  clearPlayingCommandGate();
  setAssistantMuted(false);
}

/** Brief unmute for "yes Nina I'm here" then mute again when speech stops. */
export function unmuteForPresenceReply(): void {
  if (!singAlongActive) return;
  setAssistantMuted(false);
}

export function remuteAfterPresenceReply(): void {
  if (!singAlongActive) return;
  setAssistantMuted(true);
}
