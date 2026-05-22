/** Set when `markCallLive` will send [APP STATE]; App phase effect should skip once. */
let skipNextPhasePush = false;

export function armSkipNextPhasePush() {
  skipNextPhasePush = true;
}

export function consumeSkipNextPhasePush(): boolean {
  if (!skipNextPhasePush) return false;
  skipNextPhasePush = false;
  return true;
}
