/** POC voice call limits — applied via `buildVapiStartOverrides` on each Start Session. */

export const POC_MAX_CALL_SECONDS = 30 * 60;
/** Long enough for a full song + sing-along (Vapi counts user speech to the transcriber). */
export const POC_SILENCE_TIMEOUT_SECONDS = 10 * 60;

export const POC_MAX_CALL_MINUTES = POC_MAX_CALL_SECONDS / 60;
export const POC_SILENCE_TIMEOUT_MINUTES = POC_SILENCE_TIMEOUT_SECONDS / 60;

export type VapiAutoEndReason = 'silence-timed-out' | 'exceeded-max-duration';

export function isVapiAutoEndReason(value: string): value is VapiAutoEndReason {
  return value === 'silence-timed-out' || value === 'exceeded-max-duration';
}

export function vapiAutoEndSystemMessage(reason: VapiAutoEndReason): string {
  const hint =
    'These limits are set in the SingFit POC app (web/src/lib/vapiSessionLimits.ts) and can be changed for longer sessions.';

  if (reason === 'silence-timed-out') {
    return (
      `Session ended automatically: no voice activity for ${POC_SILENCE_TIMEOUT_MINUTES} minutes. ${hint}`
    );
  }

  return (
    `Session ended automatically: call length limit of ${POC_MAX_CALL_MINUTES} minutes reached. ${hint}`
  );
}

/** Keep duration on one line in the session-end overlay (narrow card). */
function withNonBreakingMinutes(text: string, minutes: number): string {
  return text.replace(`${minutes} minutes`, `${minutes}\u00A0minutes`);
}

/** Shown on the session-end popup (countdown line is separate and shared). */
export function vapiLimitSessionEndOverlayMessage(reason: VapiAutoEndReason): string {
  if (reason === 'silence-timed-out') {
    return withNonBreakingMinutes(
      `No voice activity detected for ${POC_SILENCE_TIMEOUT_MINUTES} minutes.`,
      POC_SILENCE_TIMEOUT_MINUTES,
    );
  }

  return withNonBreakingMinutes(
    `Maximum call length is ${POC_MAX_CALL_MINUTES} minutes.`,
    POC_MAX_CALL_MINUTES,
  );
}
