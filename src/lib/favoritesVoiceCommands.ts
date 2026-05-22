import type { Song } from '../types/session';
import { executeVapiTool } from './executeVapiTool';
import type { VapiClient } from './vapiImport';
import { logVoiceDebug } from './voiceDebugLog';
import { useSessionStore } from '../store/sessionStore';
import { VAPI_TOOL_NAMES } from './vapiTools';
import { armSkipNextPhasePush } from './vapiConnectFlags';
import { deferVapiSend } from './vapiDeferredSend';

const WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function normalize(line: string): string {
  return line.trim().replace(/\s+/g, ' ').toLowerCase();
}

function wordToIndex(word: string, line: string): number | null {
  const n = WORD_TO_NUM[word];
  if (!n) return null;
  const re = new RegExp(`\\b${word}\\b(\\s+of\\b|\\s+of\\s+the\\b)`);
  if (re.test(line)) return null;
  return n;
}

export function parseFavoriteListIndex(line: string): number | null {
  const t = normalize(line);
  if (t.length < 2) return null;

  const digit =
    t.match(/\b(?:number|#|no\.?)\s*(\d{1,2})\b/) ??
    t.match(/\blet'?s\s+(?:play|sing|do|pick|choose)\s+(?:number\s+)?(\d{1,2})\b/) ??
    t.match(/\b(?:play|sing|do|pick|choose)\s+(?:number\s+)?(\d{1,2})\b/);

  if (digit) {
    const n = Number(digit[1]);
    if (n >= 1 && n <= 12) return n;
  }

  // Do not treat "just one look" / bare "one" in a title as list index 1.
  const wordMatch =
    t.match(
      /\b(?:number|#)\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:th)?\b/,
    ) ??
    t.match(
      /\blet'?s\s+(?:play|sing|do|pick|choose)\s+(?:number\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/,
    ) ??
    t.match(
      /\b(?:play|sing|do|pick|choose)\s+(?:number\s+)?(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/,
    );

  if (wordMatch) {
    return wordToIndex(wordMatch[1], t);
  }

  return null;
}

function findSongByTitleFragment(songs: Song[], line: string): Song | null {
  const t = normalize(line);
  const stripped = t
    .replace(/\blet'?s\s+(?:take|play|sing|do|pick|choose)\s+/i, '')
    .replace(/\b(?:take|play|sing|do|pick|choose)\s+(?:the\s+)?/i, '')
    .replace(/\bone\s+of\s+the\s+songs?\b/gi, '')
    .replace(/\b(?:wichita|lineman|linemen|alignment|linemen)\b/gi, 'wichita lineman')
    .trim();

  if (stripped.length < 3) return null;

  if (/\b(?:wichita|lineman|linemen|alignment)\b/.test(stripped)) {
    const wichita =
      songs.find((s) => /wichita/i.test(s.title)) ?? songs.find((s) => /lineman/i.test(s.title));
    if (wichita) return wichita;
  }

  return (
    songs.find((s) => stripped.includes(s.title.toLowerCase())) ??
    songs.find((s) => s.title.toLowerCase().includes(stripped)) ??
    songs.find((s) => {
      const words = s.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      return words.length > 0 && words.every((w) => stripped.includes(w));
    }) ??
    null
  );
}

export type FavoritePick = { listIndex?: number; songTitle?: string };

export function matchFavoritePick(line: string, songs: Song[]): FavoritePick | null {
  if (!songs.length) return null;

  const index = parseFavoriteListIndex(line);
  if (index != null && index >= 1 && index <= songs.length) {
    return { listIndex: index };
  }

  const byTitle = findSongByTitleFragment(songs, line);
  if (byTitle) return { songTitle: byTitle.title };

  return null;
}

const REPEAT_RE =
  /\b(?:repeat(?:\s+that|\s+the\s+list|\s+again)?|say\s+that\s+again|what\s+(?:were|are)\s+(?:they|those)|can\s+you\s+repeat|read\s+(?:the\s+)?(?:list|favorites?)\s+again|please\s+repeat)\b/i;

const GO_BACK_RE =
  /\b(?:let'?s\s+go\s+back|go\s+back|back\s+to\s+(?:eden|music|start)|start\s+over)\b/i;

export function handleFavoritesPhaseUserTranscript(
  vapi: VapiClient,
  line: string,
  onCommand: () => void,
): boolean {
  const songs = useSessionStore.getState().favoriteSongs;
  const t = normalize(line);

  if (GO_BACK_RE.test(t)) {
    armSkipNextPhasePush();
    const result = executeVapiTool(VAPI_TOOL_NAMES.goBackToMusicChoice, {});
    logVoiceDebug('tools', 'favorites: client go_back', { detail: { preview: line.slice(0, 80) } });
    onCommand();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content: `${result}\nApp is on Choosing music. One short line only — do not list favorites.`,
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  if (REPEAT_RE.test(t)) {
    onCommand();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[FAVORITES] Nina asked to repeat the list. Read each favorite title and style again (no list numbers aloud), then invite her to pick by title or screen number.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  const pick = matchFavoritePick(line, songs);

  if (!pick) {
    if (/\blet'?s\s+play\b/i.test(line) || /\bplay\s+(?:number|#)/i.test(line)) {
      logVoiceDebug('voiceUi', 'favorites: incomplete pick — need number or title', {
        detail: { preview: line.slice(0, 80) },
      });
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              `[FAVORITES] Nina said "${line.slice(0, 100)}" but did not name a clear song. ` +
              'Ask which number on screen (1–' +
              songs.length +
              ') or the song title, then call select_favorite_song.',
          },
          triggerResponseEnabled: true,
        });
      });
      onCommand();
      return true;
    }
    return false;
  }

  const args: Record<string, unknown> = {};
  if (pick.listIndex != null) args.listIndex = pick.listIndex;
  if (pick.songTitle) args.songTitle = pick.songTitle;

  armSkipNextPhasePush();
  const result = executeVapiTool(VAPI_TOOL_NAMES.selectFavoriteSong, args);
  logVoiceDebug('tools', 'favorites: client pick', { detail: { pick, preview: line.slice(0, 80) } });
  onCommand();
  deferVapiSend(() => {
    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: `${result}\nSong is playing — stay silent (no confirmation).`,
      },
      triggerResponseEnabled: false,
    });
  });
  return true;
}
