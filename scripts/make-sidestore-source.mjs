// Génère apps.json, la « source » SideStore qui pointe vers le .ipa de cette compilation.
// Usage : node scripts/make-sidestore-source.mjs <ipa> <info.json> <build> <repo> <tag>
import { readFileSync, statSync, writeFileSync } from 'node:fs';

const [ipaPath, infoPath, build, repo, tag] = process.argv.slice(2);
if (!tag) {
  console.error('Usage: make-sidestore-source.mjs <ipa> <info.json> <build> <repo> <tag>');
  process.exit(1);
}

const info = JSON.parse(readFileSync(infoPath, 'utf8'));
const app = JSON.parse(readFileSync('app.json', 'utf8')).expo;

// SideStore vérifie que les autorisations annoncées correspondent à celles de l'app.
const privacy = Object.fromEntries(Object.entries(info).filter(([key]) => /^NS\w+UsageDescription$/.test(key)));

const version = info.CFBundleShortVersionString;
const raw = `https://raw.githubusercontent.com/${repo}/main`;
const downloadURL = `https://github.com/${repo}/releases/download/${tag}/HorsTension.ipa`;
const size = statSync(ipaPath).size;
const date = new Date().toISOString();

const source = {
  name: 'Hors Tension',
  subtitle: 'Ma musique hors ligne',
  iconURL: `${raw}/assets/icon.png`,
  tintColor: '#FF4D6D',
  nsfw: false,
  apps: [
    {
      name: app.name,
      bundleIdentifier: app.ios.bundleIdentifier,
      developerName: repo.split('/')[0],
      subtitle: 'Musique hors ligne',
      localizedDescription: 'Bibliothèque musicale hors ligne : playlists, tri, lecture écran verrouillé.',
      iconURL: `${raw}/assets/icon.png`,
      tintColor: '#FF4D6D',
      category: 'entertainment',
      appPermissions: { entitlements: [], privacy },
      versions: [
        {
          version,
          buildVersion: String(build),
          date,
          localizedDescription: `Compilation #${build}`,
          downloadURL,
          size,
          minOSVersion: info.MinimumOSVersion,
        },
      ],
      // Champs de l'ancien format, gardés pour les versions plus anciennes de SideStore.
      version,
      versionDate: date,
      downloadURL,
      size,
    },
  ],
  news: [],
};

writeFileSync('apps.json', JSON.stringify(source, null, 2));
console.log(`apps.json : version ${version} (${build}), ${size} octets, autorisations : ${Object.keys(privacy).join(', ') || 'aucune'}`);
