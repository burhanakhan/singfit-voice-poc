export type VapiCallLifecycle = 'idle' | 'connecting' | 'connected';

let lifecycle: VapiCallLifecycle = 'idle';

export function getVapiCallLifecycle(): VapiCallLifecycle {
  return lifecycle;
}

export function setVapiCallLifecycle(next: VapiCallLifecycle): void {
  lifecycle = next;
}
