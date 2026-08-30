/**
 * The bridge between the engine loop and the round domain.
 *
 * Responsibilities, in order: turn platform input into canvas-space taps,
 * advance the domain by elapsed time, and translate what the domain reports
 * into presentation and audio. It holds no gameplay rules of its own — every
 * decision is made inside `game/state/roundState.ts`.
 */
import { VOCALIST_BLOCKING_RECT } from '../config/stage.ts';
import type { GameEntities } from '../entities/sceneEntities.ts';
import { fitCanvas, screenToCanvas, type Viewport } from '../rendering/layout.ts';
import type { RoundEvent } from '../state/roundEvents.ts';
import { resolveTap, tickRound, type Point2D, type RoundState } from '../state/roundState.ts';
import { addBurst, addStrike, tickEffects } from './effects.ts';
import { spawnShards, tickShards } from './shards.ts';

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

function collectTapPoints(args: RoundSystemArgs, viewport: Viewport): Point2D[] {
  const fit = fitCanvas(viewport.width, viewport.height);
  const points: Point2D[] = [];

  for (const touch of args.touches ?? []) {
    if (!NATIVE_TAP_TYPES.has(touch.type)) continue;
    const x = touch.event.locationX ?? touch.event.pageX;
    const y = touch.event.locationY ?? touch.event.pageY;
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    points.push(screenToCanvas(fit, x, y));
  }

  for (const event of args.input ?? []) {
    if (!WEB_TAP_EVENTS.has(event.name)) continue;
    const source =
      event.payload.touches?.[0] ?? event.payload.changedTouches?.[0] ?? event.payload;
    const { clientX, clientY } = source as { clientX?: number; clientY?: number };
    if (typeof clientX !== 'number' || typeof clientY !== 'number') continue;
    // Browser events are window-relative; the play surface may be inset.
    points.push(screenToCanvas(fit, clientX - viewport.pageX, clientY - viewport.pageY));
  }

  return points;
}

function applyEvents(entities: GameEntities, round: RoundState, events: RoundEvent[]): void {
  const { effects, shards, audio } = entities.scene;

  for (const event of events) {
    switch (event.type) {
      case 'TARGET_HIT': {
        addStrike(effects, event.x, event.y);
        addBurst(effects, event.x, event.y);
        spawnShards(shards, event.x, event.y);
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

  if (round.state !== previousState) scene.onStateChange?.(round.state);

  return entities;
}
