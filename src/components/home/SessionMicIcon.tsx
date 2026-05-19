/** Studio mic — white body, orange grille (transparent background) */
export function SessionMicIcon() {
  return (
    <svg
      className="session-mic-icon"
      viewBox="0 0 56 60"
      width="50"
      height="54"
      aria-hidden
    >
      <defs>
        <filter id="session-mic-shadow" x="-25%" y="-15%" width="150%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#000" floodOpacity="0.2" />
        </filter>
        <clipPath id="session-mic-capsule">
          <rect x="18" y="0" width="20" height="45" rx="10" />
        </clipPath>
        <clipPath id="session-mic-grille-zone">
          <rect x="19" y="21" width="18" height="22" rx="7" />
        </clipPath>
      </defs>
      <g filter="url(#session-mic-shadow)">
        {/* Stand behind capsule so the mic sits inside the cradle */}
        <path
          d="M11 35a17 17 0 0 0 34 0"
          fill="none"
          stroke="#fff"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
        <line x1="28" y1="52" x2="28" y2="58" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" />
        <line x1="17" y1="58" x2="39" y2="58" stroke="#fff" strokeWidth="2.75" strokeLinecap="round" />
        <g clipPath="url(#session-mic-capsule)">
          <rect x="18" y="0" width="20" height="45" rx="10" fill="#fff" />
          <rect x="18" y="23" width="20" height="22" fill="#f57c00" />
          <g clipPath="url(#session-mic-grille-zone)" stroke="#e65100" strokeWidth="1.6" strokeLinecap="round">
            <line x1="20" y1="25" x2="36" y2="25" />
            <line x1="20" y1="28.5" x2="36" y2="28.5" />
            <line x1="20" y1="32" x2="36" y2="32" />
            <line x1="20" y1="35.5" x2="36" y2="35.5" />
            <line x1="20" y1="39" x2="36" y2="39" />
            <line x1="20" y1="42.5" x2="36" y2="42.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}
