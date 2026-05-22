import type { AssistantOverrides } from '@vapi-ai/web/dist/api';

import { EDEN_FIRST_MESSAGE, EDEN_SYSTEM_PROMPT } from './edenPrompt';
import {
  POC_MAX_CALL_SECONDS,
  POC_SILENCE_TIMEOUT_SECONDS,
} from './vapiSessionLimits';
import { VAPI_TOOL_DEFINITIONS } from './vapiTools';
import type { SessionPhase } from '../types/session';

/**
 * Call-time overrides for prompt, tools, greeting, and session limits.
 * silenceTimeoutSeconds must match `vapiSessionLimits.ts` (overlay copy uses the same).
 */
export type VapiStartOverrides = AssistantOverrides & {
  silenceTimeoutSeconds?: number;
};

export function buildVapiStartOverrides(
  phase: SessionPhase,
  phaseHeading: string,
): VapiStartOverrides {
  return {
    maxDurationSeconds: POC_MAX_CALL_SECONDS,
    silenceTimeoutSeconds: POC_SILENCE_TIMEOUT_SECONDS,
    backgroundSound: 'off',
    firstMessage: EDEN_FIRST_MESSAGE,
    firstMessageMode: 'assistant-speaks-first',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: EDEN_SYSTEM_PROMPT }],
    },
    variableValues: {
      participantName: 'Nina',
      phase,
      phaseHeading,
    },
    'tools:append': [...VAPI_TOOL_DEFINITIONS],
  };
}
