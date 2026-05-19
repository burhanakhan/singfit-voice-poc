import type { TranscriptLine } from '../types/session';

export function formatTime(d = new Date()): string {
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function buildTranscriptFile(lines: TranscriptLine[]): string {
  const now = new Date();
  const header = [
    '═══════════════════════════════════════════════════════',
    '  SingFit AI POC — Session Transcript',
    `  Date: ${now.toLocaleDateString('en-US')}  Time: ${now.toLocaleTimeString('en-US', { hour12: false })}`,
    '  Participant: Nina',
    '  Caregiver: Eden',
    '═══════════════════════════════════════════════════════',
    '',
  ].join('\n');

  const body = lines
    .map((l) => {
      const label =
        l.role === 'eden' ? 'EDEN' : l.role === 'nina' ? 'NINA' : 'SYSTEM';
      const phase = l.phase ? ` [${l.phase}]` : '';
      return `[${l.at}] ${label}${phase}: ${l.text}`;
    })
    .join('\n');

  return `${header}${body}\n`;
}

export function downloadTranscript(lines: TranscriptLine[]) {
  const blob = new Blob([buildTranscriptFile(lines)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `singfit-eden-session-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
