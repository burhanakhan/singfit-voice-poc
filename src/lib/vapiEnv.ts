/** Strip invisible / non-ASCII junk from Vite env (common when pasting into Vercel). */
function sanitizeVapiToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;

  const trimmed = value.replace(/^\uFEFF/, '').trim();
  // Allow only characters valid in HTTP header values (Vapi keys are UUID-like).
  const cleaned = trimmed.replace(/[^\x21-\x7E]/g, '').replace(/^["']|["']$/g, '');

  return cleaned.length > 0 ? cleaned : undefined;
}

const publicKey = sanitizeVapiToken(import.meta.env.VITE_VAPI_PUBLIC_KEY);
const assistantId = sanitizeVapiToken(import.meta.env.VITE_VAPI_ASSISTANT_ID);

const rawKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
const rawId = import.meta.env.VITE_VAPI_ASSISTANT_ID;

export const vapiEnvInvalidReason =
  typeof rawKey === 'string' &&
  typeof rawId === 'string' &&
  rawKey.trim().length > 0 &&
  rawId.trim().length > 0 &&
  (!publicKey || !assistantId)
    ? 'Vapi env vars contain invalid characters (use plain UUIDs only — no smart quotes or spaces).'
    : null;

export function getVapiPublicKey(): string | undefined {
  return publicKey;
}

export function getVapiAssistantId(): string | undefined {
  return assistantId;
}

export function isVapiConfigured(): boolean {
  return Boolean(publicKey && assistantId);
}
