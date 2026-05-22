import { getVapiCallEpoch } from './vapiCallEpoch';
import { getVapiCallLifecycle } from './vapiCallLifecycle';
import { isCallEndTeardownSuppressed } from './vapiIntentionalDisconnect';
import { isFinalizeInProgress } from './sessionFinalizeGuard';
import { isVapiConfigured } from './vapiEnv';
import { useSessionStore } from '../store/sessionStore';

/** Point-in-time app + Vapi state for debug entries. */
export function captureVoiceDebugSnapshot(extra?: Record<string, unknown>): Record<string, unknown> {
  const st = useSessionStore.getState();
  return {
    screen: st.screen,
    phase: st.phase,
    voiceUi: st.voiceUi,
    vapiConnected: st.vapiConnected,
    vapiCallStatus: st.vapiCallStatus,
    vapiCallError: st.vapiCallError,
    hasEndOverlay: Boolean(st.sessionEndOverlay),
    participantSpeaking: st.participantSpeaking,
    callEpoch: getVapiCallEpoch(),
    callLifecycle: getVapiCallLifecycle(),
    callEndSuppressed: isCallEndTeardownSuppressed(),
    finalizeInProgress: isFinalizeInProgress(),
    vapiConfigured: isVapiConfigured(),
    ...extra,
  };
}
