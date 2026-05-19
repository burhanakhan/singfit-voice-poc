import type { CreateFunctionToolDTO } from '@vapi-ai/web/dist/api';

/** Client-side Vapi tools — injected at call start (see docs/VAPI_EDEN_ASSISTANT.md). */

export const VAPI_TOOL_NAMES = {
  setMood: 'set_mood',
  showAiSongPick: 'show_ai_song_pick',
  showFavorites: 'show_favorites',
  confirmOfferedSong: 'confirm_offered_song',
  pickAnotherSong: 'pick_another_song',
  selectFavoriteSong: 'select_favorite_song',
  goBackToMusicChoice: 'go_back_to_music_choice',
  completeSongFeedback: 'complete_song_feedback',
  wantAnotherSong: 'want_another_song',
  doneForToday: 'done_for_today',
  completeWrapUp: 'complete_wrap_up',
} as const;

export type VapiToolName = (typeof VAPI_TOOL_NAMES)[keyof typeof VAPI_TOOL_NAMES];

/** Client-side function tools (no server URL). */
export const VAPI_TOOL_DEFINITIONS: CreateFunctionToolDTO[] = [
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.setMood,
      description:
        'Call when Nina has shared how she is feeling (mood_check). Empathize in speech first, then call this to advance the app to music choice.',
      parameters: {
        type: 'object',
        properties: {
          moodSummary: {
            type: 'string',
            description: 'Brief summary of how Nina said she feels, in her words.',
          },
        },
        required: ['moodSummary'],
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.showAiSongPick,
      description:
        'Call when Nina wants you (Eden) to pick a song for her. Shows a song recommendation screen.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.showFavorites,
      description: 'Call when Nina wants to choose from her favorite songs list.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.confirmOfferedSong,
      description: 'Call when Nina agrees to sing the song currently shown on the offer screen.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.pickAnotherSong,
      description: 'Call when Nina wants a different AI song suggestion (stay on offer screen).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.selectFavoriteSong,
      description: 'Call when Nina picks a song from her favorites list by title or position.',
      parameters: {
        type: 'object',
        properties: {
          songTitle: { type: 'string', description: 'Title Nina said, if any.' },
          listIndex: {
            type: 'number',
            description: '1-based position in the favorites list (first song = 1).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.goBackToMusicChoice,
      description:
        'Call when Nina wants to go back, start over, or choose differently from offer, favorites, or player.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.completeSongFeedback,
      description: 'Call after Nina shares how she liked the song (song_feedback phase).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.wantAnotherSong,
      description: 'Call when Nina wants to sing another song (continue_or_end phase).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.doneForToday,
      description: 'Call when Nina is done for today (continue_or_end phase).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    async: true,
    function: {
      name: VAPI_TOOL_NAMES.completeWrapUp,
      description:
        'Call after Nina answers whether her mood improved (wrap_up phase). Then say goodbye warmly.',
      parameters: {
        type: 'object',
        properties: {
          improvement: {
            type: 'string',
            description: 'a little | a lot | not at all | paraphrase of her answer',
          },
        },
      },
    },
  },
];

export function parseToolArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>;
  return {};
}
