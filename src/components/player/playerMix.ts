export type MixLevels = {
  lyricCoach: number;
  guideSinger: number;
  backingMusic: number;
  playbackSpeed: number;
};

export const DEFAULT_MIX: MixLevels = {
  lyricCoach: 85,
  guideSinger: 50,
  backingMusic: 50,
  playbackSpeed: 50,
};

const SPEED_MIN = 0.75;
const SPEED_MAX = 1.35;

export function mixToVolume(mix: MixLevels): number {
  const backing = mix.backingMusic / 100;
  const lyric = 0.35 + (mix.lyricCoach / 100) * 0.65;
  const guide = 0.35 + (mix.guideSinger / 100) * 0.65;
  return Math.min(1, backing * lyric * guide);
}

export function mixToPlaybackRate(mix: MixLevels, highKey: boolean): number {
  const t = mix.playbackSpeed / 100;
  const base = SPEED_MIN + t * (SPEED_MAX - SPEED_MIN);
  return base * (highKey ? 1.06 : 0.94);
}

export function formatPlayerTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}
