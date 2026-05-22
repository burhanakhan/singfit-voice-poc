import { useEffect } from 'react';

import { beginGracefulSessionEnd } from '../lib/sessionEndSync';
import { logVoiceDebugLifecycle } from '../lib/voiceDebugLog';
import { isFinalizeInProgress } from '../lib/sessionFinalizeGuard';
import { useSessionStore } from '../store/sessionStore';

const CONNECT_TIMEOUT_MS = 45_000;

/** If voice never connects, end UI session in sync (overlay → home). */
export function useSessionWatchdog() {
  const screen = useSessionStore((s) => s.screen);
  const vapiCallStatus = useSessionStore((s) => s.vapiCallStatus);

  useEffect(() => {
    if (screen === 'home' || vapiCallStatus !== 'connecting') return;

    const timer = window.setTimeout(() => {
      const st = useSessionStore.getState();
      if (st.screen === 'home' || st.vapiCallStatus !== 'connecting' || isFinalizeInProgress()) {
        return;
      }
      logVoiceDebugLifecycle('connect watchdog fired (45s)', {
        vapiCallStatus: st.vapiCallStatus,
        screen: st.screen,
      });
      beginGracefulSessionEnd('Eden’s voice is taking too long to connect.');
    }, CONNECT_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [screen, vapiCallStatus]);
}
