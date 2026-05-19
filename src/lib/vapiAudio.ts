import type { DailyCall } from '@daily-co/daily-js';
import type { VapiClient } from './vapiImport';

const SINGFIT_AUDIO_ATTR = 'data-singfit-vapi-audio';

export type VapiAudioDiagnostics = {
  hasDailyCall: boolean;
  remoteCount: number;
  participants: Array<{
    userName: string;
    sessionId: string;
    audioState: string;
    hasTrack: boolean;
  }>;
  audioElementCount: number;
  lastVolumeLevel: number | null;
};

let lastVolumeLevel: number | null = null;
let lastDiagnostics: VapiAudioDiagnostics = {
  hasDailyCall: false,
  remoteCount: 0,
  participants: [],
  audioElementCount: 0,
  lastVolumeLevel: null,
};

export function noteVapiVolumeLevel(level: number) {
  lastVolumeLevel = level;
  lastDiagnostics = { ...lastDiagnostics, lastVolumeLevel: level };
}

export function getVapiAudioDiagnostics(): VapiAudioDiagnostics {
  return lastDiagnostics;
}

async function playRemoteTrack(track: MediaStreamTrack, sessionId: string) {
  let player = document.querySelector(
    `audio[${SINGFIT_AUDIO_ATTR}="${sessionId}"]`,
  ) as HTMLAudioElement | null;

  if (!player) {
    player = document.querySelector(
      `audio[data-participant-id="${sessionId}"]`,
    ) as HTMLAudioElement | null;
  }

  if (!player) {
    player = document.createElement('audio');
    player.setAttribute(SINGFIT_AUDIO_ATTR, sessionId);
    player.style.display = 'none';
    document.body.appendChild(player);
  }

  player.muted = false;
  player.autoplay = true;
  player.volume = 1;
  player.srcObject = new MediaStream([track]);

  try {
    await player.play();
  } catch (err) {
    console.warn('[SingFit] Eden audio play blocked — click the page or check volume', err);
  }
}

async function subscribeRemoteAudio(call: DailyCall, sessionId: string) {
  try {
    await call.updateParticipant(sessionId, {
      setSubscribedTracks: { audio: true, video: false },
    });
  } catch (err) {
    console.warn('[SingFit] Could not subscribe to remote audio', sessionId, err);
  }
}

function collectDiagnostics(call: DailyCall | null): VapiAudioDiagnostics {
  if (!call) {
    return {
      hasDailyCall: false,
      remoteCount: 0,
      participants: [],
      audioElementCount: document.querySelectorAll(
        `audio[data-participant-id], audio[${SINGFIT_AUDIO_ATTR}]`,
      ).length,
      lastVolumeLevel,
    };
  }

  const participants = call.participants();
  const remotes: VapiAudioDiagnostics['participants'] = [];

  for (const id of Object.keys(participants)) {
    const p = participants[id];
    if (!p || p.local) continue;
    const track = p.tracks?.audio?.persistentTrack ?? p.tracks?.audio?.track;
    remotes.push({
      userName: p.user_name ?? '(unknown)',
      sessionId: id,
      audioState: String(p.tracks?.audio?.state ?? 'unknown'),
      hasTrack: Boolean(track),
    });
  }

  return {
    hasDailyCall: true,
    remoteCount: remotes.length,
    participants: remotes,
    audioElementCount: document.querySelectorAll(
      `audio[data-participant-id], audio[${SINGFIT_AUDIO_ATTR}]`,
    ).length,
    lastVolumeLevel,
  };
}

/** Subscribe + attach all remote assistant audio (Vapi uses manual track subscription). */
export async function syncVapiRemoteAudio(vapi: VapiClient): Promise<VapiAudioDiagnostics> {
  const call = vapi.getDailyCallObject();
  if (!call) {
    lastDiagnostics = collectDiagnostics(null);
    return lastDiagnostics;
  }

  const participants = call.participants();
  for (const id of Object.keys(participants)) {
    const p = participants[id];
    if (!p || p.local) continue;
    await subscribeRemoteAudio(call, id);
  }

  await new Promise((r) => window.setTimeout(r, 200));

  const refreshed = call.participants();
  for (const id of Object.keys(refreshed)) {
    const p = refreshed[id];
    if (!p || p.local) continue;
    const track = p.tracks?.audio?.persistentTrack ?? p.tracks?.audio?.track;
    if (track?.kind === 'audio') {
      await playRemoteTrack(track, id);
    }
  }

  document
    .querySelectorAll(`audio[data-participant-id], audio[${SINGFIT_AUDIO_ATTR}]`)
    .forEach((el) => {
      if (el instanceof HTMLAudioElement) {
        el.muted = false;
        el.volume = 1;
        void el.play().catch(() => undefined);
      }
    });

  lastDiagnostics = collectDiagnostics(call);
  console.info('[SingFit] Vapi audio diagnostics', lastDiagnostics);
  return lastDiagnostics;
}

const boundDaily = new WeakSet<object>();

export function bindDailyAudioFallback(vapi: VapiClient) {
  const call = vapi.getDailyCallObject();
  if (!call || boundDaily.has(call)) return;
  boundDaily.add(call);

  call.on('participant-joined', (e) => {
    if (!e?.participant || e.participant.local) return;
    void subscribeRemoteAudio(call, e.participant.session_id);
  });

  call.on('track-started', (e) => {
    if (!e?.participant || e.participant.local) return;
    if (e.track?.kind !== 'audio') return;
    void playRemoteTrack(e.track, e.participant.session_id);
  });
}
