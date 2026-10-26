import { setAudioModeAsync, useAudioPlaylist, useAudioPlaylistStatus, type AudioPlaylistLoopMode } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { shuffled } from './format';
import { useLibrary } from './library';
import type { RepeatMode, Track } from './types';

const LOOP: Record<RepeatMode, AudioPlaylistLoopMode> = { off: 'none', all: 'all', one: 'single' };

type PlayerContextValue = {
  queue: string[];
  currentIndex: number;
  currentTrack?: Track;
  playing: boolean;
  currentTime: number;
  duration: number;
  shuffle: boolean;
  repeat: RepeatMode;
  /** Remplace la file d'attente et lance la lecture (à partir de startId si donné). */
  playTracks: (ids: string[], startId?: string, opts?: { shuffle?: boolean }) => void;
  playNext: (id: string) => void;
  addToQueue: (id: string) => void;
  removeFromQueue: (index: number) => void;
  skipTo: (index: number) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seekTo: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { trackById, trackUri, markPlayed, updateTrack } = useLibrary();
  // La playlist native gère l'enchaînement et les boutons suivant/précédent de l'écran verrouillé,
  // même quand l'app est en arrière-plan.
  const playlist = useAudioPlaylist({ updateInterval: 500, loop: 'none' });
  const status = useAudioPlaylistStatus(playlist);

  const [queue, setQueue] = useState<string[]>([]);
  const [baseOrder, setBaseOrder] = useState<string[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const lockScreenActive = useRef(false);
  const lastPlayedId = useRef<string | null>(null);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  const currentIndex = queue.length ? Math.min(Math.max(status.currentIndex, 0), queue.length - 1) : -1;
  const currentTrack = currentIndex >= 0 ? trackById.get(queue[currentIndex]) : undefined;

  const sourceFor = useCallback(
    (id: string) => {
      const t = trackById.get(id);
      return t ? { uri: trackUri(t) } : null;
    },
    [trackById, trackUri]
  );

  const load = useCallback(
    (order: string[], startIndex: number) => {
      playlist.clear();
      for (const id of order) playlist.add(sourceFor(id));
      setQueue(order);
      if (order.length === 0) return;
      playlist.skipTo(startIndex);
      playlist.play();
    },
    [playlist, sourceFor]
  );

  const playTracks = useCallback(
    (ids: string[], startId?: string, opts?: { shuffle?: boolean }) => {
      const valid = ids.filter((id) => trackById.has(id));
      if (valid.length === 0) return;
      const useShuffle = opts?.shuffle ?? shuffle;
      setShuffle(useShuffle);
      setBaseOrder(valid);
      if (useShuffle) {
        const rest = shuffled(valid.filter((id) => id !== startId));
        load(startId && valid.includes(startId) ? [startId, ...rest] : rest, 0);
      } else {
        load(valid, Math.max(0, startId ? valid.indexOf(startId) : 0));
      }
    },
    [trackById, shuffle, load]
  );

  /** Remplace uniquement les morceaux après celui en cours, sans couper la musique. */
  const replaceUpcoming = useCallback(
    (upcoming: string[]) => {
      if (currentIndex < 0) return;
      for (let i = queue.length - 1; i > currentIndex; i--) playlist.remove(i);
      for (const id of upcoming) playlist.add(sourceFor(id));
      setQueue([...queue.slice(0, currentIndex + 1), ...upcoming]);
    },
    [playlist, queue, currentIndex, sourceFor]
  );

  const toggleShuffle = useCallback(() => {
    const next = !shuffle;
    setShuffle(next);
    if (currentIndex < 0) return;
    const played = new Set(queue.slice(0, currentIndex + 1));
    if (next) {
      replaceUpcoming(shuffled(baseOrder.filter((id) => !played.has(id))));
    } else {
      const pos = baseOrder.indexOf(queue[currentIndex]);
      replaceUpcoming(baseOrder.slice(pos + 1));
    }
  }, [shuffle, currentIndex, queue, baseOrder, replaceUpcoming]);

  const playNext = useCallback(
    (id: string) => {
      if (currentIndex < 0) return playTracks([id]);
      playlist.insert(sourceFor(id), currentIndex + 1);
      setQueue((q) => [...q.slice(0, currentIndex + 1), id, ...q.slice(currentIndex + 1)]);
    },
    [playlist, currentIndex, sourceFor, playTracks]
  );

  const addToQueue = useCallback(
    (id: string) => {
      if (currentIndex < 0) return playTracks([id]);
      playlist.add(sourceFor(id));
      setQueue((q) => [...q, id]);
    },
    [playlist, currentIndex, sourceFor, playTracks]
  );

  const removeFromQueue = useCallback(
    (index: number) => {
      if (index <= currentIndex || index >= queue.length) return;
      playlist.remove(index);
      setQueue((q) => q.filter((_, i) => i !== index));
    },
    [playlist, currentIndex, queue.length]
  );

  const skipTo = useCallback(
    (index: number) => {
      playlist.skipTo(index);
      playlist.play();
    },
    [playlist]
  );

  const togglePlay = useCallback(() => {
    if (status.playing) return playlist.pause();
    if (status.duration > 0 && status.currentTime >= status.duration - 0.5) playlist.seekTo(0);
    playlist.play();
  }, [playlist, status.playing, status.duration, status.currentTime]);

  const next = useCallback(() => {
    if (currentIndex < queue.length - 1) playlist.next();
    else if (repeat !== 'off' && queue.length) skipTo(0);
  }, [playlist, currentIndex, queue.length, repeat, skipTo]);

  const previous = useCallback(() => {
    if (status.currentTime > 3 || currentIndex <= 0) playlist.seekTo(0);
    else playlist.previous();
  }, [playlist, status.currentTime, currentIndex]);

  const seekTo = useCallback((seconds: number) => void playlist.seekTo(seconds), [playlist]);

  const cycleRepeat = useCallback(() => {
    const nextMode: RepeatMode = repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off';
    setRepeat(nextMode);
    playlist.loop = LOOP[nextMode];
  }, [playlist, repeat]);

  // Écran verrouillé + compteur d'écoutes à chaque changement de morceau.
  useEffect(() => {
    if (!currentTrack) return;
    const meta = { title: currentTrack.title, artist: currentTrack.artist || 'Artiste inconnu', albumTitle: 'Hors Tension' };
    if (!lockScreenActive.current) {
      playlist.setActiveForLockScreen(true, meta, { showNextTrack: true, showPreviousTrack: true });
      lockScreenActive.current = true;
    } else {
      playlist.updateLockScreenMetadata(meta);
    }
    if (lastPlayedId.current !== currentTrack.id) {
      lastPlayedId.current = currentTrack.id;
      markPlayed(currentTrack.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist]);

  // Complète la durée si elle n'avait pas pu être lue à l'import.
  useEffect(() => {
    if (currentTrack && !currentTrack.duration && status.duration > 0) {
      updateTrack(currentTrack.id, { duration: status.duration });
    }
  }, [currentTrack, status.duration, updateTrack]);

  const value: PlayerContextValue = {
    queue,
    currentIndex,
    currentTrack,
    playing: status.playing,
    currentTime: status.currentTime,
    duration: status.duration || currentTrack?.duration || 0,
    shuffle,
    repeat,
    playTracks,
    playNext,
    addToQueue,
    removeFromQueue,
    skipTo,
    togglePlay,
    next,
    previous,
    seekTo,
    toggleShuffle,
    cycleRepeat,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans PlayerProvider');
  return ctx;
}
