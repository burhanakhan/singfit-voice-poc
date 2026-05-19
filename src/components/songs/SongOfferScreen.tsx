import { songOfferKickerForOfferIndex } from '../../lib/songOfferCopy';
import { useSessionStore } from '../../store/sessionStore';
import { VoiceFooter } from '../voice/VoiceFooter';
import './SongScreens.css';

export function SongOfferScreen() {
  const { offeredSong, offeredHistory, confirmOfferedSong, offerAnotherSong, goBackToMusicChoice } =
    useSessionStore();

  if (!offeredSong) return null;

  const offerIndex = Math.max(0, offeredHistory.length - 1);

  return (
    <div className="song-screen">
      <p className="song-screen-kicker">{songOfferKickerForOfferIndex(offerIndex)}</p>
      <h2 className="song-screen-title">{offeredSong.title}</h2>
      <p className="song-screen-artist">
        <span className="song-screen-artist-by">by </span>
        <span className="song-screen-artist-name">{offeredSong.style}</span>
      </p>
      <button type="button" className="btn-primary" onClick={confirmOfferedSong}>
        YES, let&apos;s sing it!
      </button>
      <button type="button" className="btn-secondary" onClick={offerAnotherSong}>
        Pick something else
      </button>
      <button type="button" className="btn-link" onClick={goBackToMusicChoice}>
        ← Back to Eden
      </button>
      <VoiceFooter />
    </div>
  );
}
