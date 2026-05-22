/** Bumped on each new `startCall` so stale `call-end` / `ended` events are ignored. */
let callEpoch = 0;

export function bumpVapiCallEpoch(): number {
  callEpoch += 1;
  return callEpoch;
}

export function getVapiCallEpoch(): number {
  return callEpoch;
}
