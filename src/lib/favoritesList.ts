import type { Song } from '../types/session';

/** For tools / matching — includes list index for select_favorite_song. */
export function formatFavoritesListLines(songs: Song[]): string {
  return songs.map((s, i) => `${i + 1}. "${s.title}" by ${s.style}`).join('; ');
}

/** What Eden may read aloud — title and style only, never spoken numbers. */
export function formatFavoritesForEdenSpeech(songs: Song[]): string {
  if (!songs.length) return 'No favorites on screen.';
  const spoken = songs.map((s) => `"${s.title}" by ${s.style}`).join('; ');
  return [
    `Favorites on screen (${songs.length} songs). Nina sees each row labeled 1. Title, 2. Title, etc. — you must NOT say those numbers aloud.`,
    `Read aloud in order, title and style only: ${spoken}.`,
    'Then invite her to pick by saying the song title OR the number shown on her screen (you do not speak the numbers).',
  ].join(' ');
}

/** @deprecated Use formatFavoritesForEdenSpeech */
export function formatFavoritesForEden(songs: Song[]): string {
  return formatFavoritesForEdenSpeech(songs);
}
