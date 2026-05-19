import { useState } from 'react';

import type { VapiAudioDiagnostics } from '../../lib/vapiAudio';

import { useVapi, vapiConfigured } from '../../hooks/useVapi';

import { useSessionStore } from '../../store/sessionStore';

import type { ScreenId, SessionPhase } from '../../types/session';

import { FlowDevBar } from './FlowDevBar';

import './DesktopDevPanel.css';



type Props = {

  screen: ScreenId;

  phase: SessionPhase;

};



export function DesktopDevPanel({ screen, phase }: Props) {

  const voiceReady = vapiConfigured();

  const vapiCallStatus = useSessionStore((s) => s.vapiCallStatus);

  const vapiCallError = useSessionStore((s) => s.vapiCallError);
  const inSession = screen !== 'home';

  const { unlockAudio, getAudioDiagnostics, startCall } = useVapi();

  const [audioDiag, setAudioDiag] = useState<VapiAudioDiagnostics | null>(null);



  const runAudioDiag = async () => {

    const result = await unlockAudio();

    setAudioDiag(result ?? getAudioDiagnostics());

  };



  const statusLabel =

    vapiCallStatus === 'connected'

      ? 'Connected to Eden'

      : vapiCallStatus === 'connecting'

        ? 'Connecting…'

        : vapiCallStatus === 'error'

          ? `Error: ${vapiCallError ?? 'unknown'}`

          : inSession

            ? 'Not connected yet'

            : 'Idle';



  return (

    <aside className="desktop-dev-panel" aria-label="Developer tools">

      {voiceReady ? (

        <section className="desktop-dev-card desktop-dev-card--ready">

          <h2 className="desktop-dev-card__title">Voice</h2>

          <p className="desktop-dev-muted">Vapi keys loaded.</p>

          {inSession ? (

            <p className={`desktop-dev-status desktop-dev-status--${vapiCallStatus}`}>

              Call: <strong>{statusLabel}</strong>

            </p>

          ) : null}

          {vapiCallStatus === 'error' && vapiCallError ? (

            <p className="desktop-dev-error">{vapiCallError}</p>

          ) : null}

          {inSession && vapiCallStatus !== 'connected' ? (

            <button type="button" className="desktop-dev-audio-btn" onClick={() => void startCall()}>

              Retry voice connection

            </button>

          ) : null}

          {inSession ? (

            <button type="button" className="desktop-dev-audio-btn" onClick={() => void runAudioDiag()}>

              Audio fix + diagnostics

            </button>

          ) : null}

          {audioDiag ? (

            <pre className="desktop-dev-diag">{JSON.stringify(audioDiag, null, 2)}</pre>

          ) : null}

        </section>

      ) : (

        <section className="desktop-dev-card desktop-dev-card--setup">

          <h2 className="desktop-dev-card__title">Voice is off</h2>

          <p>

            Add keys in <code>web/.env</code>, then restart the dev server:

          </p>

          <pre className="desktop-dev-env">

            {`VITE_VAPI_PUBLIC_KEY=your_key

VITE_VAPI_ASSISTANT_ID=your_assistant_id`}

          </pre>

          <p>

            Assistant + tools: <code>web/docs/VAPI_EDEN_ASSISTANT.md</code>

          </p>

          <p>

            Deploy: <code>web/DEPLOY.md</code>

          </p>

          <p className="desktop-dev-muted">Until then, use flow controls below to walk the demo.</p>

        </section>

      )}



      {inSession ? (

        <section className="desktop-dev-card">

          <FlowDevBar phase={phase} />

        </section>

      ) : null}

    </aside>

  );

}


