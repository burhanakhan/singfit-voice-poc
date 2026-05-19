import { AppShell } from './components/layout/AppShell';
import { DesktopDevPanel } from './components/dev/DesktopDevPanel';
import { HomeScreen } from './components/home/HomeScreen';
import { FavoritesScreen } from './components/songs/FavoritesScreen';
import { SongOfferScreen } from './components/songs/SongOfferScreen';
import { PlayerScreen } from './components/player/PlayerScreen';
import { VoiceHubScreen } from './components/voice/VoiceHubScreen';
import { useEffect, useRef } from 'react';
import { useVapi } from './hooks/useVapi';
import { isDebugMode } from './lib/debugMode';
import { pushPhaseContextToVapi, shouldPromptEdenAfterTransition } from './lib/syncPhaseToVapi';
import { useSessionStore } from './store/sessionStore';
import type { ScreenId, SessionPhase } from './types/session';
import './App.css';

const EDEN_GREETING =
  "Hi Nina! I'm Eden, and I'm here to guide you through your music session today. How are you feeling right now?";

function App() {
  const { screen, phase, vapiConnected } = useSessionStore();
  const { startCall, configured } = useVapi();

  const prevNav = useRef<{ phase: SessionPhase; screen: ScreenId }>({ phase, screen });

  useEffect(() => {
    if (!vapiConnected) return;

    const prev = prevNav.current;
    const prompt = shouldPromptEdenAfterTransition(prev.phase, phase);

    const timer = window.setTimeout(() => {
      prevNav.current = { phase, screen };
      pushPhaseContextToVapi({ triggerResponse: prompt });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [phase, screen, vapiConnected]);

  const phaseBar =
    screen === 'home'
      ? null
      : screen === 'voice_hub'
        ? phase
        : screen === 'song_offer'
          ? 'song_recommend'
          : screen === 'favorites'
            ? 'favorites'
            : screen === 'player'
              ? 'playing'
              : null;

  const handleStart = async () => {
    const store = useSessionStore.getState();
    store.startSession();
    if (!configured) {
      store.addTranscript('eden', EDEN_GREETING);
      store.setVoiceUi('listening');
    }

    if (configured) {
      try {
        await startCall();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleEndSession = () => {
    useSessionStore.getState().endSession();
  };

  return (
    <div className="app-desktop">
      <div className="app-phone">
        <AppShell phaseBar={phaseBar} showMenu>
          {screen === 'home' && <HomeScreen onStart={handleStart} />}
          {screen === 'voice_hub' && <VoiceHubScreen onEndSession={handleEndSession} />}
          {screen === 'song_offer' && <SongOfferScreen />}
          {screen === 'favorites' && <FavoritesScreen />}
          {screen === 'player' && <PlayerScreen />}
        </AppShell>
      </div>
      {isDebugMode() ? <DesktopDevPanel screen={screen} phase={phase} /> : null}
    </div>
  );
}

export default App;
