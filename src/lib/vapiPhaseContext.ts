import type { ScreenId, SessionPhase } from '../types/session';
import { PHASE_HEADINGS } from '../types/session';
import type { Song } from '../types/session';
import { formatFavoritesForEdenSpeech } from './favoritesList';
import { SING_ALONG_PHASE_HINT } from './voiceCommands';

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
  ];

  if (phase === 'favorites' && favoriteSongs.length) {
    lines.push(formatFavoritesForEdenSpeech(favoriteSongs));
  } else {
    lines.push(
      'The app UI shows song titles on offer and player screens — keep narration brief unless Nina asks for detail.',
    );
  }

  if (moodNote) lines.push(`Mood note: ${moodNote}.`);

  if (offeredSong) {
    lines.push(`On-screen offer: "${offeredSong.title}" by ${offeredSong.style}.`);
  }

  if (currentSong) {
    lines.push(`Now playing: "${currentSong.title}" by ${currentSong.style}.`);
  }

  switch (phase) {
    case 'mood_check':
      lines.push('Goal: learn how Nina feels, then call set_mood.');
      break;
    case 'music_choice':
      lines.push(
        'CRITICAL: Nina must choose the path — do NOT call show_ai_song_pick until she clearly asks you to suggest/pick a song.',
        'Goal: offer AI pick (show_ai_song_pick) or favorites (show_favorites) and wait for her answer.',
        'If she asks what favorites she has, call show_favorites first — never list song titles without that tool result.',
      );
      break;
    case 'song_recommend':
      lines.push(
        'CRITICAL: The song is NOT playing yet — Nina is on the song OFFER screen only (not the player).',
        'Do NOT say she is singing, listening, or enjoying the song until confirm_offered_song moves her to the player.',
        'Do NOT mention pause, resume, or skip until phase=playing.',
        'Goal: say the offered title and style aloud, then confirm_offered_song or pick_another_song or go_back_to_music_choice.',
      );
      break;
    case 'favorites':
      lines.push(
        'Goal: read each favorite (title + style only, never say "number one"). Wait for Nina.',
        'When she says "number 4", "let\'s play five", or a song title, call select_favorite_song immediately with listIndex (1-based) or songTitle.',
        'If she says go back / let\'s go back, call go_back_to_music_choice.',
      );
      break;
    case 'playing':
      lines.push(SING_ALONG_PHASE_HINT);
      lines.push(
        'Allowed tools during sing-along: go_back_to_music_choice, skip_song, pause_playback, resume_playback, show_favorites (only when she asks for those).',
      );
      break;
    case 'song_feedback':
      lines.push(
        'Goal: one brief empathy after her feedback, then complete_song_feedback — never ask follow-up questions.',
      );
      break;
    case 'continue_or_end':
      lines.push('Goal: want_another_song or done_for_today.');
      break;
    case 'wrap_up':
      lines.push(
        'Goal: ask ONLY whether mood improved a little, a lot, or not at all. Do NOT say goodbye. Do NOT end the session. Call complete_wrap_up after she answers.',
      );
      break;
    case 'goodbye':
      lines.push(
        'Goal: 2–3 warm sentences thanking Nina for singing today (complete_wrap_up was already called).',
        'Never say "one moment", "just a sec", or ask another question. App returns home after you finish speaking.',
      );
      break;
    default:
      break;
  }

  return lines.join(' ');
}
