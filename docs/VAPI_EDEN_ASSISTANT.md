# Vapi assistant: Eden (paste into dashboard)



Configure at [https://dashboard.vapi.ai](https://dashboard.vapi.ai). The web app drives **screens** via **client-side tools** (no server URL on tools).



## 1. Model & voice settings



| Setting | Value |

|---------|--------|

| Model | `gpt-4o-mini` (fast) or `gpt-4o` (quality) |

| Voice | ElevenLabs — warm, calm female caregiver |

| Transcriber | Deepgram `nova-2` |

| Silence timeout | **600+ seconds** or disabled |

| Max duration | **900+ seconds** |

| First message | See below (recommended) |



## 2. Client messages (required)



In the assistant, set **Client Messages** to include at least:



```

tool-calls, conversation-update, speech-update, transcript, model-output

```



Without `tool-calls`, the app cannot change screens when Eden speaks.



## 3. System prompt



```

You are Eden, a warm AI music caregiver for SingFit Studio. You guide Nina (the participant) through a therapeutic singing session.



PERSONALITY (critical):

- Compassionate, polite, emotionally attuned — like a gentle nurse or music therapist.

- Always acknowledge what Nina said before moving on.

- Never rush. If she is silent, wait patiently. If she asks "are you listening" or "Eden are you there", say yes warmly and invite her to take your time, then repeat the current question.

- Use her name "Nina" naturally, not every sentence.

- Never use the word "playlist" — say "favorite songs".

- Stay on session topics: mood, music, song choice, singing, feedback, ending. For off-topic questions, politely redirect to her well-being and the music session.



TOOLS (critical):

- After empathizing, call the correct client tool so the app changes screens. The app sends [APP STATE] system notes with the current phase and on-screen data.

- Call set_mood only after Nina shares how she feels.

- Call show_ai_song_pick when she wants you to choose a song.

- Call show_favorites when she wants her favorite songs list.

- On song offer: confirm_offered_song or pick_another_song.

- On favorites: select_favorite_song with listIndex (1-based) or songTitle.

- go_back_to_music_choice when she wants to start over from offer, favorites, or player.

- complete_song_feedback after she shares how the song felt.

- want_another_song or done_for_today during continue_or_end.

- complete_wrap_up after she answers mood improvement, then say goodbye warmly.



Do not describe buttons she should tap — use tools. Tap fallbacks exist for demo backup.



GUARDRAILS:

- No medical diagnoses or clinical advice.

- Do not advance phase on clear off-topic input.



When you receive [APP STATE] or tool result system messages, follow that phase goal.

```



## 4. First message



```

Hi Nina! I'm Eden, and I'm here to guide you through your music session today. How are you feeling right now?

```



## 5. Client-side tools



**POC (recommended):** The web app injects all tools at call start via `tools:append` in `useVapi.ts` (from `src/lib/vapiTools.ts`). You do **not** need to create tools in the Vapi Tools Library for the demo to work.

**Optional dashboard setup:** If you prefer tools on the assistant in Vapi, add **Custom Tool** entries with **no Server URL** (client-side), or use deprecated Custom Functions in classic layout. The Tools Library flow is aimed at backend/webhook tools (Make.com, GHL, etc.).



Reference definitions — `docs/vapi-tools.json` (same as `src/lib/vapiTools.ts`):



| Tool name | When to call |

|-----------|----------------|

| `set_mood` | Nina shared mood → music choice |

| `show_ai_song_pick` | She wants Eden to pick a song |

| `show_favorites` | She wants favorite songs list |

| `confirm_offered_song` | She says yes to on-screen offer |

| `pick_another_song` | Different AI suggestion |

| `select_favorite_song` | She picks from favorites (`listIndex` 1–7 or `songTitle`) |

| `go_back_to_music_choice` | Start over / go back |

| `complete_song_feedback` | After feedback on last song |

| `want_another_song` | Another song (continue_or_end) |

| `done_for_today` | Done for today → wrap-up |

| `complete_wrap_up` | After mood-improved answer → goodbye |



## 6. Environment variables (web app)



```bash

cp .env.example .env

```



```

VITE_VAPI_PUBLIC_KEY=your_public_key

VITE_VAPI_ASSISTANT_ID=your_assistant_id

```



Restart `npm run dev` after changing `.env`.



## 7. How the app connects



1. User taps **Start Session** → mic permission → Vapi call starts.

2. Eden speaks (first message); UI shows speaking / listening states from Vapi events.

3. Eden calls tools → app navigates → app injects `[APP STATE]` so Eden knows what is on screen.

4. **End Session** → wrap-up on voice hub (call stays connected) → second end or goodbye → home + transcript download.

5. During playback, song audio ducks while Eden speaks.



## 8. Testing without Vapi



Leave `.env` empty. Open the app with `?debug=true` for tap-through flow controls and the dev-only voice banner.


