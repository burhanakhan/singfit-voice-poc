/** Turn Vapi/error payloads into a readable string for transcripts and UI */
export function formatVapiError(e: unknown): string {
  if (e == null) return 'unknown error';
  if (typeof e === 'string') return e;
  if (e instanceof Error) return e.message;
  if (typeof e === 'number' || typeof e === 'boolean') return String(e);
  try {
    if (typeof e === 'object') {
      const o = e as Record<string, unknown>;
      const err = o.error;
      if (err && typeof err === 'object' && typeof (err as { message?: string }).message === 'string') {
        const m = (err as { message: string }).message;
        const code =
          typeof (err as { code?: string }).code === 'string' ? (err as { code: string }).code : '';
        return code ? `${code}: ${m}` : m;
      }
      if (typeof o.message === 'string') return o.message;
      return JSON.stringify(e);
    }
  } catch {
    return '[unserializable error]';
  }
  return String(e);
}
