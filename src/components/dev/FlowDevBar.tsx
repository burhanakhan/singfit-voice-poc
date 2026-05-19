import { useSessionStore } from '../../store/sessionStore';
import type { SessionPhase } from '../../types/session';
import './FlowDevBar.css';

/** Tap-through controls for demo when voice keys are missing or for QA */
export function FlowDevBar({ phase }: { phase: SessionPhase }) {
  const s = useSessionStore();

  return (
    <details className="flow-dev">
      <summary>Flow controls (tap fallback)</summary>
      <div className="flow-dev-voice">
        <p className="flow-dev-voice__label">Voice UI (preview)</p>
        <div className="flow-dev-grid flow-dev-grid--voice">
          <button
            type="button"
            onClick={() => {
              s.setParticipantSpeaking(false);
              s.setVoiceUi('listening');
            }}
          >
            Nina idle (mic)
          </button>
          <button
            type="button"
            onClick={() => {
              s.setVoiceUi('listening');
              s.setParticipantSpeaking(true);
            }}
          >
            Nina speaking
          </button>
          <button
            type="button"
            onClick={() => {
              s.setParticipantSpeaking(false);
              s.setVoiceUi('speaking');
            }}
          >
            Eden speaking
          </button>
          <button
            type="button"
            onClick={() => {
              s.setParticipantSpeaking(false);
              s.setVoiceUi('thinking');
            }}
          >
            Eden thinking
          </button>
        </div>
      </div>
      <div className="flow-dev-grid">
        {phase === 'mood_check' && (
          <>
            <button type="button" onClick={() => s.setMoodAndAdvance('Feeling a bit low today.')}>
              Mood: low
            </button>
            <button type="button" onClick={() => s.setMoodAndAdvance('Feeling great!')}>
              Mood: great
            </button>
          </>
        )}
        {phase === 'music_choice' && (
          <>
            <button type="button" onClick={() => s.startAiPick()}>
              AI pick song
            </button>
            <button type="button" onClick={() => s.showFavorites()}>
              Favorite songs
            </button>
            <button type="button" onClick={() => s.goBackToMusicChoice()}>
              Re-prompt choice
            </button>
          </>
        )}
        {phase === 'song_recommend' && (
          <>
            <button type="button" onClick={() => s.confirmOfferedSong()}>
              Yes, sing it
            </button>
            <button type="button" onClick={() => s.offerAnotherSong()}>
              Pick something else
            </button>
            <button type="button" onClick={() => s.goBackToMusicChoice()}>
              Go back
            </button>
          </>
        )}
        {phase === 'favorites' && (
          <>
            {s.favoriteSongs.slice(0, 3).map((song) => (
              <button key={song.id} type="button" onClick={() => s.selectFavorite(song)}>
                Pick {song.title}
              </button>
            ))}
            <button type="button" onClick={() => s.goBackToMusicChoice()}>
              Go back
            </button>
          </>
        )}
        {phase === 'song_feedback' && (
          <button type="button" onClick={() => s.submitSongFeedback()}>
            Feedback done
          </button>
        )}
        {phase === 'continue_or_end' && (
          <>
            <button type="button" onClick={() => s.wantAnotherSong()}>
              Another song
            </button>
            <button type="button" onClick={() => s.finishSession()}>
              Done for today
            </button>
          </>
        )}
        {phase === 'wrap_up' && (
          <button type="button" onClick={() => s.submitWrapUp()}>
            Mood improved
          </button>
        )}
      </div>
    </details>
  );
}
