import { attachVapiListeners } from './vapiListeners';
import { withSuppressedCallEndTeardown } from './vapiIntentionalDisconnect';
import { traceVapiStop } from './vapiStopTrace';
import { Vapi, type VapiClient } from './vapiImport';

let sharedVapi: VapiClient | null = null;

export function getSharedVapi(publicKey: string): VapiClient {
  if (!sharedVapi) {
    sharedVapi = new Vapi(
      publicKey,
      undefined,
      { alwaysIncludeMicInPermissionPrompt: true },
      { audioSource: true },
    );
    attachVapiListeners(sharedVapi);
  }
  return sharedVapi;
}

export function getVapiInstance(): VapiClient | null {
  return sharedVapi;
}

export function destroySharedVapi() {
  if (sharedVapi) {
    const instance = sharedVapi;
    sharedVapi.removeAllListeners();
    sharedVapi = null;
    void withSuppressedCallEndTeardown(async () => {
      traceVapiStop('destroySharedVapi');
      try {
        await instance.stop();
      } catch {
        /* already stopped */
      }
    });
  }
}
