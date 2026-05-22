import { AppShell } from './components/layout/AppShell';
import { DesktopDevPanel } from './components/dev/DesktopDevPanel';
import { HomeScreen } from './components/home/HomeScreen';
import { FavoritesScreen } from './components/songs/FavoritesScreen';
import { SongOfferScreen } from './components/songs/SongOfferScreen';
import { PlayerScreen } from './components/player/PlayerScreen';
import { VoiceHubScreen } from './components/voice/VoiceHubScreen';
import { useEffect, useRef } from 'react';
import { useSessionWatchdog } from './hooks/useSessionWatchdog';
import { useVapi } from './hooks/useVapi';
import { SessionEndOverlay } from './components/session/SessionEndOverlay';
import { beginGracefulSessionEnd, voiceFailureEndMessage } from './lib/sessionEndSync';
import { logVoiceDebug, logVoiceDebugLifecycle } from './lib/voiceDebugLog';
import { isDebugMode } from './lib/debugMode';
import { disableSingAlongMode } from './lib/singAlongMode';
import { consumeSkipNextPhasePush } from './lib/vapiConnectFlags';
import { pushPhaseContextToVapi, shouldPromptEdenAfterTransition } from './lib/syncPhaseToVapi';
import { EDEN_FIRST_MESSAGE } from './lib/edenPrompt';
import { useSessionStore } from './store/sessionStore';
import type { ScreenId, SessionPhase } from './types/session';
import './App.css';

function App() {
  const { screen, phase, vapiConnected } = useSessionStore();
  const { startCall, configured } = useVapi();
  useSessionWatchdog();

  const prevNav = useRef<{ phase: SessionPhase; screen: ScreenId }>({ phase, screen });

  useEffect(() => {
    if (!vapiConnected) return;

    if (consumeSkipNextPhasePush()) {
      prevNav.current = { phase, screen };
      return;
    }

    const prev = prevNav.current;
    if (prev.phase === phase && prev.screen === screen) return;

    const prompt = shouldPromptEdenAfterTransition(prev.phase, phase);
    if (!prompt) {
      prevNav.current = { phase, screen };
      return;
    }

    const timer = window.setTimeout(() => {
      prevNav.current = { phase, screen };
      pushPhaseContextToVapi({ triggerResponse: true });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [phase, screen, vapiConnected]);

  useEffect(() => {
    if (phase !== 'playing') {
      disableSingAlongMode();
    }
  }, [phase]);

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
    logVoiceDebugLifecycle('handleStart clicked', { vapiConfigured: configured });
    const store = useSessionStore.getState();
    store.startSession();
    if (!configured) {
      logVoiceDebug('app', 'voice off — demo transcript only', { level: 'warn', snapshot: true });
      store.addTranscript('eden', EDEN_FIRST_MESSAGE);
      store.setVoiceUi('listening');
    }

    if (configured) {
      void startCall().catch((e) => {
        logVoiceDebugLifecycle('handleStart caught error', {
          error: e instanceof Error ? e.message : String(e),
        });
        beginGracefulSessionEnd(voiceFailureEndMessage(e));
      });
    }
  };

  const handleEndSession = () => {
    logVoiceDebug('app', 'handleEndSession (user)', { snapshot: true });
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
        <SessionEndOverlay />
      </div>
      {isDebugMode() ? <DesktopDevPanel screen={screen} phase={phase} /> : null}
    </div>
  );
}

export default App;
