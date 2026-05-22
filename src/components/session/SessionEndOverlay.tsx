import { useEffect, useState } from 'react';

import { finalizeSessionToHome } from '../../lib/sessionLifecycle';
import { SESSION_END_COUNTDOWN_SEC } from '../../lib/sessionEndSync';
import { logVoiceDebugLifecycle } from '../../lib/voiceDebugLog';
import { useSessionStore } from '../../store/sessionStore';

import './SessionEndOverlay.css';

/** Full-screen notice when Vapi ends unexpectedly — then auto home (no reconnect). */
export function SessionEndOverlay() {
  const message = useSessionStore((s) => s.sessionEndOverlay);
  const [secondsLeft, setSecondsLeft] = useState(SESSION_END_COUNTDOWN_SEC);

  useEffect(() => {
    if (!message) return;

    logVoiceDebugLifecycle('SessionEndOverlay visible', { message });
    setSecondsLeft(SESSION_END_COUNTDOWN_SEC);
    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          logVoiceDebugLifecycle('SessionEndOverlay countdown done → finalize');
          finalizeSessionToHome();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [message]);

  if (!message) return null;

  return (
    <div className="session-end-overlay" role="alertdialog" aria-modal="true" aria-labelledby="session-end-title">
      <div className="session-end-overlay__card">
        <div className="session-end-overlay__icon" aria-hidden>
          <span className="session-end-overlay__icon-ring" />
          <span className="session-end-overlay__icon-mark">!</span>
        </div>
        <h2 id="session-end-title" className="session-end-overlay__title">
          Session ended
        </h2>
        <p className="session-end-overlay__message">{message}</p>
        <p className="session-end-overlay__countdown">
          Back to home screen in <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'}…
        </p>
        <div className="session-end-overlay__progress" aria-hidden>
          <span
            className="session-end-overlay__progress-fill"
            style={{
              animationDuration: `${SESSION_END_COUNTDOWN_SEC}s`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
