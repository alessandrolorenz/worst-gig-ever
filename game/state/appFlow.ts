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
import { clampStageIndex, hasNextStage, STAGES, type StageDefinition, stageAt } from '../levels/stages.ts';
import { DEFAULT_LOCALE, nextLocale, type Locale } from '../i18n/locales.ts';

export const APP_SCREENS = [
  /** The five-panel opening story. */
  'STORY',
  /** Title, stage picker, and the way back into the story. */
  'TITLE',
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
  };
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

/** Back out of a briefing, or quit a round. */
export function returnToTitle(flow: AppFlowState): void {
  flow.screen = 'TITLE';
}

/**
 * The current stage was completed. Records it and reports whether the show
 * goes on.
 *
 * Only `SHOW_COMPLETE` reaches here: a ruined show is a retry, not progress.
 */
export function recordStageCleared(flow: AppFlowState): { hasNext: boolean } {
  flow.bestStageCleared = Math.max(flow.bestStageCleared, flow.stageIndex);
  return { hasNext: hasNextStage(flow.stageIndex) };
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
