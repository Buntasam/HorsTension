import * as DocumentPicker from 'expo-document-picker';
import { createAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  copyIntoLibrary,
  deleteTrackFile,
  downloadIntoLibrary,
  loadLibrary,
  newId,
  PLAYABLE_EXT,
  extOf,
  saveLibrary,
  trackFile,
} from './files';
import { parseFileName } from './format';
import type { Download, Playlist, Settings, Track } from './types';

const DEFAULT_SETTINGS: Settings = {
  sortKey: 'addedAt',
  sortAsc: false,
  browserHome: 'https://duckduckgo.com/?q=youtube+to+mp3',
};

type LibraryContextValue = {
  loaded: boolean;
  tracks: Track[];
  trackById: Map<string, Track>;
  playlists: Playlist[];
  settings: Settings;
  downloads: Download[];
  updateSettings: (patch: Partial<Settings>) => void;
  updateTrack: (id: string, patch: Partial<Track>) => void;
  deleteTracks: (ids: string[]) => void;
  markPlayed: (id: string) => void;
  importFromFiles: () => Promise<number>;
  downloadUrl: (url: string, suggestedName?: string) => Promise<void>;
  clearFinishedDownloads: () => void;
  createPlaylist: (name: string, trackIds?: string[]) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addToPlaylist: (id: string, trackIds: string[]) => void;
  removeFromPlaylist: (id: string, index: number) => void;
  movePlaylistTrack: (id: string, from: number, to: number) => void;
  trackUri: (track: Track) => string;
};

const LibraryContext = createContext<LibraryContextValue | null>(null);

function makeTrack(fileName: string, displayName: string, source?: string): Track {
  const { title, artist } = parseFileName(displayName);
  return { id: newId(), title, artist, fileName, addedAt: Date.now(), playCount: 0, source };
}

/** Lit la durée d'un fichier en le chargeant sans le jouer. */
function probeDuration(uri: string) {
  return new Promise<number>((resolve) => {
    const player = createAudioPlayer({ uri });
    let done = false;
    const finish = (value: number) => {
      if (done) return;
      done = true;
      sub.remove();
      clearTimeout(timer);
      player.remove();
      resolve(value);
    };
    const sub = player.addListener('playbackStatusUpdate', (s) => {
      if (s.isLoaded && s.duration > 0) finish(s.duration);
    });
    const timer = setTimeout(() => finish(player.duration > 0 ? player.duration : 0), 6000);
  });
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const probing = useRef(false);
  const [probeRound, setProbeRound] = useState(0);

  useEffect(() => {
    loadLibrary().then((data) => {
      setTracks(data.tracks);
      setPlaylists(data.playlists);
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      setLoaded(true);
    });
  }, []);

  // Sauvegarde automatique (regroupée pour ne pas écrire à chaque frappe).
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => saveLibrary({ tracks, playlists, settings }), 400);
    return () => clearTimeout(t);
  }, [loaded, tracks, playlists, settings]);

  const trackUri = useCallback((track: Track) => trackFile(track).uri, []);

  // Calcule les durées manquantes, un morceau à la fois.
  useEffect(() => {
    if (!loaded || probing.current) return;
    const missing = tracks.filter((t) => t.duration === undefined);
    if (missing.length === 0) return;
    probing.current = true;
    (async () => {
      for (const t of missing) {
        const duration = await probeDuration(trackFile(t).uri).catch(() => 0);
        setTracks((prev) => prev.map((x) => (x.id === t.id ? { ...x, duration } : x)));
      }
      probing.current = false;
      // Relance une passe pour les morceaux ajoutés pendant le calcul.
      setProbeRound((n) => n + 1);
    })();
  }, [loaded, tracks, probeRound]);

  const trackById = useMemo(() => new Map(tracks.map((t) => [t.id, t])), [tracks]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const updateTrack = useCallback((id: string, patch: Partial<Track>) => {
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const markPlayed = useCallback((id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, playCount: t.playCount + 1, lastPlayedAt: Date.now() } : t))
    );
  }, []);

  const deleteTracks = useCallback((ids: string[]) => {
    const gone = new Set(ids);
    setTracks((prev) => {
      prev.filter((t) => gone.has(t.id)).forEach(deleteTrackFile);
      return prev.filter((t) => !gone.has(t.id));
    });
    setPlaylists((prev) => prev.map((p) => ({ ...p, trackIds: p.trackIds.filter((id) => !gone.has(id)) })));
  }, []);

  const importFromFiles = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'video/mp4'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return 0;
    const added: Track[] = [];
    const skipped: string[] = [];
    for (const asset of res.assets) {
      if (!PLAYABLE_EXT.includes(extOf(asset.name))) {
        skipped.push(asset.name);
        continue;
      }
      const fileName = await copyIntoLibrary(asset.uri, asset.name);
      added.push(makeTrack(fileName, asset.name, 'Fichiers'));
    }
    setTracks((prev) => [...prev, ...added]);
    if (skipped.length) {
      throw new Error(`${added.length} importé(s). Format non lisible pour : ${skipped.join(', ')}`);
    }
    return added.length;
  }, []);

  const downloadUrl = useCallback(async (url: string, suggestedName?: string) => {
    const id = newId();
    const label = suggestedName || url.replace(/^https?:\/\//, '').slice(0, 60);
    setDownloads((d) => [{ id, label, progress: 0, status: 'downloading' }, ...d]);
    const patch = (p: Partial<Download>) => setDownloads((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));
    try {
      const { fileName, displayName } = await downloadIntoLibrary(url, (progress) => patch({ progress }), suggestedName);
      const track = makeTrack(fileName, displayName, url);
      setTracks((prev) => [...prev, track]);
      patch({ status: 'done', progress: 1, label: track.artist ? `${track.artist} - ${track.title}` : track.title });
    } catch (e) {
      patch({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const clearFinishedDownloads = useCallback(() => {
    setDownloads((d) => d.filter((x) => x.status === 'downloading'));
  }, []);

  const createPlaylist = useCallback((name: string, trackIds: string[] = []) => {
    const id = newId();
    const now = Date.now();
    setPlaylists((prev) => [...prev, { id, name: name.trim() || 'Nouvelle playlist', trackIds, createdAt: now, updatedAt: now }]);
    return id;
  }, []);

  const editPlaylist = useCallback((id: string, fn: (p: Playlist) => Partial<Playlist>) => {
    setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...p, ...fn(p), updatedAt: Date.now() } : p)));
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => editPlaylist(id, () => ({ name })), [editPlaylist]);

  const deletePlaylist = useCallback((id: string) => setPlaylists((prev) => prev.filter((p) => p.id !== id)), []);

  const addToPlaylist = useCallback(
    (id: string, trackIds: string[]) => editPlaylist(id, (p) => ({ trackIds: [...p.trackIds, ...trackIds] })),
    [editPlaylist]
  );

  const removeFromPlaylist = useCallback(
    (id: string, index: number) => editPlaylist(id, (p) => ({ trackIds: p.trackIds.filter((_, i) => i !== index) })),
    [editPlaylist]
  );

  const movePlaylistTrack = useCallback(
    (id: string, from: number, to: number) =>
      editPlaylist(id, (p) => {
        if (to < 0 || to >= p.trackIds.length) return {};
        const ids = [...p.trackIds];
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        return { trackIds: ids };
      }),
    [editPlaylist]
  );

  const value: LibraryContextValue = {
    loaded,
    tracks,
    trackById,
    playlists,
    settings,
    downloads,
    updateSettings,
    updateTrack,
    deleteTracks,
    markPlayed,
    importFromFiles,
    downloadUrl,
    clearFinishedDownloads,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    addToPlaylist,
    removeFromPlaylist,
    movePlaylistTrack,
    trackUri,
  };

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary doit être utilisé dans LibraryProvider');
  return ctx;
}
