/** Engine input and clock adapter for the pure Crowd Mode domain (M27–M30). */
import type { GameEntities } from '../entities/sceneEntities.ts';
import { fitCanvas, screenToCanvas, type CanvasFit, type Viewport } from '../rendering/layout.ts';
import {
  beginCrowdGesture,
  moveCrowdGesture,
  releaseCrowdGesture,
  tickCrowd,
} from '../crowd/crowdState.ts';
import type { CrowdPoint } from '../crowd/crowdConfig.ts';

interface EngineTouch {
  type: string;
  event: { locationX?: number; locationY?: number; pageX?: number; pageY?: number };
}

interface WebPoint {
  clientX?: number;
  clientY?: number;
}

interface EngineInput {
  name: string;
  payload: WebPoint & {
    touches?: ArrayLike<WebPoint>;
    changedTouches?: ArrayLike<WebPoint>;
  };
}

export interface CrowdSystemArgs {
  touches?: EngineTouch[];
  input?: EngineInput[];
  time: { delta: number };
}

function nativePoint(touch: EngineTouch, fit: CanvasFit, viewport: Viewport): CrowdPoint | null {
  const { pageX, pageY, locationX, locationY } = touch.event;
  if (typeof pageX === 'number' && typeof pageY === 'number') {
    return screenToCanvas(fit, pageX - viewport.pageX, pageY - viewport.pageY);
  }
  if (typeof locationX === 'number' && typeof locationY === 'number') {
    return screenToCanvas(fit, locationX, locationY);
  }
  return null;
}

function webPoint(event: EngineInput, fit: CanvasFit, viewport: Viewport): CrowdPoint | null {
  const changed = event.payload.changedTouches;
  const current = event.payload.touches;
  const source =
    changed && changed.length > 0
      ? changed[0]
      : current && current.length > 0
        ? current[0]
        : event.payload;
  if (typeof source.clientX !== 'number' || typeof source.clientY !== 'number') return null;
  return screenToCanvas(
    fit,
    source.clientX - viewport.pageX,
    source.clientY - viewport.pageY,
  );
}

function applyGestureEvent(
  entities: GameEntities,
  kind: 'start' | 'move' | 'end',
  point: CrowdPoint | null,
): void {
  const state = entities.scene.crowd;
  if (kind === 'start' && point) beginCrowdGesture(state, point);
  if (kind === 'move' && point) moveCrowdGesture(state, point);
  if (kind === 'end') {
    const release = point ?? state.gestureCurrent;
    if (release) releaseCrowdGesture(state, release);
  }
}

const WEB_EVENT_KIND: Readonly<Record<string, 'start' | 'move' | 'end' | undefined>> = {
  onMouseDown: 'start',
  onMouseMove: 'move',
  onMouseUp: 'end',
  onTouchStart: 'start',
  onTouchMove: 'move',
  onTouchEnd: 'end',
};

/**
 * Runs only on the Crowd screen. Band Mode keeps its established round system
 * and touch-down behavior unchanged.
 */
export function crowdSystem(entities: GameEntities, args: CrowdSystemArgs): GameEntities {
  const scene = entities.scene;
  if (scene.flow.screen !== 'CROWD') return entities;
  const phaseBefore = scene.crowd.phase;
  const scoreBefore = scene.crowd.score;
  const feedbackBefore = scene.crowd.feedback;

  const fit = fitCanvas(scene.viewport.width, scene.viewport.height);
  for (const touch of args.touches ?? []) {
    if (touch.type !== 'start' && touch.type !== 'move' && touch.type !== 'end') continue;
    applyGestureEvent(entities, touch.type, nativePoint(touch, fit, scene.viewport));
  }
  for (const event of args.input ?? []) {
    const kind = WEB_EVENT_KIND[event.name];
    if (!kind) continue;
    applyGestureEvent(entities, kind, webPoint(event, fit, scene.viewport));
  }

  tickCrowd(scene.crowd, args.time?.delta ?? 0);
  if (
    scene.crowd.phase !== phaseBefore ||
    scene.crowd.score !== scoreBefore ||
    scene.crowd.feedback !== feedbackBefore
  ) {
    scene.onCrowdChange?.();
  }
  return entities;
}
