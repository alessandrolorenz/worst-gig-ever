/** M6A Pack 1 manifest, prompt, and provenance contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface ProductionAsset {
  path: string;
  kind: string;
  width: number;
  height: number;
  transparency: 'opaque' | 'transparent';
  prompt: string;
  requiredForMvp: boolean;
  requiredForM6B: boolean;
}

interface AliasAsset {
  aliasOf: string;
  kind: string;
  requiredForMvp: boolean;
  deprecated: true;
}

type AssetEntry = ProductionAsset | AliasAsset;

interface Manifest {
  version: number;
  assets: Record<string, AssetEntry>;
  audio: Record<string, unknown>;
}

const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
) as Manifest;

function isProduction(entry: AssetEntry): entry is ProductionAsset {
  return 'path' in entry;
}

const allProduction = Object.entries(manifest.assets).filter(
  (entry): entry is [string, ProductionAsset] => isProduction(entry[1]),
);

/**
 * Pack 1 is the M6A contract these tests exist to freeze, and it is identified
 * by its prompt family. Later packs register alongside it in the same manifest
 * — M18's drink sequence is the first — and must not silently change Pack 1's
 * counts, so they are split out here and asserted on their own terms below.
 */
const production = allProduction.filter(([, entry]) =>
  entry.prompt.startsWith('prompts/assets/'),
);
const laterPacks = allProduction.filter(
  ([, entry]) => !entry.prompt.startsWith('prompts/assets/'),
);

test('M6A: Pack 1 has exactly 33 required and two optional production files', () => {
  const required = production.filter(([, entry]) => entry.requiredForM6B);
  const optional = production.filter(([, entry]) => !entry.requiredForM6B);
  assert.equal(production.length, 35);
  assert.equal(required.length, 33);
  assert.deepEqual(
    optional.map(([key]) => key).sort(),
    ['dustPuff', 'whiskeyBottle'],
  );
  for (const [, entry] of production) {
    assert.equal(entry.requiredForMvp, entry.requiredForM6B);
  }
});

test('M6A: every production file has one canonical path and complete validation metadata', () => {
  const paths = production.map(([, entry]) => entry.path);
  assert.equal(new Set(paths).size, paths.length);
  for (const [key, entry] of production) {
    assert.ok(entry.path.startsWith('assets/art/'), `${key} is outside assets/art`);
    assert.ok(entry.path.endsWith('.png'), `${key} is not a PNG`);
    assert.ok(entry.width > 0 && entry.height > 0, `${key} has no dimensions`);
    assert.ok(['opaque', 'transparent'].includes(entry.transparency));
    assert.ok(entry.prompt.startsWith('prompts/assets/'));
    assert.ok(existsSync(join(repoRoot, entry.prompt)), `${key}: missing ${entry.prompt}`);
  }
});

test('M6A: every generation prompt names only canonical Pack 1 production paths', () => {
  const promptPaths = new Set(production.map(([, entry]) => entry.prompt));
  const canonicalPaths = new Set(production.map(([, entry]) => entry.path));
  for (const promptPath of promptPaths) {
    const prompt = readFileSync(join(repoRoot, promptPath), 'utf8');
    assert.ok(!prompt.includes('crowd_front.png'));
    assert.ok(!prompt.includes('bassist_groove.png'));
    for (const match of prompt.matchAll(/assets\/art\/[a-z0-9_./]+\.png/g)) {
      assert.ok(canonicalPaths.has(match[0]), `${promptPath}: non-canonical ${match[0]}`);
    }
  }
  for (const [, entry] of production) {
    const prompt = readFileSync(join(repoRoot, entry.prompt), 'utf8');
    assert.ok(prompt.includes(entry.path), `${entry.prompt} does not name ${entry.path}`);
  }
});

test('M18: the drink is registered as a two-frame optional effect sequence', () => {
  const drink = laterPacks.filter(([key]) => key.startsWith('mugDrink'));
  assert.deepEqual(
    drink.map(([key]) => key).sort(),
    ['mugDrinkCatch', 'mugDrinkDrink'],
    'the drink is exactly two frames — the raise frame was dropped at M18',
  );
  for (const [key, entry] of drink) {
    assert.equal(entry.kind, 'effect');
    assert.equal(entry.transparency, 'transparent');
    // Optional: the game has to run without the sequence, because it is a gag
    // on top of a mug hit and not a state the round depends on.
    assert.equal(entry.requiredForMvp, false, `${key} must not be required`);
    assert.equal(entry.requiredForM6B, false, `${key} is not Pack 1`);
    assert.ok(existsSync(join(repoRoot, entry.path)), `${key}: missing ${entry.path}`);
    assert.ok(entry.path.startsWith('assets/art/effects/'), `${key} is not an effect file`);
    assert.ok(existsSync(join(repoRoot, entry.prompt)), `${key}: missing ${entry.prompt}`);
  }
  // Both frames share one drawn box, or the arm changes size mid-gesture.
  const sizes = new Set(drink.map(([, entry]) => `${entry.width}x${entry.height}`));
  assert.equal(sizes.size, 1, 'the two drink frames must share one frame size');
});

test('M6A: legacy semantic keys are aliases, not duplicate or obsolete files', () => {
  for (const [key, entry] of Object.entries(manifest.assets)) {
    if (isProduction(entry)) continue;
    assert.equal(entry.deprecated, true, `${key} alias must be marked deprecated`);
    assert.ok(manifest.assets[entry.aliasOf], `${key}: alias target is missing`);
    assert.ok(isProduction(manifest.assets[entry.aliasOf]), `${key}: alias target has no file`);
  }
  assert.equal((manifest.assets.crowdFront as AliasAsset).aliasOf, 'crowdFront01');
  assert.equal((manifest.assets.bassistGroove as AliasAsset).aliasOf, 'bassistLoopA');
});

test('M6A: the live manifest retains the complete audio contract unchanged', () => {
  assert.deepEqual(manifest.audio, {
    musicRock01: {
      sourceMidi: 'assets/audio/music/source/rock_theme_song.mid',
      runtime: 'assets/audio/music/runtime/rock_theme_song_loop.wav',
      requiredForMvp: true,
    },
    glassBreak: {
      path: 'assets/audio/sfx/glass_breaking.wav',
      requiredForMvp: true,
    },
    stickWhoosh: {
      path: 'assets/audio/sfx/stick_whoosh.wav',
      requiredForMvp: true,
    },
    impactThwack: {
      path: 'assets/audio/sfx/impact_thwack.wav',
      requiredForMvp: false,
    },
    crowdApplause: {
      path: 'assets/audio/sfx/crowd_applause.wav',
      requiredForMvp: true,
    },
    /*
     * Both added in M16, and both `origin: 'generated'` — synthesized by a
     * committed script rather than downloaded, so there is no source page,
     * no licence to re-verify, and no author to attribute. The `generator`
     * field is the provenance: it is what a reader regenerates from, and
     * `docs/assets/AUDIO-SOURCES.md` records the SHA-256 each one reproduces.
     */
    grooveBed90: {
      runtime: 'assets/audio/music/runtime/groove_bed_90.wav',
      generator: 'scripts/make-groove-bed.mjs',
      origin: 'generated',
      tempoLockedBpm: 90,
      loopBeats: 16,
      requiredForMvp: true,
    },
    /*
     * The show's bed, added 2026-09-05. It is `requiredForMvp: true` because
     * two of the four stages play it: the rock loop it replaced is at 120 BPM
     * against a 90 BPM clock, which is the correction recorded in
     * `docs/assets/AUDIO-SOURCES.md`.
     */
    showBed90: {
      runtime: 'assets/audio/music/runtime/show_bed_90.wav',
      generator: 'scripts/make-show-bed.mjs',
      origin: 'generated',
      tempoLockedBpm: 90,
      loopBeats: 32,
      requiredForMvp: true,
    },
    beatClick: {
      path: 'assets/audio/sfx/beat_click.wav',
      generator: 'scripts/make-beat-click.mjs',
      origin: 'generated',
      requiredForMvp: true,
    },
    mugDrink: {
      path: 'assets/audio/sfx/mug_drink.wav',
      generator: 'scripts/make-mug-gulp.mjs',
      origin: 'generated',
      requiredForMvp: false,
    },
  });
});

test('M16: every generated audio asset names the script that produces it', () => {
  /*
   * The whole provenance story for a generated file. A downloaded asset is
   * traceable through a source page and a licence; a generated one is
   * traceable only through the script, so an entry that claims
   * `origin: 'generated'` without naming a generator is an asset nobody can
   * verify or reproduce.
   */
  const audio = manifest.audio as Record<string, Record<string, unknown>>;
  const generated = Object.entries(audio).filter(([, entry]) => entry.origin === 'generated');
  assert.ok(generated.length > 0, 'M16 added generated audio; the manifest lost it');

  for (const [key, entry] of generated) {
    const generator = entry.generator;
    assert.equal(typeof generator, 'string', `${key} claims to be generated by nothing`);
    assert.ok(
      existsSync(join(repoRoot, generator as string)),
      `${key}: generator ${String(generator)} does not exist`,
    );
    const path = (entry.path ?? entry.runtime) as string | undefined;
    assert.ok(path !== undefined, `${key} has no file path`);
    assert.ok(existsSync(join(repoRoot, path)), `${key}: ${path} is not on disk`);
  }
});

test('M6A: provenance ledger is ready for production rows', () => {
  const provenance = readFileSync(join(repoRoot, 'docs/assets/ART-PROVENANCE.md'), 'utf8');
  assert.match(provenance, /\| Asset key \| Local path \|/);
  assert.ok(!provenance.includes('| example |'));
});

test('M6B: every required Pack 1 file is statically registered for Metro', () => {
  const registry = readFileSync(join(repoRoot, 'game/rendering/artAssets.ts'), 'utf8');
  for (const [key, entry] of production.filter(([, asset]) => asset.requiredForM6B)) {
    const runtimePath = `../../${entry.path}`;
    assert.ok(registry.includes(runtimePath), `${key}: runtime registry is missing ${runtimePath}`);
  }
});

test('M6B: the art renderer preserves the input boundary and hides graybox debug by default', () => {
  const renderer = readFileSync(join(repoRoot, 'game/rendering/SceneRenderer.tsx'), 'utf8');
  assert.match(renderer, /pointerEvents="none"/);
  assert.match(renderer, /SHOW_GRAYBOX_DEBUG = false/);
  assert.ok(!renderer.includes('placeholderLabel'));
  // The tap-radius ring and the danger line are the same family of tuning aid,
  // and neither may leak into a scene that is now carrying final art.
  assert.match(renderer, /SHOW_GRAYBOX_DEBUG && <DangerLine \/>/);
});
