import { useSessionStore } from '../../store/sessionStore';
import { VoiceFooter } from '../voice/VoiceFooter';
import './SongScreens.css';

export function FavoritesScreen() {
  const { favoriteSongs, selectFavorite, goBackToMusicChoice } = useSessionStore();

  return (
    <div className="song-screen favorites-screen">
      <ul className="fav-list">
        {favoriteSongs.map((song) => (
          <li key={song.id}>
            <button type="button" className="fav-row" onClick={() => selectFavorite(song)}>
              <span className="fav-row__text">
                <span className="fav-row__title">{song.title}</span>
                <span className="fav-row__style">Style: {song.style}</span>
              </span>
              <img
                className="fav-play"
                src="/images/small_play_button.png"
                alt=""
                width={28}
                height={28}
              />
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-link fav-back" onClick={goBackToMusicChoice}>
        ← Back to Eden
      </button>
      <VoiceFooter />
    </div>
  );
}
