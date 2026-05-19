/**
 * @vapi-ai/web is CJS; Vite can expose `default` as `{ default: Vapi }`.
 * Resolve the real constructor once for the app.
 */
import VapiModule from '@vapi-ai/web';

type VapiConstructor = new (
  publicKey: string,
  apiBaseUrl?: string,
  dailyCallConfig?: object,
  dailyCallObject?: object,
) => import('@vapi-ai/web').default;

function resolveVapiConstructor(): VapiConstructor {
  const mod = VapiModule as VapiConstructor | { default: VapiConstructor };
  if (typeof mod === 'function') return mod;
  if (mod && typeof mod.default === 'function') return mod.default;
  throw new Error('Could not load Vapi from @vapi-ai/web — check package install');
}

export const Vapi = resolveVapiConstructor();

export type VapiClient = InstanceType<typeof Vapi>;
