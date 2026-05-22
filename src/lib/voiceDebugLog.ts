import { create } from 'zustand';
import { isDebugMode } from './debugMode';
import { captureVoiceDebugSnapshot } from './voiceDebugSnapshot';

const MAX_ENTRIES = 600;
const STORAGE_KEY = 'singfit-voice-debug-v1';

export type VoiceDebugLevel = 'info' | 'warn' | 'error';

export interface VoiceDebugEntry {
  id: string;
  t: number;
  level: VoiceDebugLevel;
  source: string;
  message: string;
  detail?: string;
  sessionId: number;
}

export type VoiceDebugLogOptions = {
  detail?: Record<string, unknown> | string;
  level?: VoiceDebugLevel;
  /** Attach full store + Vapi snapshot (default for lifecycle/vapi errors). */
  snapshot?: boolean;
  /** Also print to browser console (default: warn/error always). */
  mirrorConsole?: boolean;
};

interface VoiceDebugState {
  entries: VoiceDebugEntry[];
  currentSessionId: number;
  log: (source: string, message: string, opts?: VoiceDebugLogOptions) => void;
  clear: () => void;
  setSessionId: (id: number) => void;
}

function entryId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function safeStringify(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) {
    return JSON.stringify({
      name: value.name,
      message: value.message,
      stack: value.stack,
    });
  }
  try {
    return JSON.stringify(value, (_k, v) => {
      if (v instanceof Error) {
        return { name: v.name, message: v.message, stack: v.stack };
      }
      return v;
    });
  } catch {
    return String(value);
  }
}

function buildDetailString(opts?: VoiceDebugLogOptions): string | undefined {
  const parts: string[] = [];
  if (opts?.snapshot) {
    parts.push(safeStringify(captureVoiceDebugSnapshot({ debugSession: debugSessionCounter })));
  }
  const d = opts?.detail;
  if (typeof d === 'string' && d.length > 0) {
    parts.push(d);
  } else if (d && typeof d === 'object') {
    parts.push(safeStringify(d));
  }
  if (parts.length === 0) return undefined;
  return parts.length === 1 ? parts[0] : parts.join('\n---\n');
}

function persistEntries(entries: VoiceDebugEntry[]) {
  try {
    const slim = entries.slice(-MAX_ENTRIES).map((e) => ({
      id: e.id,
      t: e.t,
      level: e.level,
      source: e.source,
      message: e.message,
      detail: e.detail,
      sessionId: e.sessionId,
    }));
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    /* quota or private mode */
  }
}

function restoreEntries(): VoiceDebugEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VoiceDebugEntry[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

let debugSessionCounter = 0;

export function getCurrentDebugSessionId(): number {
  return debugSessionCounter;
}

export const useVoiceDebugLog = create<VoiceDebugState>((set, get) => ({
  entries: isDebugMode() ? restoreEntries() : [],
  currentSessionId: debugSessionCounter,

  setSessionId(id: number) {
    debugSessionCounter = id;
    set({ currentSessionId: id });
  },

  log(source, message, opts) {
    const detailStr = buildDetailString(opts);
    const entry: VoiceDebugEntry = {
      id: entryId(),
      t: Date.now(),
      source,
      message,
      detail: detailStr,
      level: opts?.level ?? 'info',
      sessionId: debugSessionCounter,
    };

    const next = [...get().entries, entry];
    while (next.length > MAX_ENTRIES) next.shift();
    set({ entries: next });
    persistEntries(next);

    const level = entry.level;
    const mirror =
      opts?.mirrorConsole ?? (level === 'error' || level === 'warn' || source === 'lifecycle' || source === 'vapi');
    if (mirror && typeof console !== 'undefined') {
      const tag = `[SingFit:${source}]`;
      const payload = detailStr ? [message, detailStr] : [message];
      if (level === 'error') console.error(tag, ...payload);
      else if (level === 'warn') console.warn(tag, ...payload);
      else console.info(tag, ...payload);
    }
  },

  clear: () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    set({ entries: [] });
  },
}));

/** Callable outside React — Vapi listeners, sync helpers */
export function logVoiceDebug(source: string, message: string, opts?: VoiceDebugLogOptions) {
  if (typeof window === 'undefined' || !isDebugMode()) return;
  useVoiceDebugLog.getState().log(source, message, opts);
}

/** User clicked Start session — new correlated log block. */
export function beginVoiceDebugSession(reason = 'startSession') {
  if (!isDebugMode()) return;
  debugSessionCounter += 1;
  useVoiceDebugLog.getState().setSessionId(debugSessionCounter);
  logVoiceDebug('session', `════ SESSION #${debugSessionCounter} begin (${reason}) ════`, {
    level: 'warn',
    snapshot: true,
    mirrorConsole: true,
  });
}

export function markVoiceDebugSessionEnded(reason: string) {
  logVoiceDebug('session', `════ SESSION #${debugSessionCounter} end (${reason}) ════`, {
    level: 'warn',
    snapshot: true,
    mirrorConsole: true,
  });
}

/** Shorthand for lifecycle / teardown paths */
export function logVoiceDebugLifecycle(message: string, extra?: Record<string, unknown>, level: VoiceDebugLevel = 'warn') {
  logVoiceDebug('lifecycle', message, {
    level,
    snapshot: true,
    detail: extra,
    mirrorConsole: true,
  });
}

export function logVoiceDebugVapi(message: string, extra?: Record<string, unknown>, level: VoiceDebugLevel = 'info') {
  logVoiceDebug('vapi', message, {
    level,
    snapshot: level !== 'info',
    detail: extra,
    mirrorConsole: level !== 'info',
  });
}

export function logVoiceDebugStoreChange(message: string, extra?: Record<string, unknown>) {
  logVoiceDebug('store', message, { detail: extra, snapshot: true });
}

export function buildVoiceDebugExportPayload() {
  const entries = useVoiceDebugLog.getState().entries;
  return {
    exportedAt: new Date().toISOString(),
    kind: 'singfit-voice-debug',
    meta: {
      debugSessionId: debugSessionCounter,
      entryCount: entries.length,
      vapiConfigured: captureVoiceDebugSnapshot().vapiConfigured,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      location: typeof window !== 'undefined' ? window.location.pathname + window.location.search.replace(/sfdbg=[^&]+/, 'sfdbg=***') : undefined,
    },
    entries: entries.map((e) => ({
      t: new Date(e.t).toISOString(),
      sessionId: e.sessionId,
      level: e.level,
      source: e.source,
      message: e.message,
      detail: e.detail,
    })),
  };
}

/** Download current debug log as JSON (no-op if empty). */
export function downloadVoiceDebugLog() {
  const entries = useVoiceDebugLog.getState().entries;
  if (!entries.length) return;

  const payload = buildVoiceDebugExportPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `singfit-eden-voice-debug-s${debugSessionCounter}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function clearVoiceDebugLog() {
  useVoiceDebugLog.getState().clear();
}
