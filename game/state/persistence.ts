/**
 * The saved file: its schema, and how to survive whatever is actually on disk
 * (M22).
 *
 * Source of truth: docs/specs/M22-local-memory-and-sharing.md
 *
 * Pure. No `expo-file-system`, no React, no clock — the adapter that touches a
 * disk is `storage.ts`, and it is deliberately thin so that **every hostile
 * input is this module's problem** and every one of them is testable in Node.
 *
 * ## The rule that outranks the schema
 *
 * From M15, restated in the V2 plan: *session progress must never gate a cold
 * start.* Persistence records what happened; it does not lock anything. So
 * every function here has the same failure mode — **fall back to the default
 * and keep going** — and none of them throws. A corrupt save costs a high
 * score. It must never cost the game.
 *
 * ## Why the version is in the first write
 *
 * `schemaVersion` is written from day one rather than added when it is first
 * needed. A file with no version is a file that can only ever be discarded,
 * and discarding is the thing this module exists to stop doing.
 *
 * Fields this build does not recognise are **kept and written back**, so an
 * older build cannot silently delete what a newer one saved. That is cheap
 * now and impossible to retrofit.
 */
import { emptyRecords, type Records, type StageRecord } from './records.ts';
import { isLocale, type Locale } from '../i18n/locales.ts';
import { STAGES, type StageId } from '../levels/stages.ts';
import { parseSetlist, type Setlist } from '../audio/setlist.ts';

/** Bumped only when the shape changes in a way a reader must know about. */
export const SCHEMA_VERSION = 1;

/**
 * What the save is called on disk.
 *
 * Here rather than in `storage.ts` because it is part of the contract rather
 * than part of the mechanics — and because a test that wants to check it must
 * not have to import the adapter, which pulls in a native module Node cannot
 * load. That boundary is the same one M19 drew around `expo-localization`.
 *
 * Named for the product: `docs/release/product-identity.md` forbids deriving
 * any new identifier from *Worst Band Ever*, and names file names explicitly.
 */
export const SAVE_FILE_NAME = 'worst-gig-ever.save.json';

export interface SavedState {
  readonly schemaVersion: number;
  readonly records: Records;
  /** Highest stage index finished, or -1. A tick mark, never a gate. */
  readonly bestStageCleared: number;
  readonly clickEnabled: boolean;
  /** An explicit override. Null means "use whatever the device asks for". */
  readonly locale: Locale | null;
  /**
   * The setlist the player built, or null if they never have (M24C).
   *
   * **Additive and optional, so `SCHEMA_VERSION` stays 1.** A build that
   * predates this field reads a file containing it and carries it through
   * untouched — that is what the unknown-field passthrough is for — and a build
   * that has it reads an older file and gets `null`, which is exactly right for
   * a player who has not built one. Neither direction loses anything, which is
   * the rule this module's version number exists to police.
   *
   * Not a *validated* setlist by the time it reaches here — it is, because
   * `parseSave` runs it through `parseSetlist`, which drops anything that is
   * not four distinct selectable tracks. See `parseSave` for why that rejects
   * rather than repairs.
   */
  readonly customSetlist: Setlist | null;
}

/** What a fresh install has. Also what any unreadable file becomes. */
export function emptySave(): SavedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    records: emptyRecords(),
    bestStageCleared: -1,
    clickEnabled: true,
    locale: null,
    customSetlist: null,
  };
}

/** Fields the file carried that this build has no opinion about. */
export type UnknownFields = Readonly<Record<string, unknown>>;

export interface ParsedSave {
  readonly state: SavedState;
  /** Preserved verbatim and written back, so a newer build loses nothing. */
  readonly unknown: UnknownFields;
  /**
   * True when the file existed but could not be read as a save.
   *
   * The caller uses it to decide *not* to overwrite: a file we failed to
   * understand is evidence, and the next write would destroy it.
   */
  readonly unreadable: boolean;
}

const KNOWN_FIELDS = new Set([
  'schemaVersion',
  'records',
  'bestStageCleared',
  'clickEnabled',
  'locale',
  'customSetlist',
]);

/**
 * Keys that are never carried forward, however a save spells them.
 *
 * `JSON.parse` can produce an own `__proto__` key, and copying it onto the
 * passthrough object with `unknown[key] = value` **replaces that object's
 * prototype** rather than adding a property. `Object.prototype` itself is not
 * touched and the spread in `serializeSave` would not copy the result, so the
 * blast radius is small — but a bag of unknown fields whose prototype came out
 * of a file on disk is not something to leave working by accident.
 */
const NEVER_CARRIED = new Set(['__proto__', 'constructor', 'prototype']);

const STAGE_IDS = new Set<string>(STAGES.map((stage) => stage.id));

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A finite number, or the fallback. Rejects NaN, Infinity and numeric strings. */
function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A score: finite, not negative, and an integer. */
function scoreOr(value: unknown, fallback: number): number {
  const number = numberOr(value, fallback);
  return number < 0 ? fallback : Math.floor(number);
}

function parseStageRecord(value: unknown): StageRecord | null {
  if (!isObject(value)) return null;
  const grooveScore =
    value.grooveScore === null || value.grooveScore === undefined
      ? null
      : scoreOr(value.grooveScore, 0);
  return { defenseScore: scoreOr(value.defenseScore, 0), grooveScore };
}

/**
 * Records, dropping anything that is not a stage this build knows about.
 *
 * Dropping rather than keeping, unlike the top-level unknown fields: a record
 * is keyed by a stage id, and a stage that does not exist has nothing to draw
 * a record against. It is also the one place a future build could legitimately
 * add keys, which is why the *whole* records object is not preserved — see the
 * schema version, which is the mechanism for that.
 */
function parseRecords(value: unknown): Records {
  if (!isObject(value)) return emptyRecords();

  const records: Partial<Record<StageId, StageRecord>> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!STAGE_IDS.has(key)) continue;
    const record = parseStageRecord(entry);
    if (record !== null) records[key as StageId] = record;
  }
  return records;
}

/**
 * Turns whatever was on disk into something the game can use.
 *
 * Never throws and never returns null. Every branch ends in a playable state,
 * because the alternative is storage deciding whether the game starts.
 */
export function parseSave(raw: string | null): ParsedSave {
  const empty = emptySave();
  if (raw === null || raw.trim() === '') {
    return { state: empty, unknown: {}, unreadable: false };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    return { state: empty, unknown: {}, unreadable: true };
  }

  if (!isObject(decoded)) return { state: empty, unknown: {}, unreadable: true };

  const unknown: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(decoded)) {
    if (KNOWN_FIELDS.has(key) || NEVER_CARRIED.has(key)) continue;
    unknown[key] = value;
  }

  const locale = decoded.locale;
  const bestStageCleared = Math.floor(numberOr(decoded.bestStageCleared, -1));

  return {
    state: {
      /*
       * A version from the future is read, not rejected. Everything below is
       * field-by-field tolerant, so the worst a newer file can do is carry
       * fields this build ignores — and those are preserved above.
       */
      schemaVersion: Math.floor(numberOr(decoded.schemaVersion, SCHEMA_VERSION)),
      records: parseRecords(decoded.records),
      /* Clamped low, so a corrupt value cannot claim progress; the high end
         does not need clamping because nothing is gated on it anyway. */
      bestStageCleared: bestStageCleared < -1 ? -1 : bestStageCleared,
      clickEnabled: typeof decoded.clickEnabled === 'boolean' ? decoded.clickEnabled : true,
      locale: typeof locale === 'string' && isLocale(locale) ? (locale as Locale) : null,
      /*
       * Rejects rather than repairs, like everything else here (M24C).
       *
       * `parseSetlist` returns null for a wrong length, a duplicate, a track
       * this build does not ship, and a track that exists but is not
       * selectable. Every one of those degrades to "no saved setlist", which
       * puts the player in front of an empty builder — a state they know how
       * to fix — rather than into a run they never built. It never throws, so
       * a save written by a build with a larger library cannot stop this one
       * opening.
       */
      customSetlist: parseSetlist(decoded.customSetlist),
    },
    unknown,
    unreadable: false,
  };
}

/** The file to write. Unknown fields first, so a known key always wins. */
export function serializeSave(state: SavedState, unknown: UnknownFields = {}): string {
  return JSON.stringify({
    ...unknown,
    schemaVersion: SCHEMA_VERSION,
    records: state.records,
    bestStageCleared: state.bestStageCleared,
    clickEnabled: state.clickEnabled,
    locale: state.locale,
    customSetlist: state.customSetlist,
  });
}
