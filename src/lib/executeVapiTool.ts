import { formatFavoritesForEdenSpeech, formatFavoritesListLines } from './favoritesList';
import { disableSingAlongMode } from './singAlongMode';
import { resetSongIntroGate } from './playerIntroGate';
import { clearMusicChoiceHold } from './musicChoiceGuard';
import { requestPlayerPlaybackStart } from './playerPlaybackControl';
import { useSessionStore } from '../store/sessionStore';
import type { Song } from '../types/session';
import { VAPI_TOOL_NAMES, type VapiToolName } from './vapiTools';

function findFavoriteSong(songs: Song[], args: Record<string, unknown>): Song | null {
  const index = typeof args.listIndex === 'number' ? args.listIndex : Number(args.listIndex);
  if (Number.isFinite(index) && index >= 1 && index <= songs.length) {
    return songs[Math.floor(index) - 1] ?? null;
  }

  const title = String(args.songTitle ?? args.title ?? '').trim().toLowerCase();
  if (!title) return null;

  return (
    songs.find((s) => s.title.toLowerCase() === title) ??
    songs.find((s) => s.title.toLowerCase().includes(title)) ??
    songs.find((s) => title.includes(s.title.toLowerCase())) ??
    null
  );
}

/** Runs a client tool against session state; returns context for Eden (injected via add-message). */
export function executeVapiTool(name: string, args: Record<string, unknown>): string {
  const s = useSessionStore.getState();

  switch (name as VapiToolName) {
    case VAPI_TOOL_NAMES.setMood: {
      const mood = String(args.moodSummary ?? args.mood ?? 'shared how she feels').trim();
      s.setMoodAndAdvance(mood);
      return `App is on Choosing music. Nina's mood note: ${mood}. Offer AI pick or favorite songs if you have not already.`;
    }

    case VAPI_TOOL_NAMES.showAiSongPick: {
      clearMusicChoiceHold();
      s.startAiPick(false);
      const song = useSessionStore.getState().offeredSong;
      return song
        ? `App shows song offer: "${song.title}" by ${song.style}. Your next spoken line MUST say the title and style aloud, then ask if she wants to sing it or pick something else.`
        : 'App is on song offer screen.';
    }

    case VAPI_TOOL_NAMES.showFavorites: {
      clearMusicChoiceHold();
      s.showFavorites();
      const songs = useSessionStore.getState().favoriteSongs;
      return [
        'Tool result: Favorites screen is open.',
        formatFavoritesForEdenSpeech(songs),
        'Your next spoken turn: read title and style only (never say list numbers aloud). Ask her to pick by song title OR the number on her screen.',
      ].join(' ');
    }

    case VAPI_TOOL_NAMES.confirmOfferedSong: {
      if (!s.offeredSong) return 'No song on offer screen; ask Nina to choose music first.';
      const { title, style } = s.offeredSong;
      s.confirmOfferedSong();
      return `App started playback of "${title}" by ${style}. Encourage her to sing along. Stay brief.`;
    }

    case VAPI_TOOL_NAMES.pickAnotherSong: {
      s.offerAnotherSong();
      const song = useSessionStore.getState().offeredSong;
      return song
        ? `App shows a new offer: "${song.title}" by ${song.style}. Your next spoken line MUST say the title and style aloud, then ask if she wants this one or something else.`
        : 'App refreshed the song offer.';
    }

    case VAPI_TOOL_NAMES.selectFavoriteSong: {
      const songs = s.favoriteSongs;
      if (!songs.length) {
        s.showFavorites();
      }
      const list = useSessionStore.getState().favoriteSongs;
      const song = findFavoriteSong(list, args);
      if (!song) {
        return `Could not match that song. Favorites on screen: ${formatFavoritesListLines(list)}. Ask Nina to repeat or pick by number.`;
      }
      s.selectFavorite(song);
      return `App started playback of "${song.title}" by ${song.style}. Encourage her to sing along.`;
    }

    case VAPI_TOOL_NAMES.goBackToMusicChoice: {
      disableSingAlongMode();
      resetSongIntroGate();
      s.goBackToMusicChoice();
      return 'App returned to Choosing music on the voice hub. Re-state AI pick vs favorite songs.';
    }

    case VAPI_TOOL_NAMES.pausePlayback: {
      s.setPlayerAudioPaused(true);
      return 'Tool result: Song playback paused. Stay silent — do not confirm aloud.';
    }

    case VAPI_TOOL_NAMES.resumePlayback: {
      s.setPlayerAudioPaused(false);
      requestPlayerPlaybackStart();
      return 'Tool result: Song playback resumed. Stay silent — do not confirm aloud.';
    }

    case VAPI_TOOL_NAMES.skipSong: {
      s.onSongEnded();
      return 'Tool result: Song skipped — app is on song feedback. Ask how singing felt.';
    }

    case VAPI_TOOL_NAMES.completeSongFeedback: {
      s.submitSongFeedback();
      return [
        "Tool result: App is on What's next.",
        'Say ONE brief empathetic line about her feedback — no follow-up questions (never ask what contributed or why).',
        'Then ask if she wants another song or is done for today.',
        'Do not call done_for_today in this turn — wait for her answer first.',
      ].join(' ');
    }

    case VAPI_TOOL_NAMES.wantAnotherSong: {
      s.wantAnotherSong();
      return 'App returned to Choosing music. Offer AI pick or favorite songs again.';
    }

    case VAPI_TOOL_NAMES.doneForToday: {
      const phase = useSessionStore.getState().phase;
      if (phase === 'goodbye' || phase === 'wrap_up') {
        return 'Tool result: Already in session wrap-up.';
      }
      if (phase === 'song_feedback') {
        s.submitSongFeedback();
      }
      s.finishSession();
      return [
        'Tool result: Session wrap-up screen.',
        'Ask Nina ONLY: did singing today help her mood a little, a lot, or not at all?',
        'Do NOT say goodbye. Do NOT thank her for ending the session. Do NOT say the session is over.',
        'Do NOT use filler phrases. Wait for her answer, then call complete_wrap_up with improvement in { a little | a lot | not at all }.',
      ].join(' ');
    }

    case VAPI_TOOL_NAMES.completeWrapUp: {
      const improvement = String(args.improvement ?? 'shared').trim();
      s.addTranscript('nina', improvement);
      s.submitWrapUp();
      return [
        'Tool result: Wrap-up complete. Phase is now goodbye.',
        'Give a brief warm goodbye to Nina. The app returns home automatically after you finish speaking.',
      ].join(' ');
    }

    default:
      return `Unknown tool "${name}". Continue using the current phase goal.`;
  }
}
