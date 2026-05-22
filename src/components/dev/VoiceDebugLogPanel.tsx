import { useEffect, useMemo, useRef, useState } from 'react';

import {
  buildVoiceDebugExportPayload,
  downloadVoiceDebugLog,
  logVoiceDebug,
  useVoiceDebugLog,
} from '../../lib/voiceDebugLog';
import { captureVoiceDebugSnapshot } from '../../lib/voiceDebugSnapshot';
import type { ScreenId, SessionPhase } from '../../types/session';

import './VoiceDebugLogPanel.css';

type Props = {
  screen: ScreenId;
  phase: SessionPhase;
};

const DEBUG_HINT = (
  <>
    Open with <code>?sfdbg=…</code> matching <code>VITE_DEBUG_SECRET</code>. Logs persist in this tab
    (sessionStorage) until you Clear. <strong>Warn/error</strong> and <strong>lifecycle/vapi</strong> lines
    also print to the browser console. On session end, JSON auto-downloads — use Copy JSON or Download if
    needed. Filter out <code>vapi-msg</code> noise unless you need raw Vapi payloads.
  </>
);

const HIDE_BY_DEFAULT = new Set(['vapi-msg', 'voiceUi']);

export function VoiceDebugLogPanel({ screen, phase }: Props) {
  const entries = useVoiceDebugLog((s) => s.entries);
  const debugSessionId = useVoiceDebugLog((s) => s.currentSessionId);
  const clear = useVoiceDebugLog((s) => s.clear);
  const snapshotRef = useRef('');
  const feedRef = useRef<HTMLPreElement>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [hideNoise, setHideNoise] = useState(true);
  const [errorsOnly, setErrorsOnly] = useState(false);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (errorsOnly && e.level !== 'error' && e.level !== 'warn') return false;
      if (hideNoise && HIDE_BY_DEFAULT.has(e.source)) return false;
      return true;
    });
  }, [entries, hideNoise, errorsOnly]);

  const pretty = useMemo(() => [...filtered].reverse(), [filtered]);

  useEffect(() => {
    const snap = `${screen}|${phase}`;
    if (snapshotRef.current === snap) return;
    const prev = snapshotRef.current;
    snapshotRef.current = snap;
    logVoiceDebug('session', `nav ${prev || '(init)'} → ${snap}`, {
      snapshot: true,
      detail: captureVoiceDebugSnapshot({ nav: snap }),
    });
  }, [screen, phase]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [entries.length, hideNoise, errorsOnly]);

  const copyJson = async () => {
    const blob = buildVoiceDebugExportPayload();
    try {
      await navigator.clipboard.writeText(JSON.stringify(blob, null, 2));
    } catch {
      /* ignore */
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of entries) {
      c[e.source] = (c[e.source] ?? 0) + 1;
    }
    return c;
  }, [entries]);

  return (
    <section className="voice-debug-panel" aria-label="Voice debug log">
      <div className="voice-debug-panel__toolbar">
        <h2 className="voice-debug-panel__title">
          Voice debug
          {debugSessionId > 0 ? (
            <span className="voice-debug-panel__session"> · session #{debugSessionId}</span>
          ) : null}
        </h2>
        <button
          type="button"
          className="voice-debug-panel__btn voice-debug-panel__btn--toggle"
          onClick={() => setHintOpen((v) => !v)}
          aria-expanded={hintOpen}
          aria-label={hintOpen ? 'Hide debug notes' : 'Show debug notes'}
        >
          {hintOpen ? '−' : '+'}
        </button>
        <button type="button" className="voice-debug-panel__btn" onClick={() => clear()}>
          Clear
        </button>
        <button type="button" className="voice-debug-panel__btn" onClick={() => downloadVoiceDebugLog()}>
          Download
        </button>
        <button type="button" className="voice-debug-panel__btn" onClick={() => void copyJson()}>
          Copy JSON
        </button>
      </div>

      <div className="voice-debug-panel__filters">
        <label className="voice-debug-panel__filter">
          <input type="checkbox" checked={hideNoise} onChange={(e) => setHideNoise(e.target.checked)} />
          Hide noise (vapi-msg, voiceUi)
        </label>
        <label className="voice-debug-panel__filter">
          <input type="checkbox" checked={errorsOnly} onChange={(e) => setErrorsOnly(e.target.checked)} />
          Warnings & errors only
        </label>
        <span className="voice-debug-panel__count">
          {filtered.length}/{entries.length} lines
        </span>
      </div>

      {hintOpen ? <p className="voice-debug-panel__hint">{DEBUG_HINT}</p> : null}

      {entries.length > 0 ? (
        <p className="voice-debug-panel__summary" aria-hidden>
          {Object.entries(counts)
            .map(([k, n]) => `${k}:${n}`)
            .join(' · ')}
        </p>
      ) : null}

      <pre ref={feedRef} className="voice-debug-panel__feed" aria-live="polite">
        {pretty.length === 0 ? (
          <span className="voice-debug-panel__empty">
            {entries.length > 0 ? 'No lines match filters — loosen filters above.' : 'Waiting for events…'}
          </span>
        ) : (
          pretty.map((e) => (
            <div
              key={e.id}
              className={`voice-debug-panel__line voice-debug-panel__line--${e.level}${
                e.message.startsWith('════') ? ' voice-debug-panel__line--divider' : ''
              }`}
            >
              <span className="voice-debug-panel__time">{new Date(e.t).toISOString().slice(11, 23)}</span>
              <span className="voice-debug-panel__sess">s{e.sessionId}</span>
              <span className="voice-debug-panel__src">{e.source}</span>
              <span className="voice-debug-panel__msg">{e.message}</span>
              {e.detail ? (
                <>
                  {'\n'}
                  <span className="voice-debug-panel__detail">{e.detail}</span>
                </>
              ) : null}
            </div>
          ))
        )}
      </pre>
    </section>
  );
}
