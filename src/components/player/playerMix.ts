export type MixLevels = {
  lyricCoach: number;
  guideSinger: number;
  backingMusic: number;
  playbackSpeed: number;
};

export const DEFAULT_MIX: MixLevels = {
  lyricCoach: 85,
  guideSinger: 50,
  /** Primary level control — each song is one mixed MP3, not separate stems. */
  backingMusic: 92,
  playbackSpeed: 50,
};

const SPEED_MIN = 0.75;
const SPEED_MAX = 1.35;

/** While Eden TTS is active, pull song down — not while she is merely "thinking". */
export const EDEN_DUCK_MULTIPLIER = 0.72;

/** Web Audio gain at max sliders — above 1.0; tuned down ~25% from prior ceiling. */
export const SONG_GAIN_CEILING = 2.1;

/**
 * POC plays a single MP3 per song. Sliders map to Web Audio linear gain (not HTML volume).
 * Backing is primary; lyric/guide are small trims.
 */
export function mixToLinearGain(mix: MixLevels): number {
  const backingGain = 1.05 + (mix.backingMusic / 100) * 1.05;
  const lyricTrim = 0.94 + (mix.lyricCoach / 100) * 0.06;
  const guideTrim = 0.94 + (mix.guideSinger / 100) * 0.06;
  return Math.min(SONG_GAIN_CEILING, backingGain * lyricTrim * guideTrim);
}

/** @deprecated use mixToLinearGain — kept for callers expecting 0–1 */
export function mixToVolume(mix: MixLevels): number {
  return Math.min(1, mixToLinearGain(mix));
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
