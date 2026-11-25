import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registry = JSON.parse(readFileSync(path.join(root, 'generated/prompts.json'), 'utf8'));
const refs = {
  A: 'story/04_performance.jpg; results/gig_payout.png; props/beer_bottle.png',
  B: 'story/04_performance.jpg; results/gig_payout.png',
  B2: 'generated/source/wge-keep-the-groove-initial-portrait.png (targeted hand removal)',
  C: 'story/04_performance.jpg; results/gig_payout.png',
  D: 'story/04_performance.jpg; results/gig_payout.png; story/03_setup.jpg',
  E: 'story/04_performance.jpg; results/gig_payout.png; story/03_setup.jpg',
  F: 'results/gig_payout.png; story/04_performance.jpg',
  AL: 'generated/source/wge-hero-impossible-gig-portrait.png',
  SQ: 'generated/source/wge-gameplay-bottle-defense-portrait.png',
};
const notes = {
  A: 'Drummer keeps playing while an amber bottle flies toward him; the band performs behind him.',
  B: 'Initial groove concept has an unwanted hand holding the incoming bottle; retained for review history.',
  B2: 'Drummer splits attention between snare pulse and freely flying bottle; corrected version.',
  C: 'One stick blocks a bottle while the other keeps drumming; band plays on.',
  D: 'Drummer reaches for a mug while playing; landscape master still needs portrait recomposition.',
  E: 'Four band members consider an abstract four-line setlist; landscape master still needs portrait recomposition.',
  F: 'Exhausted band receives an envelope and another booking slip from the unfazed bar owner.',
  AL: 'Full band spread across a wide bar stage, drummer and incoming bottle central to the joke.',
  SQ: 'Square recomposition of bottle defense, contact burst and drummer action.',
};
const exports = [
  ['A', 'social/instagram/feed/01-hero.png', 1080, 1350, 'Instagram feed; Facebook'],
  ['C', 'social/instagram/feed/02-gameplay-chaos.png', 1080, 1350, 'Instagram feed; Facebook'],
  ['F', 'social/instagram/feed/05-gig-payout.png', 1080, 1350, 'Instagram feed; Facebook'],
  ['B2', 'social/instagram/feed/06-challenge.png', 1080, 1350, 'Instagram feed; Facebook'],
  ['AL', 'landing-page/hero/wge-hero-impossible-gig-landscape.png', 1920, 1080, 'Landing hero; Facebook; video header concept'],
  ['SQ', 'social/facebook/wge-gameplay-bottle-defense-square.png', 1080, 1080, 'Facebook; Instagram square; Threads; X'],
  ['D', 'landing-page/feature-art/wge-beer-break-landscape.png', 1600, 900, 'Landing feature; Facebook'],
  ['E', 'landing-page/feature-art/wge-custom-setlist-landscape.png', 1600, 900, 'Landing feature; Facebook'],
];
const entries = [];
function record(id, filename, purpose, channels) {
  const data = readFileSync(path.join(root, filename));
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  entries.push({ id, filename, purpose, dimensions: `${width}×${height}`, format: 'PNG', bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), references: refs[id], date: '2026-09-09', status: 'REVIEW', channels, description: notes[id] });
}
for (const row of registry) record(row.id, `generated/source/${row.name}.png`, 'Original built-in image generation; retained master', 'Creative review; reusable promotional art');
for (const [id, output, width, height, channels] of exports) {
  const row = registry.find(r => r.id === id);
  const target = path.join(root, output);
  mkdirSync(path.dirname(target), { recursive: true });
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(root, `generated/source/${row.name}.png`), '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x100c18,setsar=1`, '-frames:v', '1', target]);
  record(id, output, 'Art-only channel export; proportional fit, no content crop', channels);
}
writeFileSync(path.join(root, 'plans/asset-manifest.json'), JSON.stringify(entries, null, 2) + '\n');
const head = '# Asset manifest\n\nStatus: PARTIAL. All visuals REVIEW; no owner approvals recorded. Generated 2026-09-09 using the built-in image tool. Canonical paths abbreviated below are under `assets/art/`; marketing paths begin `generated/`. Exact prompts: `../generated/prompts.json`. Dimensions, bytes and hashes are measured from delivered files.\n\nChannel exports preserve the full image at its original aspect ratio. Small charcoal mattes resolve generator size differences. No art is stretched or cropped. Original generations remain intact.\n\n';
const table = '| File | Purpose | Dimensions | Format / bytes | References | Date | Status | Channels |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n' + entries.map(e => `| [${e.filename}](../${e.filename}) | ${e.purpose} | ${e.dimensions} | PNG / ${e.bytes} | ${e.references} | ${e.date} | REVIEW | ${e.channels} |`).join('\n');
const review = '\n\n## Owner review queue\n\nLeave the decision blank until the owner chooses KEEP / REVISE / REJECT. Initial B remains history, not the recommended export.\n\n| Asset | Visual description / review note | Decision |\n| --- | --- | --- |\n' + registry.map(r => `| ${r.id} — ${r.name} | ${notes[r.id]} | |`).join('\n');
const pending = '\n\n## Pending because image generation reached its usage limit\n\n- Beer and Setlist 4:5 recompositions: feed 03 and 04 are not delivered. Landscape masters are available.\n- Four distinct 1080×1920 Story/Reel compositions: not generated.\n- Six-frame drummer-survival animation: frames, animated WebP, GIF and sprite sheet are not generated. Duration/dimensions/bytes: N/A. The local Pillow installation supports animated WebP, so assembly tooling is available once frames exist.\n- No composed-text promo is supplied; all delivered art is reusable across locales.\n';
writeFileSync(path.join(root, 'plans/asset-manifest.md'), head + table + review + pending);
console.log(`Exported ${exports.length} channel assets; catalogued ${entries.length} PNG files.`);
