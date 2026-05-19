import { SessionMicIcon } from './SessionMicIcon';
import './HomeScreen.css';

type Props = { onStart: () => void };

const TILES = [
  ["NINA'S", 'SONGS'],
  ["NINA'S", 'PLAYLISTS'],
  ['SINGFIT', 'SONGS'],
  ['SINGFIT', 'PLAYLISTS'],
] as const;

export function HomeScreen({ onStart }: Props) {
  return (
    <div className="home">
      <div className="home-stack">
        <div className="start-cta-wrap">
          <div className="start-pulse-rings" aria-hidden>
            <span className="start-pulse-ring" />
            <span className="start-pulse-ring" />
            <span className="start-pulse-ring" />
          </div>
          <button type="button" className="start-cta" onClick={onStart} aria-label="Start session">
            <span className="start-cta-disk" aria-hidden />
            <span className="start-cta-inner">
              <SessionMicIcon />
              <span className="start-cta-title">
                START
                <br />
                SESSION
              </span>
            </span>
          </button>
        </div>
        <input className="home-search" readOnly placeholder="Search for song or artist" />
        <div className="home-grid">
          {TILES.map(([line1, line2]) => (
            <button key={`${line1}-${line2}`} type="button" className="home-tile">
              <span>{line1}</span>
              <span>{line2}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
