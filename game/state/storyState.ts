/**
 * The opening story: five stills, in order, before the title (M15).
 *
 * Source of truth: docs/specs/M15-story-briefings-and-two-stages.md
 *
 * This module owns *when* the story advances and nothing about how it looks.
 * It imports no React and no React Native and names no image file, so the
 * whole sequence is assertable without a renderer (AGENTS.md rule 4). The
 * mapping from a panel id to a bundled JPEG is made once, in
 * `game/rendering/storyAssets.ts`.
 *
 * ## One clock, and it is the engine's
 *
 * The story is advanced by `tickStory`, from the same elapsed-time delta the
 * round is advanced by (AGENTS.md rule 5), rather than by a `setTimeout` or an
 * animation callback. A story that is paced by wall-clock timers and a game
 * that is paced by engine deltas are two clocks, and the second one would be
 * the only one in the app that ran while the app was backgrounded.
 *
 * The crossfade is deliberately *not* here. Its opacity is a native-driven
 * animation started when the panel index changes, so the story screen does not
 * re-render sixty times a second to fade an image — the M14.1 lesson about
 * per-frame JavaScript applies to a menu as much as to a round.
 */

export interface StoryPanel {
  /** Stable key; `storyAssets.ts` maps it to a file. */
  readonly id: string;
  /** The single line printed under the still. */
  readonly caption: string;
  /** How long this panel holds before the story advances by itself. */
  readonly holdMs: number;
}

/**
 * How long a panel holds when nobody touches the screen.
 *
 * Long enough to read a short caption twice without hurrying, short enough
 * that five of them are under twenty seconds. A player who wants to go faster
 * taps, and a player who wants to skip has a button; neither has to wait this
 * out.
 */
const DEFAULT_HOLD_MS = 3600;

/**
 * The five panels, in the order the owner asked for them: the poster that
 * announced the gig, the band arriving in the storm, the load-in, the show
 * actually working, and then the beer that ends it.
 *
 * The last panel is the one that matters mechanically: it is the answer to
 * "why is a crowd throwing glassware at me", and the game never explains that
 * anywhere else. It holds longer than the rest for that reason.
 */
export const STORY_PANELS: readonly StoryPanel[] = [
  { id: 'poster', caption: 'One night only. Nobody asked for it.', holdMs: DEFAULT_HOLD_MS },
  { id: 'arrival', caption: 'You went anyway.', holdMs: DEFAULT_HOLD_MS },
  { id: 'setup', caption: 'Load in. Bolt it down. Hope.', holdMs: DEFAULT_HOLD_MS },
  { id: 'performance', caption: 'For about four songs, it worked.', holdMs: DEFAULT_HOLD_MS },
  { id: 'soundDesk', caption: 'Then a beer found the mixing desk.', holdMs: 4400 },
];

export interface StoryState {
  /** Which panel is showing. Equal to `STORY_PANELS.length` once finished. */
  index: number;
  /** How long the current panel has been up, in engine-elapsed ms. */
  panelElapsedMs: number;
  /** True once the story has run out or been skipped. */
  finished: boolean;
}

export type StoryEvent =
  | { readonly type: 'PANEL_CHANGED'; readonly index: number }
  | { readonly type: 'STORY_FINISHED' };

/**
 * Largest step the story will accept from one tick, matching the round's cap.
 *
 * Without it, backgrounding the app during the story and returning a minute
 * later would advance past every remaining panel at once and land on the title
 * having shown the player nothing.
 */
export const MAX_STORY_TICK_MS = 100;

export function createStory(): StoryState {
  return { index: 0, panelElapsedMs: 0, finished: false };
}

/** Restores a story in place, so the entity map's object identity survives. */
export function clearStory(state: StoryState): void {
  Object.assign(state, createStory());
}

/** The panel currently showing, or null once the story is over. */
export function currentPanel(state: StoryState): StoryPanel | null {
  return STORY_PANELS[state.index] ?? null;
}

/**
 * Moves to the next panel, finishing the story if that was the last one.
 *
 * Shared by the timer and by the player's tap, so a tapped advance and an
 * expired one leave the story in exactly the same state — there is no
 * "skipped" panel that behaves differently from a watched one.
 */
function goToNextPanel(state: StoryState, events: StoryEvent[]): void {
  state.index += 1;
  state.panelElapsedMs = 0;
  if (state.index >= STORY_PANELS.length) {
    state.index = STORY_PANELS.length;
    state.finished = true;
    events.push({ type: 'STORY_FINISHED' });
    return;
  }
  events.push({ type: 'PANEL_CHANGED', index: state.index });
}

/**
 * Advances the story by a time step.
 *
 * A single tick advances at most one panel however large the step is: a slow
 * frame must not silently eat a panel the player never saw. The leftover time
 * is discarded rather than carried, because a panel the player *did* see for
 * its full hold has already done its job and shortening the next one to repay
 * a few milliseconds would only make the pacing depend on frame rate.
 */
export function tickStory(state: StoryState, rawDeltaMs: number): StoryEvent[] {
  const events: StoryEvent[] = [];
  if (state.finished) return events;
  if (!(rawDeltaMs > 0)) return events;

  const panel = currentPanel(state);
  if (panel === null) {
    state.finished = true;
    events.push({ type: 'STORY_FINISHED' });
    return events;
  }

  state.panelElapsedMs += Math.min(rawDeltaMs, MAX_STORY_TICK_MS);
  if (state.panelElapsedMs >= panel.holdMs) goToNextPanel(state, events);
  return events;
}

/** A tap on the story: show the next panel now. */
export function advanceStory(state: StoryState): StoryEvent[] {
  const events: StoryEvent[] = [];
  if (state.finished) return events;
  goToNextPanel(state, events);
  return events;
}

/** The Skip button: end the story wherever it is. */
export function skipStory(state: StoryState): StoryEvent[] {
  if (state.finished) return [];
  state.index = STORY_PANELS.length;
  state.panelElapsedMs = 0;
  state.finished = true;
  return [{ type: 'STORY_FINISHED' }];
}

/** Progress through the whole story, 0 to 1, for the panel dots. */
export function storyProgress(state: StoryState): number {
  if (STORY_PANELS.length === 0) return 1;
  return Math.min(1, state.index / STORY_PANELS.length);
}
