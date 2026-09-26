import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioStatus } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

export type Track = { id: string; title: string; subtitle?: string; url: string };

type PlayerState = 'idle' | 'loading' | 'ready' | 'error';

type Player = {
  track: Track | null;
  status: AudioStatus;
  state: PlayerState;
  /** Load and start a track (or resume it if it's already current). Only ever called from a user tap. */
  play: (track: Track) => void;
  toggle: () => void;
  seek: (sec: number) => void;
  stop: () => void;
};

const Ctx = createContext<Player | null>(null);

const LOAD_TIMEOUT_MS = 10_000;

// Sample media points at *.invalid hosts; fail fast instead of waiting for DNS.
const unreachable = (url: string) => {
  try {
    return /\.invalid$/i.test(new URL(url).hostname);
  } catch {
    return true;
  }
};

/** One app-wide audio player (hymns, lessons, chapter audio) so only one thing ever plays at a time. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [track, setTrack] = useState<Track | null>(null);
  // 'active' = a source was handed to the player; ready/loading/error below is derived from its status.
  const [phase, setPhase] = useState<'idle' | 'active' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loaded = status.isLoaded && status.duration > 0;
  const failed = /fail|error/i.test(status.playbackState ?? '');
  const state: PlayerState =
    phase === 'idle' ? 'idle' : phase === 'error' || (failed && !loaded) ? 'error' : loaded ? 'ready' : 'loading';
  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const play = useCallback(
    (next: Track) => {
      if (timer.current) clearTimeout(timer.current);
      if (track?.id === next.id && state === 'ready') {
        player.play();
        return;
      }
      setTrack(next);
      if (unreachable(next.url)) {
        player.pause();
        setPhase('error');
        return;
      }
      setPhase('active');
      try {
        player.replace({ uri: next.url });
        player.play();
        if (Platform.OS === 'android') player.setActiveForLockScreen(true, { title: next.title, artist: next.subtitle });
      } catch {
        setPhase('error');
        return;
      }
      // A source that never reports loaded within the timeout counts as unavailable.
      timer.current = setTimeout(() => setPhase((p) => (p === 'active' && !loadedRef.current ? 'error' : p)), LOAD_TIMEOUT_MS);
    },
    [player, track?.id, state],
  );

  const toggle = useCallback(() => {
    if (state !== 'ready') return;
    if (status.playing) player.pause();
    else {
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.5)) void player.seekTo(0);
      player.play();
    }
  }, [player, state, status.playing, status.didJustFinish, status.currentTime, status.duration]);

  const seek = useCallback((sec: number) => void player.seekTo(sec).catch(() => {}), [player]);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      player.pause();
      if (Platform.OS === 'android') player.setActiveForLockScreen(false);
    } catch {}
    setTrack(null);
    setPhase('idle');
  }, [player]);

  const value = useMemo(() => ({ track, status, state, play, toggle, seek, stop }), [track, status, state, play, toggle, seek, stop]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): Player {
  const p = useContext(Ctx);
  if (!p) throw new Error('usePlayer must be used inside <PlayerProvider>');
  return p;
}

export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
