/**
 * The bridge between the engine loop and the round domain.
 *
 * Responsibilities, in order: turn platform input into canvas-space taps,
 * advance the domain by elapsed time, and translate what the domain reports
 * into presentation and audio. It holds no gameplay rules of its own — every
 * decision is made inside `game/state/roundState.ts`.
 */
import { VOCALIST_BLOCKING_RECT } from '../config/stage.ts';
import { HIT_FORGIVENESS } from '../config/targets.ts';
import type { GameEntities } from '../entities/sceneEntities.ts';
import { fitCanvas, screenToCanvas, type CanvasFit, type Viewport } from '../rendering/layout.ts';
import type { GameState } from '../state/gameState.ts';
import type { RoundEvent } from '../state/roundEvents.ts';
import {
  resolveRhythmTap,
  tickRhythm,
  type BeatContext,
  type RhythmEvent,
  type RhythmState,
} from '../state/rhythmState.ts';
import {
  resolveTap,
  targetViews,
  tickRound,
  type Point2D,
  type RoundState,
} from '../state/roundState.ts';
import { addBurst, addStrike, tickEffects } from './effects.ts';
import { spawnShards, tickShards } from './shards.ts';
import { reactToImpact, tickStageMotion } from './stageMotion.ts';

/** Native touch as delivered by react-native-game-engine. */
interface EngineTouch {
  type: string;
  event: { locationX?: number; locationY?: number; pageX?: number; pageY?: number };
}

/** Web input as delivered by react-game-engine. */
interface EngineInput {
  name: string;
  payload: {
    clientX?: number;
    clientY?: number;
    touches?: ArrayLike<{ clientX: number; clientY: number }>;
    changedTouches?: ArrayLike<{ clientX: number; clientY: number }>;
  };
}

export interface RoundSystemArgs {
  touches?: EngineTouch[];
  input?: EngineInput[];
  time: { delta: number };
}

/**
 * Touch-down rather than tap-release: M1 requires the response to feel
 * immediate, and waiting for the finger to lift adds latency the player reads
 * as sluggishness.
 */
const NATIVE_TAP_TYPES = new Set(['start']);
const WEB_TAP_EVENTS = new Set(['onMouseDown', 'onTouchStart']);

/**
 * Canvas point for one native touch (M5A, Priority 1).
 *
 * `pageX`/`pageY` are window-relative and therefore always mean the same
 * thing. `locationX`/`locationY` are relative to the *view the touch landed
 * on*, and react-native-game-engine listens with a bubbling `onTouchStart` on
 * its container rather than a responder on a single view — so the moment a
 * touch lands on any nested view inside the scene, `locationX` is measured
 * from that child's corner and the tap resolves somewhere the player never
 * aimed. Page coordinates are preferred for exactly that reason; the location
 * pair is kept only as a fallback for platforms that omit page coordinates.
 *
 * The scene's canvas is also marked `pointerEvents="none"`, so nothing inside
 * it can become a touch target in the first place.
 */
function nativeTapPoint(touch: EngineTouch, fit: CanvasFit, viewport: Viewport): Point2D | null {
  const { pageX, pageY, locationX, locationY } = touch.event;
  if (typeof pageX === 'number' && typeof pageY === 'number') {
    return screenToCanvas(fit, pageX - viewport.pageX, pageY - viewport.pageY);
  }
  if (typeof locationX === 'number' && typeof locationY === 'number') {
    return screenToCanvas(fit, locationX, locationY);
  }
  return null;
}

/**
 * One physical swing must resolve one tap.
 *
 * A browser reports a single finger as both `onTouchStart` and `onMouseDown`,
 * and a multi-touch mash can deliver two contacts a few pixels apart. Either
 * way the player swung once, so near-coincident points in the same frame are
 * folded together.
 */
function isDuplicate(points: readonly Point2D[], candidate: Point2D): boolean {
  return points.some(
    (point) =>
      Math.hypot(point.x - candidate.x, point.y - candidate.y) <=
      HIT_FORGIVENESS.duplicateTapDistancePx,
  );
}

function collectTapPoints(args: RoundSystemArgs, viewport: Viewport): Point2D[] {
  const fit = fitCanvas(viewport.width, viewport.height);
  const points: Point2D[] = [];

  const add = (point: Point2D | null) => {
    if (point !== null && !isDuplicate(points, point)) points.push(point);
  };

  for (const touch of args.touches ?? []) {
    if (!NATIVE_TAP_TYPES.has(touch.type)) continue;
    add(nativeTapPoint(touch, fit, viewport));
  }

  for (const event of args.input ?? []) {
    if (!WEB_TAP_EVENTS.has(event.name)) continue;
    const source =
      event.payload.touches?.[0] ?? event.payload.changedTouches?.[0] ?? event.payload;
    const { clientX, clientY } = source as { clientX?: number; clientY?: number };
    if (typeof clientX !== 'number' || typeof clientY !== 'number') continue;
    // Browser events are window-relative; the play surface may be inset.
    add(screenToCanvas(fit, clientX - viewport.pageX, clientY - viewport.pageY));
  }

  return points;
}

function applyEvents(entities: GameEntities, round: RoundState, events: RoundEvent[]): void {
  const { effects, shards, stageMotion, audio } = entities.scene;

  for (const event of events) {
    switch (event.type) {
      case 'TARGET_HIT': {
        addStrike(effects, event.x, event.y);
        addBurst(effects, event.x, event.y);
        spawnShards(shards, event.x, event.y);
        // Anyone standing near the break flinches (M5A, Priority 3).
        reactToImpact(stageMotion, event.x, event.y);
        audio.playSfx('stickWhoosh');
        audio.playSfx('glassBreak');
        break;
      }
      case 'TARGET_MISSED': {
        // Something got through and hit the kit.
        audio.playSfx('impactThwack');
        break;
      }
      case 'VOCALIST_HIT': {
        const x = VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2;
        const y = VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2;
        addStrike(effects, x, y);
        addBurst(effects, x, y);
        reactToImpact(stageMotion, x, y);
        audio.playSfx('stickWhoosh');
        audio.playSfx('impactThwack');
        break;
      }
      case 'SHOW_COMPLETED': {
        audio.stopMusic();
        audio.playSfx('crowdApplause');
        break;
      }
      case 'SHOW_RUINED': {
        audio.stopMusic();
        break;
      }
      default:
        break;
    }
  }

  void round;
}

/**
 * Turns Groove judgements into feedback.
 *
 * A scored beat plays the existing drumstick whoosh — the same one a target
 * hit already uses, so no new asset is introduced (AGENTS.md rules 13 and 14)
 * — because a cymbal that makes no sound when it is struck reads as broken.
 * This is a one-shot answering a tap the player just made. It is **not** audio
 * synchronization: nothing seeks, schedules, or corrects against the music's
 * playback position, and the beat clock never consults it.
 *
 * A missed beat is deliberately silent. It already costs the streak, and a
 * failure noise twice a second while the player is learning the pad would be
 * punishing out of all proportion to what a missed beat actually costs, which
 * is nothing (M11, "Rhythm miss behavior").
 */
function applyRhythmEvents(entities: GameEntities, events: RhythmEvent[]): void {
  const { audio } = entities.scene;
  for (const event of events) {
    if (event.type === 'BEAT_HIT') audio.playSfx('stickWhoosh');
  }
}

/**
 * What the Groove needs to know about the round at a given instant.
 *
 * `state` is passed rather than read off the round, because the state that
 * governs a frame is the one the frame *started* in. `tickRound` advances the
 * clock only when it was PLAYING or VOCALIST_EVENT on entry, and it may end
 * the round on the way out — so reading `round.state` after the tick would
 * make the Groove skip the last beat windows of a completed round, because
 * SHOW_COMPLETE stops the beat clock.
 */
function beatContext(round: RoundState, state: GameState): BeatContext {
  return {
    elapsedMs: round.elapsedMs,
    durationMs: round.level.durationMs,
    state,
  };
}

/**
 * Routes one tap point to both resolvers (M11).
 *
 * Every unique tap is offered to the Groove and to the Defense, and each
 * decides for itself whether the point was any of its business. There is
 * deliberately **no priority between them**: if a bottle happens to be over
 * the Groove Pad and one tap legitimately falls inside both regions, the
 * player gets the beat and the break. That is a reward for timing and
 * positioning, not a double-processing bug (rhythm-pivot architecture), and
 * forcing an artificial winner would make one of the two mechanics silently
 * fail exactly when the player did something good.
 *
 * Neither resolver can be triggered twice by one point: a beat is consumed by
 * its own index and a target by its `active` status, so idempotency is a
 * property of the domains rather than of this routing.
 */
function resolvePoint(
  round: RoundState,
  rhythm: RhythmState,
  point: Point2D,
  context: BeatContext,
  roundEvents: RoundEvent[],
  rhythmEvents: RhythmEvent[],
): void {
  // The Groove is judged against the same instant as the Defense, so the two
  // readings of one tap can never disagree about when it happened.
  rhythmEvents.push(...resolveRhythmTap(rhythm, point, context));
  roundEvents.push(...resolveTap(round, point));
}

export function roundSystem(entities: GameEntities, args: RoundSystemArgs): GameEntities {
  const scene = entities.scene;
  const round = scene.round;
  const rhythm = scene.rhythm;
  const previousState = round.state;
  const delta = args.time?.delta ?? 0;

  // Taps are resolved against the frame the player actually saw, before the
  // world moves on.
  const events: RoundEvent[] = [];
  const rhythmEvents: RhythmEvent[] = [];
  const tapContext = beatContext(round, previousState);
  for (const point of collectTapPoints(args, scene.viewport)) {
    resolvePoint(round, rhythm, point, tapContext, events, rhythmEvents);
  }
  events.push(...tickRound(round, delta));
  // Ticked after the round so beat windows close against the clock the round
  // just advanced, but judged under the state the frame started in — a round
  // that ends on this very tick must still close out the beats it contained.
  // The clock does not move in READY, PAUSED, or a terminal state, so this is
  // inert there without a rule of its own.
  rhythmEvents.push(...tickRhythm(rhythm, beatContext(round, previousState)));

  applyEvents(entities, round, events);
  applyRhythmEvents(entities, rhythmEvents);

  tickEffects(scene.effects, delta);
  tickShards(scene.shards, delta);
  // The stage keeps breathing in every state, menus included, so it is ticked
  // outside the round clock and reads targets rather than owning any.
  tickStageMotion(scene.stageMotion, targetViews(round), delta);

  if (round.state !== previousState) scene.onStateChange?.(round.state);

  return entities;
}
