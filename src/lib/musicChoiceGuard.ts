/** Block Vapi from auto-calling show_ai_song_pick right after mood until Nina chooses. */

let holdAiPickUntilUserAsks = false;
let userAskedAiPickAt = 0;

export function armMusicChoiceHold() {
  holdAiPickUntilUserAsks = true;
}

export function clearMusicChoiceHold() {
  holdAiPickUntilUserAsks = false;
}

export function noteUserAskedAiPick() {
  userAskedAiPickAt = Date.now();
  holdAiPickUntilUserAsks = false;
}

export function shouldBlockVapiMusicTool(toolName: string): boolean {
  if (!holdAiPickUntilUserAsks || toolName !== 'show_ai_song_pick') return false;
  if (Date.now() - userAskedAiPickAt < 20_000) return false;
  return true;
}

export function resetMusicChoiceGuard() {
  holdAiPickUntilUserAsks = false;
  userAskedAiPickAt = 0;
}
