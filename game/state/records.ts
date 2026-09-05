/**
 * What the player's best runs were, per stage (M22).
 *
 * Source of truth: docs/specs/M22-local-memory-and-sharing.md
 *
 * Pure data and pure transitions — no React, no storage, no clock — so the
 * rule "a best only ever goes up" is assertable without a disk (AGENTS.md
 * rule 4). Whether any of this survives a relaunch is `persistence.ts`'s
 * problem and not this module's.
 *
 * **Nothing here gates anything.** A record is a number the player is shown;
 * it is not a key. See `appFlow.ts`: no stage is locked, and M22 is the
 * milestone most likely to break that by accident, because storage is exactly
 * what makes locking feel fair.
 */
import type { StageId } from '../levels/stages.ts';

export interface StageRecord {
  /** Best Defense score on this stage, ever. */
  readonly defenseScore: number;
  /**
   * Best Groove score, or null on a stage that never scored one.
   *
   * Null rather than 0, for the same reason the results screen prints no
   * Groove column on a defense-only stage (M15): a zero would claim the player
   * did badly at a job the stage never gave them.
   */
  readonly grooveScore: number | null;
}

/** Bests by stage. A stage that has never been finished is simply absent. */
export type Records = Readonly<Partial<Record<StageId, StageRecord>>>;

/** What a finished round is worth, as the records care about it. */
export interface RoundOutcome {
  readonly defenseScore: number;
  /** Null on a stage with the Groove switched off. */
  readonly grooveScore: number | null;
}

export interface RecordUpdate {
  readonly records: Records;
  /** True when this round set a new Defense best. */
  readonly beatDefense: boolean;
  /** True when this round set a new Groove best. */
  readonly beatGroove: boolean;
}

export function emptyRecords(): Records {
  return {};
}

/** The stage's bests, or zeroes if it has never been finished. */
export function recordFor(records: Records, stageId: StageId): StageRecord {
  return records[stageId] ?? { defenseScore: 0, grooveScore: null };
}

/**
 * Folds a finished round into the records.
 *
 * Returns a new object rather than mutating, because a record is read by React
 * to draw a "best" next to a score and a mutated one would not re-render.
 * `RoundState` is mutated in place for the opposite reason — it is ticked sixty
 * times a second — and the two conventions are deliberate rather than
 * inconsistent.
 *
 * A best only ever rises. Replaying a stage badly cannot cost the player the
 * number they already earned, which is the difference between a record and a
 * score.
 */
export function recordRound(
  records: Records,
  stageId: StageId,
  outcome: RoundOutcome,
): RecordUpdate {
  const previous = records[stageId];

  const beatDefense = outcome.defenseScore > (previous?.defenseScore ?? -1);
  const beatGroove =
    outcome.grooveScore !== null && outcome.grooveScore > (previous?.grooveScore ?? -1);

  if (!beatDefense && !beatGroove) return { records, beatDefense: false, beatGroove: false };

  return {
    records: {
      ...records,
      [stageId]: {
        defenseScore: beatDefense ? outcome.defenseScore : (previous?.defenseScore ?? 0),
        /*
         * A defense-only run must not erase a Groove best set earlier on the
         * same stage — which can happen, because no stage is locked and the
         * player may have played it under different rules.
         */
        grooveScore: beatGroove ? outcome.grooveScore : (previous?.grooveScore ?? null),
      },
    },
    beatDefense,
    beatGroove,
  };
}

/** True if any stage has a record at all, for deciding whether to draw them. */
export function hasAnyRecord(records: Records): boolean {
  return Object.keys(records).length > 0;
}
