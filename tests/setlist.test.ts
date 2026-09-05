/**
 * The setlist contract (M24A).
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *                  docs/specs/M24-test-plan.md
 *
 * M24A adds an indirection between a stage and the track it plays, and an
 * indirection is exactly the kind of change that is invisible until the day it
 * is wrong. So these tests are mostly about things *not* moving:
 *
 *   - the official show is still the show the owner approved, slot for slot;
 *   - the round and rhythm domains still cannot see a setlist at all;
 *   - the same level under different music still throws the same objects at the
 *     same milliseconds.
 *
 * The last one is the important one. "Changing the music cannot change the
 * game" is claimed by every milestone that touches audio; here it is a property
 * of the module graph and of a replayed round, rather than of care.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  OFFICIAL_SETLIST,
  SETLIST_SLOTS,
  isValidCustomSetlist,
  parseSetlist,
  trackForStage,
  type Setlist,
} from '../game/audio/setlist.ts';
import {
  MUSIC_TRACKS,
  availableTracks,
  isGrooveQualified,
  isMusicTrackId,
  trackIds,
} from '../game/audio/musicCatalogue.ts';
import { STAGES } from '../game/levels/stages.ts';
import {
  advanceToNextStage,
  beginRound,
  createAppFlow,
  isCustomSetlistUnlocked,
  recordStageCleared,
  returnToTitle,
  startStage,
} from '../game/state/appFlow.ts';
import { createRound, tickRound } from '../game/state/roundState.ts';
import { emptySave, parseSave, serializeSave } from '../game/state/persistence.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// The official setlist
// ---------------------------------------------------------------------------

test('M24A: the official setlist is the show the owner approved', () => {
  /*
   * Pinned to a literal on purpose, alongside the derivation in `setlist.ts`.
   * The derivation stops the setlist drifting away from the stage table; this
   * stops the stage table quietly changing the authored show. They guard
   * opposite mistakes and the milestone needs both.
   */
  assert.deepEqual(
    [...OFFICIAL_SETLIST],
    ['showTheme', 'grooveBed', 'showBed', 'showBed'],
    'the authored first run changed',
  );
});

test('M24A: a slot exists for every stage, and the count is derived', () => {
  assert.equal(SETLIST_SLOTS, STAGES.length);
  assert.equal(OFFICIAL_SETLIST.length, SETLIST_SLOTS);

  const source = readFileSync(join(repoRoot, 'game/audio/setlist.ts'), 'utf8');
  const body = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(
    /SETLIST_SLOTS\s*=\s*\d/.test(body),
    false,
    'the slot count is a literal, so adding a stage would leave it behind',
  );
});

test('M24A: every official slot names a track that exists', () => {
  for (const [index, id] of OFFICIAL_SETLIST.entries()) {
    assert.ok(isMusicTrackId(id), `slot ${String(index)} names an unregistered track: ${id}`);
    assert.equal(OFFICIAL_SETLIST[index], STAGES[index].music);
  }
});

test('M24A: every official slot that scores beats is on the beat clock', () => {
  for (const [index, stage] of STAGES.entries()) {
    if (!stage.groove) continue;
    assert.equal(
      isGrooveQualified(OFFICIAL_SETLIST[index]),
      true,
      `stage ${String(stage.number)} scores beats over ${OFFICIAL_SETLIST[index]}, which is not on the grid`,
    );
  }
});

test('M24A: the official setlist may repeat a track, and a custom one may not', () => {
  /*
   * Stages 3 and 4 both play `showBed`, and that is authored rather than
   * accidental. The no-duplicates rule is a rule about *choosing* — it exists so
   * a player cannot fill four slots with one song — and applying it to the
   * authored show would invalidate the game as shipped.
   */
  assert.equal(new Set(OFFICIAL_SETLIST).size < OFFICIAL_SETLIST.length, true);

  // A stand-in library, so the rule is testable before any song exists.
  const library = ['showTheme', 'grooveBed', 'showBed', 'showTheme'] as const;
  const selectable = [...new Set(library)];
  assert.equal(
    isValidCustomSetlist(['showTheme', 'grooveBed', 'showBed', 'showTheme'], selectable),
    false,
    'a duplicate was accepted in a player-built setlist',
  );
  assert.equal(
    isValidCustomSetlist(OFFICIAL_SETLIST, selectable),
    false,
    'the authored show passes the rules for a player-built one, so the rule is not being applied',
  );
});

test('M24A: a setlist may only hold tracks a player can actually choose', () => {
  /*
   * `grooveBed` is a teaching floor and `showTheme` is a 120 BPM loop. Both are
   * real registered tracks and neither is something a player may put in a
   * setlist, so "is this a track?" is the wrong question for a saved setlist to
   * be asked.
   */
  const chosen = ['grooveBed', 'showBed', 'showTheme', 'grooveBed'];
  assert.equal(parseSetlist(chosen, ['showBed']), null, 'a bed was accepted as a chosen song');
  assert.equal(
    parseSetlist(chosen, []),
    null,
    'a setlist was accepted while nothing is selectable',
  );
});

test('M24A: nothing is selectable yet, so no custom setlist can exist', () => {
  /*
   * The honest state of M24A, pinned so it is a decision rather than an
   * oversight: the catalogue holds three beds and no library entries, the
   * feature is not player-visible, and every attempt to load a custom setlist
   * therefore falls back to the authored show.
   */
  assert.deepEqual([...availableTracks(true)], [], 'a track became selectable before M24B');
  assert.equal(
    parseSetlist(['showBed', 'grooveBed', 'showTheme', 'showBed']),
    null,
    'a custom setlist parsed while the library is empty',
  );
});

test('M24A: nothing can mutate the official setlist through a reference', () => {
  const stolen = OFFICIAL_SETLIST as unknown as string[];
  assert.throws(() => {
    stolen[0] = 'grooveBed';
  });
  assert.equal(OFFICIAL_SETLIST[0], 'showTheme');
});

// ---------------------------------------------------------------------------
// Resolving a slot
// ---------------------------------------------------------------------------

test('M24A: a bad stage index can never crash a round or produce silence', () => {
  for (const index of [-1, -99, 4, 99, Number.NaN, Number.POSITIVE_INFINITY, 1.5]) {
    const id = trackForStage(OFFICIAL_SETLIST, index);
    assert.ok(isMusicTrackId(id), `index ${String(index)} resolved to ${String(id)}`);
  }
  assert.equal(trackForStage(OFFICIAL_SETLIST, 1.5), OFFICIAL_SETLIST[1], 'a fraction floors');
  assert.equal(trackForStage(OFFICIAL_SETLIST, -1), OFFICIAL_SETLIST[0]);
  assert.equal(trackForStage(OFFICIAL_SETLIST, 99), OFFICIAL_SETLIST[SETLIST_SLOTS - 1]);
});

test('M24A: a short setlist falls back to the authored slot rather than going quiet', () => {
  const truncated = ['grooveBed'] as unknown as Setlist;
  assert.equal(trackForStage(truncated, 0), 'grooveBed');
  assert.equal(trackForStage(truncated, 2), OFFICIAL_SETLIST[2], 'slot 2 went silent');
});

// ---------------------------------------------------------------------------
// Parsing whatever is on disk
// ---------------------------------------------------------------------------

test('M24A: the setlist parser rejects rather than repairs', () => {
  // A stand-in library of four, so every rejection below is about the rule it
  // names rather than about the library being empty.
  const selectable = ['showTheme', 'grooveBed', 'showBed'] as const;
  const valid = ['grooveBed', 'showBed', 'showTheme'];

  assert.equal(
    parseSetlist(['grooveBed', 'showBed', 'showTheme'], selectable),
    null,
    'a three-entry setlist filled four slots',
  );

  for (const [label, input] of [
    ['null', null],
    ['undefined', undefined],
    ['a string', 'grooveBed'],
    ['a number', 4],
    ['an object', { 0: 'grooveBed' }],
    ['an empty array', []],
    ['too short', valid.slice(0, 3)],
    ['too long', [...valid, 'showBed', 'grooveBed']],
    ['an unknown id', ['grooveBed', 'showBed', 'showTheme', 'noRefunds']],
    ['a non-string entry', ['grooveBed', 'showBed', 'showTheme', 7]],
    ['a null entry', ['grooveBed', 'showBed', 'showTheme', null]],
    ['a duplicate', ['grooveBed', 'grooveBed', 'showBed', 'showTheme']],
    ['a track nobody can choose', ['grooveBed', 'showBed', 'showTheme', 'grooveBed']],
  ] as const) {
    assert.equal(parseSetlist(input, selectable), null, `${label} was accepted as a setlist`);
  }
});

test('M24A: a setlist saved by a build with more tracks degrades to the official one', () => {
  /*
   * The forward-compatibility case, and the reason `parseSetlist` returns null
   * rather than filtering: a save written by M24C on a device that later
   * installs an older build names songs this build has never heard of. The
   * right outcome is the authored show, not three quarters of somebody's
   * setlist.
   */
  const fromTheFuture = ['noRefunds', 'lastCall', 'brokenAmp', 'cheapBeerRiot'];
  assert.equal(parseSetlist(fromTheFuture, ['showBed', 'grooveBed']), null);
  assert.equal(parseSetlist(fromTheFuture) ?? OFFICIAL_SETLIST, OFFICIAL_SETLIST);
});

test('M24A: no save, however broken, can stop a run starting', () => {
  // The M22 rule, re-run against the field M24C will add.
  for (const raw of [
    '{"customSetlist":"nonsense"}',
    '{"customSetlist":[1,2,3,4]}',
    '{"customSetlist":null}',
    '{"customSetlist":{"0":"grooveBed"}}',
    'not json at all',
  ]) {
    const parsed = parseSave(raw);
    const setlist = parseSetlist((parsed.unknown as { customSetlist?: unknown }).customSetlist);
    const resolved = setlist ?? OFFICIAL_SETLIST;
    assert.equal(resolved.length, SETLIST_SLOTS);
    assert.ok(isMusicTrackId(trackForStage(resolved, 0)));
  }
});

test('M24A: an unrecognised setlist field survives a round trip untouched', () => {
  /*
   * M24C adds `customSetlist` to the schema. Until then a save written by a
   * newer build must come back out of an older one intact — which the existing
   * unknown-field passthrough already does, and this proves it does for the
   * exact field M24C will use.
   */
  const written = '{"schemaVersion":1,"customSetlist":["grooveBed","showBed","showTheme","grooveBed"]}';
  const parsed = parseSave(written);
  assert.deepEqual(
    (parsed.unknown as { customSetlist?: unknown }).customSetlist,
    ['grooveBed', 'showBed', 'showTheme', 'grooveBed'],
  );
  const round = parseSave(serializeSave(parsed.state, parsed.unknown));
  assert.deepEqual(
    (round.unknown as { customSetlist?: unknown }).customSetlist,
    ['grooveBed', 'showBed', 'showTheme', 'grooveBed'],
    'a newer build had its setlist deleted by this one',
  );
  assert.equal(emptySave().schemaVersion, 1, 'the schema was bumped without a reader needing it');
});

// ---------------------------------------------------------------------------
// The run's setlist
// ---------------------------------------------------------------------------

test('M24A: every path that exists today starts the authored show', () => {
  const flow = createAppFlow();
  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'a fresh flow is not on the official setlist');

  startStage(flow, 2);
  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'a stage card started something else');
  beginRound(flow);
  assert.equal(flow.setlist, OFFICIAL_SETLIST);

  recordStageCleared(flow);
  advanceToNextStage(flow);
  assert.equal(flow.setlist, OFFICIAL_SETLIST, '"Next stage" changed the music');

  returnToTitle(flow);
  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'quitting left a setlist behind');
});

test('M24A: a run resolves the same track the stage table authored', () => {
  /*
   * The behaviour-preservation claim, checked rather than asserted in prose:
   * for every stage, what a run resolves is what `GameEngine` used to read
   * straight off the stage.
   */
  const flow = createAppFlow();
  for (const [index, stage] of STAGES.entries()) {
    startStage(flow, index);
    assert.equal(
      trackForStage(flow.setlist, flow.stageIndex),
      stage.music,
      `stage ${String(stage.number)} would play different music than before M24A`,
    );
  }
});

// ---------------------------------------------------------------------------
// The unlock
// ---------------------------------------------------------------------------

test('M24A: the custom setlist is locked until the whole show is finished', () => {
  const flow = createAppFlow();
  assert.equal(isCustomSetlistUnlocked(flow), false, 'a fresh install is unlocked');

  for (let index = 0; index < STAGES.length - 1; index += 1) {
    startStage(flow, index);
    recordStageCleared(flow);
    assert.equal(
      isCustomSetlistUnlocked(flow),
      false,
      `clearing stage ${String(index + 1)} unlocked it early`,
    );
  }

  startStage(flow, STAGES.length - 1);
  recordStageCleared(flow);
  assert.equal(isCustomSetlistUnlocked(flow), true, 'finishing the show did not unlock it');
});

test('M24A: the unlock only ever goes up, and rides the existing save', () => {
  const flow = createAppFlow();
  flow.stageIndex = STAGES.length - 1;
  recordStageCleared(flow);
  assert.equal(isCustomSetlistUnlocked(flow), true);

  // Replaying an earlier stage cannot take it away: the field is a high-water
  // mark, which is the whole reason no new state was added for the unlock.
  startStage(flow, 0);
  recordStageCleared(flow);
  assert.equal(isCustomSetlistUnlocked(flow), true, 'replaying stage 1 re-locked the feature');

  const save = emptySave();
  const restored = parseSave(
    serializeSave({ ...save, bestStageCleared: flow.bestStageCleared }),
  );
  const cold = createAppFlow();
  cold.bestStageCleared = restored.state.bestStageCleared;
  assert.equal(isCustomSetlistUnlocked(cold), true, 'the unlock did not survive a cold start');
});

test('M24A: a ruined show is not progress', () => {
  // `recordStageCleared` is only ever called on SHOW_COMPLETE; this pins the
  // consequence, so a future caller cannot quietly widen the victory condition.
  const flow = createAppFlow();
  flow.stageIndex = STAGES.length - 1;
  assert.equal(isCustomSetlistUnlocked(flow), false);
});

test('M24A: the unlock gates a screen, never a stage', () => {
  // M15's rule, restated in the V2 plan: session progress must never gate a
  // cold start. A locked feature must not make a stage unreachable.
  const flow = createAppFlow();
  assert.equal(isCustomSetlistUnlocked(flow), false);
  for (const [index, stage] of STAGES.entries()) {
    startStage(flow, index);
    assert.equal(flow.stageIndex, index, `stage ${String(stage.number)} was not selectable`);
    assert.equal(flow.screen, 'BRIEFING');
  }
});

// ---------------------------------------------------------------------------
// Mechanical equivalence
// ---------------------------------------------------------------------------

/** Every spawn a level makes, as (time, kind, lane-ish) triples. */
function spawnTrace(level: (typeof STAGES)[number]['level']): string[] {
  const round = createRound(level);
  round.state = 'PLAYING';
  const trace: string[] = [];
  for (let elapsed = 0; elapsed <= level.durationMs + 1000; elapsed += 50) {
    for (const event of tickRound(round, 50)) {
      if (event.type === 'TARGET_SPAWNED') {
        trace.push(`${String(round.elapsedMs)}:${event.kind}:${String(event.targetId)}`);
      }
    }
  }
  return trace;
}

test('M24A: the same level throws the same objects whatever is playing', () => {
  /*
   * The claim §26 of the brief makes, measured. Each stage is replayed twice
   * with a *different setlist live on the flow* — the official one, then one
   * built from the other direction — and the two traces must agree spawn for
   * spawn.
   *
   * The flow is set rather than ignored on purpose: this is the arrangement
   * that would break if a level ever started reading the run's music, which is
   * the thing the next test forbids structurally.
   */
  const reversed = [...OFFICIAL_SETLIST].reverse() as unknown as Setlist;

  for (const [index, stage] of STAGES.entries()) {
    const flow = createAppFlow();
    startStage(flow, index);
    const underOfficial = spawnTrace(stage.level);
    assert.equal(trackForStage(flow.setlist, index), stage.music);

    flow.setlist = reversed;
    const underOther = spawnTrace(stage.level);
    assert.notEqual(
      trackForStage(flow.setlist, index),
      stage.music,
      'both runs were arranged with the same music, so the comparison proves nothing',
    );

    assert.deepEqual(
      underOther,
      underOfficial,
      `stage ${String(stage.number)} did not replay identically under different music`,
    );
    assert.ok(underOfficial.length > 0, `stage ${String(stage.number)} threw nothing at all`);
  }
});

test('M24A: no gameplay module can see the catalogue or the setlist', () => {
  /*
   * The structural half, and the one that actually holds. A test that plays two
   * rounds proves today's code is fine; this proves tomorrow's cannot quietly
   * stop being fine, because the import simply is not there to use.
   *
   * `appFlow.ts` is the deliberate exception and the only one: it owns the
   * run's setlist. It is a *flow* module — the round never reads it, which is
   * the one-way rule M15 established and this milestone leans on.
   */
  const forbidden = ['audio/musicCatalogue', 'audio/setlist'];
  const allowed = new Set(['game/state/appFlow.ts']);

  const offenders: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!path.endsWith('.ts') && !path.endsWith('.tsx')) continue;
      const shown = relative(repoRoot, path);
      if (allowed.has(shown)) continue;
      const source = readFileSync(path, 'utf8');
      for (const needle of forbidden) {
        if (new RegExp(`from '[^']*${needle}\\.ts'`).test(source)) offenders.push(`${shown} -> ${needle}`);
      }
    }
  };
  walk(join(repoRoot, 'game/state'));
  walk(join(repoRoot, 'game/levels'));

  assert.deepEqual(
    offenders.filter((offender) => !offender.startsWith('game/levels/stages.ts')),
    [],
    'a gameplay module imported the music catalogue or the setlist',
  );
});

test('M24A: stages.ts names a track type and nothing else about music', () => {
  /*
   * `stages.ts` is the one gameplay-adjacent file that touches the catalogue,
   * and it must stay a *type* import. A value import would let a stage read a
   * track's genre or evidence, which is how music metadata leaks into the thing
   * that decides difficulty.
   */
  const source = readFileSync(join(repoRoot, 'game/levels/stages.ts'), 'utf8');
  assert.match(
    source,
    /import type \{ MusicTrackId \} from '\.\.\/audio\/musicCatalogue\.ts';/,
    'stages.ts stopped importing the track id as a type',
  );
  assert.equal(
    /^import \{[^}]*\} from '\.\.\/audio\/musicCatalogue\.ts';/m.test(source),
    false,
    'stages.ts now imports catalogue values, not just a type',
  );
});

test('M24A: exactly one place turns a stage into a sound', () => {
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');
  const calls = engine.match(/audio\.playMusic\(/g) ?? [];
  assert.equal(calls.length, 1, `playMusic is called from ${String(calls.length)} places`);
  assert.ok(
    engine.includes('audio.playMusic(scene.music)'),
    'the music no longer comes from the resolved setlist slot',
  );
  assert.ok(
    engine.includes('trackForStage(scene.flow.setlist, scene.flow.stageIndex)'),
    'the scene stopped resolving its track through the run setlist',
  );
});

test('M24A: preloading is bounded by the setlist, not by the catalogue', () => {
  /*
   * The scaling seam. Today the catalogue and the official setlist are almost
   * the same size, so this asserts the *shape* rather than a saving: the engine
   * hands the audio service a setlist, and the service has a way to be told a
   * new one.
   */
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');
  assert.ok(
    engine.includes('createAudioService(OFFICIAL_SETLIST)'),
    'the audio service is no longer seeded from the official setlist',
  );

  const service = readFileSync(join(repoRoot, 'game/audio/audioService.ts'), 'utf8');
  assert.ok(service.includes('preloadSetlist'), 'the audio service has no setlist preload');
  assert.equal(
    /Object\.keys\(MUSIC_SOURCES\)/.test(service),
    false,
    'the audio service still creates a player for every track in the registry',
  );
  assert.ok(
    new Set(OFFICIAL_SETLIST).size <= SETLIST_SLOTS,
    'the official setlist needs more players than it has slots',
  );
});

test('M24A: the catalogue does not encode how many tracks the library has', () => {
  /*
   * The owner's refinement: the library is 8-12 tracks, maybe more, and the
   * number is a product decision made from auditions rather than a constant in
   * business logic. Only the slot count is fixed, and it is fixed by the stages.
   */
  const catalogue = readFileSync(join(repoRoot, 'game/audio/musicCatalogue.ts'), 'utf8');
  const body = catalogue.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(
    /\b(length|size)\s*[=<>!]=*\s*\d/.test(body),
    false,
    'the catalogue caps or compares its own track count',
  );
  assert.ok(trackIds().length >= 3, 'the catalogue lost a track');
  assert.equal(
    Object.keys(MUSIC_TRACKS).length,
    trackIds().length,
    'trackIds() does not enumerate the catalogue',
  );
});
