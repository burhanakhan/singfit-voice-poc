import { useEffect, useRef } from 'react';
import { buildTranscriptFile } from '../../lib/transcript';
import { useSessionStore } from '../../store/sessionStore';
import './TranscriptPanel.css';

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M6 16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v10m0 0l4-4m-4 4L8 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TranscriptPanel() {
  const transcript = useSessionStore((s) => s.transcript);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [transcript]);

  const copy = async () => {
    await navigator.clipboard.writeText(buildTranscriptFile(transcript));
  };

  const download = () => {
    const blob = new Blob([buildTranscriptFile(transcript)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `singfit-transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="transcript-panel">
      <div className="transcript-head">
        <span>Transcript</span>
        <div className="transcript-actions">
          <button type="button" className="transcript-icon-btn" onClick={copy} aria-label="Copy transcript" title="Copy">
            <CopyIcon />
          </button>
          <button
            type="button"
            className="transcript-icon-btn"
            onClick={download}
            aria-label="Download transcript"
            title="Download"
          >
            <DownloadIcon />
          </button>
        </div>
      </div>
      <div className="transcript-body" ref={bodyRef}>
        {transcript.length === 0 && (
          <p className="transcript-empty">Conversation will appear here…</p>
        )}
        {transcript.map((line) =>
          line.role === 'system' ? (
            <p key={line.id} className="transcript-line transcript-line--system">
              {line.text}
            </p>
          ) : (
            <p key={line.id} className={`transcript-line transcript-line--${line.role}`}>
              <span className="transcript-role">{line.role === 'eden' ? 'Eden' : 'Nina'}</span>
              <span className="transcript-text">{line.text}</span>
            </p>
          ),
        )}
      </div>
    </div>
  );
}
