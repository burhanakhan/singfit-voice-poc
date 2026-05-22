import { executeVapiTool } from './executeVapiTool';
import type { VapiClient } from './vapiImport';
import { matchFavoritePick } from './favoritesVoiceCommands';
import {
  matchDoneForToday,
  matchGoBackCommand,
  matchNavigationCommand,
  matchPickAnotherCommand,
  matchPlayingNavigationCommand,
  matchPlayingStartPlayback,
  matchPresenceCheck,
  matchSongOfferConfirm,
  matchSongOfferSkip,
  matchUserWantsAiPick,
  matchWantAnotherSong,
  normalizeVoiceLine,
  parseMoodFromLine,
  parseWrapUpImprovement,
  type NavigationCommand,
} from './voiceCommands';
import { deferVapiSend } from './vapiDeferredSend';
import { markPlayingCommandDetected, unmuteForPresenceReply } from './singAlongMode';
import { logVoiceDebug } from './voiceDebugLog';
import { noteClientToolExecuted } from './clientToolDedupe';
import { armMusicChoiceHold, clearMusicChoiceHold, noteUserAskedAiPick } from './musicChoiceGuard';
import { markSongIntroComplete } from './playerIntroGate';
import { requestPlayerPlaybackStart } from './playerPlaybackControl';
import { armSkipNextPhasePush } from './vapiConnectFlags';
import { useSessionStore } from '../store/sessionStore';
import { VAPI_TOOL_NAMES } from './vapiTools';
import type { SessionPhase } from '../types/session';

const NAV_TOOL: Record<NavigationCommand, string> = {
  go_back: VAPI_TOOL_NAMES.goBackToMusicChoice,
  skip_next: VAPI_TOOL_NAMES.skipSong,
  pause_stop: VAPI_TOOL_NAMES.pausePlayback,
  resume_play: VAPI_TOOL_NAMES.resumePlayback,
  show_favorites: VAPI_TOOL_NAMES.showFavorites,
  show_ai_pick: VAPI_TOOL_NAMES.showAiSongPick,
  pick_another: VAPI_TOOL_NAMES.pickAnotherSong,
  confirm_song: VAPI_TOOL_NAMES.confirmOfferedSong,
};

const PLAYING_NAV = new Set<NavigationCommand>([
  'go_back',
  'skip_next',
  'pause_stop',
  'resume_play',
  'show_favorites',
]);

const NO_FILLER =
  'No filler phrases ("one moment", "this will take a sec", "just a moment"). App already applied the action.';

function runClientTool(
  vapi: VapiClient,
  toolName: string,
  args: Record<string, unknown> = {},
  opts?: { triggerResponse?: boolean; extraSystem?: string },
) {
  armSkipNextPhasePush();
  const result = executeVapiTool(toolName, args);
  noteClientToolExecuted(toolName);
  logVoiceDebug('tools', `voice: client ${toolName}`, { detail: { preview: args } });
  const trigger = opts?.triggerResponse ?? false;
  deferVapiSend(() => {
    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: [result, NO_FILLER, opts?.extraSystem].filter(Boolean).join('\n'),
      },
      triggerResponseEnabled: trigger,
    });
  });
  return true;
}

function handlePlaying(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  if (matchPlayingStartPlayback(line)) {
    markSongIntroComplete();
    requestPlayerPlaybackStart();
    onCommand?.();
    return true;
  }

  const nav = matchPlayingNavigationCommand(line);
  if (nav && PLAYING_NAV.has(nav)) {
    markPlayingCommandDetected();
    onCommand?.();
    if (nav === 'go_back' && matchGoBackCommand(line)) {
      runClientTool(vapi, NAV_TOOL.go_back, {}, { triggerResponse: false });
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              '[MUSIC CHOICE] Nina left the song. Speak now: one short warm line — offer AI pick or favorites. No filler.',
          },
          triggerResponseEnabled: true,
        });
      });
      return true;
    }
    if (nav === 'pause_stop' || nav === 'resume_play') {
      runClientTool(vapi, NAV_TOOL[nav], {}, { triggerResponse: false });
      return true;
    }
    runClientTool(vapi, NAV_TOOL[nav], {}, { triggerResponse: nav === 'show_favorites' });
    return true;
  }

  if (matchPresenceCheck(line)) {
    unmuteForPresenceReply();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[SING-ALONG] Nina checked if you are there. One short warm line only ("Yes Nina, I\'m right here."). Then stop. No tools. No questions.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  logVoiceDebug('voiceUi', 'sing-along: silent (not a command)', { detail: { preview: line.slice(0, 80) } });
  return true;
}

function handleFavorites(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  if (matchGoBackCommand(line)) {
    onCommand?.();
    runClientTool(vapi, NAV_TOOL.go_back, {}, { triggerResponse: false });
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[MUSIC CHOICE] Nina left favorites. Speak now: one short line — offer AI pick or favorites. No filler.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  const songs = useSessionStore.getState().favoriteSongs;
  const pick = matchFavoritePick(line, songs);
  if (pick) {
    const args: Record<string, unknown> = {};
    if (pick.listIndex != null) args.listIndex = pick.listIndex;
    if (pick.songTitle) args.songTitle = pick.songTitle;
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.selectFavoriteSong, args, {
      triggerResponse: false,
      extraSystem:
        'Give a full short intro (title + style + invite to sing, at least one sentence). The app starts the song after you finish speaking.',
    });
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[PLAYING] Nina picked a favorite. One warm intro sentence naming title and style, invite her to sing. No filler. Do not call tools.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  if (/\b(?:repeat|say\s+that\s+again|read\s+(?:the\s+)?list)\b/i.test(line)) {
    onCommand?.();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[FAVORITES] Repeat the on-screen favorites (title + style only, never say list numbers aloud). Then invite pick by title or screen number.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  if (/\blet'?s\s+play\b/i.test(line) || /\bplay\s+(?:number|#)/i.test(line)) {
    onCommand?.();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            `[FAVORITES] Nina said "${line.slice(0, 100)}" but did not name a clear song. ` +
            `Ask which number on screen (1–${songs.length}) or the song title, then call select_favorite_song.`,
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  return false;
}

function handleMusicChoice(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  if (matchDoneForToday(line)) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.doneForToday, {}, { triggerResponse: true });
    return true;
  }

  if (matchGoBackCommand(line)) {
    onCommand?.();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[MUSIC CHOICE] Nina is on the voice hub. Speak now: one short line — offer AI pick or favorites. No filler.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  if (matchUserWantsAiPick(line)) {
    noteUserAskedAiPick();
    clearMusicChoiceHold();
    onCommand?.();
    runClientTool(vapi, NAV_TOOL.show_ai_pick, {}, { triggerResponse: false });
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[SONG OFFER] Say the offered title and style aloud, then ask if she wants to sing it or try another. No filler.',
        },
        triggerResponseEnabled: true,
      });
    });
    return true;
  }

  const nav = matchNavigationCommand(line);
  if (nav === 'show_favorites') {
    clearMusicChoiceHold();
    onCommand?.();
    runClientTool(vapi, NAV_TOOL.show_favorites, {}, { triggerResponse: true });
    return true;
  }

  return false;
}

function handleMoodCheck(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  const nav = matchNavigationCommand(line);
  const mood = parseMoodFromLine(line);
  const wantsMusic =
    nav === 'show_ai_pick' ||
    nav === 'show_favorites' ||
    /\bpick\s+a\s+song\b/i.test(normalizeVoiceLine(line));

  if (mood || wantsMusic) {
    onCommand?.();
    const note = mood ?? 'ready to choose music';
    runClientTool(vapi, VAPI_TOOL_NAMES.setMood, { moodSummary: note }, { triggerResponse: false });
    armMusicChoiceHold();
    deferVapiSend(() => {
      vapi.send({
        type: 'add-message',
        message: {
          role: 'system',
          content:
            '[MUSIC CHOICE] Nina shared her mood. Stay on Choosing music. Ask if she wants YOU to pick a song or her FAVORITES. Do NOT call show_ai_song_pick until she clearly asks for a suggestion.',
        },
        triggerResponseEnabled: true,
      });
    });
    if (nav === 'show_favorites') {
      clearMusicChoiceHold();
      runClientTool(vapi, NAV_TOOL.show_favorites, {}, { triggerResponse: true });
      return true;
    }
    if (nav === 'show_ai_pick' || wantsMusic) {
      clearMusicChoiceHold();
      runClientTool(vapi, NAV_TOOL.show_ai_pick, {}, { triggerResponse: false });
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              '[SONG OFFER] Say the offered title and style aloud, then ask if she wants to sing it or try another. No filler.',
          },
          triggerResponseEnabled: true,
        });
      });
      return true;
    }
    return true;
  }
  return false;
}

function handleSongOffer(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  const skip = matchSongOfferSkip(line);
  const confirm = !skip && matchSongOfferConfirm(line);
  const pickAnother = skip || matchPickAnotherCommand(line);
  const nav = matchNavigationCommand(line);
  if (!confirm && !pickAnother && !nav) return false;
  if (confirm || pickAnother || nav === 'show_ai_pick' || nav === 'go_back' || nav === 'show_favorites') {
    onCommand?.();
    if (pickAnother && !confirm) {
      runClientTool(
        vapi,
        pickAnother ? NAV_TOOL.pick_another : NAV_TOOL.show_ai_pick,
        {},
        { triggerResponse: false },
      );
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              '[SONG OFFER] Say the offered title and style aloud, then ask if she wants to sing it or try another. No filler.',
          },
          triggerResponseEnabled: true,
        });
      });
      return true;
    }
    if (confirm) {
      runClientTool(vapi, NAV_TOOL.confirm_song, {}, { triggerResponse: false });
      const song = useSessionStore.getState().currentSong;
      const titleHint = song ? `Title: "${song.title}" by ${song.style}. ` : '';
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: {
            role: 'system',
            content:
              `[PLAYING] Nina confirmed the song. ${titleHint}Speak 2–3 sentences: name the song, invite her to sing along. ` +
              'Never say "just a sec", "one moment", or "give me a moment". Do not call tools.',
          },
          triggerResponseEnabled: true,
        });
      });
      return true;
    }
    if (nav === 'go_back' || nav === 'show_favorites') {
      runClientTool(vapi, NAV_TOOL[nav], {}, { triggerResponse: true });
      return true;
    }
  }
  return false;
}

const FEEDBACK_RE =
  /\b(?:good|great|nice|loved|fun|tired|okay|ok|refreshing|better|well|wonderful|fine|enjoyed|terrible|awful|bad|rough|hard|disliked|hated|didn'?t\s+(?:like|enjoy)|not\s+good)\b/i;

function handleSongFeedback(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  if (matchDoneForToday(line)) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.doneForToday, {}, { triggerResponse: true });
    return true;
  }
  if (line.length >= 3 && FEEDBACK_RE.test(line)) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.completeSongFeedback, {}, {
      triggerResponse: true,
      extraSystem:
        'Nina gave song feedback. Say ONE brief empathetic line only. Do NOT ask what contributed, why, or any follow-up. Then ask if she wants another song or is done for today.',
    });
    return true;
  }
  return false;
}

function handleContinueOrEnd(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  if (matchDoneForToday(line)) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.doneForToday, {}, { triggerResponse: true });
    return true;
  }
  if (matchWantAnotherSong(line)) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.wantAnotherSong, {}, { triggerResponse: true });
    return true;
  }
  const improvement = parseWrapUpImprovement(line);
  if (improvement) {
    onCommand?.();
    runClientTool(vapi, VAPI_TOOL_NAMES.completeWrapUp, { improvement }, {
      triggerResponse: true,
      extraSystem: `She answered "${improvement}". Do NOT ask the mood question again. Speak 2–3 warm goodbye sentences — never "one moment".`,
    });
    return true;
  }
  return false;
}

function handleWrapUp(vapi: VapiClient, line: string, onCommand?: () => void): boolean {
  const improvement = parseWrapUpImprovement(line);
  if (!improvement) return false;
  onCommand?.();
  runClientTool(vapi, VAPI_TOOL_NAMES.completeWrapUp, { improvement }, {
    triggerResponse: true,
    extraSystem: `She answered "${improvement}". Do NOT ask the mood question again. Speak 2–3 warm goodbye sentences — never "one moment".`,
  });
  return true;
}

/**
 * One client-side voice router for every phase (same command patterns).
 * Playing always returns true so Vapi does not chat over the song.
 */
export function handlePhaseUserTranscript(
  vapi: VapiClient,
  line: string,
  phase: SessionPhase,
  onCommand?: () => void,
): boolean {
  switch (phase) {
    case 'mood_check':
      return handleMoodCheck(vapi, line, onCommand);
    case 'playing':
      return handlePlaying(vapi, line, onCommand);
    case 'favorites':
      return handleFavorites(vapi, line, onCommand);
    case 'music_choice':
      return handleMusicChoice(vapi, line, onCommand);
    case 'song_recommend':
      return handleSongOffer(vapi, line, onCommand);
    case 'song_feedback':
      return handleSongFeedback(vapi, line, onCommand);
    case 'continue_or_end':
      return handleContinueOrEnd(vapi, line, onCommand);
    case 'wrap_up':
      return handleWrapUp(vapi, line, onCommand);
    default:
      return false;
  }
}
