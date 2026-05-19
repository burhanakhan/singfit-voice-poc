import type { ScreenId, SessionPhase } from '../types/session';
import { PHASE_HEADINGS } from '../types/session';
import type { Song } from '../types/session';

export function buildPhaseContextMessage(input: {
  phase: SessionPhase;
  screen: ScreenId;
  offeredSong: Song | null;
  favoriteSongs: Song[];
  currentSong: Song | null;
  moodNote: string | null;
}): string {
  const { phase, screen, offeredSong, favoriteSongs, currentSong, moodNote } = input;
  const heading = PHASE_HEADINGS[phase];
  const lines = [
    `[APP STATE] phase=${phase} screen=${screen} heading="${heading}".`,
    'Call the matching client tool when Nina is ready to advance. Do not invent screens.',
    'The app UI already shows song titles on offer, favorites, and player screens — do not repeat them unless Nina asks.',
  ];

  if (moodNote) lines.push(`Mood note: ${moodNote}.`);

  if (offeredSong) {
    lines.push(`On-screen offer: "${offeredSong.title}" by ${offeredSong.style}.`);
  }

  if (favoriteSongs.length) {
    const list = favoriteSongs.map((s, i) => `${i + 1}. ${s.title}`).join(', ');
    lines.push(`Favorites visible: ${list}.`);
  }

  if (currentSong) {
    lines.push(`Now playing: "${currentSong.title}" by ${currentSong.style}.`);
  }

  switch (phase) {
    case 'mood_check':
      lines.push('Goal: learn how Nina feels, then call set_mood.');
      break;
    case 'music_choice':
      lines.push('Goal: AI pick (show_ai_song_pick) or favorites (show_favorites).');
      break;
    case 'song_recommend':
      lines.push('Goal: confirm_offered_song or pick_another_song or go_back_to_music_choice.');
      break;
    case 'favorites':
      lines.push('Goal: select_favorite_song or go_back_to_music_choice.');
      break;
    case 'playing':
      lines.push('Goal: encourage singing; go_back_to_music_choice if she wants to change songs.');
      break;
    case 'song_feedback':
      lines.push('Goal: ask how she liked it; then complete_song_feedback.');
      break;
    case 'continue_or_end':
      lines.push('Goal: want_another_song or done_for_today.');
      break;
    case 'wrap_up':
      lines.push('Goal: ask mood improvement; then complete_wrap_up.');
      break;
    case 'goodbye':
      lines.push(
        'Goal: brief warm goodbye only. No filler phrases (no "one sec", "hold on", "let me check"). App ends session after you stop speaking.',
      );
      break;
    default:
      break;
  }

  return lines.join(' ');
}
