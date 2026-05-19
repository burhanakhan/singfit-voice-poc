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
      s.startAiPick();
      const song = useSessionStore.getState().offeredSong;
      return song
        ? `App shows song offer: "${song.title}" by ${song.style}. Ask if she wants to sing it or pick something else.`
        : 'App is on song offer screen.';
    }

    case VAPI_TOOL_NAMES.showFavorites: {
      s.showFavorites();
      const titles = useSessionStore
        .getState()
        .favoriteSongs.map((song, i) => `${i + 1}. ${song.title} (${song.style})`)
        .join('; ');
      return `App shows Nina's favorite songs: ${titles}. Help her pick by name or number.`;
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
        ? `App shows a new offer: "${song.title}" by ${song.style}.`
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
        return `Could not match that song. Favorites on screen: ${list.map((x) => x.title).join(', ')}. Ask Nina to repeat or pick by number.`;
      }
      s.selectFavorite(song);
      return `App started playback of "${song.title}" by ${song.style}. Encourage her to sing along.`;
    }

    case VAPI_TOOL_NAMES.goBackToMusicChoice: {
      s.goBackToMusicChoice();
      return 'App returned to Choosing music on the voice hub. Re-state AI pick vs favorite songs.';
    }

    case VAPI_TOOL_NAMES.completeSongFeedback: {
      s.submitSongFeedback();
      return 'App is on What\'s next. Ask if she wants another song or is done for today.';
    }

    case VAPI_TOOL_NAMES.wantAnotherSong: {
      s.wantAnotherSong();
      return 'App returned to Choosing music. Offer AI pick or favorite songs again.';
    }

    case VAPI_TOOL_NAMES.doneForToday: {
      s.finishSession();
      return 'App is on Session wrap-up. Ask if her mood improved a little, a lot, or not at all.';
    }

    case VAPI_TOOL_NAMES.completeWrapUp: {
      const improvement = String(args.improvement ?? 'shared').trim();
      s.addTranscript('nina', improvement);
      s.submitWrapUp();
      return 'Phase is goodbye. Give a brief warm goodbye to Nina now. Do not say you are loading, waiting, or checking anything. The app will return home after you finish speaking.';
    }

    default:
      return `Unknown tool "${name}". Continue using the current phase goal.`;
  }
}
