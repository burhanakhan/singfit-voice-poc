import { attachVapiListeners } from './vapiListeners';
import { Vapi, type VapiClient } from './vapiImport';

let sharedVapi: VapiClient | null = null;

export function getSharedVapi(publicKey: string): VapiClient {
  if (!sharedVapi) {
    sharedVapi = new Vapi(publicKey);
    attachVapiListeners(sharedVapi);
  }
  return sharedVapi;
}

export function getVapiInstance(): VapiClient | null {
  return sharedVapi;
}

export function destroySharedVapi() {
  if (sharedVapi) {
    void sharedVapi.stop();
    sharedVapi.removeAllListeners();
    sharedVapi = null;
  }
}
