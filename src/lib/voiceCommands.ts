/** Shared voice command patterns — same rules on every screen/phase. */

export type NavigationCommand =
  | 'go_back'
  | 'skip_next'
  | 'pause_stop'
  | 'resume_play'
  | 'show_favorites'
  | 'show_ai_pick'
  | 'pick_another'
  | 'confirm_song';

const NAV_PATTERNS: { command: NavigationCommand; re: RegExp }[] = [
  {
    command: 'skip_next',
    re: /\b(?:can\s+(?:you|we)\s+skip|let'?s\s+skip|skip\s+(?:(?:this|the)\s+)?song|skip\s+it|next\s+song)\b/i,
  },
  { command: 'skip_next', re: /(?:^|[.!?,]\s*)skip(?:\s+(?:the\s+)?song)?(?:\s|$|[.!?,])/i },
  {
    command: 'go_back',
    re: /\b(?:let'?s\s+go\s+back|go(?:ing)?\s+back|stop\s+and\s+go\s+back|can\s+we\s+go\s+back|take\s+me\s+back|back\s+to\s+eden|start\s+over|leave\s+(?:the\s+)?song|move\s+back)\b/i,
  },
  {
    command: 'pause_stop',
    re: /\b(?:pause(?:\s+(?:this|the|it))?(?:\s+(?:song|music|clip|phone))?|(?:please\s+)?stop(?:\s+(?:this|the|it))?(?:\s+(?:song|music|clip))?|hold\s+on)\b/i,
  },
  {
    command: 'resume_play',
    re: /\b(?:resume|unpause|keep\s+playing|continue\s+(?:the\s+)?song)\b/i,
  },
  { command: 'resume_play', re: /(?:^|[.!?,]\s*)continue(?:\s|$|[.!?,])/i },
  {
    command: 'pick_another',
    re: /\b(?:(?:pick|choose|show)\s+(?:me\s+)?something\s+else|(?:pick|choose|play)\s+another(?:\s+song)?|another\s+song|different\s+song|something\s+else)\b/i,
  },
  {
    command: 'confirm_song',
    re: /\b(?:yes[,!]?\s*)?(?:let'?s\s+)?(?:play\s+it|sing\s+it|play\s+this|let'?s\s+do\s+it|yes\s+please|start\s+playing|let'?s\s+sing)\b/i,
  },
  {
    command: 'show_favorites',
    re: /\b(?:(?:my\s+)?favorites?|favorite\s+songs?|what\s+do\s+you\s+have\s+for\s+(?:my\s+)?favorites?|show\s+(?:me\s+)?(?:my\s+)?favorites?|list\s+(?:my\s+)?favorites?)\b/i,
  },
  {
    command: 'show_ai_pick',
    re: /\b(?:pick\s+a\s+song(?:\s+for\s+me)?|take\s+a\s+song|choose\s+a\s+song|suggest\s+a\s+song|(?:you|eden)\s+pick(?:\s+a\s+song)?|pick\s+(?:me\s+)?a\s+song)\b/i,
  },
];

const GO_BACK_COMPLAINT_RE =
  /\b(?:eden\s+is\s+gone|no\s+response|kind\s+of\s+stuck|not\s+responding|where\s+(?:are\s+you|is\s+eden)|when\s+i'?m\s+saying)\b/i;

const PRESENCE_RE =
  /\b(?:are\s+you\s+(?:there|listening|with\s+me|still\s+there)|can\s+you\s+hear\s+me|do\s+you\s+hear\s+me|hello\s+eden|hey\s+eden|eden\s+are\s+you\s+there)\b/i;

const PRESENCE_SHORT_RE = /^(?:hey\s+)?eden[.!?,]*$/i;

const WRAP_IMPROVEMENT_RE =
  /\b(?:a\s+lot|lots|much\s+better|greatly|not\s+at\s+all|no\s+change|a\s+little|little\s+better|somewhat|bit\s+better|helped\s+(?:somewhat|a\s+little|a\s+bit))\b/i;

const MOOD_GOOD_RE =
  /\b(?:feeling\s+)?(?:pretty\s+)?good\b|\b(?:doing\s+)?(?:well|okay|ok|fine|great|wonderful)\b|\bi'?m\s+(?:good|okay|ok|fine|well|great)\b/i;
const MOOD_LOW_RE =
  /\b(?:low|sad|down|tired|anxious|heavy|rough|bad|hurt|weighed|lonely|stressed)\b/i;
/** Common STT glitch for "I'm feeling pretty good". */
const MOOD_STT_GOOD_RE = /\bbearing\s+(?:dirt|good)\b/i;

const PLAYING_NAV_PATTERNS: { command: NavigationCommand; re: RegExp }[] = [
  {
    command: 'resume_play',
    re: /\b(?:eden[,]?\s+)?(?:please\s+)?(?:resume|unpause|keep\s+playing|continue\s+(?:the\s+)?song)(?:\s+now)?\b/i,
  },
  { command: 'resume_play', re: /^resume[.!?,]*$/i },
  {
    command: 'pause_stop',
    re: /\b(?:eden[,]?\s+)?(?:can\s+you\s+)?(?:please\s+)?pause(?:\s+(?:this|the|it))?(?:\s+(?:song|music|form))?\b/i,
  },
  {
    command: 'pause_stop',
    re: /\bplease\s+pause(?:\s+the\s+(?:song|form|music))?\b/i,
  },
  {
    command: 'pause_stop',
    re: /\b(?:eden[,]?\s+)?(?:please\s+)?(?:stop|hold)\s+(?:this|the|it)?\s*(?:song|music|form)?\b/i,
  },
  {
    command: 'skip_next',
    re: /\b(?:eden[,]?\s+)?(?:can\s+you\s+)?(?:please\s+)?skip(?:\s+(?:this|the))?\s*(?:song)?\b/i,
  },
  { command: 'go_back', re: NAV_PATTERNS.find((p) => p.command === 'go_back')!.re },
  { command: 'show_favorites', re: NAV_PATTERNS.find((p) => p.command === 'show_favorites')!.re },
];

const DONE_TODAY_RE =
  /\b(?:done\s+for\s+today|end\s+(?:the\s+)?session|please\s+end\s+(?:the\s+)?session|i'?m\s+done|finish(?:\s+for)?\s+today|that'?s\s+all\s+for\s+today)\b/i;

const ANOTHER_SONG_RE = /\b(?:another\s+song|sing\s+another|one\s+more\s+song|want\s+another)\b/i;

export function normalizeVoiceLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function matchNavigationCommand(line: string): NavigationCommand | null {
  const t = normalizeVoiceLine(line);
  if (t.length < 2) return null;
  for (const { command, re } of NAV_PATTERNS) {
    if (re.test(t)) return command;
  }
  return null;
}

export function matchGoBackCommand(line: string): boolean {
  const t = normalizeVoiceLine(line);
  if (t.length < 4 || t.length > 72) return false;
  if (GO_BACK_COMPLAINT_RE.test(t)) return false;
  return matchNavigationCommand(line) === 'go_back';
}

export function matchUserWantsAiPick(line: string): boolean {
  return matchNavigationCommand(line) === 'show_ai_pick';
}

export function matchSongOfferSkip(line: string): boolean {
  const t = normalizeVoiceLine(line);
  if (/\b(?:yep|yes|this\s+one|sing\s+it|let'?s\s+sing)\b/.test(t) && !/\bskip\b/.test(t)) return false;
  return (
    matchNavigationCommand(line) === 'skip_next' ||
    matchNavigationCommand(line) === 'pick_another' ||
    /\b(?:skip(?:\s+(?:this|the|it))?(?:\s+song)?|don'?t\s+want\s+this|not\s+this\s+one|try\s+another)\b/i.test(t)
  );
}

/** During sing-along — prefer resume over pause when both appear (STT runs on one long line). */
export function matchPlayingNavigationCommand(line: string): NavigationCommand | null {
  const t = normalizeVoiceLine(line);
  if (t.length < 3) return null;
  if (/\bresume\b/i.test(t) && /\bpause\b/i.test(t)) {
    if (/\b(?:let'?s\s+resume|resume\s+now|please\s+resume|can\s+you\s+resume)\b/i.test(t)) {
      return 'resume_play';
    }
  }
  for (const { command, re } of PLAYING_NAV_PATTERNS) {
    if (re.test(t)) return command;
  }
  return null;
}

export function matchPlayingStartPlayback(line: string): boolean {
  const t = normalizeVoiceLine(line);
  return /\b(?:song\s+is\s+not\s+playing|not\s+playing|please\s+play|start\s+playing|play\s+(?:the\s+)?song|play\s+it|can\s+you\s+play)\b/i.test(
    t,
  );
}

export function matchSongOfferConfirm(line: string): boolean {
  if (matchNavigationCommand(line) === 'confirm_song') return true;
  const t = normalizeVoiceLine(line);
  return /\b(?:start\s+playing|let'?s\s+(?:play|sing)|sing\s+(?:it|this|that)|play\s+(?:it|now|this)|listen\s+(?:this|it)|(?:yeah|yes).{0,28}\bsing)\b/i.test(
    t,
  );
}

/** Avoid pick_another on long complaints that only mention "something else" in passing. */
export function matchPickAnotherCommand(line: string): boolean {
  const t = normalizeVoiceLine(line);
  if (
    !/\b(?:(?:pick|choose|show)\s+(?:me\s+)?something\s+else|(?:pick|choose|play)\s+another(?:\s+song)?|another\s+song|different\s+song|something\s+else)\b/i.test(
      t,
    )
  ) {
    return false;
  }
  if (t.length > 88) return false;
  if (
    /\b(?:wrong\s+screen|still\s+showing|not\s+gone|changed\s+the\s+song|without\s+my|not\s+playing\s+yet|wrong\s+screen|run\s+the\s+wrong)\b/i.test(
      t,
    ) &&
    !/^(?:pick|choose|play)\s+(?:me\s+)?(?:something\s+else|another)/i.test(t.trim())
  ) {
    return false;
  }
  return true;
}

export function parseMoodFromLine(line: string): string | null {
  const t = normalizeVoiceLine(line);
  if (t.length < 4) return null;
  if (MOOD_STT_GOOD_RE.test(t)) return 'feeling pretty good';
  if (MOOD_GOOD_RE.test(t)) return line.trim().slice(0, 120);
  if (MOOD_LOW_RE.test(t) && (t.length >= 8 || /\bfeeling\b/.test(t))) return line.trim().slice(0, 120);
  if (/\b(?:feeling|mood|today)\b/.test(t) && t.length >= 10) return line.trim().slice(0, 120);
  return null;
}

export function matchPresenceCheck(line: string): boolean {
  const raw = line.trim();
  const t = normalizeVoiceLine(line);
  return (
    (t.length >= 2 && PRESENCE_RE.test(t)) || PRESENCE_SHORT_RE.test(raw) || /\beden\b.*\b(?:there|listening)\b/i.test(t)
  );
}

export function parseWrapUpImprovement(line: string): 'a little' | 'a lot' | 'not at all' | null {
  const t = normalizeVoiceLine(line);
  if (!WRAP_IMPROVEMENT_RE.test(t) && !/\bhelped\b/.test(t)) return null;
  if (/\b(?:not\s+at\s+all|no\s+change)\b/.test(t)) return 'not at all';
  if (/\b(?:a\s+little|little\s+better|somewhat|bit\s+better|helped\s+(?:somewhat|a\s+little|a\s+bit)|\bhelped\b)/.test(t))
    return 'a little';
  if (/\b(?:a\s+lot|lots|much\s+better|greatly)\b/.test(t)) return 'a lot';
  return null;
}

export function matchDoneForToday(line: string): boolean {
  return DONE_TODAY_RE.test(normalizeVoiceLine(line));
}

export function matchWantAnotherSong(line: string): boolean {
  return ANOTHER_SONG_RE.test(normalizeVoiceLine(line));
}

export const SING_ALONG_PHASE_HINT = [
  'Sing-along: Nina may sing lyrics — not conversation.',
  'Stay SILENT unless she asks navigation with a full phrase (e.g. "Eden, please pause the song", "Eden, skip this song", go back, favorites) or a presence check ("Eden, are you there?") — then one short line only.',
  'Never coach mid-song, comment on her singing, or use filler ("one moment", "this will take a sec").',
].join(' ');

export const PLAYER_VOICE_HINT =
  'Try: "Please pause the song" · "Eden, skip this song" · "Eden, resume the song" · "Eden, are you there?"';

export const SONG_OFFER_VOICE_HINT =
  'To start: "Yes, let\'s sing it" or "Eden, start playing" · Another: "Pick something else"';

export const MOOD_VOICE_HINT =
  'Say a full sentence, e.g. "I\'m feeling pretty good today"';
