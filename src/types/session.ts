export type ScreenId = 'home' | 'voice_hub' | 'song_offer' | 'favorites' | 'player';

export type VoiceUiState = 'speaking' | 'listening' | 'thinking' | 'idle';

export type VapiCallStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type SessionPhase =
  | 'starting'
  | 'mood_check'
  | 'music_choice'
  | 'song_recommend'
  | 'favorites'
  | 'playing'
  | 'song_feedback'
  | 'continue_or_end'
  | 'wrap_up'
  | 'goodbye';

export const PHASE_HEADINGS: Record<SessionPhase, string> = {
  starting: 'Getting started',
  mood_check: 'Checking in',
  music_choice: 'Choosing music',
  song_recommend: "Eden's pick",
  favorites: "Nina's favorite songs",
  playing: "Let's sing together",
  song_feedback: 'How did that feel?',
  continue_or_end: "What's next?",
  wrap_up: 'Session wrap-up',
  goodbye: 'Thank you',
};

export interface Song {
  id: string;
  title: string;
  style: string;
  filename: string;
}

export interface TranscriptLine {
  id: string;
  at: string;
  role: 'system' | 'eden' | 'nina';
  text: string;
  phase?: SessionPhase;
}
