export type Track = {
  id: string;
  title: string;
  artist: string;
  /** Nom du fichier dans le dossier music/ (le chemin complet change entre les mises à jour iOS). */
  fileName: string;
  duration?: number;
  addedAt: number;
  playCount: number;
  lastPlayedAt?: number;
  source?: string;
};

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

export type SortKey = 'addedAt' | 'title' | 'artist' | 'duration' | 'playCount';

export type Settings = {
  sortKey: SortKey;
  sortAsc: boolean;
  browserHome: string;
};

export type Download = {
  id: string;
  label: string;
  progress: number;
  status: 'downloading' | 'done' | 'error';
  error?: string;
};

export type RepeatMode = 'off' | 'all' | 'one';
