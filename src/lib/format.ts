import type { SortKey, Track } from './types';

export function formatTime(seconds?: number) {
  if (!seconds || !isFinite(seconds) || seconds < 0) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

export function formatTotal(seconds: number) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}

const JUNK_PREFIX = /^(y2mate\.\w+|yt1s\.\w+|ytmp3\.\w+|savefrom\.\w+|ssyoutube\.\w+|[\w-]+\.(com|net|io|cc|to|app))\s*[-_–]\s*/i;
const JUNK_TAGS =
  /\s*[([](official\s*(music\s*)?(video|audio|clip|lyric video)?|clip officiel|vid[ée]o officielle|lyrics?|paroles|audio|hd|hq|4k|visuali[sz]er|128\s*kbps|320\s*kbps)[^)\]]*[)\]]/gi;

/** Transforme "Artiste - Titre (Official Video).mp3" en { artist, title }. */
export function parseFileName(raw: string) {
  let base = raw;
  try {
    base = decodeURIComponent(raw);
  } catch {}
  base = base.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_/g, ' ');
  base = base.replace(JUNK_PREFIX, '').replace(JUNK_TAGS, '');
  base = base.replace(/\s{2,}/g, ' ').trim();
  const parts = base.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: '', title: base || raw };
}

const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });

export function sortTracks(tracks: Track[], key: SortKey, asc: boolean) {
  const dir = asc ? 1 : -1;
  return [...tracks].sort((a, b) => {
    let r = 0;
    switch (key) {
      case 'title':
        r = collator.compare(a.title, b.title);
        break;
      case 'artist':
        r = collator.compare(a.artist || '~', b.artist || '~') || collator.compare(a.title, b.title);
        break;
      case 'duration':
        r = (a.duration ?? 0) - (b.duration ?? 0);
        break;
      case 'playCount':
        r = a.playCount - b.playCount;
        break;
      case 'addedAt':
        r = a.addedAt - b.addedAt;
        break;
    }
    return r * dir;
  });
}

export function matchesSearch(track: Track, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return `${track.title} ${track.artist}`.toLowerCase().includes(q);
}

export function shuffled<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const SORT_LABELS: Record<SortKey, string> = {
  addedAt: "Date d'ajout",
  title: 'Titre',
  artist: 'Artiste',
  duration: 'Durée',
  playCount: 'Plus écoutés',
};
