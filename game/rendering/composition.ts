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
import type { TargetKind } from '../state/gameState.ts';
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

/**
 * Crowd layers, back and front, both authored at canvas width.
 *
 * Their vertical placement is the depth order: whoever is nearer stands lower
 * on screen. Placed flush, the front row's feet landed *above* the rear row's,
 * so the near crowd read as standing on the far crowd's heads. Both rows start
 * above the stage lip around y=828 in the background art — the crowd is beyond
 * the stage, the band is on it.
 *
 * The boxes are larger than the drawn crowds: the bitmaps carry transparent
 * padding, so these edges were tuned by eye on device and the front row's
 * lower edge in particular runs behind the band and the foreground kit rather
 * than marking a ground line.
 */
export const CROWD_BACK_RECT: Rect = { x: 0, y: 440, width: 1920, height: 420 };
export const CROWD_FRONT_RECT: Rect = { x: 0, y: 482, width: 1920, height: 520 };

/**
 * How far the kit is dropped below a bottom-anchored placement, in canvas px.
 *
 * Sitting flush on the bottom edge, the kit ate most of the venue: cymbals
 * crossed the band's torsos and the stage behind them barely read. Dropping it
 * runs the nearest shells off the bottom of the canvas — which is where the
 * closest part of a kit belongs from the drummer's seat — and gives the room
 * back. `STAGE.drumkitNearY` moves with it.
 */
export const DRUM_KIT_DROP = 120;

/**
 * Foreground drum kit.
 *
 * `drumkit_pov.png` is authored 1920x700 at canvas width, so its native size
 * is its placement — stretching it to a different box would bend the cymbals
 * and shells out of shape. Only the vertical offset is a composition choice;
 * whatever falls past the bottom edge is clipped by the canvas.
 */
export const DRUM_KIT_RECT: Rect = {
  x: 0,
  y: REFERENCE_CANVAS.height - 700 + DRUM_KIT_DROP,
  width: REFERENCE_CANVAS.width,
  height: 700,
};

/**
 * Drawn size of a thrown target at full approach, in canvas px.
 *
 * Presentation only — hit resolution reads `effectiveHitRadius` and never
 * this. The ceiling on these numbers is that the *visible* artwork must stay
 * inside the tap circle, or the player aims at pixels that are not tappable;
 * `tests/composition.test.ts` holds them to it.
 *
 * The mug is drawn larger than the bottle because the domain already says it
 * is a bigger target (a 120 px tap radius against the bottle's 104). Until now
 * the art said the opposite.
 *
 * Enlarged again on 2026-08-31 so a target reads at the shorter approach
 * times: bottle +19%, mug +29%. The mug had that much slack against its own
 * tap circle; the bottle did not, and is the reason
 * `beerBottle.hitRadiusAtDangerLine` moved with it. A bottle is a tall, thin,
 * hard-spinning object, so its half-diagonal — the ceiling here — is nearly
 * its half-height, and it runs out of room long before the squat mug does.
 */
export const TARGET_DRAW_SIZE: Readonly<Record<TargetKind, { width: number; height: number }>> = {
  beerBottle: { width: 128, height: 260 },
  beerMug: { width: 240, height: 232 },
};

/** Pack 1 prop frames, and the opaque artwork inside them, in source px. */
const TARGET_ART_FRAME: Readonly<Record<TargetKind, { width: number; height: number }>> = {
  beerBottle: { width: 256, height: 512 },
  beerMug: { width: 384, height: 384 },
};

/**
 * Measured opaque bounds inside those frames. A prop is mostly padding — the
 * bottle covers 94x470 of its 256x512 frame — so the layout box overstates
 * how much of the screen the object actually occupies. Regenerating a prop
 * means re-measuring these.
 */
const TARGET_ART_CONTENT: Readonly<Record<TargetKind, { width: number; height: number }>> = {
  beerBottle: { width: 94, height: 470 },
  beerMug: { width: 306, height: 312 },
};

/**
 * The artwork a player actually sees for a target, after `resizeMode="contain"`
 * fits the frame into the drawn box and the transparent padding is discounted.
 */
export function targetVisibleSize(
  kind: TargetKind,
  scale: number,
): { width: number; height: number } {
  const box = TARGET_DRAW_SIZE[kind];
  const frame = TARGET_ART_FRAME[kind];
  const content = TARGET_ART_CONTENT[kind];
  const fit = Math.min(box.width / frame.width, box.height / frame.height);
  return { width: content.width * fit * scale, height: content.height * fit * scale };
}

/** Half-diagonal of the visible artwork: its furthest point from its centre. */
export function targetVisibleReach(kind: TargetKind, scale: number): number {
  const { width, height } = targetVisibleSize(kind, scale);
  return Math.hypot(width / 2, height / 2);
}

/**
 * One frame for all three performers, matching the 640x900 authored aspect so
 * nobody is squashed, and one shared floor line so the band stands on the same
 * stage (M6, "the same ground anchor").
 */
export const PERFORMER_FRAME = { width: 370, height: 520 } as const;

/**
 * The stage floor the band stands on.
 *
 * Below the rear crowd's ground line, because the band is nearer than the
 * audience, and below the stage lip in the background art so they are standing
 * on the boards rather than in the pit. Their feet meet the drum kit, which is nearer still.
 */
export const PERFORMER_BASELINE_Y = 862;

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
