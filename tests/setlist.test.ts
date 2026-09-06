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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
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
  libraryTracks,
  trackIds,
  type MusicTrackId,
} from '../game/audio/musicCatalogue.ts';
import { STAGES } from '../game/levels/stages.ts';
import {
  advanceToNextStage,
  assignSlot,
  beginRound,
  completedDraft,
  createAppFlow,
  emptyDraft,
  isCustomRun,
  isCustomSetlistUnlocked,
  loadDraft,
  openSetlist,
  recordStageCleared,
  returnToTitle,
  selectSlot,
  startCustomGig,
  startStage,
} from '../game/state/appFlow.ts';
import { createRound, tickRound } from '../game/state/roundState.ts';
import { AUDITION_BUILD_FLAG } from '../game/config/buildFlags.ts';
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

test('M24C: the whole library ships, and the beds stay unchoosable', () => {
  /*
   * Replaces M24B's "candidates are selectable in development and nowhere
   * else", and the property it asserts moved with the owner's decision.
   *
   * M24B's interesting failure was asymmetric — a release build carrying
   * unaudited music. That risk is gone the only way it can honestly go: the
   * owner listened to all eleven on a phone and kept all eleven, so there are
   * no candidates left to leak. What has to be true now is the opposite shape:
   * **the eleven are really there in a build with the audition flag off**, and
   * the beds are still not among them.
   */
  const shipping = availableTracks(false);
  const development = availableTracks(true);

  assert.ok(shipping.length >= SETLIST_SLOTS, 'the shipping library is smaller than the show');
  assert.deepEqual(
    [...development],
    [...shipping],
    'a track is reachable in development that a player cannot have',
  );

  for (const id of shipping) {
    assert.equal(
      MUSIC_TRACKS[id].library?.release,
      'production',
      `${id} is selectable in a release build without being a production track`,
    );
  }

  /*
   * The beds stay unselectable whatever else changed. `grooveBed` is a teaching
   * floor and `showTheme` is a 120 BPM loop; neither is something a player may
   * put in a setlist, and that is a `library: null` in the catalogue rather
   * than a rule written down anywhere else.
   */
  for (const id of ['showTheme', 'grooveBed', 'showBed'] as const) {
    assert.equal(shipping.includes(id), false, `${id} became player-selectable`);
  }
});

test('M24C: the builder does not depend on the audition flag', () => {
  /*
   * §6 of the M24C brief, and the distinction it exists to keep: **production
   * music availability** and **audition UI visibility** are different
   * questions, answered by different modules, and the custom setlist is a
   * production feature.
   *
   * Asserted by asking the library what a build with the flag *off* offers,
   * which is the one answer a player's phone will ever get.
   */
  const original = process.env[AUDITION_BUILD_FLAG];
  try {
    delete process.env[AUDITION_BUILD_FLAG];
    const withoutFlag = availableTracks(false);
    assert.ok(withoutFlag.length >= SETLIST_SLOTS, 'a release build has no library to choose from');

    const chosen = withoutFlag.slice(0, SETLIST_SLOTS) as MusicTrackId[];
    assert.equal(
      isValidCustomSetlist(chosen, withoutFlag),
      true,
      'a setlist of shipping tracks is invalid in a shipping build',
    );
    assert.deepEqual(
      parseSetlist([...chosen], withoutFlag),
      Object.freeze([...chosen]),
      'a saved setlist of shipping tracks does not parse in a shipping build',
    );

    // And turning the flag on changes nothing about what a player may choose.
    process.env[AUDITION_BUILD_FLAG] = '1';
    assert.deepEqual(
      [...availableTracks(false)],
      [...withoutFlag],
      'the audition flag leaked into the shipping answer',
    );
  } finally {
    if (original === undefined) delete process.env[AUDITION_BUILD_FLAG];
    else process.env[AUDITION_BUILD_FLAG] = original;
  }
});

test('M24C: a setlist of beds still does not parse', () => {
  // What M24A's version proved, kept: the rule is about *selectability*, not
  // about whether an id names a real track.
  assert.equal(
    parseSetlist(['showBed', 'grooveBed', 'showTheme', 'showBed'], availableTracks(false)),
    null,
    'a setlist of beds parsed',
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
   * rather than filtering: a save written by a build with a larger library
   * names songs this one has never heard of. The right outcome is the authored
   * show, not three quarters of somebody's setlist.
   *
   * The ids below are deliberately not in this build's catalogue. Until M24C
   * this test used the M24B candidates, which worked because nothing was
   * production yet — and would now pass for the wrong reason, since all eleven
   * ship.
   */
  const fromTheFuture = ['expansionOne', 'expansionTwo', 'expansionThree', 'expansionFour'];
  for (const id of fromTheFuture) {
    assert.equal(isMusicTrackId(id), false, `${id} is a real track, so this proves nothing`);
  }
  assert.equal(parseSetlist(fromTheFuture, availableTracks(false)), null);
  assert.equal(parseSetlist(fromTheFuture) ?? OFFICIAL_SETLIST, OFFICIAL_SETLIST);

  // And a setlist of songs that *are* real but that this build does not offer
  // degrades the same way — "is this a track?" was never the question.
  assert.equal(parseSetlist([...availableTracks(false)].slice(0, SETLIST_SLOTS), []), null);
});

test('M24A: no save, however broken, can stop a run starting', () => {
  /*
   * The M22 rule, run against the field M24C added. `customSetlist` is a known
   * field now, so this reads it off the parsed state rather than out of the
   * unknown bag — which is also the assertion that `parseSave` never throws on
   * it and never returns a shape a run cannot use.
   */
  for (const raw of [
    '{"customSetlist":"nonsense"}',
    '{"customSetlist":[1,2,3,4]}',
    '{"customSetlist":null}',
    '{"customSetlist":{"0":"grooveBed"}}',
    '{"customSetlist":["grooveBed","showBed","showTheme","grooveBed"]}',
    'not json at all',
  ]) {
    const parsed = parseSave(raw);
    const resolved = parsed.state.customSetlist ?? OFFICIAL_SETLIST;
    assert.equal(resolved.length, SETLIST_SLOTS);
    assert.ok(isMusicTrackId(trackForStage(resolved, 0)));
  }
});

test('M24A: an unrecognised setlist field survives a round trip untouched', () => {
  /*
   * `customSetlist` was the unknown field this test was written for, and at
   * M24C it graduated into the schema — so the property it protects is now
   * checked against the *next* such field instead. That is the correct
   * migration: what matters is that a save written by a newer build comes back
   * out of an older one intact, not which key happens to be doing it today.
   *
   * `setlistName` is the obvious next one (naming a setlist is the first thing
   * anybody asks for after building one) and this build has no opinion about
   * it, which is exactly what makes it the right sample.
   */
  const written =
    '{"schemaVersion":1,"setlistName":"THE BAD ONE","sharedRunId":42}';
  const parsed = parseSave(written);
  assert.equal((parsed.unknown as { setlistName?: unknown }).setlistName, 'THE BAD ONE');
  assert.equal((parsed.unknown as { sharedRunId?: unknown }).sharedRunId, 42);

  const round = parseSave(serializeSave(parsed.state, parsed.unknown));
  assert.equal(
    (round.unknown as { setlistName?: unknown }).setlistName,
    'THE BAD ONE',
    'a newer build had a field deleted by this one',
  );
  assert.equal((round.unknown as { sharedRunId?: unknown }).sharedRunId, 42);
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
  /*
   * Two files, and the list is asserted below to be exactly these two, so a
   * third is a deliberate edit here rather than a drive-by import.
   *
   *   - `appFlow.ts` owns the run's setlist and the draft. It is a *flow*
   *     module: the round never reads it, which is the one-way rule M15
   *     established and this milestone leans on.
   *   - `persistence.ts` is the save format, and since M24C the save holds a
   *     setlist. It reaches for `parseSetlist` rather than re-deciding what a
   *     valid setlist is, which is the reason the import is worth having: a
   *     second answer to that question living in the parser is how a build
   *     would accept a setlist the builder could not have produced.
   *
   * Neither is gameplay. The modules this rule is really about — `roundState`,
   * `rhythmState`, `roundSystem`, every level — are named explicitly below, so
   * widening the allowlist can never quietly cover one of them.
   */
  const allowed = new Set(['game/state/appFlow.ts', 'game/state/persistence.ts']);

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

  /*
   * The named half. The allowlist above is a set of exemptions and a set of
   * exemptions can grow; these four are the modules the rule exists for, and
   * an exemption for any of them has to fail here rather than pass by being
   * added to a list.
   */
  for (const file of [
    'game/state/roundState.ts',
    'game/state/rhythmState.ts',
    'game/systems/roundSystem.ts',
    'game/levels/level01.ts',
  ]) {
    const source = readFileSync(join(repoRoot, file), 'utf8');
    for (const needle of forbidden) {
      assert.equal(
        new RegExp(`from '[^']*${needle}\\.ts'`).test(source),
        false,
        `${file} imported ${needle}, which decides what a round throws`,
      );
    }
  }
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
  /*
   * Widened at M24B, and narrowed in what it means.
   *
   * The rule was "`playMusic` is called once", which was a proxy for the thing
   * actually worth protecting: **a round's music comes from the setlist slot
   * and from nowhere else.** M24B adds a second caller that is not a round —
   * the audition row's preview button, which plays a track the owner picked
   * with ◀ ▶ and never touches a stage.
   *
   * So the count is now over the calls that start a *round's* music, and the
   * preview is excluded by name rather than by loosening the number. A third
   * caller, or a round starting its music from anything but `scene.music`,
   * still fails.
   */
  const calls = engine.match(/audio\.playMusic\(([^)]*)\)/g) ?? [];
  const roundCalls = calls.filter((call) => !call.includes('track'));
  assert.equal(
    roundCalls.length,
    1,
    `a round's music is started from ${String(roundCalls.length)} places: ${calls.join(', ')}`,
  );
  assert.ok(
    calls.every((call) => call === 'audio.playMusic(scene.music)' || call === 'audio.playMusic(track)'),
    `playMusic is called with something other than the setlist slot or an audition track: ${calls.join(', ')}`,
  );
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

// ---------------------------------------------------------------------------
// The production library (M24C)
// ---------------------------------------------------------------------------

/**
 * The eleven songs the owner approved, pinned.
 *
 * The one place in the repository where the library is written out, and it is
 * deliberately a *product* assertion rather than a rule: these are the tracks
 * the owner listened to on a phone and kept (11 KEEP, 0 MAYBE, 0 REJECT —
 * `docs/specs/M24B-owner-audition.md`). Adding or removing one is a decision
 * somebody makes here, on purpose, and not something a refactor can do.
 *
 * Nothing else counts them. `tests/audition.test.ts` proves no implementation
 * file contains the number.
 */
const APPROVED_LIBRARY = [
  'noRefunds',
  'brokenAmp',
  'lastCall',
  'stageDive',
  'cheapBeerRiot',
  'wrongChord',
  'badSoundcheck',
  'loadOut',
  'fireExit',
  'noEncore',
  'wrongVenue',
] as const;

test('M24C: exactly the approved songs are production-selectable', () => {
  assert.deepEqual(
    [...availableTracks(false)],
    [...APPROVED_LIBRARY],
    'the shipping library is not the eleven the owner approved, in catalogue order',
  );
  assert.deepEqual(
    [...libraryTracks()],
    [...APPROVED_LIBRARY],
    'a track has a library entry without being selectable, or the other way round',
  );
});

test('M24C: every production track carries the whole of what shipping requires', () => {
  /*
   * Five claims per track, each guarding a different failure, and all of them
   * checked over `availableTracks(false)` rather than over the pinned list —
   * so a twelfth track added tomorrow has to satisfy them too.
   */
  for (const id of availableTracks(false)) {
    const track = MUSIC_TRACKS[id];
    assert.equal(track.library?.release, 'production', `${id} ships as a candidate`);
    assert.equal(isGrooveQualified(id), true, `${id} ships without being on the beat clock`);
    assert.ok(track.provenanceId, `${id} ships with no provenance record`);
    assert.ok(
      typeof track.beats === 'number' && track.beats > 0 && track.beats % 4 === 0,
      `${id} ships without a whole number of bars`,
    );
    assert.ok(
      existsSync(join(repoRoot, track.file)),
      `${id} is selectable and its runtime asset is not in the tree`,
    );
    if (track.evidence.kind === 'conditioned') {
      assert.equal(
        track.evidence.ownerConfirmed,
        true,
        `${id} is an external track that shipped without anybody listening to it`,
      );
    }
  }
});

test('M24C: the library lives at a production path, not a candidate one', () => {
  /*
   * The asset-location decision (§36), as a check rather than a note. The
   * tracks were promoted out of `candidates/` because a directory called
   * "candidates" is a directory somebody eventually tidies up — and these
   * eleven are shipped music now.
   *
   * It is worth a test because the failure is silent in both directions: a
   * file left behind still plays, and `audit:provenance` would stop checking a
   * record whose file it can no longer find.
   */
  for (const id of availableTracks(false)) {
    const { file } = MUSIC_TRACKS[id];
    assert.match(
      file,
      /^assets\/audio\/music\/library\//,
      `${id} is bundled from ${file}, which is not the production library`,
    );
  }
  assert.equal(
    existsSync(join(repoRoot, 'assets/audio/music/candidates')),
    false,
    'the candidates directory is still in the tree, so two copies of the library exist',
  );
});

// ---------------------------------------------------------------------------
// The builder (M24C)
// ---------------------------------------------------------------------------

/** A flow that has survived the show, which is the only way into the builder. */
function unlockedFlow(): ReturnType<typeof createAppFlow> {
  const flow = createAppFlow();
  flow.stageIndex = STAGES.length - 1;
  recordStageCleared(flow);
  returnToTitle(flow);
  return flow;
}

test('M24C: the builder cannot be opened until the show has been survived', () => {
  const fresh = createAppFlow();
  assert.equal(openSetlist(fresh), false, 'a fresh player reached the builder');
  assert.equal(fresh.screen, 'BOOT', 'a refused open moved the player anyway');

  // Partial progress is not progress enough.
  for (let index = 0; index < STAGES.length - 1; index += 1) {
    const flow = createAppFlow();
    flow.stageIndex = index;
    recordStageCleared(flow);
    assert.equal(openSetlist(flow), false, `clearing stage ${String(index + 1)} opened the builder`);
  }

  // A ruined show never calls `recordStageCleared`, so it never unlocks.
  const ruined = createAppFlow();
  ruined.stageIndex = STAGES.length - 1;
  assert.equal(openSetlist(ruined), false, 'reaching the last stage was enough');

  const survived = unlockedFlow();
  assert.equal(openSetlist(survived), true, 'surviving the show did not open the builder');
  assert.equal(survived.screen, 'SETLIST');
});

test('M24C: a fresh draft is four empty slots, one per stage', () => {
  const flow = createAppFlow();
  assert.equal(flow.draftSetlist.length, SETLIST_SLOTS);
  assert.equal(flow.draftSetlist.length, STAGES.length, 'a stage exists with no slot to fill it');
  assert.deepEqual([...flow.draftSetlist], [...emptyDraft()]);
  assert.equal(
    completedDraft(flow),
    null,
    'an empty draft is playable, so START THE GIG would be live on a blank screen',
  );
});

test('M24C: four taps in the library build a whole setlist', () => {
  /*
   * The interaction the screen is named after: choosing a song advances the
   * cursor to the next empty slot, so the fastest path to a full setlist is
   * four taps in the right-hand column and no taps on a slot at all.
   */
  const flow = unlockedFlow();
  openSetlist(flow);
  const songs = availableTracks(false).slice(0, SETLIST_SLOTS);

  for (const [index, song] of songs.entries()) {
    assert.equal(flow.activeSlot, index, `the cursor was not on slot ${String(index + 1)}`);
    assert.equal(assignSlot(flow, song), true, `${song} was refused`);
  }

  assert.deepEqual([...flow.draftSetlist], [...songs]);
  assert.deepEqual(completedDraft(flow), Object.freeze([...songs]));
});

test('M24C: the same song cannot be put in two slots', () => {
  const flow = unlockedFlow();
  openSetlist(flow);
  const [first, second] = availableTracks(false);

  assert.equal(assignSlot(flow, first), true);
  // The cursor is on slot 2 now; the song already in slot 1 must be refused.
  assert.equal(assignSlot(flow, first), false, 'a song was accepted into a second slot');
  assert.equal(flow.draftSetlist[1], null, 'the refused song landed anyway');
  assert.equal(flow.activeSlot, 1, 'a refused tap moved the cursor');

  assert.equal(assignSlot(flow, second), true);
  assert.deepEqual([...flow.draftSetlist].slice(0, 2), [first, second]);
});

test('M24C: replacing one slot leaves the rest of the setlist alone', () => {
  const flow = unlockedFlow();
  openSetlist(flow);
  const library = availableTracks(false);
  for (const song of library.slice(0, SETLIST_SLOTS)) assignSlot(flow, song);
  const before = [...flow.draftSetlist];

  // Aim at slot 3 and choose something else.
  selectSlot(flow, 2);
  assert.equal(flow.activeSlot, 2);
  const replacement = library[SETLIST_SLOTS];
  assert.equal(assignSlot(flow, replacement), true, 'an unused song was refused');

  assert.deepEqual(
    [...flow.draftSetlist],
    [before[0], before[1], replacement, before[3]],
    'replacing one slot disturbed another',
  );
  // The displaced song is available again the moment it leaves the draft.
  selectSlot(flow, 3);
  assert.equal(assignSlot(flow, before[2] as MusicTrackId), true, 'a displaced song stayed used');

  // And re-choosing what is already in the active slot is a no-op, not a bug.
  selectSlot(flow, 0);
  assert.equal(assignSlot(flow, before[0] as MusicTrackId), true);
  assert.equal(flow.draftSetlist[0], before[0]);
});

test('M24C: a saved setlist is loaded, and a rejected one leaves an empty builder', () => {
  const flow = unlockedFlow();
  const saved = availableTracks(false).slice(1, SETLIST_SLOTS + 1);

  loadDraft(flow, parseSetlist([...saved], availableTracks(false)));
  assert.deepEqual([...flow.draftSetlist], [...saved], 'the saved setlist did not come back');
  openSetlist(flow);
  assert.equal(flow.activeSlot, SETLIST_SLOTS - 1, 'a full draft armed a slot that does not exist');

  // What `parseSetlist` rejects becomes an empty draft rather than a partial one.
  loadDraft(flow, parseSetlist(['noRefunds', 'noRefunds', 'lastCall', 'brokenAmp']));
  assert.deepEqual([...flow.draftSetlist], [...emptyDraft()], 'a rejected save half-loaded');
  assert.equal(completedDraft(flow), null);
});

test('M24C: START THE GIG refuses a draft that is not a setlist', () => {
  const flow = unlockedFlow();
  openSetlist(flow);
  assert.equal(startCustomGig(flow), null, 'an empty draft started a gig');
  assert.equal(flow.screen, 'SETLIST', 'a refused start moved the player');
  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'a refused start touched the run');

  for (const song of availableTracks(false).slice(0, SETLIST_SLOTS - 1)) assignSlot(flow, song);
  assert.equal(startCustomGig(flow), null, 'three quarters of a setlist started a gig');
  assert.equal(flow.screen, 'SETLIST');

  /*
   * A draft made of songs this build does not offer is refused too, which is
   * the case a save from a bigger library produces. Nothing may reach a round
   * that `isValidCustomSetlist` would reject.
   */
  flow.draftSetlist = Object.freeze(availableTracks(false).slice(0, SETLIST_SLOTS));
  assert.equal(startCustomGig(flow, []), null, 'a setlist of unavailable songs started a gig');
  assert.equal(flow.screen, 'SETLIST');
});

// ---------------------------------------------------------------------------
// The custom run (M24C)
// ---------------------------------------------------------------------------

/** A flow with a complete four-song draft, ready to start. */
function flowWithDraft(): {
  flow: ReturnType<typeof createAppFlow>;
  songs: readonly MusicTrackId[];
} {
  const flow = unlockedFlow();
  openSetlist(flow);
  const songs = availableTracks(false).slice(0, SETLIST_SLOTS);
  for (const song of songs) assignSlot(flow, song);
  return { flow, songs };
}

test('M24C: slot 1 plays Stage 1, and slot 4 plays Stage 4', () => {
  /*
   * The whole feature, in one assertion: the position a song sits at in the
   * builder is the stage it plays under. Checked through `trackForStage`, which
   * is the same function `GameEngine.resetScene` calls, rather than through a
   * copy of the mapping.
   */
  const { flow, songs } = flowWithDraft();
  const started = startCustomGig(flow);
  assert.deepEqual(started, Object.freeze([...songs]), 'START THE GIG did not start the draft');
  assert.equal(flow.stageIndex, 0, 'a custom show started somewhere other than the top');
  assert.equal(flow.screen, 'BRIEFING');

  for (const [index, stage] of STAGES.entries()) {
    assert.equal(
      trackForStage(flow.setlist, index),
      songs[index],
      `stage ${String(stage.number)} played the wrong slot`,
    );
    assert.notEqual(
      trackForStage(flow.setlist, index),
      stage.music,
      `stage ${String(stage.number)} played its authored music during a custom run`,
    );
  }
});

test('M24C: Stage 2 takes the player’s song, and the official run still does not', () => {
  /*
   * The decision in §15, both halves, side by side — because they are the pair
   * that is easy to get half right.
   *
   * The teaching rationale for `grooveBed` is spent by the time the builder is
   * reachable: the player has already finished the show. What protects them is
   * not that one file but that every production track is on the beat clock,
   * which `tests/audioContract.test.ts` holds for the whole library.
   */
  const { flow, songs } = flowWithDraft();
  startCustomGig(flow);
  assert.equal(trackForStage(flow.setlist, 1), songs[1], 'Stage 2 ignored the chosen song');
  assert.equal(
    isGrooveQualified(songs[1] as MusicTrackId),
    true,
    'Stage 2 scores beats and its custom song is not on the clock',
  );

  const official = createAppFlow();
  startStage(official, 1);
  assert.equal(
    trackForStage(official.setlist, 1),
    'grooveBed',
    'the authored Stage 2 stopped teaching over its bed',
  );
});

test('M24C: a custom run survives every stage transition and every retry', () => {
  const { flow, songs } = flowWithDraft();
  startCustomGig(flow);
  beginRound(flow);

  for (let index = 0; index < STAGES.length - 1; index += 1) {
    assert.equal(trackForStage(flow.setlist, flow.stageIndex), songs[index]);
    recordStageCleared(flow);
    assert.equal(advanceToNextStage(flow), true);
    assert.deepEqual([...flow.setlist], [...songs], '"Next stage" reset the run to the official show');
  }
  assert.equal(trackForStage(flow.setlist, STAGES.length - 1), songs[STAGES.length - 1]);
  assert.equal(isCustomRun(flow), true, 'a custom run stopped reading as one mid-show');

  /*
   * A ruined stage is a retry, and a retry keeps the music (§38). Nothing in
   * the flow changes on `SHOW_RUINED` — `recordStageCleared` is not called —
   * so this asserts what a retry actually does: replays the same stage on the
   * same setlist.
   */
  assert.deepEqual([...flow.setlist], [...songs], 'failing a stage discarded the chosen setlist');
});

test('M24C: leaving a custom run restores the official show but keeps the setlist', () => {
  /*
   * The two halves of §38, which pull in opposite directions and are why the
   * run's setlist and the draft are different fields.
   */
  const { flow, songs } = flowWithDraft();
  startCustomGig(flow);
  returnToTitle(flow);

  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'quitting left the player’s music on the run');
  assert.equal(isCustomRun(flow), false);
  assert.deepEqual([...flow.draftSetlist], [...songs], 'quitting cost the player their setlist');

  // And a stage card from the title starts the authored show, as it always has.
  startStage(flow, 1);
  assert.equal(flow.setlist, OFFICIAL_SETLIST, 'a stage card started the custom setlist');
  assert.equal(trackForStage(flow.setlist, 1), 'grooveBed');
  assert.deepEqual([...flow.draftSetlist], [...songs], 'a stage card cleared the builder');
});

test('M24C: the custom setlist cannot leak into an official run by any path', () => {
  /*
   * §20 as a property rather than a promise. Every entry point that is not
   * START THE GIG is walked with a full draft sitting in the builder, and none
   * of them may put it on the run.
   */
  const { flow } = flowWithDraft();

  for (const [name, enter] of [
    ['a stage card', () => startStage(flow, 0)],
    ['the last stage card', () => startStage(flow, STAGES.length - 1)],
    ['back to the title', () => returnToTitle(flow)],
    ['opening the builder', () => void openSetlist(flow)],
  ] as const) {
    enter();
    assert.equal(flow.setlist, OFFICIAL_SETLIST, `${name} started the player’s setlist`);
    assert.equal(isCustomRun(flow), false, `${name} reads as a custom run`);
  }

  // "Next stage" from an official run stays official for the whole show.
  startStage(flow, 0);
  for (let index = 0; index < STAGES.length - 1; index += 1) {
    recordStageCleared(flow);
    advanceToNextStage(flow);
    assert.equal(flow.setlist, OFFICIAL_SETLIST, '"Next stage" picked up the draft');
  }
});

// ---------------------------------------------------------------------------
// Reset (M24C §40)
// ---------------------------------------------------------------------------

test('M24C: clearing the save locks the feature and takes the setlist with it', () => {
  /*
   * **There is no reset-progress control in the game.** `clearSave()` exists in
   * `game/state/storage.ts` for development and nothing calls it, so "reset"
   * means the save file going away — a reinstall, cleared app data, or that
   * function. Defining it is what §40 asks for; this is the definition.
   *
   * Both facts live in the same file, so they cannot come back separately: a
   * save that is gone leaves `bestStageCleared: -1` *and* `customSetlist: null`,
   * which relocks the feature and empties the builder in one step. A setlist
   * that survived a reset would be reachable from a screen the same reset had
   * just locked.
   */
  const fresh = parseSave(null).state;
  assert.equal(fresh.bestStageCleared, -1, 'a cleared save remembered progress');
  assert.equal(fresh.customSetlist, null, 'a cleared save kept the setlist');

  const flow = createAppFlow();
  flow.bestStageCleared = fresh.bestStageCleared;
  loadDraft(flow, fresh.customSetlist);
  assert.equal(isCustomSetlistUnlocked(flow), false, 'the feature survived a reset');
  assert.equal(openSetlist(flow), false, 'the builder was reachable after a reset');
  assert.deepEqual([...flow.draftSetlist], [...emptyDraft()]);

  /*
   * And the other direction, which is the one worth a test: a save that somehow
   * holds a setlist without the progress that earns it cannot be played. The
   * gate is the unlock, never the presence of a setlist.
   */
  const inconsistent = createAppFlow();
  inconsistent.bestStageCleared = -1;
  loadDraft(inconsistent, availableTracks(false).slice(0, SETLIST_SLOTS));
  assert.notEqual(
    completedDraft(inconsistent),
    null,
    'the sample draft is not playable, so this proves nothing about the gate',
  );
  assert.equal(
    openSetlist(inconsistent),
    false,
    'a saved setlist made the builder reachable without the unlock',
  );
  assert.equal(
    startCustomGig(inconsistent),
    null,
    'a playable draft started a gig for a player who has not earned the feature',
  );
});

// ---------------------------------------------------------------------------
// Audio (M24C §28)
// ---------------------------------------------------------------------------

test('M24C: starting a custom gig preloads the setlist, never the library', () => {
  /*
   * The scaling property, asserted on the shape of the call rather than on a
   * count — the same way M24A's version does, and for the same reason: this
   * test cannot import `audioService.ts`, which reaches for files through
   * Metro's `require`.
   *
   * What it forbids is the specific regression this milestone could cause. The
   * builder draws every song in the library, so `availableTracks()` is right
   * there in the same component tree as the preload call, and preloading it
   * would hold eleven decoders open for a session that plays four.
   */
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');

  const preloads = engine.match(/audio\.preloadSetlist\(([^)]*)\)/g) ?? [];
  assert.ok(preloads.length > 0, 'nothing preloads anything any more');
  for (const call of preloads) {
    assert.equal(
      /availableTracks|trackIds|libraryTracks|MUSIC_TRACKS|selectableTracks/.test(call),
      false,
      `${call} preloads the whole library rather than a setlist`,
    );
  }
  assert.ok(
    engine.includes('audio.preloadSetlist(setlist)'),
    'a custom gig no longer preloads the setlist it is about to play',
  );

  // The ceiling itself: a setlist has one slot per stage and cannot exceed it.
  const { flow, songs } = flowWithDraft();
  const started = startCustomGig(flow);
  assert.ok(started);
  assert.equal(started.length, SETLIST_SLOTS);
  assert.equal(new Set(songs).size, SETLIST_SLOTS, 'a setlist needs fewer players than it has slots');
});

test('M24C: every way onto and off the builder silences whatever was playing', () => {
  /*
   * The leak §45 names, widened at M24C when the builder gained a ▶ on every
   * song. Three screens can now have music sounding when the player walks away
   * from them — the title (a development audition preview), the builder (a song
   * preview), and whatever a round left behind — and only the builder draws a
   * control that could stop it.
   *
   * So every transition in and out routes through one `stopPreview`, and this
   * asserts that rather than asserting `audio.stopMusic()` appears in three
   * places: a single helper is the reason a fourth exit cannot forget.
   *
   * Read off the source because `audioService.ts` cannot be imported here — it
   * reaches for files through Metro's `require`.
   */
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');

  const helper = engine.slice(
    engine.indexOf('const stopPreview = useCallback('),
    engine.indexOf('const handlePreviewTrack'),
  );
  assert.ok(helper.includes('audio.stopMusic()'), 'stopPreview no longer stops the music');
  assert.ok(helper.includes('setPreviewTrack(null)'), 'stopPreview no longer clears the ▶ state');

  for (const [handler, why] of [
    ['handleOpenSetlist', 'opening the builder'],
    ['handleStartCustomGig', 'starting a custom gig'],
    ['handleBackToTitle', 'leaving the builder'],
  ] as const) {
    const at = engine.indexOf(`const ${handler} = useCallback(`);
    assert.ok(at > 0, `${handler} is gone`);
    const body = engine.slice(at, engine.indexOf('}, [', at));
    assert.ok(body.includes('stopPreview()'), `${why} no longer stops what was playing`);
  }

  // And the two that could be sounding from the *previous* screen are both
  // cleared when the builder opens, not just one of them.
  const open = engine.slice(
    engine.indexOf('const handleOpenSetlist = useCallback('),
    engine.indexOf('const handleSelectSlot'),
  );
  assert.ok(
    open.includes('setAuditionPlaying(false)'),
    'opening the builder leaves the audition row claiming it is still playing',
  );
});

test('M24C: a song already in the setlist can still be listened to', () => {
  /*
   * The two controls on a library row have different rules, and the difference
   * is easy to lose in a refactor that treats the row as one thing.
   *
   *   choosing  -> deaf once the song is in the draft. That is the
   *                no-duplicates rule, drawn.
   *   listening -> never deaf. "What did I put in slot 3?" is exactly as real a
   *                question as "what is this one?", and a ▶ that dies the
   *                moment you use the row reads as broken rather than as a rule.
   *
   * The domain half is asserted elsewhere — `assignSlot` refuses a duplicate.
   * This is the drawing half, read off the source, because the failure is a
   * `disabled` on the wrong element and nothing else would catch it.
   */
  const overlays = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');

  const choose = overlays.slice(
    overlays.indexOf('onPress={used ? undefined : () => onChooseTrack(track)}'),
    overlays.indexOf('styles.setlistTrackChoose'),
  );
  assert.ok(choose.includes('disabled={used}'), 'a chosen song can be chosen again');

  const preview = overlays.slice(
    overlays.indexOf('onPress={() => onPreviewTrack(track)}'),
    overlays.indexOf('styles.setlistPreview,'),
  );
  assert.ok(preview.length > 0, 'the preview control is gone');
  assert.equal(
    /\bdisabled=/.test(preview),
    false,
    'the preview goes deaf for a song already in the setlist',
  );
  assert.ok(
    preview.includes('hitSlop'),
    'the preview lost the hit slop that makes it thumb-sized',
  );
});

test('M24C: a stopped preview does not survive as an extra resident player', () => {
  /*
   * The ceiling, and the one way this milestone could have quietly raised it.
   *
   * `preloadSetlist` deliberately never releases what is sounding. A previewed
   * song that has been *stopped* is not sounding, but `music` still points at
   * it — so under the old test it survived every later preload and a player who
   * listened to a song they did not choose carried a fifth decoder through the
   * whole show.
   *
   * The guard now asks whether the current player is actually playing, and
   * `playing === false` rather than `!playing` so that a shim which does not
   * report the field falls back to the old, conservative answer.
   */
  const service = readFileSync(join(repoRoot, 'game/audio/audioService.ts'), 'utf8');
  assert.ok(
    service.includes('music?.playing !== false'),
    'preloadSetlist no longer releases a stopped preview',
  );
  assert.ok(
    service.includes('if (isCurrent) music = null;'),
    'releasing the current player leaves the reference dangling at a removed one',
  );

  /*
   * And the order at START THE GIG, which is what makes the guard reachable:
   * the preview is stopped *before* the setlist is preloaded. Reversed, the
   * preview would still be playing when the release decision was taken.
   */
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');
  const body = engine.slice(
    engine.indexOf('const handleStartCustomGig = useCallback('),
    engine.indexOf('}, [', engine.indexOf('const handleStartCustomGig = useCallback(')),
  );
  assert.ok(
    body.indexOf('stopPreview()') < body.indexOf('audio.preloadSetlist(setlist)'),
    'the setlist is preloaded before the preview is stopped, so the preview survives',
  );
});

test('M24C: a custom setlist changes the music and nothing else', () => {
  /*
   * M24A proved this with a reversed *official* setlist, which was the only
   * kind that existed. This is the real case: an actual four-song custom
   * setlist, built the way a player builds one, replayed against the authored
   * show stage by stage.
   *
   * Every spawn has to land at the same millisecond with the same id. If it
   * does not, something in the round is reading the run's music — which
   * `no gameplay module can see the catalogue or the setlist` forbids
   * structurally and this measures.
   */
  const { flow, songs } = flowWithDraft();
  startCustomGig(flow);

  for (const [index, stage] of STAGES.entries()) {
    const official = createAppFlow();
    startStage(official, index);
    const underOfficial = spawnTrace(stage.level);

    flow.stageIndex = index;
    const underCustom = spawnTrace(stage.level);

    assert.notEqual(
      trackForStage(flow.setlist, index),
      trackForStage(official.setlist, index),
      `stage ${String(stage.number)} played the same music both times, so this proves nothing`,
    );
    assert.equal(trackForStage(flow.setlist, index), songs[index]);
    assert.deepEqual(
      underCustom,
      underOfficial,
      `stage ${String(stage.number)} threw different objects under the player's music`,
    );
    assert.ok(underOfficial.length > 0, `stage ${String(stage.number)} threw nothing at all`);
  }
});
