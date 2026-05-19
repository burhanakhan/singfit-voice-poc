# Deploy SingFit Voice AI POC (≈5 minutes)

## Pre-flight (showstoppers)

| Check | Action |
|-------|--------|
| Production build | `npm run build` in `web/` must pass |
| Songs / images | `public/songs/*.mp3` and `public/images/` present (committed) |
| Vapi keys | Set `VITE_VAPI_PUBLIC_KEY` + `VITE_VAPI_ASSISTANT_ID` on host (not in git) |
| Tools | Injected by the app at call start — no Vapi Tools Library setup required |
| Mic | Public URL must be **HTTPS** (Vercel provides this) |

---

## Stack (why this is fast + low latency)

| Layer | Choice | Why |
|-------|--------|-----|
| App | **Vite + React** | Instant dev, static build |
| Host | **Vercel** | `git push` → public HTTPS URL, no server ops |
| Voice | **Vapi** (`@vapi-ai/web`) | WebRTC to Vapi edge; STT + LLM + TTS in one pipe (same class as vendor Melody/Deepgram demo) |

**Latency tips (Pakistan ↔ US):** In Vapi assistant settings use a **US** server region if offered, **GPT-4o-mini** (or similar fast model), ElevenLabs **turbo** voice, disable unnecessary tools. Vapi streams audio — you should not feel multi-second gaps between turns when configured correctly.

UI + song playback run in the browser; only voice goes through Vapi.

---

## 1. Vapi setup (one time, ~10 min)

1. Sign up at [https://dashboard.vapi.ai](https://dashboard.vapi.ai)
2. Create an **Assistant** named `Eden`
3. Paste the system prompt from `docs/VAPI_EDEN_ASSISTANT.md`
4. Voice: warm female caregiver (ElevenLabs — e.g. Rachel / a “calm” preset)
5. Model: `gpt-4o-mini` or `gpt-4o` for quality
6. **Silence timeout / max duration:** set high (10+ min) or disable idle hang-up
7. Copy **Public Key** and **Assistant ID** into `.env`:

```bash
cp .env.example .env
# edit .env
```

8. Enable **client messages**: `tool-calls`, `transcript`, `speech-update`, `conversation-update` (see `docs/VAPI_EDEN_ASSISTANT.md`). Client tools are **injected by the web app** — no Tools Library setup required.

---

## 2. Local run

```bash
cd web
npm install
npm run dev
```

Open the URL shown (usually `http://localhost:5173`). Use Chrome; allow microphone.

---

## 3. Public URL (Vercel)

### Option A — CLI (fastest)

```bash
npm i -g vercel
cd web
vercel
```

Follow prompts (link to Git optional). Add env vars in Vercel dashboard:

- `VITE_VAPI_PUBLIC_KEY`
- `VITE_VAPI_ASSISTANT_ID`

Redeploy after adding env: `vercel --prod`

### Option B — GitHub

1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. **Root Directory:** `web`
4. Framework: Vite (auto-detected)
5. Add the two `VITE_*` env vars
6. Deploy → share `https://your-project.vercel.app`

---

## 4. Without Vapi keys (UI only)

The app runs in **tap-through mode**: all screens and MP3 playback work. Add `?debug=true` for flow controls and a dev banner about Vapi keys.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No mic | HTTPS required (Vercel gives HTTPS); check browser permission |
| Voice not connecting | Verify `VITE_*` in Vercel env and redeploy |
| High latency | Smaller/faster model; turbo TTS; wired network; close heavy tabs |
| Songs 404 | Ensure `public/songs/*.mp3` were committed or copied before build |
