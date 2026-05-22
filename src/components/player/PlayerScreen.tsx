import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { songAudioUrl } from '../../data/songs';
import { usePlayerPlaybackGate } from '../../hooks/usePlayerPlaybackGate';
import {
  attachPlayerAudio,
  resumePlayerAudioContext,
  setPlayerLinearGain,
} from '../../lib/playerAudioEngine';
import { edenSpeechActiveFromVapi } from '../../lib/voiceUiSync';
import { useSessionStore } from '../../store/sessionStore';
import { VoiceFooter } from '../voice/VoiceFooter';
import { PlayerAsset } from './PlayerAsset';
import { PlayerMixSlider } from './PlayerMixSlider';
import {
  TransportPauseCircle,
  TransportPlayCircle,
  TransportSkipBack,
  TransportSkipForward,
} from './PlayerTransportIcons';
import {
  DEFAULT_MIX,
  EDEN_DUCK_MULTIPLIER,
  formatPlayerTime,
  mixToPlaybackRate,
  mixToLinearGain,
  type MixLevels,
} from './playerMix';
import './PlayerScreen.css';

export function PlayerScreen() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [mix, setMix] = useState<MixLevels>(DEFAULT_MIX);
  const [highKey, setHighKey] = useState(true);
  const [liked, setLiked] = useState<'up' | 'down' | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const {
    currentSong,
    onSongEnded,
    goBackToMusicChoice,
    voiceUi,
    vapiConnected,
    playerAudioPaused,
    phase,
  } = useSessionStore();

  usePlayerPlaybackGate(audioRef, currentSong?.id, onSongEnded);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    attachPlayerAudio(el);
  }, []);

  const applyMixToAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    const base = mixToLinearGain(mix);
    const edenTalking =
      vapiConnected &&
      (phase === 'playing'
        ? edenSpeechActiveFromVapi()
        : voiceUi === 'speaking' || voiceUi === 'thinking');
    setPlayerLinearGain(el, edenTalking ? base * EDEN_DUCK_MULTIPLIER : base);
    el.playbackRate = mixToPlaybackRate(mix, highKey);
  }, [mix, highKey, voiceUi, vapiConnected, phase]);

  useEffect(() => {
    applyMixToAudio();
  }, [applyMixToAudio]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const syncPlaying = () => setPlaying(!el.paused);
    el.addEventListener('play', syncPlaying);
    el.addEventListener('pause', syncPlaying);
    return () => {
      el.removeEventListener('play', syncPlaying);
      el.removeEventListener('pause', syncPlaying);
    };
  }, []);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentSong) return;
    el.pause();
    attachPlayerAudio(el);
    el.src = songAudioUrl(currentSong);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoaded = () => setDuration(el.duration || 0);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('durationchange', onLoaded);
    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('durationchange', onLoaded);
    };
  }, [currentSong]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentSong) return;
    if (playerAudioPaused) {
      el.pause();
      return;
    }
    if (el.paused) {
      void resumePlayerAudioContext()
        .then(() => el.play())
        .catch(() => undefined);
    }
  }, [playerAudioPaused, currentSong]);

  const updateMix = (key: keyof MixLevels, value: number) => {
    setMix((prev) => ({ ...prev, [key]: value }));
  };

  if (!currentSong) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void resumePlayerAudioContext().then(() => el.play());
    } else {
      el.pause();
    }
  };

  const skipForward = () => {
    audioRef.current?.pause();
    goBackToMusicChoice();
  };

  const seek = (value: number) => {
    const el = audioRef.current;
    if (!el || !duration) return;
    const next = (value / 100) * duration;
    el.currentTime = next;
    setCurrentTime(next);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const remaining = Math.max(0, duration - currentTime);

  return (
    <div className="player-screen">
      <div className="player-mix">
        <PlayerMixSlider
          label="Lyric Coach"
          value={mix.lyricCoach}
          onChange={(v) => updateMix('lyricCoach', v)}
        />
        <PlayerMixSlider
          label="Guide Singer"
          value={mix.guideSinger}
          onChange={(v) => updateMix('guideSinger', v)}
        />
        <PlayerMixSlider
          label="Background Music"
          value={mix.backingMusic}
          onChange={(v) => updateMix('backingMusic', v)}
        />
        <PlayerMixSlider
          label="Playback Speed"
          value={mix.playbackSpeed}
          onChange={(v) => updateMix('playbackSpeed', v)}
          variant="speed"
        />
        <div className="player-key-toggle">
          <span className="player-key-toggle__label">Low Key</span>
          <button
            type="button"
            className="player-key-toggle__btn"
            onClick={() => setHighKey((k) => !k)}
            aria-pressed={highKey}
            aria-label={highKey ? 'High key' : 'Low key'}
          >
            <PlayerAsset name={highKey ? 'high-key.png' : 'low-key.png'} className="player-key-toggle__img" />
          </button>
          <span className="player-key-toggle__label">High Key</span>
        </div>
      </div>

      <div className="player-body">
        <div className="player-song-info">
          <h2 className="player-title">{currentSong.title}</h2>
          <p className="player-style">Style: {currentSong.style}</p>
        </div>

        <div className="player-feedback">
          <button
            type="button"
            className="player-feedback-btn"
            onClick={() => setLiked((v) => (v === 'down' ? null : 'down'))}
            aria-label="Dislike"
            aria-pressed={liked === 'down'}
          >
            <PlayerAsset
              name={liked === 'down' ? 'btn-thumbs-down-active-player.png' : 'btn-thumbs-down-inactive-player.png'}
              className="player-feedback-btn__img"
            />
          </button>
          <button
            type="button"
            className="player-feedback-btn"
            onClick={() => setLiked((v) => (v === 'up' ? null : 'up'))}
            aria-label="Like"
            aria-pressed={liked === 'up'}
          >
            <PlayerAsset
              name={liked === 'up' ? 'btn-thumbs-up-active-player.png' : 'btn-thumbs-up-inactive-player.png'}
              className="player-feedback-btn__img"
            />
          </button>
        </div>

        <div className="player-progress">
          <input
            type="range"
            className="player-progress-slider"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            style={{ '--progress-fill': `${progress}%` } as CSSProperties}
            onChange={(e) => seek(Number(e.target.value))}
            aria-label="Song progress"
          />
          <div className="player-progress-times">
            <span>{formatPlayerTime(currentTime)}</span>
            <span>-{formatPlayerTime(remaining)}</span>
          </div>
        </div>

        <div className="player-transport">
          <button type="button" className="player-transport-btn player-transport-btn--disabled" disabled aria-label="Previous">
            <TransportSkipBack disabled />
          </button>
          <button
            type="button"
            className="player-transport-btn player-transport-btn--center"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <TransportPauseCircle /> : <TransportPlayCircle />}
          </button>
          <button type="button" className="player-transport-btn" onClick={skipForward} aria-label="Leave song">
            <TransportSkipForward />
          </button>
        </div>

        <button type="button" className="player-back" onClick={goBackToMusicChoice}>
          ← Back to Eden
        </button>
      </div>

      <audio ref={audioRef} preload="auto" />
      <VoiceFooter />
    </div>
  );
}
