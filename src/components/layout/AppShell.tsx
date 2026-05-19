import type { ReactNode } from 'react';
import { PHASE_HEADINGS, type SessionPhase } from '../../types/session';
import './AppShell.css';

type Props = {
  children: ReactNode;
  phaseBar?: SessionPhase | null;
  showMenu?: boolean;
};

export function AppShell({ children, phaseBar, showMenu = true }: Props) {
  return (
    <div className="app-shell">
      <header className="app-header">
        {showMenu ? <span className="header-spacer" aria-hidden /> : null}
        <img
          className="logo-img"
          src="/images/SingFit_studio_logo.png"
          alt="SingFit Studio"
        />
        {showMenu ? (
          <button type="button" className="menu-btn" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
        ) : null}
      </header>
      {phaseBar ? <div className="phase-bar">{PHASE_HEADINGS[phaseBar]}</div> : null}
      <main className="app-main">{children}</main>
    </div>
  );
}
