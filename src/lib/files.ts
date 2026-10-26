import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { Playlist, Settings, Track } from './types';

/** Formats lisibles par le lecteur iOS. */
export const PLAYABLE_EXT = ['mp3', 'm4a', 'aac', 'mp4', 'wav', 'aif', 'aiff', 'caf', 'flac', 'alac'];
const AUDIO_URL = new RegExp(`\\.(${PLAYABLE_EXT.join('|')})(\\?|#|$)`, 'i');

const MIME_EXT: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aiff': 'aiff',
  'video/mp4': 'mp4',
};

export const newId = () => Crypto.randomUUID();

export const musicDir = () => new Directory(Paths.document, 'music');
const dbFile = () => new File(Paths.document, 'library.json');

export function ensureMusicDir() {
  const dir = musicDir();
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
}

export function trackFile(track: Track) {
  return new File(musicDir(), track.fileName);
}

export function extOf(name: string) {
  const m = /\.([a-z0-9]{2,5})$/i.exec(name.split(/[?#]/)[0]);
  return m ? m[1].toLowerCase() : '';
}

export function looksLikeAudioUrl(url: string) {
  return AUDIO_URL.test(url);
}

export type LibraryData = { tracks: Track[]; playlists: Playlist[]; settings?: Partial<Settings> };

export async function loadLibrary(): Promise<LibraryData> {
  ensureMusicDir();
  const f = dbFile();
  if (!f.exists) return { tracks: [], playlists: [] };
  try {
    const data = JSON.parse(await f.text()) as LibraryData;
    // On oublie les morceaux dont le fichier a disparu.
    const tracks = (data.tracks ?? []).filter((t) => trackFile(t).exists);
    return { tracks, playlists: data.playlists ?? [], settings: data.settings };
  } catch {
    return { tracks: [], playlists: [] };
  }
}

export async function saveLibrary(data: LibraryData) {
  const f = dbFile();
  if (!f.exists) f.create({ intermediates: true });
  await f.write(JSON.stringify(data));
}

/** Copie un fichier choisi dans l'app Fichiers vers la bibliothèque. */
export async function copyIntoLibrary(sourceUri: string, originalName: string) {
  ensureMusicDir();
  const ext = extOf(originalName) || 'mp3';
  const fileName = `${newId()}.${ext}`;
  await new File(sourceUri).copy(new File(musicDir(), fileName));
  return fileName;
}

function filenameFromDisposition(header: string | null) {
  if (!header) return '';
  const star = /filename\*\s*=\s*[^']*''([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/"/g, ''));
    } catch {}
  }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : '';
}

function filenameFromUrl(url: string) {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return decodeURIComponent(last);
  } catch {
    return '';
  }
}

/** Télécharge un fichier audio depuis une URL et renvoie le nom de fichier + un nom lisible. */
export async function downloadIntoLibrary(
  url: string,
  onProgress: (fraction: number) => void,
  suggestedName?: string
) {
  ensureMusicDir();
  let displayName = suggestedName || '';
  let ext = extOf(suggestedName ?? '');

  try {
    const head = await fetch(url, { method: 'HEAD' });
    const type = (head.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (type.startsWith('text/html')) {
      throw new Error("Ce lien mène à une page web, pas à un fichier audio. Ouvre-le dans l'onglet Navigateur.");
    }
    const fromHeader = filenameFromDisposition(head.headers.get('content-disposition'));
    if (fromHeader) {
      displayName = displayName || fromHeader;
      ext = ext || extOf(fromHeader);
    }
    ext = ext || MIME_EXT[type] || '';
  } catch (e) {
    // Certains serveurs refusent HEAD : on tente quand même le téléchargement.
    if (e instanceof Error && e.message.startsWith('Ce lien')) throw e;
  }

  const fromUrl = filenameFromUrl(url);
  displayName = displayName || fromUrl || 'Morceau téléchargé';
  ext = ext || extOf(fromUrl) || 'mp3';
  if (!PLAYABLE_EXT.includes(ext)) {
    throw new Error(`Format .${ext} non lisible sur iPhone. Choisis MP3 ou M4A sur le site.`);
  }

  const fileName = `${newId()}.${ext}`;
  const dest = new File(musicDir(), fileName);
  await File.downloadFileAsync(url, dest, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      if (totalBytes > 0) onProgress(bytesWritten / totalBytes);
    },
  });
  if ((dest.size ?? 0) < 10 * 1024) {
    dest.delete();
    throw new Error("Le fichier reçu est vide ou trop petit (le lien a peut-être expiré).");
  }
  return { fileName, displayName, size: dest.size ?? 0 };
}

export function deleteTrackFile(track: Track) {
  try {
    const f = trackFile(track);
    if (f.exists) f.delete();
  } catch {}
}

export function librarySize(tracks: Track[]) {
  let total = 0;
  for (const t of tracks) {
    try {
      total += trackFile(t).size ?? 0;
    } catch {}
  }
  return total;
}
