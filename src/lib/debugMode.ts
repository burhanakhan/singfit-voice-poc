/**
 * Dev panel + verbose voice logging — gated by a secret you set in `.env`, not a guessable flag.
 *
 * Open: `?sfdbg=<VITE_DEBUG_SECRET>` (param name is deliberate; value is your private string).
 * The secret ships in the JS bundle — this only stops casual URL leakage, not inspection of built assets.
 */
export const DEBUG_QUERY_PARAM = 'sfdbg';

/** Minimum length so trivial secrets don’t accidentally turn debug on after typos */
const MIN_SECRET_LEN = 12;

export function isDebugMode(): boolean {
  const secret = (import.meta.env.VITE_DEBUG_SECRET as string | undefined)?.trim();
  if (!secret || secret.length < MIN_SECRET_LEN) {
    return false;
  }
  const token = new URLSearchParams(window.location.search).get(DEBUG_QUERY_PARAM);
  return token === secret;
}
