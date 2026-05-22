/** Parse Vapi / Daily `error` events from @vapi-ai/web for user-facing copy + debug. */

export type ParsedVapiDailyError = {
  dailyType?: string;
  roomMsg?: string;
  errorMsg?: string;
  callClientId?: string;
};

export function parseVapiDailyError(e: unknown): ParsedVapiDailyError | null {
  if (!e || typeof e !== 'object') return null;
  const root = e as Record<string, unknown>;
  if (root.type !== 'daily-error' && root.type !== 'error') {
    const nested = root.error;
    if (!nested || typeof nested !== 'object') return null;
  }

  const err = (root.error ?? root) as Record<string, unknown>;
  const message = err.message;
  const msgObj =
    message && typeof message === 'object' ? (message as Record<string, unknown>) : null;

  return {
    dailyType: msgObj?.type != null ? String(msgObj.type) : undefined,
    roomMsg: msgObj?.msg != null ? String(msgObj.msg) : undefined,
    errorMsg: typeof err.errorMsg === 'string' ? err.errorMsg : undefined,
    callClientId: typeof err.callClientId === 'string' ? err.callClientId : undefined,
  };
}

export function sessionEndMessageFromVapiError(e: unknown): string {
  const p = parseVapiDailyError(e);
  if (!p) {
    return 'The voice connection has dropped.';
  }

  if (p.dailyType === 'no-room' || /room was deleted/i.test(p.roomMsg ?? '')) {
    return (
      "The voice room closed because Eden never received your microphone audio (see Vapi: " +
      'error-assistant-did-not-receive-customer-audio). Allow mic access for this site and try again.'
    );
  }

  if (/meeting has ended/i.test(p.errorMsg ?? '')) {
    return (
      'The voice meeting ended unexpectedly. See the debug log for the Daily error above this message.'
    );
  }

  return 'The voice connection has dropped.';
}
