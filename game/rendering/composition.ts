/**
 * Where Pack 1 bitmaps sit on the reference canvas, and which side of the
 * foreground drum kit each one belongs on (M6B).
 *
 * Pure data and pure functions: no React, no React Native, and no asset
 * import, so the composition is assertable without a renderer
 * (AGENTS.md rule 4). None of it is gameplay truth — hit radii, tap regions,
 * and trajectories stay in `game/config` and `game/state`, and no rectangle
 * here is ever consulted by hit resolution (AGENTS.md rule 17).
 */
import { PERFORMER_ANCHORS, REFERENCE_CANVAS, STAGE } from '../config/stage.ts';
import type { PerformerId } from '../systems/stageMotion.ts';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A rect as a React Native style.
 *
 * Rects are authored as x/y, which is not what a style means: React Native
 * wants `left`/`top`, ignores `x`/`y` outright, and lays an image out in
 * normal flow unless it is told `position: 'absolute'`. Handing a bare rect to
 * `style` therefore stacks the layers down the screen instead of placing them
 * — and the type checker cannot catch it, because excess properties are only
 * rejected on object literals, not on a variable that happens to carry extra
 * keys. Every placement goes through here so that mistake has nowhere to live.
 */
export function absolute(rect: Rect) {
  return {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.width,
    height: rect.height,
  } as const;
}

/** Rear crowd. Authored at canvas width, so it is placed at its native size. */
export const CROWD_BACK_RECT: Rect = { x: 0, y: 300, width: 1920, height: 520 };

/** Front crowd, the three-frame loop. Also authored at canvas width. */
export const CROWD_FRONT_RECT: Rect = { x: 0, y: 430, width: 1920, height: 420 };

/**
 * Foreground drum kit.
 *
 * `drumkit_pov.png` is authored 1920x700 at canvas width and reads as sitting
 * on the bottom edge, so its native size is its placement. Stretching it to a
 * different box would bend the cymbals and shells out of shape.
 */
export const DRUM_KIT_RECT: Rect = {
  x: 0,
  y: REFERENCE_CANVAS.height - 700,
  width: REFERENCE_CANVAS.width,
  height: 700,
};

/**
 * One frame for all three performers, matching the 640x900 authored aspect so
 * nobody is squashed, and one shared floor line so the band stands on the same
 * stage (M6, "the same ground anchor").
 */
export const PERFORMER_FRAME = { width: 370, height: 520 } as const;
export const PERFORMER_BASELINE_Y = 800;

/**
 * The frame a performer's art is drawn into. Horizontal position comes from
 * the domain anchor that reaction proximity already uses, so art and
 * choreography can never disagree about where somebody is standing.
 */
export function performerRect(id: PerformerId): Rect {
  return {
    x: PERFORMER_ANCHORS[id].x - PERFORMER_FRAME.width / 2,
    y: PERFORMER_BASELINE_Y - PERFORMER_FRAME.height,
    width: PERFORMER_FRAME.width,
    height: PERFORMER_FRAME.height,
  };
}

/**
 * True for anything close enough to be between the drummer and their own kit.
 *
 * The kit is the foreground, but a bottle at the end of its arc is a
 * hand's width from the player's face — nearer than the toms, not behind
 * them. Drawing the whole projectile layer behind the kit hid the last tenth
 * of every flight, which is exactly the tenth the player has to react to, and
 * hid the break burst that confirms a hit.
 */
export function isNearField(y: number): boolean {
  return y >= STAGE.drumkitNearY;
}

/**
 * Splits a layer into what the kit occludes and what passes in front of it.
 * Order within each half is preserved, so nothing changes z-order between
 * frames except by crossing the near line.
 */
export function partitionByDepth<T>(
  items: readonly T[],
  yOf: (item: T) => number,
): { far: T[]; near: T[] } {
  const far: T[] = [];
  const near: T[] = [];
  for (const item of items) {
    (isNearField(yOf(item)) ? near : far).push(item);
  }
  return { far, near };
}
