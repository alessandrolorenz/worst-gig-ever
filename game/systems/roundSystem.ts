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
import type { RoundEvent } from '../state/roundEvents.ts';
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

export function roundSystem(entities: GameEntities, args: RoundSystemArgs): GameEntities {
  const scene = entities.scene;
  const round = scene.round;
  const previousState = round.state;
  const delta = args.time?.delta ?? 0;

  // Taps are resolved against the frame the player actually saw, before the
  // world moves on.
  const events: RoundEvent[] = [];
  for (const point of collectTapPoints(args, scene.viewport)) {
    events.push(...resolveTap(round, point));
  }
  events.push(...tickRound(round, delta));

  applyEvents(entities, round, events);

  tickEffects(scene.effects, delta);
  tickShards(scene.shards, delta);
  // The stage keeps breathing in every state, menus included, so it is ticked
  // outside the round clock and reads targets rather than owning any.
  tickStageMotion(scene.stageMotion, targetViews(round), delta);

  if (round.state !== previousState) scene.onStateChange?.(round.state);

  return entities;
}
