/** Production contract for the one new final-result illustration. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const relativeAsset = 'assets/art/results/gig_payout.png';
const assetPath = join(repoRoot, relativeAsset);

test('final result art: runtime asset has the documented production dimensions', () => {
  const png = readFileSync(assetPath);
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 675);
  assert.equal(statSync(assetPath).size, 1_328_947);
});

test('final result art: registry uses one static semantic require', () => {
  const registry = readFileSync(join(repoRoot, 'game/rendering/artAssets.ts'), 'utf8');
  assert.match(
    registry,
    /RESULT_ART\s*=\s*\{\s*\n\s* gigPayout:\s*require\('\.\.\/\.\.\/assets\/art\/results\/gig_payout\.png'\),\s*\n\} as const;/,
  );
  assert.equal((registry.match(/assets\/art\/results\/gig_payout\.png/g) ?? []).length, 1);
});

test('final result art: provenance records origin, references, conditioning, and checksum', () => {
  const provenance = readFileSync(
    join(repoRoot, 'docs/assets/FINAL-RESULT-ART-PROVENANCE.md'),
    'utf8',
  );
  for (const required of [
    relativeAsset,
    '2026-09-08',
    'specifically for Worst Gig Ever',
    'OpenAI built-in image generation',
    'assets/art/story/04_performance.jpg',
    'assets/art/band/vocalist_loop_a.png',
    'assets/art/band/bassist_idle.png',
    'assets/art/band/guitarist_idle.png',
    'assets/art/backgrounds/stage_bg_base.png',
    '1200 × 675',
    '1,328,947 bytes',
    '9e3bd3270a6e13f463dd8a19074cafe3db95311752d879d703227bd5e9a859f1',
    'No third-party source artwork',
  ]) {
    assert.ok(provenance.includes(required), `provenance is missing: ${required}`);
  }
});
