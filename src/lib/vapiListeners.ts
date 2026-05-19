import type { VapiClient } from './vapiImport';
import { bindDailyAudioFallback, noteVapiVolumeLevel, syncVapiRemoteAudio } from './vapiAudio';
import { executeVapiTool } from './executeVapiTool';
import { pushPhaseContextToVapi } from './syncPhaseToVapi';
import { parseToolArguments } from './vapiTools';
import { useSessionStore } from '../store/sessionStore';

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

function handleToolCalls(vapi: VapiClient, message: ToolCallMsg | FunctionCallMsg) {
  const calls =
    message.type === 'tool-calls'
      ? (message.toolCallList ?? [])
      : message.functionCall
        ? [{ function: { name: message.functionCall.name, arguments: message.functionCall.parameters } }]
        : [];

  for (const call of calls) {
    const name = call.function?.name;
    if (!name) continue;
    const result = executeVapiTool(name, parseToolArguments(call.function?.arguments));
    vapi.send({
      type: 'add-message',
      message: { role: 'system', content: result },
      triggerResponseEnabled: true,
    });
  }

  pushPhaseContextToVapi();
}

const attached = new WeakSet<VapiClient>();

/** Register once per Vapi instance — not tied to React mount/unmount. */
export function attachVapiListeners(vapi: VapiClient) {
  if (attached.has(vapi)) return;
  attached.add(vapi);

  const store = () => useSessionStore.getState();

  const refreshAudio = () => {
    bindDailyAudioFallback(vapi);
    void syncVapiRemoteAudio(vapi);
  };

  vapi.on('call-start', () => {
    store().setVapiCallStatus('connected');
    store().setVapiConnected(true);
    store().setVoiceUi('listening');
    pushPhaseContextToVapi();
  });

  vapi.on('call-start-success', () => {
    store().setVapiCallStatus('connected');
    refreshAudio();
    window.setTimeout(refreshAudio, 400);
    window.setTimeout(refreshAudio, 1500);
  });

  vapi.on('call-start-failed', (e: { error?: string }) => {
    const msg = e?.error ?? 'Call failed to start';
    console.error('Vapi call-start-failed', e);
    store().setVapiCallStatus('error', msg);
    store().setVapiConnected(false);
    store().setVoiceUi('listening');
    store().addTranscript('system', `Voice error: ${msg}`);
  });

  vapi.on('call-end', () => {
    store().setVapiCallStatus('idle');
    store().setVapiConnected(false);
    store().setParticipantSpeaking(false);
    store().setVoiceUi('idle');
  });

  vapi.on('daily-participant-updated', () => {
    void syncVapiRemoteAudio(vapi);
  });

  vapi.on('speech-start', () => {
    void syncVapiRemoteAudio(vapi);
  });

  vapi.on('volume-level', (level) => {
    noteVapiVolumeLevel(level);
  });

  vapi.on('message', (msg) => {
    if (msg.type === 'tool-calls' || msg.type === 'function-call') {
      handleToolCalls(vapi, msg as ToolCallMsg | FunctionCallMsg);
      return;
    }

    if (msg.type === 'speech-update') {
      if (msg.role === 'user') {
        const speaking = msg.status === 'started';
        store().setParticipantSpeaking(speaking);
        if (speaking) store().setVoiceUi('listening');
      }
      if (msg.role === 'assistant') {
        if (msg.status === 'started') {
          store().setParticipantSpeaking(false);
          store().setVoiceUi('speaking');
        } else if (msg.status === 'stopped') {
          store().setVoiceUi('listening');
        }
      }
    }

    if (msg.type === 'transcript') {
      if (msg.role === 'user' && msg.transcriptType === 'partial') {
        store().setParticipantSpeaking(true);
        store().setVoiceUi('listening');
      }
      if (msg.role === 'user' && msg.transcriptType === 'final') {
        store().addTranscript('nina', msg.transcript);
        store().setParticipantSpeaking(false);
        store().setVoiceUi('thinking');
      }
      if (msg.role === 'assistant' && msg.transcriptType === 'final') {
        const text = String(msg.transcript ?? '').trim();
        if (text && text !== lastAssistantLine.current) {
          lastAssistantLine.current = text;
          store().addTranscript('eden', text);
        }
        store().setParticipantSpeaking(false);
      }
    }

    if (msg.type === 'conversation-update') {
      const last = msg.messages?.at(-1);
      if (last?.role === 'assistant' && typeof last.message === 'string') {
        const text = last.message.trim();
        if (text && text !== lastAssistantLine.current) {
          lastAssistantLine.current = text;
          store().addTranscript('eden', text);
        }
        store().setParticipantSpeaking(false);
      }
    }

    if (msg.type === 'model-output' && msg.output) {
      store().setVoiceUi('thinking');
    }
  });

  vapi.on('error', (e) => {
    console.error('Vapi error', e);
    const msg =
      typeof e === 'object' && e && 'error' in e && typeof (e as { error: unknown }).error === 'object'
        ? String((e as { error: { message?: string } }).error?.message ?? 'Unknown error')
        : 'Voice connection error';
    store().setVapiCallStatus('error', msg);
    store().addTranscript('system', `Voice error: ${msg}`);
  });
}

export function resetVapiTranscriptDedupe() {
  lastAssistantLine.current = '';
}
