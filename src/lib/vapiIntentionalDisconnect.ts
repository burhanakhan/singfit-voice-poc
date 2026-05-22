/** While > 0, `call-end` must not schedule session teardown (app-initiated stop). */
let suppressCallEndTeardown = 0;
let lastIntentionalStopAt = 0;

export async function withSuppressedCallEndTeardown<T>(fn: () => Promise<T>): Promise<T> {
  suppressCallEndTeardown += 1;
  lastIntentionalStopAt = Date.now();
  try {
    return await fn();
  } finally {
    suppressCallEndTeardown = Math.max(0, suppressCallEndTeardown - 1);
  }
}

export function markIntentionalVapiStop() {
  lastIntentionalStopAt = Date.now();
}

/** True if the app called `vapi.stop()` in the last few seconds. */
export function wasIntentionalVapiStopRecent(withinMs = 4000): boolean {
  return Date.now() - lastIntentionalStopAt < withinMs;
}

export function isCallEndTeardownSuppressed(): boolean {
  return suppressCallEndTeardown > 0;
}
