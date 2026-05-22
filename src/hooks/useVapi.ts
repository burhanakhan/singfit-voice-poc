import { useCallback } from 'react';
import { bindDailyAudioFallback, getVapiAudioDiagnostics, syncVapiRemoteAudio } from '../lib/vapiAudio';
import { preflightMicrophoneAccess } from '../lib/vapiMic';
import { bumpVapiCallEpoch } from '../lib/vapiCallEpoch';
import { getSharedVapi, getVapiInstance } from '../lib/vapiClient';
import { getVapiCallLifecycle, setVapiCallLifecycle } from '../lib/vapiCallLifecycle';
import { withSuppressedCallEndTeardown } from '../lib/vapiIntentionalDisconnect';
import { traceVapiStop } from '../lib/vapiStopTrace';
import { resetGoodbyeFinalizeState } from '../lib/sessionLifecycle';
import { logVoiceDebugLifecycle, logVoiceDebugVapi } from '../lib/voiceDebugLog';
import { resetClientToolDedupe } from '../lib/clientToolDedupe';
import { resetVapiTranscriptDedupe } from '../lib/vapiListeners';
import { beginGracefulSessionEnd, resetSessionEndFlow, voiceFailureEndMessage } from '../lib/sessionEndSync';
import {
  getVapiAssistantId,
  getVapiPublicKey,
  isVapiConfigured,
  vapiEnvInvalidReason,
} from '../lib/vapiEnv';
import { buildVapiStartOverrides } from '../lib/vapiCallOverrides';
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
      const hint =
        vapiEnvInvalidReason ??
        'Missing VITE_VAPI_PUBLIC_KEY or VITE_VAPI_ASSISTANT_ID (set in Vercel and redeploy).';
      if (useSessionStore.getState().screen !== 'home') {
        beginGracefulSessionEnd(voiceFailureEndMessage(hint));
      }
      return;
    }

    const store = useSessionStore.getState();
    resetGoodbyeFinalizeState();
    resetSessionEndFlow();
    resetVapiTranscriptDedupe();
    resetClientToolDedupe();

    const existing = getVapiInstance();
    const lifecycle = getVapiCallLifecycle();
    if (existing && (lifecycle === 'connecting' || lifecycle === 'connected')) {
      logVoiceDebugVapi('stopping prior in-flight call before new start', { lifecycle });
      await withSuppressedCallEndTeardown(async () => {
        traceVapiStop('startCall:replace prior call');
        try {
          await existing.stop();
        } catch {
          /* prior call may already be stopped */
        }
      });
    }

    /** After intentional stop so its `call-end` cannot match this epoch. */
    const epoch = bumpVapiCallEpoch();
    setVapiCallLifecycle('connecting');
    store.setVapiCallStatus('connecting');
    store.setVoiceUi('thinking');
    const micPreflightPromise = preflightMicrophoneAccess();

    logVoiceDebugVapi('startCall', { epoch, assistantIdPrefix: assistantId.slice(0, 8) });

    const vapi = getSharedVapi(publicKey);
    const overrides = buildVapiStartOverrides(store.phase, PHASE_HEADINGS[store.phase]);

    try {
      // Client-side tools (no server URL) — injected here because Vapi's Tools Library
      // targets backend integrations; deprecated "Custom Functions" matched our POC needs.
      let callPromise = vapi.start(assistantId, overrides);
      const micPreflight = await micPreflightPromise;
      if (!micPreflight.ok) {
        setVapiCallLifecycle('idle');
        await withSuppressedCallEndTeardown(async () => {
          try {
            await vapi.stop();
          } catch {
            /* ignore */
          }
        });
        beginGracefulSessionEnd(
          "Microphone access is required. Allow the mic for this site in your browser, then try again.",
        );
        return;
      }
      let call = await callPromise;

      if (!call) {
        logVoiceDebugVapi('start returned null — retrying without overrides', {}, 'warn');
        await withSuppressedCallEndTeardown(async () => {
          traceVapiStop('startCall:null result retry');
          try {
            await vapi.stop();
          } catch {
            /* ignore */
          }
        });
        call = await vapi.start(assistantId);
      }

      if (!call) {
        setVapiCallLifecycle('idle');
        beginGracefulSessionEnd(
          voiceFailureEndMessage('Vapi returned no call — check assistant ID and publish status'),
        );
        return;
      }

      bindDailyAudioFallback(vapi);
      window.setTimeout(() => void syncVapiRemoteAudio(vapi), 250);
    } catch (e) {
      console.error('Vapi start failed (with overrides)', e);
      logVoiceDebugVapi(
        'start failed with overrides — retrying minimal',
        { error: e instanceof Error ? { message: e.message, stack: e.stack } : e },
        'warn',
      );
      try {
        await withSuppressedCallEndTeardown(async () => {
          traceVapiStop('startCall:catch retry after failed overrides');
          try {
            await vapi.stop();
          } catch {
            /* ignore */
          }
        });
        const call = await vapi.start(assistantId);
        if (!call) throw e;
        bindDailyAudioFallback(vapi);
        window.setTimeout(() => void syncVapiRemoteAudio(vapi), 250);
        logVoiceDebugVapi('start succeeded with minimal overrides (dashboard assistant only)', {}, 'warn');
      } catch (e2) {
        console.error('Vapi start failed (minimal)', e2);
        setVapiCallLifecycle('idle');
        logVoiceDebugLifecycle('startCall failed (minimal retry too)', {
          error: e2 instanceof Error ? e2.message : String(e2),
        });
        beginGracefulSessionEnd(voiceFailureEndMessage(e2));
      }
    }
  }, [setVapiCallStatus]);

  const stopCall = useCallback(() => {
    traceVapiStop('stopCall()');
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
