import { useCallback } from 'react';
import { bindDailyAudioFallback, getVapiAudioDiagnostics, syncVapiRemoteAudio } from '../lib/vapiAudio';
import { getSharedVapi, getVapiInstance } from '../lib/vapiClient';
import { resetVapiTranscriptDedupe } from '../lib/vapiListeners';
import {
  getVapiAssistantId,
  getVapiPublicKey,
  isVapiConfigured,
  vapiEnvInvalidReason,
} from '../lib/vapiEnv';
import { VAPI_TOOL_DEFINITIONS } from '../lib/vapiTools';
import { useSessionStore } from '../store/sessionStore';
import { PHASE_HEADINGS, type SessionPhase } from '../types/session';

export function vapiConfigured(): boolean {
  return isVapiConfigured();
}

export function useVapi() {
  const goHome = useSessionStore((s) => s.goHome);
  const setVapiCallStatus = useSessionStore((s) => s.setVapiCallStatus);

  const startCall = useCallback(async () => {
    const publicKey = getVapiPublicKey();
    const assistantId = getVapiAssistantId();
    if (!publicKey || !assistantId) {
      const store = useSessionStore.getState();
      const hint =
        vapiEnvInvalidReason ??
        'Missing VITE_VAPI_PUBLIC_KEY or VITE_VAPI_ASSISTANT_ID (set in Vercel and redeploy).';
      store.setVapiCallStatus('error', hint);
      store.addTranscript('system', `Voice error: ${hint}`);
      return;
    }

    const store = useSessionStore.getState();
    store.setVapiCallStatus('connecting');
    store.setVoiceUi('thinking');
    resetVapiTranscriptDedupe();

    const vapi = getSharedVapi(publicKey);

    try {
      // Client-side tools (no server URL) — injected here because Vapi's Tools Library
      // targets backend integrations; deprecated "Custom Functions" matched our POC needs.
      const call = await vapi.start(assistantId, {
        variableValues: {
          participantName: 'Nina',
          phase: store.phase,
          phaseHeading: PHASE_HEADINGS[store.phase],
        },
        'tools:append': [...VAPI_TOOL_DEFINITIONS],
      });

      if (!call) {
        store.setVapiCallStatus('error', 'Vapi returned no call — check assistant ID and publish status');
        store.setVoiceUi('listening');
        store.addTranscript('system', 'Voice error: call did not start. Check Eden is published in Vapi.');
        return;
      }

      bindDailyAudioFallback(vapi);
      void syncVapiRemoteAudio(vapi);
      window.setTimeout(() => void syncVapiRemoteAudio(vapi), 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('Vapi start failed', e);
      store.setVapiCallStatus('error', msg);
      store.setVoiceUi('listening');
      store.addTranscript('system', `Voice error: ${msg}`);
    }
  }, [setVapiCallStatus]);

  const stopCall = useCallback(() => {
    void getVapiInstance()?.stop();
    useSessionStore.getState().setVapiCallStatus('idle');
  }, [setVapiCallStatus]);

  const endCallAndGoHome = useCallback(() => {
    goHome();
  }, [goHome]);

  const sendPhaseHint = useCallback((p: SessionPhase) => {
    const vapi = getVapiInstance();
    if (!vapi) return;
    vapi.send({
      type: 'add-message',
      message: {
        role: 'system',
        content: `[PHASE: ${p}] Follow the flow spec for this phase.`,
      },
      triggerResponseEnabled: false,
    });
  }, []);

  const unlockAudio = useCallback(async () => {
    const vapi = getVapiInstance();
    if (!vapi) return getVapiAudioDiagnostics();
    bindDailyAudioFallback(vapi);
    return syncVapiRemoteAudio(vapi);
  }, []);

  return {
    startCall,
    stopCall,
    endCallAndGoHome,
    sendPhaseHint,
    unlockAudio,
    getAudioDiagnostics: getVapiAudioDiagnostics,
    configured: vapiConfigured(),
  };
}
