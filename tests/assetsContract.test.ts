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

const production = Object.entries(manifest.assets).filter(
  (entry): entry is [string, ProductionAsset] => isProduction(entry[1]),
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
  });
});

test('M6A: provenance ledger is ready for production rows', () => {
  const provenance = readFileSync(join(repoRoot, 'docs/assets/ART-PROVENANCE.md'), 'utf8');
  assert.match(provenance, /\| Asset key \| Local path \|/);
  assert.ok(!provenance.includes('| example |'));
});
