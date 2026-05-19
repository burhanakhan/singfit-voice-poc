# SingFit Voice AI POC (Eden)

Web demo replicating the vendor Voice AI Start Session flow. Full spec: [`../Docs/SingFit_VoiceAI_POC_Flow_Spec.md`](../Docs/SingFit_VoiceAI_POC_Flow_Spec.md).

## Quick start

```bash
npm install
npm run dev
```

## Public URL

See **[DEPLOY.md](./DEPLOY.md)** — deploy from this folder only (`web/` is the app root).

**Quick path:** `npm run build` → Vercel → add `VITE_VAPI_*` env vars → production deploy.

## Stack

- **Vite + React + TypeScript**
- **Vercel** hosting
- **Vapi** (`@vapi-ai/web`) for low-latency voice (WebRTC streaming)

## Env

Copy `.env.example` → `.env` and set Vapi keys. Without keys, the UI runs with **tap flow controls** at the bottom of the voice screen.
