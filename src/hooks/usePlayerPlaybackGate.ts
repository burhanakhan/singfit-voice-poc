import { useEffect, useRef, useSyncExternalStore, type RefObject } from 'react';

import { DEFAULT_MIX, mixToLinearGain } from '../components/player/playerMix';

import {

  attachPlayerAudio,

  resumePlayerAudioContext,

  setPlayerLinearGain,

} from '../lib/playerAudioEngine';

import {
  getIntroGateEpoch,
  isAwaitingSongIntro,
  markSongIntroComplete,
  subscribeIntroGate,
} from '../lib/playerIntroGate';

import {

  edenAllowsPlayerPlayback,

  registerPlayerPlaybackStart,

  unregisterPlayerPlaybackStart,

} from '../lib/playerPlaybackControl';

import { logVoiceDebug } from '../lib/voiceDebugLog';

import { enableSingAlongMode } from '../lib/singAlongMode';

import { startPlayingSilenceKeepalive, stopPlayingSilenceKeepalive } from '../lib/vapiPlayingSilence';

import { useSessionStore } from '../store/sessionStore';



const INTRO_WAIT_FALLBACK_MS = 14_000;



/**

 * Load the track on the player screen but start playback only after Eden's intro

 * finishes speaking (not while she is still talking).

 */

export function usePlayerPlaybackGate(

  audioRef: RefObject<HTMLAudioElement | null>,

  currentSongId: string | undefined,

  onSongEnded: () => void,

) {

  const vapiConnected = useSessionStore((s) => s.vapiConnected);

  const voiceUi = useSessionStore((s) => s.voiceUi);

  const introGateEpoch = useSyncExternalStore(subscribeIntroGate, getIntroGateEpoch, getIntroGateEpoch);



  const startedRef = useRef(false);

  const sawEdenSpeechRef = useRef(false);

  const tryStartRef = useRef<() => void>(() => undefined);



  useEffect(() => {

    startedRef.current = false;

    sawEdenSpeechRef.current = false;

    stopPlayingSilenceKeepalive();

  }, [currentSongId]);



  useEffect(() => {

    if (vapiConnected && currentSongId) {

      startPlayingSilenceKeepalive();

      return () => stopPlayingSilenceKeepalive();

    }

    stopPlayingSilenceKeepalive();

  }, [vapiConnected, currentSongId]);



  useEffect(() => {

    const el = audioRef.current;

    if (!el || !currentSongId) return;



    const tryStart = () => {

      if (!edenAllowsPlayerPlayback()) return;



      enableSingAlongMode();

      attachPlayerAudio(el);

      setPlayerLinearGain(el, mixToLinearGain(DEFAULT_MIX));

      const paused = useSessionStore.getState().playerAudioPaused;

      if (paused) return;

      const playNow = () => {

        void resumePlayerAudioContext()

          .then(() => el.play())

          .catch(() => undefined);

      };

      if (startedRef.current) {

        playNow();

        return;

      }

      startedRef.current = true;

      playNow();

    };



    tryStartRef.current = tryStart;



    if (!vapiConnected) {

      tryStart();

      return;

    }



    if (isAwaitingSongIntro()) {

      if (voiceUi === 'speaking') sawEdenSpeechRef.current = true;

      return;

    }



    if (voiceUi === 'speaking') sawEdenSpeechRef.current = true;



    if (edenAllowsPlayerPlayback() && sawEdenSpeechRef.current) {

      tryStart();

    }

  }, [audioRef, currentSongId, vapiConnected, voiceUi, introGateEpoch]);



  useEffect(() => {

    registerPlayerPlaybackStart(() => tryStartRef.current());

    return () => unregisterPlayerPlaybackStart();

  }, []);



  useEffect(() => {

    const el = audioRef.current;

    if (!el || !currentSongId || !vapiConnected) return;



    const fallback = window.setTimeout(() => {

      if (startedRef.current) return;

      if (!edenAllowsPlayerPlayback()) return;

      if (isAwaitingSongIntro()) {

        logVoiceDebug('sync', 'intro fallback timeout — starting song without full intro', {

          level: 'warn',

        });

        markSongIntroComplete();

      }

      tryStartRef.current();

    }, INTRO_WAIT_FALLBACK_MS);



    return () => window.clearTimeout(fallback);

  }, [audioRef, currentSongId, vapiConnected]);



  useEffect(() => {

    const el = audioRef.current;

    if (!el || !currentSongId) return;



    const onEnd = () => onSongEnded();

    el.addEventListener('ended', onEnd);

    return () => el.removeEventListener('ended', onEnd);

  }, [audioRef, currentSongId, onSongEnded]);

}


