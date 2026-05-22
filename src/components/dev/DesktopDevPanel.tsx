import { useEffect, useRef } from 'react';

import { vapiEnvInvalidReason } from '../../lib/vapiEnv';
import { logVoiceDebug } from '../../lib/voiceDebugLog';
import { useVapi, vapiConfigured } from '../../hooks/useVapi';
import { useSessionStore } from '../../store/sessionStore';
import type { ScreenId, SessionPhase } from '../../types/session';
import { DevSessionTools } from './DevSessionTools';
import { VoiceDebugLogPanel } from './VoiceDebugLogPanel';
import './DevSessionTools.css';
import './DesktopDevPanel.css';

type Props = {
  screen: ScreenId;
  phase: SessionPhase;
};

export function DesktopDevPanel({ screen, phase }: Props) {
  const voiceReady = vapiConfigured();
  const vapiCallStatus = useSessionStore((s) => s.vapiCallStatus);
  const vapiCallError = useSessionStore((s) => s.vapiCallError);
  const vapiConnected = useSessionStore((s) => s.vapiConnected);
  const inSession = screen !== 'home';
  const { unlockAudio, getAudioDiagnostics } = useVapi();

  const statusLabel =
    vapiCallStatus === 'connected'
      ? 'connected'
      : vapiCallStatus === 'connecting'
        ? 'connecting'
        : vapiCallStatus === 'error'
          ? `error: ${vapiCallError ?? 'unknown'}`
          : inSession
            ? 'not connected yet'
            : 'idle';

  const bootLogged = useRef(false);
  const lastCallStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!bootLogged.current) {
      bootLogged.current = true;
      if (voiceReady) {
        logVoiceDebug('dev', 'Debug panel ready · Vapi env OK', {
          snapshot: true,
          detail: { assistantIdSet: true, publicKeySet: true },
        });
      } else {
        logVoiceDebug('dev', 'Debug panel ready · Vapi NOT configured', {
          level: 'warn',
          snapshot: true,
          detail: {
            reason: vapiEnvInvalidReason ?? 'missing VITE_VAPI_PUBLIC_KEY or VITE_VAPI_ASSISTANT_ID',
            envFile: 'web/.env',
          },
        });
      }
    }
  }, [voiceReady]);

  useEffect(() => {
    if (!inSession) return;
    const key = `${vapiCallStatus}:${vapiConnected}:${vapiCallError ?? ''}`;
    if (lastCallStatus.current === key) return;
    lastCallStatus.current = key;
    logVoiceDebug('dev', `in-session call state: ${statusLabel}`, {
      detail: { vapiCallStatus, vapiConnected, vapiCallError, screen, phase },
      snapshot: true,
    });
  }, [inSession, statusLabel, vapiCallStatus, vapiConnected, vapiCallError, screen, phase]);

  const runAudioDiag = async () => {
    const result = (await unlockAudio()) ?? getAudioDiagnostics();
    logVoiceDebug('dev', 'Audio diagnostics', {
      detail: result ?? { note: 'no diagnostics returned' },
    });
  };

  return (
    <aside className="desktop-dev-panel" aria-label="Developer tools">
      <section className="desktop-dev-card desktop-dev-card--tools">
        <DevSessionTools phase={phase} inSession={inSession} />
        {voiceReady && inSession ? (
          <button type="button" className="desktop-dev-inline-btn" onClick={() => void runAudioDiag()}>
            Log audio diagnostics
          </button>
        ) : null}
        {!voiceReady ? (
          <details className="dev-help dev-help--setup">
            <summary>Vapi env setup (also in debug log)</summary>
            <div className="dev-help__body">
              <p>
                Add to <code>web/.env</code> and restart the dev server:
              </p>
              <pre className="desktop-dev-env">{`VITE_VAPI_PUBLIC_KEY=your_key
VITE_VAPI_ASSISTANT_ID=your_assistant_id
VITE_DEBUG_SECRET=your_12_char_secret`}</pre>
              <p>
                Assistant: <code>web/docs/VAPI_EDEN_ASSISTANT.md</code> · Deploy:{' '}
                <code>web/DEPLOY.md</code>
              </p>
            </div>
          </details>
        ) : null}
      </section>

      <section className="desktop-dev-card desktop-dev-card--debug-log">
        <VoiceDebugLogPanel screen={screen} phase={phase} />
      </section>
    </aside>
  );
}
