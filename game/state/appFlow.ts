/**
 * What the player is looking at, above the round (M15).
 *
 * Source of truth: docs/specs/M15-story-briefings-and-two-stages.md
 *
 * Until M15 there was only one screen stack and `GameState` was it: the round
 * was READY or it was not, and the title screen was "the overlay you get in
 * READY". That stopped being true the moment there was a story before the
 * title, a briefing between the title and the round, and two stages to choose
 * between — none of which are states of a *round*.
 *
 * So the two are now separate domains and they are not peers:
 *
 *   - `AppFlowState` (here) decides which screen exists.
 *   - `RoundState` decides what is true inside a round.
 *
 * The flow may read the round's outcome; the round never reads the flow. That
 * one-way rule is what keeps the round exactly as testable as it was, and it
 * is why `roundState.ts` has no import from this file.
 *
 * Pure data and pure transitions: no React, no React Native, no timers.
 */
import {
  clampStageIndex,
  FIRST_STAGE_INDEX,
  hasNextStage,
  STAGES,
  type StageDefinition,
  stageAt,
} from '../levels/stages.ts';
import {
  OFFICIAL_SETLIST,
  SETLIST_SLOTS,
  isValidCustomSetlist,
  type Setlist,
} from '../audio/setlist.ts';
import { availableTracks, type MusicTrackId } from '../audio/musicCatalogue.ts';
import { DEFAULT_LOCALE, nextLocale, type Locale } from '../i18n/locales.ts';

export const APP_SCREENS = [
  /** The five-panel opening story. */
  'STORY',
  /** Title, stage picker, and the way back into the story. */
  'TITLE',
  /**
   * The setlist builder (M24C).
   *
   * Between the title and the briefing because that is where it sits in the
   * player's path: it is reached from the title, and leaving it by START THE
   * GIG opens Stage 1's briefing exactly as a stage card would.
   *
   * Unreachable until `isCustomSetlistUnlocked(flow)`. `openSetlist` is the
   * only transition into it and it refuses while the show has not been
   * survived, so the screen is gated by a function rather than by whether a
   * button happens to be drawn.
   */
  'SETLIST',
  /** The stage's how-to-play card, shown immediately before its round. */
  'BRIEFING',
  /**
   * A round is mounted and its own `GameState` decides the rest — countdown,
   * play, pause, and the results overlay are all this one screen.
   */
  'ROUND',
] as const;

export type AppScreen = (typeof APP_SCREENS)[number];

export interface AppFlowState {
  screen: AppScreen;
  /** Which stage is selected, as an index into `STAGES`. */
  stageIndex: number;
  /**
   * Highest stage index the player has completed this session, or -1.
   *
   * Session-only, and deliberately so: persistence needs storage, and storage
   * is an MVP non-goal. Nothing is *gated* on it — see `startStage` — so
   * losing it on relaunch costs the player a tick mark on a button and
   * nothing else.
   */
  bestStageCleared: number;
  /** True once the story has been watched or skipped, so it plays once. */
  introSeen: boolean;
  /**
   * Whether the beat click sounds (M16).
   *
   * On by default and switchable from the title and the pause overlay, at the
   * owner's request. Session-only, exactly like `bestStageCleared` and for the
   * same reason: persistence needs storage and storage is an MVP non-goal. A
   * relaunch brings the click back, which is the right failure — a player who
   * turned it off loses a preference, and a player who forgot they turned it
   * off is not left wondering why the game went quiet.
   *
   * It lives on the flow rather than in the audio service because it is a
   * player choice about the whole session, not a property of a round or of a
   * player pool. Nothing in the rhythm domain reads it: the beat is emitted
   * either way and this only decides whether a sound comes out, which is what
   * makes "muting cannot change a judgement" true by construction rather than
   * by care.
   */
  clickEnabled: boolean;
  /**
   * The language the game is being read in (M19).
   *
   * Session-only, exactly like `clickEnabled`, and for the same reason:
   * persistence needs storage and storage is M22. It is seeded from the
   * device's own preference at startup rather than defaulting to English, so a
   * player whose phone is in Portuguese gets Portuguese without touching a
   * control — the control exists so that choice can be *overridden* and, more
   * importantly, so a translation can be checked on a device that is not set
   * to that language.
   *
   * It lives on the flow rather than in a module-level variable because it is
   * a player choice about the whole session, which is precisely what this
   * object holds. `LocaleContext` reads it; it is not a second copy of it.
   */
  locale: Locale;
  /**
   * The setlist **this run** is playing (M24A).
   *
   * `OFFICIAL_SETLIST` unless a custom gig was started, and M24A never starts
   * one — the field exists so that runtime music resolution goes through a
   * setlist from the day the setlist exists, rather than being retrofitted
   * later underneath a working game.
   *
   * On the flow rather than on the round, for the same reason `locale` and
   * `clickEnabled` are: it is a choice about the whole run, and the round
   * domain must not be able to see it. Nothing in `roundState.ts` or
   * `rhythmState.ts` imports this module, and `tests/setlist.test.ts` holds
   * that boundary — which is what makes "different music cannot change
   * gameplay" structural instead of careful.
   */
  setlist: Setlist;
  /**
   * The setlist the player is **building**, one entry per slot (M24C).
   *
   * Separate from `setlist` on purpose, and the separation is the feature's
   * whole safety story. `setlist` is what a run resolves its music through and
   * is `OFFICIAL_SETLIST` on every authored path; `draftSetlist` is a screen's
   * working state that only ever becomes a run's setlist by passing through
   * `startCustomGig`, which validates it first. A half-built draft is therefore
   * unable to reach a round even in principle.
   *
   * `null` is an unfilled slot rather than a missing one: the array is always
   * `SETLIST_SLOTS` long, so the builder can index it without checking and a
   * draft can never be *partly* the wrong shape.
   */
  draftSetlist: readonly (MusicTrackId | null)[];
  /**
   * Which slot the next chosen song lands in.
   *
   * On the flow rather than in React state because the builder's whole
   * interaction — tap a song, watch the cursor move to the next empty slot —
   * is a transition of this value, and a transition that lives in a component
   * cannot be tested without a renderer. `tests/setlist.test.ts` drives the
   * entire four-tap path through `assignSlot` alone.
   */
  activeSlot: number;
}

/**
 * A draft with nothing chosen: one `null` per slot.
 *
 * Built from `SETLIST_SLOTS` rather than written out, so a fifth stage gives
 * the builder a fifth row instead of a silently short array.
 */
export function emptyDraft(): readonly (MusicTrackId | null)[] {
  return Object.freeze(new Array<MusicTrackId | null>(SETLIST_SLOTS).fill(null));
}

/**
 * A fresh flow.
 *
 * The locale is a parameter with a default rather than a device read, so this
 * stays a pure function that the domain tests can call without a device or a
 * native module. `GameEngine` passes `detectLocale()`; every test gets English.
 */
export function createAppFlow(initialLocale: Locale = DEFAULT_LOCALE): AppFlowState {
  return {
    screen: 'STORY',
    stageIndex: 0,
    bestStageCleared: -1,
    introSeen: false,
    clickEnabled: true,
    locale: initialLocale,
    setlist: OFFICIAL_SETLIST,
    draftSetlist: emptyDraft(),
    activeSlot: 0,
  };
}

/**
 * Has the player earned the custom setlist? (M24A)
 *
 * **Derived, not stored.** `bestStageCleared` already means "the highest stage
 * index finished", is already raised only by `SHOW_COMPLETE`, and is already
 * persisted and restored. A separate `customSetlistUnlocked` boolean would be a
 * second copy of a fact the save already holds, and two copies can disagree —
 * which is the whole reason M24 reuses the existing completion state rather
 * than inventing a second definition of victory.
 *
 * Note what it gates and what it does not: this decides whether a **screen** is
 * reachable. No stage is locked by it, on a fresh install or a corrupt save, so
 * the M15 rule that session progress must never gate a cold start survives
 * intact.
 *
 * M24C is where it starts deciding something: it draws the title's way into the
 * builder, it is the transition `recordStageCleared` reports crossing, and
 * `openSetlist` refuses while it is false.
 */
export function isCustomSetlistUnlocked(flow: AppFlowState): boolean {
  return flow.bestStageCleared >= STAGES.length - 1;
}

/** The language control, from the title or from a paused round (M19). */
export function cycleLocale(flow: AppFlowState): void {
  flow.locale = nextLocale(flow.locale);
}

/** Sets the language directly. */
export function setLocale(flow: AppFlowState, locale: Locale): void {
  flow.locale = locale;
}

/** The click switch, from the title or from a paused round. */
export function toggleClick(flow: AppFlowState): void {
  flow.clickEnabled = !flow.clickEnabled;
}

export function currentStage(flow: AppFlowState): StageDefinition {
  return stageAt(flow.stageIndex);
}

/** True once the player has finished this stage at least once this session. */
export function isStageCleared(flow: AppFlowState, index: number): boolean {
  return flow.bestStageCleared >= clampStageIndex(index);
}

/** The story ended, by timer or by Skip. */
export function finishIntro(flow: AppFlowState): void {
  flow.introSeen = true;
  flow.screen = 'TITLE';
}

/** "Story" on the title: watch it again. Does not reset anything else. */
export function replayIntro(flow: AppFlowState): void {
  flow.screen = 'STORY';
}

/**
 * Picking a stage on the title opens its briefing, not its round.
 *
 * **No stage is locked.** A progression the player cannot skip would have to
 * survive a relaunch to be fair, and it cannot: `bestStageCleared` is
 * session-only. Locking Stage 2 would therefore mean replaying the drill on
 * every cold start — including for the owner, who still has a device retest to
 * run against exactly that round. The intended path is still the ordered one:
 * clearing Stage 1 leads straight into Stage 2 without going back to the
 * title.
 */
export function startStage(flow: AppFlowState, index: number): void {
  flow.stageIndex = clampStageIndex(index);
  /*
   * A stage card always starts the **authored** show (M24A). The custom setlist
   * is reached from its own screen and nowhere else, which is what makes
   * "the player's setlist cannot overwrite the official one" true by
   * construction rather than by remembering to reset it.
   */
  flow.setlist = OFFICIAL_SETLIST;
  flow.screen = 'BRIEFING';
}

/* ---------------------------------------------------------------- *
 * The custom setlist (M24C)
 * ---------------------------------------------------------------- */

/**
 * The first slot with nothing in it, or the last slot when the draft is full.
 *
 * The last slot rather than -1 so the cursor is always somewhere a tap can
 * land: a full draft that a player wants to change is the common case once the
 * feature has been used, and a cursor pointing at nothing would make the next
 * song silently do nothing.
 */
function firstEmptySlot(draft: readonly (MusicTrackId | null)[]): number {
  const empty = draft.findIndex((entry) => entry === null);
  return empty === -1 ? Math.max(0, draft.length - 1) : empty;
}

/**
 * Opens the setlist builder, or refuses.
 *
 * Returns false when the show has not been survived, and that refusal is the
 * gate — not the absence of a button. A screen whose only protection is that
 * nothing draws a way in is a screen one stray render reopens; this way the
 * unlock is a property of the transition and `tests/setlist.test.ts` can ask it
 * without a renderer.
 *
 * The cursor is placed on the first empty slot on every entry, so a player
 * returning to a saved setlist lands on the end of it and a player with a fresh
 * draft lands on slot 1.
 */
export function openSetlist(flow: AppFlowState): boolean {
  if (!isCustomSetlistUnlocked(flow)) return false;
  flow.activeSlot = firstEmptySlot(flow.draftSetlist);
  flow.screen = 'SETLIST';
  return true;
}

/** Tapping a slot: it becomes the one the next chosen song lands in. */
export function selectSlot(flow: AppFlowState, slot: number): void {
  if (!Number.isFinite(slot)) return;
  flow.activeSlot = Math.max(0, Math.min(SETLIST_SLOTS - 1, Math.floor(slot)));
}

/**
 * Tapping a song: it fills the active slot, and the cursor moves on.
 *
 * The four-tap path the screen is named after. Tapping four songs in the list
 * builds a whole setlist without touching a slot, because each assignment
 * advances to the next empty one.
 *
 * **A song already in the draft is refused**, returning false. That is the
 * no-duplicates rule (`isValidCustomSetlist`) enforced at the moment of the
 * tap rather than only at START THE GIG, so the builder can never hold a state
 * the validator would later reject — the used row is drawn deaf and this is
 * what makes that drawing true. Re-tapping the song *already in the active
 * slot* is likewise a no-op rather than a swap with itself.
 *
 * Replacing a slot works by making it active and choosing something else: the
 * displaced song becomes available again the moment it leaves the draft, which
 * is why the availability check reads the array rather than a second set.
 */
export function assignSlot(flow: AppFlowState, track: MusicTrackId): boolean {
  const slot = Math.max(0, Math.min(SETLIST_SLOTS - 1, Math.floor(flow.activeSlot)));
  const elsewhere = flow.draftSetlist.some((entry, index) => entry === track && index !== slot);
  if (elsewhere) return false;

  const next = [...flow.draftSetlist];
  next[slot] = track;
  flow.draftSetlist = Object.freeze(next);
  flow.activeSlot = firstEmptySlot(flow.draftSetlist);
  return true;
}

/**
 * Puts a setlist that came off disk into the builder (M24C).
 *
 * Takes an already-parsed `Setlist`, never raw JSON: `parseSetlist` is the one
 * place a saved setlist is validated, and a second entry point here would be a
 * second answer to "is this thing a setlist".
 *
 * `null` restores the empty draft, so a save with no setlist and a save with a
 * rejected one land in the same, correct, place.
 */
export function loadDraft(flow: AppFlowState, setlist: Setlist | null): void {
  flow.draftSetlist = setlist === null ? emptyDraft() : Object.freeze([...setlist]);
  flow.activeSlot = firstEmptySlot(flow.draftSetlist);
}

/**
 * The draft as a playable setlist, or `null` while it is not one yet.
 *
 * The single definition of "ready", read by START THE GIG to decide whether it
 * is deaf and by `startCustomGig` to decide whether it runs. One function, so
 * a button that looks pressable and a gig that refuses to start cannot
 * disagree.
 *
 * It re-runs the *whole* validator rather than merely counting filled slots.
 * Every rule is already there — four slots, all selectable, no duplicates — and
 * checking a cheaper proxy here is how a draft loaded from a save written by a
 * build with a different library would slip through.
 */
export function completedDraft(
  flow: AppFlowState,
  selectable: readonly MusicTrackId[] = availableTracks(),
): Setlist | null {
  if (flow.draftSetlist.some((entry) => entry === null)) return null;
  const setlist = flow.draftSetlist as readonly MusicTrackId[];
  if (!isValidCustomSetlist(setlist, selectable)) return null;
  return Object.freeze([...setlist]);
}

/**
 * START THE GIG: the run becomes the player's, and Stage 1's briefing opens.
 *
 * Returns the setlist it started so the caller can preload exactly those tracks
 * and persist them, or `null` when the draft is not playable — in which case
 * **nothing moves**. A refused start leaves the player on the builder with
 * their draft intact rather than dropping them into an authored show they did
 * not ask for.
 *
 * Always Stage 1. A custom show is the show, from the top; there is no
 * "custom stage 3", and starting at `FIRST_STAGE_INDEX` is what makes slot 1
 * mean Stage 1 for every run.
 */
export function startCustomGig(
  flow: AppFlowState,
  selectable: readonly MusicTrackId[] = availableTracks(),
): Setlist | null {
  /*
   * The unlock is checked here as well as in `openSetlist`, and the redundancy
   * is deliberate. Today the only way to reach this is through a screen that
   * gate already guards — but "no caller can get here" is an argument about
   * the current call graph, and this is the function that decides what music a
   * run plays. A save that holds a setlist without the progress that earns it
   * is a real state (`tests/setlist.test.ts`), and it must not be one tap away
   * from a gig whatever the screens happen to do.
   */
  if (!isCustomSetlistUnlocked(flow)) return null;
  const setlist = completedDraft(flow, selectable);
  if (setlist === null) return null;
  startStageWithSetlist(flow, FIRST_STAGE_INDEX, setlist);
  return setlist;
}

/**
 * Is the run in progress one the player built?
 *
 * Reference identity against the authored show rather than a `mode` field on
 * the flow, per §21 of the brief: the run's setlist already answers the
 * question, and a second field could disagree with it. `OFFICIAL_SETLIST` is a
 * frozen module constant that only `startStage` and `returnToTitle` ever
 * assign, so anything else in that field arrived through `startCustomGig` or
 * the development audition.
 */
export function isCustomRun(flow: AppFlowState): boolean {
  return flow.setlist !== OFFICIAL_SETLIST;
}

/**
 * Starts a stage on a **given** setlist rather than the authored one (M24B).
 *
 * The development audition path, and the only way in the codebase that
 * `flow.setlist` becomes anything other than `OFFICIAL_SETLIST`. M24C's builder
 * will be the second, and will call this same function — which is why it takes
 * a setlist rather than reaching into the audition module for one.
 *
 * Deliberately a sibling of `startStage` and not a flag on it. A boolean
 * parameter would put "is this the real show or not?" inside the function every
 * production path calls, one negation away from a player's first run coming up
 * on an unaudited candidate. Two functions cannot make that mistake: the stage
 * buttons call `startStage`, which sets the authored show and cannot be told
 * otherwise.
 *
 * Nothing persists `flow.setlist`, and `returnToTitle` restores the official
 * one, so an audition cannot outlive the run it was started for.
 */
export function startStageWithSetlist(
  flow: AppFlowState,
  index: number,
  setlist: Setlist,
): void {
  flow.stageIndex = clampStageIndex(index);
  flow.setlist = setlist;
  flow.screen = 'BRIEFING';
}

/** The briefing's Start button. */
export function beginRound(flow: AppFlowState): void {
  flow.screen = 'ROUND';
}

/** "How to play" on the title: the selected stage's briefing card. */
export function showBriefing(flow: AppFlowState): void {
  flow.screen = 'BRIEFING';
}

/**
 * Back out of a briefing, the builder, or a round. Ends any custom run (M24A).
 *
 * The run's setlist goes back to the authored show; the **draft does not**
 * (M24C §38). Those are different objects for exactly this reason: leaving a
 * gig must never leave the player's music where a stage card could pick it up,
 * and it must never cost them the setlist they spent four taps building. A
 * failed custom run is a retry, and the setlist is still in the builder when
 * they go back to it.
 */
export function returnToTitle(flow: AppFlowState): void {
  flow.screen = 'TITLE';
  flow.setlist = OFFICIAL_SETLIST;
}

/**
 * The current stage was completed. Records it and reports whether the show
 * goes on.
 *
 * Only `SHOW_COMPLETE` reaches here: a ruined show is a retry, not progress.
 *
 * ## `unlockedCustomSetlist`, and why it is a return value
 *
 * The reward moment in §37 of the M24C brief needs a *transition*, not a
 * state: `CUSTOM SETLIST UNLOCKED` is right the first time the show is
 * survived and wrong every time after. The transition is computed here, from
 * the same `bestStageCleared` that defines the unlock, by asking the question
 * on either side of the one line that can change the answer.
 *
 * Reporting it beats persisting an "unlock message seen" flag, which would be
 * a second fact about progress that the save would then have to keep true. It
 * is also why this is idempotent in the way that matters: the effect that
 * calls it re-runs on re-render, and a second call raises no high-water mark
 * and therefore reports `false` — the banner appears once per completion,
 * never once per frame.
 */
export function recordStageCleared(flow: AppFlowState): {
  hasNext: boolean;
  unlockedCustomSetlist: boolean;
} {
  const wasUnlocked = isCustomSetlistUnlocked(flow);
  flow.bestStageCleared = Math.max(flow.bestStageCleared, flow.stageIndex);
  return {
    hasNext: hasNextStage(flow.stageIndex),
    unlockedCustomSetlist: !wasUnlocked && isCustomSetlistUnlocked(flow),
  };
}

/**
 * "Next stage" on the results screen: straight into the next briefing, without
 * passing through the title.
 *
 * Returns false when there is no next stage, so the caller cannot advance off
 * the end of the list by asking twice.
 */
export function advanceToNextStage(flow: AppFlowState): boolean {
  if (!hasNextStage(flow.stageIndex)) return false;
  flow.stageIndex = clampStageIndex(flow.stageIndex + 1);
  flow.screen = 'BRIEFING';
  return true;
}

/** Total stages, for the title's picker. */
export function stageCount(): number {
  return STAGES.length;
}
