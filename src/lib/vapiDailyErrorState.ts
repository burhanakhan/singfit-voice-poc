let lastVapiDailyError: unknown;

export function setLastVapiDailyError(error: unknown) {
  lastVapiDailyError = error;
}

export function getLastVapiDailyError(): unknown {
  return lastVapiDailyError;
}

export function clearLastVapiDailyError() {
  lastVapiDailyError = undefined;
}
