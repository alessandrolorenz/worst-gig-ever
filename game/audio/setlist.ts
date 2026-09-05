/**
 * The show's running order: which track plays in which slot.
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *
 * ## What a setlist is, and what it is not
 *
 * A setlist is a track per **slot**, and a slot is a stage's position in the
 * show. It is not a property of a stage: `StageDefinition.music` is still the
 * authored answer to "what does this stage play in the official show", and
 * `OFFICIAL_SETLIST` is *derived* from it rather than restating it.
 *
 * That derivation is the whole reason M24A is behaviour-preserving. On the
 * official path the value the game resolves is provably the value it read
 * before this module existed — not a copy of it that could drift, and not a
 * list somebody typed out and has to keep in step.
 *
 * ## Positional, not keyed by stage
 *
 * `readonly MusicTrackId[]` rather than `Record<StageId, MusicTrackId>`, for
 * three reasons that all point the same way:
 *
 *   - the player's model is an ordered setlist — 01, 02, 03, 04 — and the
 *     builder M24C draws is a list;
 *   - a results card wants the songs in play order, which a list already is;
 *   - a saved list degrades cleanly. An unknown id, a wrong length or a
 *     duplicate all reduce to "this is not a setlist", and the fallback is the
 *     official one. A partial *map* would invite a half-custom run nobody
 *     designed.
 *
 * The cost, stated: a positional list is coupled to stage order. Insert a stage
 * and every saved custom setlist becomes the wrong length — which `parseSetlist`
 * turns into `null`, and `tests/setlist.test.ts` holds it to that.
 *
 * Pure data and pure functions. No React, no storage, no audio player.
 */
import { STAGES } from '../levels/stages.ts';
import { availableTracks, isMusicTrackId, type MusicTrackId } from './musicCatalogue.ts';

export type Setlist = readonly MusicTrackId[];

/**
 * One slot per stage.
 *
 * Derived, never a literal. Four is true today and is true because there are
 * four stages, which is a different fact from "the number 4 appears in the
 * setlist code".
 */
export const SETLIST_SLOTS = STAGES.length;

/**
 * The authored show.
 *
 * `tests/setlist.test.ts` pins this to an explicit literal. The derivation
 * keeps it from drifting away from the stage table; the pin keeps the stage
 * table from silently changing the show the owner approved. Both, because they
 * guard opposite mistakes.
 */
export const OFFICIAL_SETLIST: Setlist = Object.freeze(STAGES.map((stage) => stage.music));

/**
 * The track for a stage position.
 *
 * Clamped rather than checked, exactly like `stageAt`: a bad index is a bug
 * somewhere else and the right behaviour here is a playable round, not a
 * crash in the middle of a show. Falls back to the official slot when a
 * setlist is too short, so a malformed one can never produce silence.
 */
export function trackForStage(setlist: Setlist, stageIndex: number): MusicTrackId {
  const index = Number.isFinite(stageIndex)
    ? Math.max(0, Math.min(SETLIST_SLOTS - 1, Math.floor(stageIndex)))
    : 0;
  return setlist[index] ?? OFFICIAL_SETLIST[index];
}

/**
 * Whether a **player-built** setlist is valid.
 *
 * Three rules, and each guards a different mistake:
 *
 *   - one track per slot, so a run cannot be half-configured;
 *   - every track **selectable**, not merely registered. `grooveBed` is a
 *     teaching floor and `showTheme` is a 120 BPM loop; both are real tracks and
 *     neither is something a player may put in a setlist. Checking
 *     `isMusicTrackId` instead would let a save name one of them;
 *   - no duplicates, so four slots of one song is not a setlist anybody can
 *     build (`docs/specs/M24-custom-setlist.md`, Q5).
 *
 * `selectable` is a parameter with a default rather than a read inside, exactly
 * like `availableLocales(includeDev)`: a test can ask what a production build
 * would accept without pretending to be a bundler, and a development build can
 * validate a setlist of audition candidates.
 *
 * Deliberately **not** applied to `OFFICIAL_SETLIST`, which legitimately repeats
 * `showBed` across Stages 3 and 4 and is made of beds nobody chose. The authored
 * show is not a choice and is not held to the rules for making one.
 */
export function isValidCustomSetlist(
  value: Setlist,
  selectable: readonly MusicTrackId[] = availableTracks(),
): boolean {
  if (value.length !== SETLIST_SLOTS) return false;
  const allowed = new Set(selectable);
  if (!value.every((id) => isMusicTrackId(id) && allowed.has(id))) return false;
  return new Set(value).size === value.length;
}

/**
 * Whatever came off disk, or `null`.
 *
 * Never throws, and rejects rather than repairs. A setlist that is nearly right
 * is not nearly a setlist: half-fixing one would start a custom run the player
 * never built, and the fallback — the show as authored — is always correct and
 * always available.
 *
 * Two consequences worth naming, because both are correct and both look like
 * bugs from the outside:
 *
 *   - a save naming a track this build does not ship, or an audition candidate
 *     read by a release build, degrades to the official show rather than to a
 *     partial one;
 *   - in M24A it returns `null` for *everything*, because no track is
 *     selectable yet. That is the honest answer while the library is empty, and
 *     the parser exists now so M24C inherits it rather than writing it in a
 *     hurry beside a UI.
 *
 * Mirrors `parseRecords` in `game/state/persistence.ts`, which drops what it
 * does not recognise for the same reason.
 */
export function parseSetlist(
  value: unknown,
  selectable: readonly MusicTrackId[] = availableTracks(),
): Setlist | null {
  if (!Array.isArray(value)) return null;
  if (!value.every((entry) => isMusicTrackId(entry))) return null;
  const setlist = value as MusicTrackId[];
  if (!isValidCustomSetlist(setlist, selectable)) return null;
  return Object.freeze([...setlist]);
}
