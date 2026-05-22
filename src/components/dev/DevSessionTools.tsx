import {
  devPreviewSessionEndOverlay,
  SESSION_END_COUNTDOWN_SEC,
  type SessionEndPreviewScenario,
} from '../../lib/sessionEndSync';
import { useSessionStore } from '../../store/sessionStore';
import type { SessionPhase } from '../../types/session';
import './DevSessionTools.css';

const END_PREVIEWS: { id: SessionEndPreviewScenario; label: string }[] = [
  { id: 'inactivity', label: '5 min inactivity' },
  { id: 'max_duration', label: '30 min limit' },
  { id: 'unknown', label: 'Unknown end' },
  { id: 'voice_error', label: 'Voice error' },
];

type Props = {
  phase: SessionPhase;
  inSession: boolean;
};

/** Combined flow tap-through + session-end preview (debug mode only). */
export function DevSessionTools({ phase, inSession }: Props) {
  const s = useSessionStore();

  return (
    <section className="dev-session-tools" aria-label="Session developer tools">
      <h2 className="dev-session-tools__title">Session tools</h2>

      <details className="dev-help">
        <summary>How these tools work</summary>
        <div className="dev-help__body">
          <p>
            Use when voice is unavailable or you need to jump ahead without speaking. Flow buttons
            mirror what Eden’s tools do in production — they only change app state, not Vapi.
          </p>
          <p>
            Session end buttons show the same popup and {SESSION_END_COUNTDOWN_SEC}s countdown as a
            real disconnect or timeout, then return home (no need to wait).
          </p>
          <p>
            Vapi connection status, audio diagnostics, and env setup notes are written to the voice
            debug log below — not shown in a separate banner.
          </p>
        </div>
      </details>

      {inSession ? (
        <>
          <details className="dev-section" open>
            <summary>Flow — phase: {phase}</summary>
            <div className="dev-section__body">
              <p className="dev-section__hint">Buttons for the current step only.</p>
              <div className="dev-grid">
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
                {phase === 'playing' && (
                  <>
                    <button type="button" onClick={() => s.onSongEnded()}>
                      End song (feedback)
                    </button>
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
                    Mood improved → goodbye
                  </button>
                )}
              </div>
            </div>
          </details>

          <details className="dev-section">
            <summary>Voice UI preview</summary>
            <div className="dev-section__body">
              <p className="dev-section__hint">Orb / footer states only — does not call Vapi.</p>
              <div className="dev-grid">
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
          </details>
        </>
      ) : (
        <p className="dev-session-tools__idle">Start a session on the phone to enable flow controls.</p>
      )}

      <details className="dev-section">
        <summary>Session end popups</summary>
        <div className="dev-section__body">
          <details className="dev-help dev-help--nested">
            <summary>About session end preview</summary>
            <div className="dev-help__body">
              <p>
                Each button triggers <code>beginGracefulSessionEnd</code> with the same copy and
                countdown as production, then auto home. Use to QA overlay layout without waiting
                for silence timeout or a dropped call.
              </p>
            </div>
          </details>
          <div className="dev-grid dev-grid--end">
            {END_PREVIEWS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className="dev-grid__btn"
                onClick={() => devPreviewSessionEndOverlay(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
