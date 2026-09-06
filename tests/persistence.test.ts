/**
 * M22 — local memory, and the rule it is most likely to break.
 *
 * Source of truth: docs/specs/M22-local-memory-and-sharing.md
 *
 * From M15, restated in the V2 plan and not negotiable:
 *
 * > **Session progress must never gate a cold start. Persistence records what
 * > happened; it does not lock anything.**
 *
 * Storage is exactly the thing that makes locking feel fair, so most of what
 * follows is hostile input handed to the parser followed by the question "is
 * the game still playable" — asked for a truncated file, a file from a future
 * version, a file full of the wrong types, and a file that is not JSON at all.
 *
 * Nothing here touches a disk. That is `storage.ts`, and it is thin on purpose.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SAVE_FILE_NAME,
  SCHEMA_VERSION,
  emptySave,
  parseSave,
  serializeSave,
} from '../game/state/persistence.ts';
import {
  emptyRecords,
  hasAnyRecord,
  recordFor,
  recordRound,
  type Records,
} from '../game/state/records.ts';
import { STAGES, clampStageIndex } from '../game/levels/stages.ts';
import {
  createAppFlow,
  isStageCleared,
  startStage,
  currentStage,
} from '../game/state/appFlow.ts';
import { SETLIST_SLOTS } from '../game/audio/setlist.ts';
import { availableTracks } from '../game/audio/musicCatalogue.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import { format, placeholdersIn } from '../game/i18n/format.ts';
import { PRODUCT_TITLE } from '../game/config/product.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// A best only ever rises
// ---------------------------------------------------------------------------

const STAGE_ONE = STAGES[0].id;
const STAGE_THREE = STAGES[2].id;

test('M22: a record only ever goes up', () => {
  let records: Records = emptyRecords();
  assert.equal(hasAnyRecord(records), false);

  records = recordRound(records, STAGE_ONE, { defenseScore: 120, grooveScore: null }).records;
  assert.equal(recordFor(records, STAGE_ONE).defenseScore, 120);

  // A worse run changes nothing, and says so.
  const worse = recordRound(records, STAGE_ONE, { defenseScore: 40, grooveScore: null });
  assert.equal(worse.beatDefense, false);
  assert.equal(recordFor(worse.records, STAGE_ONE).defenseScore, 120);
  assert.equal(worse.records, records, 'an unchanged record must not make a new object');

  const better = recordRound(records, STAGE_ONE, { defenseScore: 121, grooveScore: null });
  assert.equal(better.beatDefense, true);
  assert.equal(recordFor(better.records, STAGE_ONE).defenseScore, 121);
});

test('M22: a stage that never scored a Groove has no Groove record', () => {
  // Null rather than 0, for the reason the results screen prints no Groove
  // column on a defense-only stage: a zero claims a failure at a job the stage
  // never gave (M15).
  const records = recordRound(emptyRecords(), STAGE_ONE, {
    defenseScore: 50,
    grooveScore: null,
  }).records;
  assert.equal(recordFor(records, STAGE_ONE).grooveScore, null);
});

test('M22: a defense-only run cannot erase a Groove best set earlier', () => {
  /*
   * Reachable, because no stage is locked and nothing stops a player replaying
   * one. The Groove best has to survive a run that did not score one.
   */
  let records = recordRound(emptyRecords(), STAGE_THREE, {
    defenseScore: 100,
    grooveScore: 900,
  }).records;

  records = recordRound(records, STAGE_THREE, { defenseScore: 200, grooveScore: null }).records;

  assert.equal(recordFor(records, STAGE_THREE).defenseScore, 200, 'the better Defense counts');
  assert.equal(recordFor(records, STAGE_THREE).grooveScore, 900, 'and the Groove best survives');
});

test('M22: a stage never finished reads as zero rather than as missing', () => {
  const record = recordFor(emptyRecords(), STAGE_ONE);
  assert.equal(record.defenseScore, 0);
  assert.equal(record.grooveScore, null);
});

// ---------------------------------------------------------------------------
// Whatever is on disk
// ---------------------------------------------------------------------------

/** Every way a save has of being wrong that this module promises to survive. */
const HOSTILE_SAVES: Array<[string, string | null]> = [
  ['nothing written yet', null],
  ['an empty file', ''],
  ['whitespace', '   \n  '],
  ['not JSON at all', 'this is not json {{{'],
  ['a truncated write', '{"schemaVersion":1,"records":{"stage-1-def'],
  ['JSON that is not an object', '[1,2,3]'],
  ['JSON null', 'null'],
  ['a bare number', '42'],
  ['a string', '"hello"'],
  ['an empty object', '{}'],
  ['a version from the future', '{"schemaVersion":999,"somethingNew":true}'],
  ['every field the wrong type', '{"schemaVersion":"x","records":7,"bestStageCleared":"nope","clickEnabled":"yes","locale":12}'],
  ['records that are not objects', '{"records":{"stage-1-defense":"nope"}}'],
  ['a stage that does not exist', '{"records":{"stage-99-imaginary":{"defenseScore":5}}}'],
  ['negative and non-finite scores', '{"records":{"stage-1-defense":{"defenseScore":-5,"grooveScore":1e999}}}'],
  ['a locale that does not exist', '{"locale":"klingon"}'],
  ['bestStageCleared far below the floor', '{"bestStageCleared":-9999}'],
  ['bestStageCleared far above the top', '{"bestStageCleared":9999}'],
  ['a prototype pollution attempt', '{"__proto__":{"polluted":true},"constructor":"x"}'],
  ['deep nesting', `{"records":${'['.repeat(40)}${']'.repeat(40)}}`],
];

test('M22: the parser never throws, whatever the file says', () => {
  for (const [name, raw] of HOSTILE_SAVES) {
    assert.doesNotThrow(() => parseSave(raw), `${name} threw`);
  }
});

test('M22: no save, however broken, can stop a stage being played', () => {
  /*
   * The milestone's whole risk, asserted directly. For every hostile file: the
   * game builds a flow from it, every stage is selectable, and picking one puts
   * the player in front of it.
   */
  for (const [name, raw] of HOSTILE_SAVES) {
    const parsed = parseSave(raw);
    const flow = createAppFlow();
    flow.bestStageCleared = parsed.state.bestStageCleared;
    flow.clickEnabled = parsed.state.clickEnabled;

    for (let index = 0; index < STAGES.length; index += 1) {
      startStage(flow, index);
      assert.equal(flow.screen, 'BRIEFING', `${name}: stage ${index} did not open`);
      assert.equal(flow.stageIndex, index, `${name}: stage ${index} was redirected`);
      assert.equal(currentStage(flow).id, STAGES[index].id, `${name}: wrong stage`);
    }
  }
});

test('M22: a corrupt save cannot invent progress or lose the floor', () => {
  const high = parseSave('{"bestStageCleared":9999}');
  // Nothing is gated on it, so the high end needs no clamp — but it must still
  // be a number the tick-mark logic can use without crashing.
  assert.ok(Number.isFinite(high.state.bestStageCleared));
  assert.equal(isStageCleared(createAppFlow(), 0), false, 'a fresh flow has cleared nothing');

  const low = parseSave('{"bestStageCleared":-9999}');
  assert.equal(low.state.bestStageCleared, -1, 'the floor is "nothing cleared"');

  const fractional = parseSave('{"bestStageCleared":1.9}');
  assert.equal(fractional.state.bestStageCleared, 1, 'an index is a whole number');
});

test('M22: bad scores fall back without taking the rest of the save with them', () => {
  const parsed = parseSave(
    '{"clickEnabled":false,"records":{"stage-1-defense":{"defenseScore":-5,"grooveScore":"x"}}}',
  );
  const record = recordFor(parsed.state.records, STAGE_ONE);
  assert.equal(record.defenseScore, 0, 'a negative score is not a score');
  assert.equal(record.grooveScore, 0, 'a non-numeric Groove score falls back');
  assert.equal(parsed.state.clickEnabled, false, 'and the good field beside it survived');
});

test('M22: a stage this build does not know about is dropped, not kept', () => {
  const parsed = parseSave('{"records":{"stage-99-imaginary":{"defenseScore":5}}}');
  assert.deepEqual(Object.keys(parsed.state.records), [], 'a record needs a stage to belong to');
});

test('M22: an unreadable file is reported so it is not overwritten', () => {
  // The distinction that matters: absent is normal, corrupt is evidence.
  assert.equal(parseSave(null).unreadable, false, 'a fresh install is not a corruption');
  assert.equal(parseSave('').unreadable, false);
  assert.equal(parseSave('not json').unreadable, true);
  assert.equal(parseSave('[1,2]').unreadable, true);
});

// ---------------------------------------------------------------------------
// Forwards and backwards
// ---------------------------------------------------------------------------

test('M22: the schema is versioned from the first write', () => {
  // A file with no version can only ever be discarded, and discarding is what
  // this module exists to stop doing.
  const written = JSON.parse(serializeSave(emptySave())) as { schemaVersion: unknown };
  assert.equal(written.schemaVersion, SCHEMA_VERSION);
  assert.equal(typeof written.schemaVersion, 'number');
});

test('M22: fields from a newer build survive a round trip through this one', () => {
  const future = JSON.stringify({
    schemaVersion: 99,
    clickEnabled: false,
    somethingNew: { deep: [1, 2, 3] },
    anotherThing: 'kept',
  });

  const parsed = parseSave(future);
  assert.deepEqual(parsed.unknown, { somethingNew: { deep: [1, 2, 3] }, anotherThing: 'kept' });

  const rewritten = JSON.parse(serializeSave(parsed.state, parsed.unknown)) as Record<
    string,
    unknown
  >;
  assert.deepEqual(rewritten.somethingNew, { deep: [1, 2, 3] }, 'an older build must not delete it');
  assert.equal(rewritten.anotherThing, 'kept');
  assert.equal(rewritten.clickEnabled, false, 'and what it does understand still round-trips');
  assert.equal(rewritten.schemaVersion, SCHEMA_VERSION, 'written at the version that wrote it');
});

test('M22: a known field always wins over a stale one of the same name', () => {
  // `unknown` is spread first in `serializeSave`. If a future build moved a
  // field out of the known set and back, the current value must still win.
  const written = JSON.parse(
    serializeSave({ ...emptySave(), clickEnabled: false }, { clickEnabled: true } as never),
  ) as { clickEnabled: unknown };
  assert.equal(written.clickEnabled, false);
});

test('M22: a prototype pollution attempt does not reach the passthrough', () => {
  /*
   * `JSON.parse` can produce an own `__proto__` key, and copying it onto the
   * passthrough with `unknown[key] = value` replaces that object's prototype
   * instead of adding a property. Caught by writing this test, which failed
   * before `NEVER_CARRIED` existed.
   */
  for (const raw of [
    '{"__proto__":{"polluted":true},"records":{}}',
    '{"records":{},"__proto__":{"polluted":true}}',
    '{"constructor":{"polluted":true}}',
    '{"prototype":{"polluted":true}}',
  ]) {
    const parsed = parseSave(raw);
    assert.deepEqual(Object.keys(parsed.unknown), [], raw);
    assert.equal(
      Object.getPrototypeOf(parsed.unknown),
      Object.prototype,
      `${raw} replaced the passthrough's prototype`,
    );
    assert.equal(JSON.parse(serializeSave(parsed.state, parsed.unknown)).polluted, undefined);
  }

  assert.equal(({} as Record<string, unknown>).polluted, undefined, 'Object.prototype is clean');
});

test('M22: a full save survives a round trip unchanged', () => {
  const records = recordRound(emptyRecords(), STAGE_THREE, {
    defenseScore: 340,
    grooveScore: 1200,
  }).records;

  const original = {
    schemaVersion: SCHEMA_VERSION,
    records,
    bestStageCleared: 2,
    clickEnabled: false,
    locale: 'pt-BR',
    /* Every field, so a new one added without a round trip fails here (M24C). */
    customSetlist: availableTracks(true).slice(0, SETLIST_SLOTS),
  } as const;

  const parsed = parseSave(serializeSave(original));
  assert.deepEqual(parsed.state, original);
  assert.equal(parsed.unreadable, false);
});

// ---------------------------------------------------------------------------
// The saved custom setlist (M24C)
// ---------------------------------------------------------------------------

test('M24C: a fresh save has no setlist and does not pretend to', () => {
  const empty = emptySave();
  assert.equal(empty.customSetlist, null, 'a fresh install came with a setlist');
  assert.equal(
    parseSave(null).state.customSetlist,
    null,
    'no file on disk produced a setlist',
  );
  assert.equal(
    parseSave('not json at all').state.customSetlist,
    null,
    'an unreadable file produced a setlist',
  );
  // And the schema did not have to move for an additive optional field.
  assert.equal(empty.schemaVersion, 1, 'the schema was bumped without a reader needing it');
});

test('M24C: a saved setlist comes back exactly as it was written', () => {
  const chosen = availableTracks(false).slice(0, SETLIST_SLOTS);
  assert.equal(chosen.length, SETLIST_SLOTS, 'the shipping library is smaller than the show');

  const written = serializeSave({ ...emptySave(), customSetlist: chosen });
  const restored = parseSave(written).state.customSetlist;

  assert.deepEqual(restored, chosen, 'the setlist did not survive a cold start');
  assert.notEqual(restored, null);
});

test('M24C: a malformed saved setlist falls back rather than half-loading', () => {
  /*
   * Every way a setlist on disk can be wrong, and every one of them has the
   * same answer: `null`, which puts the player in front of an empty builder —
   * a state they know how to fix — rather than into a run they never built.
   *
   * Rejecting rather than repairing is the point. A three-slot setlist padded
   * out with a track nobody chose would start a gig the player did not build,
   * and it would look like the game deciding for them.
   */
  const library = availableTracks(false);
  const good = library.slice(0, SETLIST_SLOTS);

  const broken: Array<[string, unknown]> = [
    ['not an array', 'noRefunds'],
    ['an object', { 0: good[0] }],
    ['too short', good.slice(0, SETLIST_SLOTS - 1)],
    ['too long', [...good, library[SETLIST_SLOTS]]],
    ['a duplicate', [good[0], good[0], good[1], good[2]]],
    ['a bed nobody may choose', ['showBed', 'grooveBed', 'showTheme', 'showBed']],
    ['a track from a future build', [...good.slice(1), 'someTrackThisBuildHasNeverHeardOf']],
    ['a hole', [good[0], null, good[2], good[3]]],
    ['nested rubbish', [[good[0]], good[1], good[2], good[3]]],
  ];

  for (const [why, value] of broken) {
    const raw = JSON.stringify({ ...emptySave(), customSetlist: value });
    const parsed = parseSave(raw);
    assert.equal(parsed.state.customSetlist, null, `a setlist with ${why} was accepted`);
    // And it cost nothing else: the rest of the save is still readable.
    assert.equal(parsed.unreadable, false, `${why} made the whole save unreadable`);
    assert.equal(parsed.state.clickEnabled, true, `${why} took the rest of the save with it`);
  }
});

test('M24C: the setlist is a known field, so an old build cannot duplicate it', () => {
  /*
   * The passthrough is for fields this build has *no opinion* about. Now that
   * it has one, `customSetlist` must not also arrive in `unknown` — writing it
   * twice would let a stale copy win, since unknown fields are spread first.
   */
  const chosen = availableTracks(false).slice(0, SETLIST_SLOTS);
  const parsed = parseSave(JSON.stringify({ ...emptySave(), customSetlist: chosen }));
  assert.equal(
    Object.prototype.hasOwnProperty.call(parsed.unknown, 'customSetlist'),
    false,
    'the saved setlist is being carried as an unknown field as well as a known one',
  );
});

// ---------------------------------------------------------------------------
// Where the disk is allowed to be touched
// ---------------------------------------------------------------------------

function collect(dir: string, extension: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) collect(path, extension, found);
    else if (path.endsWith(extension)) found.push(path);
  }
  return found;
}

test('M22: only the adapter knows there is a disk', () => {
  const sources = [
    ...collect(join(repoRoot, 'game'), '.ts'),
    ...collect(join(repoRoot, 'game'), '.tsx'),
  ];
  const importers = sources.filter((path) =>
    readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .includes('expo-file-system'),
  );

  assert.deepEqual(
    importers.map((path) => relative(repoRoot, path)),
    ['game/state/storage.ts'],
    'the schema and its parsing stay testable in Node, which is the point of the split',
  );
});

test('M22: the save file is named for the product, not the old working title', () => {
  // docs/release/product-identity.md names storage keys and file names
  // explicitly: no new identifier may be derived from Worst Band Ever.
  assert.ok(!/worst.?band.?ever/i.test(SAVE_FILE_NAME), SAVE_FILE_NAME);
  assert.ok(SAVE_FILE_NAME.includes('worst-gig-ever'));
});

test('M22: no new dependency was added for storage or sharing', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
  };
  for (const forbidden of [
    '@react-native-async-storage/async-storage',
    'expo-sharing',
    'expo-secure-store',
    'react-native-mmkv',
  ]) {
    assert.ok(
      !(forbidden in pkg.dependencies),
      `${forbidden} is a native module for a job the existing stack already does (rule 18)`,
    );
  }
  assert.ok('expo-file-system' in pkg.dependencies, 'the storage this milestone uses');
});

// ---------------------------------------------------------------------------
// Sharing
// ---------------------------------------------------------------------------

test('M22: the share line carries the product name without translating it', () => {
  for (const [locale, strings] of allCatalogues()) {
    for (const template of [strings.share.withGroove, strings.share.defenseOnly]) {
      assert.ok(
        placeholdersIn(template).includes('title'),
        `${locale}: the share line must name the game`,
      );
      assert.ok(
        !template.includes(PRODUCT_TITLE),
        `${locale}: the product name is interpolated from the constant, never written into a catalogue`,
      );
    }

    assert.deepEqual(placeholdersIn(strings.share.withGroove).sort(), [
      'defense',
      'groove',
      'stage',
      'title',
    ]);
    assert.deepEqual(placeholdersIn(strings.share.defenseOnly).sort(), [
      'defense',
      'stage',
      'title',
    ]);
  }
});

test('M22: a shared line comes out as a sentence a person could read', () => {
  for (const [locale, strings] of allCatalogues()) {
    const message = format(strings.share.withGroove, {
      title: PRODUCT_TITLE,
      stage: strings.stages[STAGES[2].id].name,
      defense: 340,
      groove: 1200,
    });
    assert.ok(message.includes(PRODUCT_TITLE), `${locale}: no game name in the share line`);
    assert.ok(message.includes('340') && message.includes('1200'), `${locale}: no scores`);
    assert.ok(!/\{\w+\}/.test(message), `${locale}: an unfilled placeholder reached the sheet`);
  }
});

test('M22: the clamp helper agrees with the flow it protects', () => {
  // Belt and braces on the "nothing is gated" rule: whatever a save says, the
  // index it produces still lands on a real stage.
  for (const value of [-9999, -1, 0, 2, 9999, Number.NaN, Number.POSITIVE_INFINITY]) {
    const index = clampStageIndex(value);
    assert.ok(index >= 0 && index < STAGES.length, `${value} escaped the stage list`);
  }
});
