/** Ignore duplicate Vapi tool-calls right after the app already ran the same tool client-side. */

let lastTool = '';
let lastAt = 0;

export function noteClientToolExecuted(toolName: string) {
  lastTool = toolName;
  lastAt = Date.now();
}

export function shouldIgnoreDuplicateVapiTool(toolName: string): boolean {
  return toolName === lastTool && Date.now() - lastAt < 4000;
}

export function resetClientToolDedupe() {
  lastTool = '';
  lastAt = 0;
}
