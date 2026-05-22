# Vapi setup (POC) — ~5 minutes, no long doc

The **web app** injects Eden’s prompt, greeting, and client tools on each **Start Session**. **Silence timeout and max call length** should stay on the Vapi assistant (600s+ / 900s+) — the app no longer overrides those at call time (that override was breaking calls during POC tuning).

## What you must have (once)

### 1. Vapi dashboard — [dashboard.vapi.ai](https://dashboard.vapi.ai)

| Step | Do this |
|------|---------|
| Create assistant | Name it **Eden** (or anything) |
| **Voice** | ElevenLabs — pick one warm, calm female voice you like |
| **Tools on assistant** | **None** — leave empty. The app injects all tools at call start. |
| **Publish** | Assistant must be **published** (not draft-only) |
| Copy IDs | **Public key** + **Assistant ID** → next step |

You can leave **System prompt** and **First message** blank in Vapi if you want — the app overrides them on each call from `web/src/lib/edenPrompt.ts`.

Optional dashboard-only (only if voice sounds wrong): Model **gpt-4o-mini**, Transcriber **Deepgram nova-2**, English.

### 2. Local `.env` (`web/.env`)

```env
VITE_VAPI_PUBLIC_KEY=paste_public_key
VITE_VAPI_ASSISTANT_ID=paste_assistant_uuid_only
```

Restart dev server after saving.

### 3. Live site (Vercel)

Same two variables in **Project → Settings → Environment Variables**, then **Redeploy**.

Values must be **UUID only** for assistant id — no quotes, no `KEY=` prefix, no smart quotes.

### 4. Debug panel (optional)

```env
VITE_DEBUG_SECRET=your_random_12_char_string_or_longer
```

Open: `https://your-app/?sfdbg=that_same_string`

---

## What the app sets automatically (you can ignore in Vapi)

| Setting | POC value | Why |
|---------|-----------|-----|
| Max call length | **Dashboard** (recommend 900s+) | App does not override at call time |
| Silence timeout | **10 minutes** (app override) | Long songs + sing-along; singing may not reset the timer |
| Background sound | **off** (call override) | Cleaner web audio with song playback |
| Client messages | Must include `tool-calls`, `speech-update`, `transcript` (see `VAPI_EDEN_ASSISTANT.md`) | Screens + orb stay in sync |
| System prompt + greeting | `edenPrompt.ts` (first message at call start) | One place to edit Eden’s behavior |
| Tools | Injected at call start | **No tools** on the dashboard assistant |
| Model + transcriber | **Dashboard only** (not overridden at call start) | Avoids pipeline conflicts |

To change Eden’s words or guardrails, edit **`web/src/lib/edenPrompt.ts`** and redeploy — not the Vapi dashboard.

To change call/silence limits, edit **`web/src/lib/vapiSessionLimits.ts`** (auto-end logs a system line in the transcript + debug JSON).

---

## Quick test

1. Start session → Eden greets Nina.  
2. Talk 2–3 minutes, open favorites, stay silent ~90s → call should **stay up**.  
3. If voice drops after ~15s: see **mic troubleshooting** below.

### If the call ends after ~15 seconds

Vapi Call Logs often show **`call.in-progress.error-assistant-did-not-receive-customer-audio`**. Eden never received Nina’s mic — allow **microphone** for the site (browser lock icon). The app preflights mic on Start Session and logs **`local mic check`** in the debug panel.

The client “room was deleted” Daily error is a follow-on after Vapi ends the call for missing mic audio.

Full reference (optional): `VAPI_EDEN_ASSISTANT.md`.
