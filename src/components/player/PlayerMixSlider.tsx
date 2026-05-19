import type { CSSProperties } from 'react';
import { PlayerAsset } from './PlayerAsset';
import './PlayerScreen.css';

type Props = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  variant?: 'volume' | 'speed';
};

export function PlayerMixSlider({ label, value, onChange, variant = 'volume' }: Props) {
  const setMin = () => onChange(0);
  const setMax = () => onChange(100);

  const leftAsset = variant === 'speed' ? 'slow-enabled.png' : 'vol-lo.png';
  const rightAsset = variant === 'speed' ? 'fast-enabled.png' : 'vol-hi.png';

  return (
    <div className="player-mix-row">
      <span className="player-mix-row__label">{label}</span>
      <div className={`player-mix-row__control${variant === 'speed' ? ' player-mix-row__control--speed' : ''}`}>
        <button type="button" className="player-mix-icon-btn" onClick={setMin} aria-label={`${label} minimum`}>
          <PlayerAsset
            name={leftAsset}
            className={`player-mix-icon${variant === 'speed' ? ' player-mix-icon--speed-left' : ''}`}
          />
        </button>
        <div className="player-mix-slider-wrap">
          <input
            type="range"
            className={`player-mix-slider${variant === 'volume' ? ' player-mix-slider--volume' : ' player-mix-slider--speed'}`}
            min={0}
            max={100}
            value={value}
            style={{ '--mix-fill': `${value}%` } as CSSProperties}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label={label}
          />
        </div>
        <button type="button" className="player-mix-icon-btn" onClick={setMax} aria-label={`${label} maximum`}>
          <PlayerAsset
            name={rightAsset}
            className={`player-mix-icon${variant === 'speed' ? ' player-mix-icon--speed-right' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
