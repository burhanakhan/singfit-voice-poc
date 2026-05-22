import type { VapiClient } from './vapiImport';
import { bindDailyAudioFallback, noteVapiVolumeLevel, syncVapiRemoteAudio } from './vapiAudio';
import { executeVapiTool } from './executeVapiTool';
import { isFinalizeInProgress } from './sessionFinalizeGuard';
import { armSkipNextPhasePush } from './vapiConnectFlags';
import { clearLastVapiDailyError, setLastVapiDailyError } from './vapiDailyErrorState';
import {
  beginGracefulSessionEnd,
  isSessionEndFlowActive,
  voiceFailureEndMessage,
} from './sessionEndSync';
import {
  noteGoodbyeAssistantTranscript,
  onGoodbyeAssistantSpeechStarted,
  onGoodbyeAssistantSpeechStopped,
  onVapiCallEnded,
} from './sessionLifecycle';
import { clearDeferredVapiSends, deferVapiSend, flushDeferredVapiSends } from './vapiDeferredSend';
import { ensureVapiLocalMicrophone } from './vapiMic';
import {
  isAwaitingSongIntro,
  noteIntroAssistantFinal,
  noteIntroSpeechStarted,
  noteIntroSpeechStopped,
} from './playerIntroGate';
import {
  disableSingAlongMode,
  remuteAfterPresenceReply,
  shouldAllowModelOutputInPlaying,
} from './singAlongMode';
import { shouldIgnoreDuplicateVapiTool } from './clientToolDedupe';
import { shouldBlockVapiMusicTool } from './musicChoiceGuard';
import { handlePhaseUserTranscript } from './voicePhaseRouter';
import { matchSongOfferSkip, matchWantAnotherSong } from './voiceCommands';
import { requestPlayerPlaybackStart } from './playerPlaybackControl';
import { getVapiCallEpoch } from './vapiCallEpoch';
import { getVapiCallLifecycle, setVapiCallLifecycle } from './vapiCallLifecycle';
import { isCallEndTeardownSuppressed } from './vapiIntentionalDisconnect';
import { pushPhaseContextToVapi } from './syncPhaseToVapi';
import { parseToolArguments } from './vapiTools';
import {
  clearEdenSpeechGateForUserTurn,
  edenSpeechActiveFromVapi,
  armAwaitingFirstEdenGreeting,
  clearAwaitingFirstEdenGreeting,
  isAwaitingFirstEdenGreeting,
  onEdenVapiSpeechStart,
  onEdenVapiSpeechStopped,
  resetEdenSpeechGate,
  resolveVoiceUiState,
} from './voiceUiSync';
import { logVoiceDebug, logVoiceDebugLifecycle, logVoiceDebugVapi } from './voiceDebugLog';
import { useSessionStore } from '../store/sessionStore';
import type { VoiceUiState } from '../types/session';

type ToolCallMsg = {
  type: 'tool-calls';
  toolCallList?: Array<{
    function?: { name?: string; arguments?: unknown };
  }>;
};

type FunctionCallMsg = {
  type: 'function-call';
  functionCall?: { name?: string; parameters?: unknown };
};

const lastAssistantLine = { current: '' };
let lastNinaFinalLine = '';
let lastVapiEndedReason: string | undefined;
/** SDK 2.x often emits `call-start-success` without `call-start`. */
let callLiveHandled = false;

function resetCallLiveGuard() {
  callLiveHandled = false;
}

function safeSetVoiceUi(get: () => ReturnType<typeof useSessionStore.getState>, next: VoiceUiState, reason: string) {
  if (next === 'thinking' && edenSpeechActiveFromVapi()) {
    logVoiceDebug('voiceUi', `keep speaking (ignore thinking: ${reason})`, {
      detail: { next, current: get().voiceUi },
    });
    return;
  }
  const cur = get().voiceUi;
  const resolved = resolveVoiceUiState(next);
  if (cur !== resolved) {
    logVoiceDebug('voiceUi', `${cur} → ${resolved}`, {
      detail: { reason, requested: next !== resolved ? next : undefined },
    });
    get().setVoiceUi(resolved);
  }
}

function handleToolCalls(vapi: VapiClient, message: ToolCallMsg | FunctionCallMsg) {
  const calls =
    message.type === 'tool-calls'
      ? (message.toolCallList ?? [])
      : message.functionCall
        ? [{ function: { name: message.functionCall.name, arguments: message.functionCall.parameters } }]
        : [];

  const names: string[] = [];
  const results: string[] = [];

  for (const call of calls) {
    const name = call.function?.name;
    if (!name) continue;
    if (shouldBlockVapiMusicTool(name)) {
      logVoiceDebug('tools', `blocked Vapi tool ${name} (awaiting music choice)`, {});
      const phase = useSessionStore.getState().phase;
      if (phase === 'music_choice') {
        deferVapiSend(() => {
          vapi.send({
            type: 'add-message',
            message: {
              role: 'system',
              content:
                '[MUSIC CHOICE] Wait for Nina to say pick a song or favorites — do not call show_ai_song_pick until she asks.',
            },
            triggerResponseEnabled: false,
          });
        });
      }
      continue;
    }
    if (name === 'confirm_offered_song' && matchSongOfferSkip(lastNinaFinalLine)) {
      logVoiceDebug('tools', `blocked Vapi tool ${name} (Nina asked to skip)`, {
        detail: { preview: lastNinaFinalLine.slice(0, 80) },
      });
      continue;
    }
    if (name === 'want_another_song' && !matchWantAnotherSong(lastNinaFinalLine)) {
      logVoiceDebug('tools', `blocked Vapi tool ${name} (Nina did not ask for another song)`, {
        detail: { preview: lastNinaFinalLine.slice(0, 80) },
      });
      continue;
    }
    if (shouldIgnoreDuplicateVapiTool(name)) {
      logVoiceDebug('tools', `ignored duplicate Vapi tool ${name} (client already ran)`, {});
      continue;
    }
    names.push(name);
    results.push(executeVapiTool(name, parseToolArguments(call.function?.arguments)));
  }

  if (names.length) {
    logVoiceDebug('tools', `called: ${names.join(', ')}`, { detail: { names } });
  }

  if (results.length > 0) {
    armSkipNextPhasePush();
    const wrapOnly = names.length === 1 && names[0] === 'complete_wrap_up';
    const moodOnly = names.length === 1 && names[0] === 'set_mood';
    const silentPlaybackTools =
      names.length === 1 &&
      (names[0] === 'pause_playback' || names[0] === 'resume_playback');
    if (!wrapOnly && !moodOnly && !silentPlaybackTools) {
      safeSetVoiceUi(() => useSessionStore.getState(), 'thinking', 'after tool batch (waiting for Eden)');
    }
    const payload = `${results.join('\n')}\nNever use filler ("one moment", "this will take a sec", "just a moment", "give me a moment").`;
    const moodExtra = moodOnly
      ? '\nReply with exactly ONE short warm sentence (under 15 words). Then offer AI pick or favorites. Do not repeat thanks or re-introduce yourself.'
      : '';
    const wrapExtra = wrapOnly
      ? '\nShe already answered. Speak 2–3 warm goodbye sentences thanking her for today. Never say "one moment" or ask another question.'
      : '';
    const offerOnly =
      names.length === 1 &&
      (names[0] === 'show_ai_song_pick' || names[0] === 'pick_another_song');
    const confirmOnly = names.length === 1 && names[0] === 'confirm_offered_song';

    if (offerOnly || confirmOnly) {
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: { role: 'system', content: payload + moodExtra + wrapExtra },
          triggerResponseEnabled: false,
        });
      });
      deferVapiSend(() => {
        const speakHint = confirmOnly
          ? '[PLAYING] One warm intro naming title and style; invite Nina to sing. No filler.'
          : '\nSay the offered title and style aloud, then ask sing this or try another. No filler.';
        vapi.send({
          type: 'add-message',
          message: { role: 'system', content: payload + speakHint },
          triggerResponseEnabled: true,
        });
      });
    } else {
      deferVapiSend(() => {
        vapi.send({
          type: 'add-message',
          message: { role: 'system', content: payload + moodExtra + wrapExtra },
          triggerResponseEnabled: true,
        });
      });
    }
  } else {
    const phase = useSessionStore.getState().phase;
    pushPhaseContextToVapi({
      triggerResponse: phase === 'music_choice' || phase === 'continue_or_end',
    });
  }
}

const attached = new WeakSet<VapiClient>();

/** Register once per Vapi instance — not tied to React mount/unmount. */
export function attachVapiListeners(vapi: VapiClient) {
  if (attached.has(vapi)) return;
  attached.add(vapi);
  logVoiceDebugVapi('listeners attached (once per Vapi instance)');

  const get = () => useSessionStore.getState();

  const refreshAudio = () => {
    bindDailyAudioFallback(vapi);
    void syncVapiRemoteAudio(vapi);
  };

  const markCallLive = (source: 'call-start' | 'call-start-success') => {
    if (callLiveHandled) {
      logVoiceDebugVapi(`ignored duplicate ${source} (already live)`);
      return;
    }
    callLiveHandled = true;
    resetEdenSpeechGate();
    disableSingAlongMode();
    setVapiCallLifecycle('connected');
    logVoiceDebugVapi(`${source} → call live`, {}, 'warn');
    const s = get();
    s.setVapiCallStatus('connected');
    s.setVapiConnected(true);
    armAwaitingFirstEdenGreeting();
    s.setVoiceUi('thinking');
    armSkipNextPhasePush();
    void ensureVapiLocalMicrophone(vapi);
    refreshAudio();
    window.setTimeout(() => void ensureVapiLocalMicrophone(vapi), 500);
  };

  vapi.on('call-start', () => {
    markCallLive('call-start');
  });

  vapi.on('call-start-success', () => {
    markCallLive('call-start-success');
  });

  vapi.on('call-start-failed', (e: unknown) => {
    resetCallLiveGuard();
    resetEdenSpeechGate();
    setVapiCallLifecycle('idle');
    console.error('Vapi call-start-failed', e);
    logVoiceDebugVapi('call-start-failed', { error: serializeVapiUnknown(e) }, 'error');
    if (get().screen !== 'home' && !isFinalizeInProgress() && !isSessionEndFlowActive()) {
      logVoiceDebugLifecycle('call-start-failed → overlay', { error: serializeVapiUnknown(e) });
      beginGracefulSessionEnd(voiceFailureEndMessage(e));
    } else {
      logVoiceDebugVapi('call-start-failed ignored (home or end already active)', {
        screen: get().screen,
      });
    }
  });

  vapi.on('call-end', () => {
    resetCallLiveGuard();
    resetEdenSpeechGate();
    clearDeferredVapiSends();
    setVapiCallLifecycle('idle');
    const endEpoch = getVapiCallEpoch();
    const suppressed = isCallEndTeardownSuppressed();
    logVoiceDebugVapi('call-end', { endEpoch, endedReason: lastVapiEndedReason ?? null, suppressed }, 'warn');
    const s = get();
    s.setVapiConnected(false);
    s.setParticipantSpeaking(false);
    s.setVoiceUi('idle');
    s.setVapiCallStatus('idle');

    if (suppressed) {
      logVoiceDebugVapi('ignore call-end (intentional stop)');
      lastVapiEndedReason = undefined;
      return;
    }

    window.setTimeout(() => {
      if (endEpoch !== getVapiCallEpoch()) {
        logVoiceDebugVapi('ignore stale call-end (newer call started)', {
          endEpoch,
          currentEpoch: getVapiCallEpoch(),
        });
        return;
      }
      if (isCallEndTeardownSuppressed()) {
        logVoiceDebugVapi('ignore call-end teardown (intentional stop)');
        return;
      }
      const st = get();
      if (st.screen === 'home' || isFinalizeInProgress() || isSessionEndFlowActive()) {
        logVoiceDebugVapi('call-end → no overlay', {
          reason: 'home or finalize or end flow active',
          screen: st.screen,
          endedReason: lastVapiEndedReason ?? null,
        });
        return;
      }
      logVoiceDebugLifecycle('call-end → onVapiCallEnded', {
        endedReason: lastVapiEndedReason ?? '(none)',
      });
      onVapiCallEnded(lastVapiEndedReason);
      lastVapiEndedReason = undefined;
    }, 400);
  });

  vapi.on('daily-participant-updated', () => {
    void syncVapiRemoteAudio(vapi);
  });

  vapi.on('volume-level', (level) => {
    noteVapiVolumeLevel(level);
  });

  vapi.on('message', (msg) => {
    const type = typeof msg?.type === 'string' ? msg.type : '?';

    if (shouldLogVapiMessage(type, msg as Record<string, unknown>)) {
      logVoiceDebug('vapi-msg', type, {
        detail: pruneMessageForDebug(msg as Record<string, unknown>),
      });
    }

    if (msg.type === 'tool-calls' || msg.type === 'function-call') {
      handleToolCalls(vapi, msg as ToolCallMsg | FunctionCallMsg);
      return;
    }

    if (msg.type === 'speech-update') {
      if (msg.role === 'user') {
        const speaking = msg.status === 'started';
        const phase = get().phase;
        if (phase === 'playing') {
          get().setParticipantSpeaking(speaking);
        } else {
          get().setParticipantSpeaking(speaking);
          if (speaking) {
            clearEdenSpeechGateForUserTurn();
            if (isAwaitingFirstEdenGreeting()) clearAwaitingFirstEdenGreeting();
            get().setVoiceUi('listening');
          }
        }
      }
      if (msg.role === 'assistant') {
        if (msg.status === 'started') {
          onEdenVapiSpeechStart();
          get().setParticipantSpeaking(false);
          get().setVoiceUi('speaking');
          onGoodbyeAssistantSpeechStarted();
          if (get().phase === 'playing' && isAwaitingSongIntro()) {
            noteIntroSpeechStarted();
          }
        } else if (msg.status === 'stopped') {
          onGoodbyeAssistantSpeechStopped();
          onEdenVapiSpeechStopped();
          flushDeferredVapiSends();
          if (get().phase === 'playing') {
            if (isAwaitingSongIntro()) {
              noteIntroSpeechStopped();
            } else {
              requestPlayerPlaybackStart();
            }
            remuteAfterPresenceReply();
          }
          if (isAwaitingFirstEdenGreeting()) {
            clearAwaitingFirstEdenGreeting();
            get().setVoiceUi('listening');
            logVoiceDebug('voiceUi', 'first greeting done → listening', {});
          } else {
            safeSetVoiceUi(get, 'listening', 'Eden speech-update stopped');
          }
        }
      }
    }

    if (msg.type === 'transcript') {
      if (msg.role === 'user' && msg.transcriptType === 'partial') {
        get().setParticipantSpeaking(true);
        if (get().phase !== 'playing') {
          get().setVoiceUi(resolveVoiceUiState('listening'));
        }
      }
      if (msg.role === 'user' && msg.transcriptType === 'final') {
        const line = String(msg.transcript ?? '').trim();
        const { phase } = get();
        if (line) {
          lastNinaFinalLine = line;
          get().addTranscript('nina', line);
        }
        get().setParticipantSpeaking(false);
        const handled = handlePhaseUserTranscript(vapi, line, phase, () => {
          if (phase === 'playing' || phase === 'song_recommend') {
            get().setVoiceUi('listening');
          } else {
            safeSetVoiceUi(get, 'thinking', `voice command (${phase})`);
          }
        });
        if (handled) return;
      }
      if (msg.role === 'assistant' && msg.transcriptType === 'final') {
        const text = String(msg.transcript ?? '').trim();
        if (text && text !== lastAssistantLine.current) {
          lastAssistantLine.current = text;
          get().addTranscript('eden', text);
          if (get().phase === 'playing' && isAwaitingSongIntro()) {
            noteIntroAssistantFinal(text);
          }
          if (get().phase === 'goodbye') {
            noteGoodbyeAssistantTranscript(text);
          }
        }
        get().setParticipantSpeaking(false);
      }
    }

    if (msg.type === 'conversation-update') {
      const last = msg.messages?.at(-1);
      if (last?.role === 'assistant' && typeof last.message === 'string') {
        const text = last.message.trim();
        if (text && text !== lastAssistantLine.current) {
          lastAssistantLine.current = text;
          get().addTranscript('eden', text);
        }
        get().setParticipantSpeaking(false);
      }
    }

    if (msg.type === 'model-output' && msg.output) {
      const { phase, voiceUi } = get();
      if (phase === 'playing' && !shouldAllowModelOutputInPlaying()) {
        logVoiceDebug('voiceUi', 'sing-along: ignore model-output');
        return;
      }
      if (voiceUi === 'listening') {
        safeSetVoiceUi(get, 'thinking', 'model-output');
      }
    }

    if (msg.type === 'status-update' && msg.status === 'ended') {
      const endedReason =
        typeof (msg as { endedReason?: string }).endedReason === 'string'
          ? (msg as { endedReason: string }).endedReason
          : undefined;
      lastVapiEndedReason = endedReason;
      logVoiceDebugVapi('status-update ended', { endedReason, lifecycle: getVapiCallLifecycle() }, 'warn');
      /** `call-end` handles session teardown; avoid double-firing `onVapiCallEnded` here. */
    }
  });

  vapi.on('error', (e) => {
    console.error('Vapi error', e);
    resetEdenSpeechGate();
    setLastVapiDailyError(e);
    logVoiceDebugVapi('error event (stored; overlay on call-end)', {
      error: serializeVapiUnknown(e),
    }, 'error');
  });
}

function serializeVapiUnknown(e: unknown): unknown {
  if (e instanceof Error) return { name: e.name, message: e.message, stack: e.stack };
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    try {
      return JSON.parse(JSON.stringify(e));
    } catch {
      return String(e);
    }
  }
  return e;
}

function shouldLogVapiMessage(type: string, msg: Record<string, unknown>): boolean {
  if (type === 'status-update' || type === 'tool-calls' || type === 'function-call') return true;
  if (type === 'speech-update' || type === 'model-output') return true;
  if (type === 'transcript') return msg.transcriptType !== 'partial';
  return false;
}

/** Avoid huge payloads in debug log */
function pruneMessageForDebug(msg: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { type: msg.type };
  if (msg.role !== undefined) out.role = msg.role;
  if (msg.status !== undefined) out.status = msg.status;
  if (msg.endedReason !== undefined) out.endedReason = msg.endedReason;
  if (msg.transcriptType !== undefined) out.transcriptType = msg.transcriptType;
  if (typeof msg.transcript === 'string') {
    const t = msg.transcript;
    out.transcript = t.length > 80 ? `${t.slice(0, 80)}…` : t;
  }
  if (msg.messages && Array.isArray(msg.messages)) {
    out.messageCount = (msg.messages as unknown[]).length;
  }
  return out;
}

export function resetVapiTranscriptDedupe() {
  lastAssistantLine.current = '';
  clearLastVapiDailyError();
  resetCallLiveGuard();
  resetEdenSpeechGate();
}
