/**
 * Development-only tooling for listening to audition candidates (M24B).
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *
 * ## What this is for
 *
 * M24B can prove a track is CC0, that it sits on the 90 BPM grid, and that its
 * loop does not click. It cannot answer the only question that decides whether
 * a track ships:
 *
 *     Is this fun while I am trying to keep the groove and survive bottles?
 *
 * So this module exists to get a candidate in front of the owner's ears inside
 * a real round, with no source edit, no rename and no rebuild between songs.
 *
 * ## Why it is not a small copy of M24C's builder
 *
 * It builds a `Setlist` and hands it to `flow.setlist`, which is the same
 * primitive the player-facing builder will use at M24C and which has existed
 * since M24A. There is no second music-resolution path, no dev-only field on
 * the round, and nothing here for M24C to delete — `trackForStage` resolves an
 * audition run exactly as it resolves the authored show.
 *
 * What M24C adds is a screen, persistence and an unlock. None of that is here,
 * which is the point: M24B is forbidden from shipping the builder.
 *
 * ## Why the official show cannot be touched
 *
 * Nothing in this module is reachable from `startStage`. Selecting a stage on
 * the title still sets `OFFICIAL_SETLIST`, so the first run a player takes is
 * the authored one whatever the audition cursor is pointing at — and Stage 2
 * still teaches the beat over `grooveBed` unless the owner deliberately starts
 * an audition. `tests/setlist.test.ts` holds that.
 *
 * Pure data and pure functions. No React, no audio player, no storage.
 */
import { SETLIST_SLOTS, type Setlist } from './setlist.ts';
import { availableTracks, type MusicTrackId } from './musicCatalogue.ts';

/**
 * How an audition run fills its four slots.
 *
 * Two modes because the owner has two different questions, and one control
 * cannot answer both:
 *
 *   - `solo` — the selected track in **every** slot. "How does *this* song feel
 *     during Stage 3?" Whichever stage the owner starts, they hear the track
 *     the cursor is on, which is what makes the answer attributable.
 *   - `rotate` — the selected track and the next three. A genuine four-track
 *     setlist, which is what a custom gig will actually be, and the only way to
 *     hear whether two candidates clash when the show moves between them.
 */
export type AuditionMode = 'solo' | 'rotate';

export const AUDITION_MODES: readonly AuditionMode[] = ['solo', 'rotate'];

/**
 * The candidates available to audition, in catalogue order.
 *
 * `availableTracks(true)` rather than a list written here: the pool is whatever
 * the catalogue says it is, so adding or removing a candidate is a data change.
 * In a release build the caller never constructs any of this — see
 * `GameEngine`, which passes `null` for the whole control — but this returning
 * the *development* answer regardless keeps the function honest about what it
 * is for and keeps it testable without pretending to be a bundler.
 */
export function auditionTracks(): readonly MusicTrackId[] {
  return availableTracks(true);
}

/**
 * Moves the cursor, wrapping in both directions.
 *
 * Wrapping rather than clamping because this is a ◀ ▶ pair on a phone and a
 * control that silently stops responding at the end of a list reads as broken.
 * Returns 0 for an empty pool rather than -1, so a caller can always index.
 */
export function stepCursor(tracks: readonly MusicTrackId[], cursor: number, delta: number): number {
  if (tracks.length === 0) return 0;
  const next = (Math.trunc(cursor) + Math.trunc(delta)) % tracks.length;
  return next < 0 ? next + tracks.length : next;
}

/**
 * The track the cursor is on, or `null` when there is nothing to audition.
 *
 * `null` is a real state, not a defensive one: a release build has no
 * candidates, and after the owner's selection at M24C most of these tracks stop
 * existing. Anything that renders a title has to cope with the pool being
 * empty.
 */
export function trackAtCursor(
  tracks: readonly MusicTrackId[],
  cursor: number,
): MusicTrackId | null {
  if (tracks.length === 0) return null;
  return tracks[stepCursor(tracks, cursor, 0)] ?? null;
}

/**
 * The setlist an audition run plays.
 *
 * Length is `SETLIST_SLOTS`, always — a setlist with the wrong number of slots
 * is not a setlist, and `trackForStage` would silently fall back to the
 * official slot for the missing ones, which would put the *authored* music into
 * a run the owner started to hear something else.
 *
 * Returns `null` rather than a partial list when there is nothing to play, so
 * the caller starts the authored show instead of a broken audition.
 *
 * Note what this deliberately does **not** satisfy: `isValidCustomSetlist`
 * rejects duplicates, so a `solo` setlist is not a setlist any *player* could
 * build. That is correct and not an oversight — the no-duplicates rule exists
 * so a player cannot fill a gig with one song, and the owner auditioning one
 * song across four stages is the exact case the rule was never about. Nothing
 * persists an audition setlist, so none of this can reach a save.
 */
export function auditionSetlist(
  tracks: readonly MusicTrackId[],
  cursor: number,
  mode: AuditionMode,
): Setlist | null {
  if (tracks.length === 0) return null;
  const start = stepCursor(tracks, cursor, 0);
  const slots: MusicTrackId[] = [];
  for (let slot = 0; slot < SETLIST_SLOTS; slot += 1) {
    slots.push(mode === 'solo' ? tracks[start] : tracks[stepCursor(tracks, start, slot)]);
  }
  return Object.freeze(slots);
}

/** The other mode. A two-state control, so cycling and toggling are the same. */
export function nextMode(mode: AuditionMode): AuditionMode {
  return mode === 'solo' ? 'rotate' : 'solo';
}
