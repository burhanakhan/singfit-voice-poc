import { create } from 'zustand';
import { pickFavoriteSongs, pickRandomSong } from '../data/songs';
import { downloadTranscript, formatTime } from '../lib/transcript';
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
  favoriteSongs: Song[];
  currentSong: Song | null;
  transcript: TranscriptLine[];
  moodNote: string | null;

  addTranscript: (role: TranscriptLine['role'], text: string) => void;
  setVoiceUi: (v: VoiceUiState) => void;
  setParticipantSpeaking: (v: boolean) => void;
  setVapiConnected: (v: boolean) => void;
  setVapiCallStatus: (status: VapiCallStatus, error?: string | null) => void;

  startSession: () => void;
  endSession: () => void;
  goHome: () => void;

  setMoodAndAdvance: (note: string) => void;
  goToMusicChoice: () => void;
  startAiPick: () => void;
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
  favoriteSongs: [] as Song[],
  currentSong: null as Song | null,
  transcript: [] as TranscriptLine[],
  moodNote: null as string | null,
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

  startSession: () => {
    set({
      ...initial,
      screen: 'voice_hub',
      phase: 'starting',
      voiceUi: 'listening',
    });
    const s = get();
    s.addTranscript('system', 'Voice session starting — full-duplex');
    set({ phase: 'mood_check', voiceUi: 'listening', vapiCallStatus: 'idle', vapiCallError: null });
  },

  endSession: () => {
    const s = get();
    if (s.phase !== 'wrap_up' && s.phase !== 'goodbye') {
      set({
        screen: 'voice_hub',
        phase: 'wrap_up',
        currentSong: null,
        offeredSong: null,
        voiceUi: 'listening',
      });
      return;
    }
    get().goHome();
  },

  goHome: () => {
    const { transcript } = get();
    if (transcript.length > 2) downloadTranscript(transcript);
    set({ ...initial, screen: 'home', voiceUi: 'idle' });
  },

  setMoodAndAdvance: (note) => {
    set({
      moodNote: note,
      phase: 'music_choice',
      screen: 'voice_hub',
      voiceUi: 'listening',
    });
    get().addTranscript('nina', note);
  },

  goToMusicChoice: () => {
    set({
      screen: 'voice_hub',
      phase: 'music_choice',
      currentSong: null,
      offeredSong: null,
      voiceUi: 'listening',
    });
  },

  startAiPick: () => {
    const { offeredHistory } = get();
    const song = pickRandomSong(offeredHistory);
    set({
      screen: 'song_offer',
      phase: 'song_recommend',
      offeredSong: song,
      offeredHistory: [...offeredHistory, song.id],
      currentSong: null,
      voiceUi: 'listening',
    });
  },

  offerAnotherSong: () => {
    get().startAiPick();
  },

  confirmOfferedSong: () => {
    const { offeredSong } = get();
    if (!offeredSong) return;
    set({
      currentSong: offeredSong,
      screen: 'player',
      phase: 'playing',
      offeredSong: null,
      voiceUi: 'listening',
    });
  },

  showFavorites: () => {
    set({
      screen: 'favorites',
      phase: 'favorites',
      favoriteSongs: pickFavoriteSongs(7),
      currentSong: null,
      voiceUi: 'listening',
    });
  },

  selectFavorite: (song) => {
    set({
      currentSong: song,
      screen: 'player',
      phase: 'playing',
      voiceUi: 'listening',
    });
  },

  goBackToMusicChoice: () => {
    set({
      screen: 'voice_hub',
      phase: 'music_choice',
      offeredSong: null,
      currentSong: null,
      voiceUi: 'listening',
    });
  },

  onSongEnded: () => {
    set({
      screen: 'voice_hub',
      phase: 'song_feedback',
      currentSong: null,
      voiceUi: 'listening',
    });
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
    set({ phase: 'goodbye', voiceUi: 'speaking' });
    setTimeout(() => get().goHome(), 2500);
  },
}));
