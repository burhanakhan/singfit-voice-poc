/**
 * Browser <audio>.volume is capped at 1.0; Eden (Daily/WebRTC) often sounds much louder
 * at the same nominal level. Route the song through a GainNode so mix sliders can boost
 * above 1.0 to match perceived loudness in Explorer / system player.
 */

type PlayerChain = {
  gain: GainNode;
};

let audioContext: AudioContext | null = null;
const chains = new WeakMap<HTMLAudioElement, PlayerChain>();

function getContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/** Wire the player <audio> through Web Audio (once per element). */
export function attachPlayerAudio(el: HTMLAudioElement): void {
  if (chains.has(el)) return;
  const ctx = getContext();
  const source = ctx.createMediaElementSource(el);
  const gain = ctx.createGain();
  source.connect(gain);
  gain.connect(ctx.destination);
  chains.set(el, { gain });
  el.volume = 1;
}

export async function resumePlayerAudioContext(): Promise<void> {
  const ctx = audioContext;
  if (!ctx || ctx.state !== 'suspended') return;
  try {
    await ctx.resume();
  } catch {
    /* ignore */
  }
}

/** Linear gain; values above 1.0 are allowed (capped for safety). */
export function setPlayerLinearGain(el: HTMLAudioElement, linearGain: number): void {
  const clamped = Math.max(0, Math.min(4, linearGain));
  const chain = chains.get(el);
  if (chain) {
    chain.gain.gain.value = clamped;
    el.volume = 1;
    return;
  }
  el.volume = Math.min(1, clamped);
}

export function disposePlayerAudio(el: HTMLAudioElement): void {
  chains.delete(el);
}
