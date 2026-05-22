import { create } from 'zustand';
import { pickFavoriteSongs, pickRandomSong } from '../data/songs';
import {
  clearGoodbyeFinalizeTimer,
  finalizeSessionToHome,
  scheduleGoodbyeHomeFallback,
} from '../lib/sessionLifecycle';
import { resetSessionEndFlow } from '../lib/sessionEndSync';
import { beginVoiceDebugSession, logVoiceDebugStoreChange } from '../lib/voiceDebugLog';
import { resetMusicChoiceGuard } from '../lib/musicChoiceGuard';
import { markAwaitingSongIntro, resetSongIntroGate } from '../lib/playerIntroGate';
import { syncSongEndedToVapi } from '../lib/syncSongEndedToVapi';
import { formatTime } from '../lib/transcript';
import type {
  ScreenId,
  SessionPhase,
  Song,
  TranscriptLine,
  VapiCallStatus,
  VoiceUiState,
} from '../types/session';

function lineId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface SessionState {
  screen: ScreenId;
  phase: SessionPhase;
  voiceUi: VoiceUiState;
  participantSpeaking: boolean;
  vapiConnected: boolean;
  vapiCallStatus: VapiCallStatus;
  vapiCallError: string | null;
  offeredSong: Song | null;
  offeredHistory: string[];
  /** Rotating kicker line on song offer — resets when a new pick round starts. */
  offerKickerIndex: number;
  favoriteSongs: Song[];
  currentSong: Song | null;
  transcript: TranscriptLine[];
  moodNote: string | null;
  /** When true, player screen keeps backing track paused until resume. */
  playerAudioPaused: boolean;
  /** Non-null while Vapi ended unexpectedly — countdown overlay before home. */
  sessionEndOverlay: string | null;

  addTranscript: (role: TranscriptLine['role'], text: string) => void;
  setSessionEndOverlay: (message: string | null) => void;
  setVoiceUi: (v: VoiceUiState) => void;
  setParticipantSpeaking: (v: boolean) => void;
  setVapiConnected: (v: boolean) => void;
  setVapiCallStatus: (status: VapiCallStatus, error?: string | null) => void;
  setPlayerAudioPaused: (paused: boolean) => void;

  startSession: () => void;
  endSession: () => void;
  goHome: () => void;

  setMoodAndAdvance: (note: string) => void;
  goToMusicChoice: () => void;
  startAiPick: (advanceKicker?: boolean) => void;
  offerAnotherSong: () => void;
  confirmOfferedSong: () => void;
  showFavorites: () => void;
  selectFavorite: (song: Song) => void;
  goBackToMusicChoice: () => void;
  onSongEnded: () => void;
  submitSongFeedback: () => void;
  wantAnotherSong: () => void;
  finishSession: () => void;
  submitWrapUp: () => void;
}

const initial = {
  screen: 'home' as ScreenId,
  phase: 'starting' as SessionPhase,
  voiceUi: 'idle' as VoiceUiState,
  participantSpeaking: false,
  vapiConnected: false,
  vapiCallStatus: 'idle' as VapiCallStatus,
  vapiCallError: null as string | null,
  offeredSong: null as Song | null,
  offeredHistory: [] as string[],
  offerKickerIndex: 0,
  favoriteSongs: [] as Song[],
  currentSong: null as Song | null,
  transcript: [] as TranscriptLine[],
  moodNote: null as string | null,
  playerAudioPaused: false,
  sessionEndOverlay: null as string | null,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  ...initial,

  addTranscript: (role, text) => {
    const { phase, transcript } = get();
    set({
      transcript: [
        ...transcript,
        { id: lineId(), at: formatTime(), role, text, phase },
      ],
    });
  },

  setVoiceUi: (voiceUi) => set({ voiceUi }),
  setParticipantSpeaking: (participantSpeaking) => set({ participantSpeaking }),
  setVapiConnected: (vapiConnected) => set({ vapiConnected }),
  setVapiCallStatus: (vapiCallStatus, vapiCallError = null) =>
    set({ vapiCallStatus, vapiCallError: vapiCallError ?? null }),

  setSessionEndOverlay: (sessionEndOverlay) => set({ sessionEndOverlay }),

  setPlayerAudioPaused: (playerAudioPaused) => set({ playerAudioPaused }),

  startSession: () => {
    beginVoiceDebugSession('startSession');
    clearGoodbyeFinalizeTimer();
    resetSessionEndFlow();
    resetMusicChoiceGuard();
    set({
      ...initial,
      screen: 'voice_hub',
      phase: 'starting',
      voiceUi: 'listening',
      sessionEndOverlay: null,
    });
    const s = get();
    s.addTranscript('system', 'Voice session starting — full-duplex');
    set({
      phase: 'mood_check',
      voiceUi: 'listening',
      vapiCallStatus: 'idle',
      vapiCallError: null,
      sessionEndOverlay: null,
    });
  },

  endSession: () => {
    const { phase } = get();
    logVoiceDebugStoreChange('endSession (user) — immediate home', { phase });
    if (phase === 'starting') return;
    finalizeSessionToHome();
  },

  goHome: () => {
    finalizeSessionToHome();
  },

  setMoodAndAdvance: (note) => {
    set({
      moodNote: note,
      phase: 'music_choice',
      screen: 'voice_hub',
      voiceUi: 'listening',
    });
  },

  goToMusicChoice: () => {
    set({
      screen: 'voice_hub',
      phase: 'music_choice',
      currentSong: null,
      offeredSong: null,
      favoriteSongs: [],
      offerKickerIndex: 0,
      voiceUi: 'listening',
    });
  },

  startAiPick: (advanceKicker = false) => {
    const { offeredHistory, offerKickerIndex } = get();
    const song = pickRandomSong(offeredHistory);
    const nextKicker = advanceKicker
      ? Math.min(offerKickerIndex + 1, 4)
      : 0;
    set({
      screen: 'song_offer',
      phase: 'song_recommend',
      offeredSong: song,
      offeredHistory: [...offeredHistory, song.id],
      offerKickerIndex: nextKicker,
      currentSong: null,
      voiceUi: 'listening',
    });
  },

  offerAnotherSong: () => {
    get().startAiPick(true);
  },

  confirmOfferedSong: () => {
    const { offeredSong } = get();
    if (!offeredSong) return;
    markAwaitingSongIntro();
    set({
      currentSong: offeredSong,
      screen: 'player',
      phase: 'playing',
      offeredSong: null,
      playerAudioPaused: false,
      voiceUi: 'listening',
    });
  },

  showFavorites: () => {
    set({
      screen: 'favorites',
      phase: 'favorites',
      favoriteSongs: pickFavoriteSongs(7),
      currentSong: null,
      playerAudioPaused: false,
      voiceUi: 'listening',
    });
  },

  selectFavorite: (song) => {
    markAwaitingSongIntro();
    set({
      currentSong: song,
      screen: 'player',
      phase: 'playing',
      playerAudioPaused: false,
      voiceUi: 'listening',
    });
  },

  goBackToMusicChoice: () => {
    resetSongIntroGate();
    set({
      screen: 'voice_hub',
      phase: 'music_choice',
      offeredSong: null,
      currentSong: null,
      favoriteSongs: [],
      offerKickerIndex: 0,
      playerAudioPaused: false,
      voiceUi: 'listening',
    });
  },

  onSongEnded: () => {
    set({
      screen: 'voice_hub',
      phase: 'song_feedback',
      currentSong: null,
      playerAudioPaused: false,
      voiceUi: 'listening',
    });
    queueMicrotask(() => syncSongEndedToVapi());
  },

  submitSongFeedback: () => {
    set({ phase: 'continue_or_end', voiceUi: 'listening' });
  },

  wantAnotherSong: () => {
    get().goToMusicChoice();
  },

  finishSession: () => {
    set({
      screen: 'voice_hub',
      phase: 'wrap_up',
      currentSong: null,
      offeredSong: null,
      voiceUi: 'listening',
    });
  },

  submitWrapUp: () => {
    set({
      phase: 'goodbye',
      screen: 'voice_hub',
      voiceUi: 'listening',
    });
    scheduleGoodbyeHomeFallback();
  },
}));
