import { ActionSheetIOS, Alert } from 'react-native';

import { useLibrary } from '../lib/library';
import { usePlayer } from '../lib/player';
import type { Track } from '../lib/types';

type Extra = { label: string; destructive?: boolean; run: () => void };

function sheet(title: string, options: string[], destructiveIndex?: number) {
  return new Promise<number>((resolve) =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options, 'Annuler'],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: destructiveIndex,
        userInterfaceStyle: 'dark',
      },
      resolve
    )
  );
}

export function prompt(title: string, defaultValue = '', message?: string) {
  return new Promise<string | null>((resolve) =>
    Alert.prompt(
      title,
      message,
      [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(null) },
        { text: 'OK', onPress: (v?: string) => resolve(v?.trim() ? v.trim() : null) },
      ],
      'plain-text',
      defaultValue
    )
  );
}

export function confirm(title: string, message: string, action: string) {
  return new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ])
  );
}

/** Menu d'actions d'un morceau (le bouton « … » ou un appui long). */
export function useTrackMenu() {
  const lib = useLibrary();
  const player = usePlayer();

  const pickPlaylist = async (trackIds: string[]) => {
    const names = lib.playlists.map((p) => p.name);
    const i = await sheet('Ajouter à une playlist', ['+ Nouvelle playlist', ...names]);
    if (i === 0) {
      const name = await prompt('Nouvelle playlist');
      if (name) lib.createPlaylist(name, trackIds);
    } else if (i > 0 && i <= names.length) {
      lib.addToPlaylist(lib.playlists[i - 1].id, trackIds);
    }
  };

  const open = async (track: Track, extra: Extra[] = []) => {
    const base = ['Lire ensuite', "Ajouter à la file d'attente", 'Ajouter à une playlist', 'Modifier le titre', "Modifier l'artiste"];
    const options = [...base, ...extra.map((e) => e.label), 'Supprimer du téléphone'];
    const destructive = options.length - 1;
    const i = await sheet(`${track.title}${track.artist ? ` — ${track.artist}` : ''}`, options, destructive);
    switch (i) {
      case 0:
        return player.playNext(track.id);
      case 1:
        return player.addToQueue(track.id);
      case 2:
        return pickPlaylist([track.id]);
      case 3: {
        const title = await prompt('Titre', track.title);
        if (title) lib.updateTrack(track.id, { title });
        return;
      }
      case 4: {
        const artist = await prompt('Artiste', track.artist);
        if (artist !== null) lib.updateTrack(track.id, { artist });
        return;
      }
      case destructive:
        if (await confirm('Supprimer ce morceau ?', 'Le fichier sera effacé du téléphone et retiré des playlists.', 'Supprimer')) {
          lib.deleteTracks([track.id]);
        }
        return;
      default:
        if (i >= base.length && i < destructive) extra[i - base.length].run();
    }
  };

  return { open, pickPlaylist };
}
