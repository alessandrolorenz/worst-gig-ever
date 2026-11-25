/**
 * Crowd Mode art-slot manifest (M29).
 *
 * Every image Crowd Mode will eventually draw, named before it exists. Pure
 * data: no `require`, no React. It is the machine-readable half of
 * docs/assets/CROWD-MODE-ASSET-CONTRACT.md, and the two are kept in step by
 * tests/crowdArtSlots.test.ts.
 *
 * A slot is `placeholder` until its file is delivered and wired, then
 * `integrated`. The test fails if a `placeholder` slot's file already exists
 * or an `integrated` slot's file is missing, so art can neither arrive
 * unannounced nor be claimed before it lands (AGENTS.md rule 14).
 *
 * `box` is where the art is drawn on the 1920x1080 canvas. It is never a
 * hitbox: those live in crowdConfig and do not move when art changes.
 */
import {
  CROWD_CANVAS,
  crowdTarget,
  type CrowdRect,
} from './crowdConfig.ts';

export const CROWD_ART_DIRECTORY = 'assets/art/crowd_mode';

export type CrowdArtSlotStatus = 'placeholder' | 'integrated';

export interface CrowdArtSlot {
  /** Path from the repository root. */
  readonly expectedFile: string;
  readonly required: boolean;
  readonly status: CrowdArtSlotStatus;
  /** The component in CrowdPlaceholders.tsx this art replaces. */
  readonly placeholder: string;
  /** The domain state in which the art is shown. */
  readonly shownWhen: string;
  readonly transparent: boolean;
  /** Draw box on the reference canvas; for a mover, its box at rest. */
  readonly box: CrowdRect;
  /** Fraction of `box` that stays put when code transforms the art. */
  readonly anchor: { readonly x: number; readonly y: number };
  /** Paint order, back (0) to front. */
  readonly zLayer: number;
  /** What code does to the art, so none of it is baked into the image. */
  readonly codeDriven: readonly ('translate' | 'rotate' | 'scale' | 'fall' | 'bob' | 'shake')[];
}

const file = (name: string) => `${CROWD_ART_DIRECTORY}/${name}`;
const FULL_CANVAS: CrowdRect = { x: 0, y: 0, ...CROWD_CANVAS };
const CENTRE = { x: 0.5, y: 0.5 } as const;
const FEET = { x: 0.5, y: 1 } as const;

/** Performer frames share one box per performer so a pose swap never jumps. */
const BASSIST_BOX: CrowdRect = { x: 130, y: 180, width: 570, height: 600 };
const VOCALIST_BOX: CrowdRect = { x: 555, y: 170, width: 500, height: 740 };
const GUITARIST_BOX: CrowdRect = { x: 1330, y: 75, width: 495, height: 755 };

export const CROWD_ART_SLOTS = {
  stagePlate: {
    expectedFile: file('crowd_stage_plate.jpg'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdStagePlatePlaceholder',
    shownWhen: 'always',
    transparent: false,
    box: FULL_CANVAS,
    anchor: CENTRE,
    zLayer: 0,
    codeDriven: [],
  },
  amplifierIntact: {
    expectedFile: file('amplifier_intact.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdAmplifierPlaceholder',
    shownWhen: "stageProps.amplifier.status === 'intact'",
    transparent: true,
    box: crowdTarget('amplifier').rect,
    anchor: FEET,
    zLayer: 10,
    codeDriven: [],
  },
  amplifierDamaged: {
    expectedFile: file('amplifier_damaged.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdAmplifierPlaceholder',
    shownWhen: "stageProps.amplifier.status === 'damaged'",
    transparent: true,
    box: crowdTarget('amplifier').rect,
    anchor: FEET,
    zLayer: 10,
    codeDriven: ['shake'],
  },
  cymbal: {
    expectedFile: file('cymbal.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdCymbalPlaceholder',
    shownWhen: 'every status of crashCymbal and rideCymbal (one sprite, drawn twice)',
    transparent: true,
    box: crowdTarget('rideCymbal').rect,
    anchor: CENTRE,
    zLayer: 11,
    codeDriven: ['scale', 'rotate', 'fall'],
  },
  bassistPerforming: {
    expectedFile: file('bassist_performing.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.bassist.armed',
    transparent: true,
    box: BASSIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
  bassistDisarmed: {
    expectedFile: file('bassist_disarmed.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: '!performers.bassist.armed',
    transparent: true,
    box: BASSIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
  vocalistPerforming: {
    expectedFile: file('vocalist_performing.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.vocalist.armed',
    transparent: true,
    box: VOCALIST_BOX,
    anchor: FEET,
    zLayer: 21,
    codeDriven: ['rotate', 'translate'],
  },
  vocalistDisarmed: {
    expectedFile: file('vocalist_disarmed.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: '!performers.vocalist.armed',
    transparent: true,
    box: VOCALIST_BOX,
    anchor: FEET,
    zLayer: 21,
    codeDriven: ['rotate', 'translate'],
  },
  guitaristPerforming: {
    expectedFile: file('guitarist_performing.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.guitarist.armed',
    transparent: true,
    box: GUITARIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
  guitaristDisarmed: {
    expectedFile: file('guitarist_disarmed.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: '!performers.guitarist.armed',
    transparent: true,
    box: GUITARIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
  microphoneProp: {
    expectedFile: file('microphone_prop.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdMicrophonePlaceholder',
    shownWhen: "stageProps.microphone.status is 'falling' or 'down'",
    transparent: true,
    box: crowdTarget('microphone').rect,
    anchor: CENTRE,
    zLayer: 30,
    codeDriven: ['rotate', 'fall'],
  },
  guitarProp: {
    expectedFile: file('guitar_prop.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdInstrumentPlaceholder',
    shownWhen: "stageProps.guitar.status is 'falling' or 'down'",
    transparent: true,
    box: { x: 1435, y: 230, width: 380, height: 340 },
    anchor: { x: 0.25, y: 0.7 },
    zLayer: 30,
    codeDriven: ['rotate', 'fall'],
  },
  bassProp: {
    expectedFile: file('bass_prop.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdInstrumentPlaceholder',
    shownWhen: "stageProps.bass.status is 'falling' or 'down'",
    transparent: true,
    box: { x: 220, y: 330, width: 475, height: 330 },
    anchor: { x: 0.25, y: 0.7 },
    zLayer: 30,
    codeDriven: ['rotate', 'fall'],
  },
  waiter: {
    expectedFile: file('waiter.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdWaiterPlaceholder',
    shownWhen: 'crowdBlockerPose(...).visible',
    transparent: true,
    // The authored file size. Drawn larger, feet-anchored: `crowdWaiterDrawRect`.
    box: { x: 0, y: 0, width: 230, height: 430 },
    anchor: FEET,
    zLayer: 40,
    codeDriven: ['translate', 'bob'],
  },
  throwHand: {
    expectedFile: file('throw_hand.png'),
    required: true,
    status: 'integrated',
    placeholder: 'CrowdThrowHandPlaceholder',
    shownWhen: "phase is 'ready' or 'aiming'",
    transparent: true,
    box: { x: 860, y: 880, width: 300, height: 200 },
    anchor: { x: 0.5, y: 1 },
    zLayer: 50,
    codeDriven: [],
  },
  audienceForeground: {
    expectedFile: file('audience_foreground.png'),
    required: false,
    status: 'placeholder',
    placeholder: '(none — the audience is baked into the stage plate)',
    shownWhen: 'always, if delivered',
    transparent: true,
    box: { x: 0, y: 660, width: 1920, height: 420 },
    anchor: FEET,
    zLayer: 45,
    codeDriven: [],
  },
  bassistHit: {
    expectedFile: file('bassist_hit.png'),
    required: false,
    status: 'placeholder',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.bassist.reacting',
    transparent: true,
    box: BASSIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
  vocalistHit: {
    expectedFile: file('vocalist_hit.png'),
    required: false,
    status: 'placeholder',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.vocalist.reacting',
    transparent: true,
    box: VOCALIST_BOX,
    anchor: FEET,
    zLayer: 21,
    codeDriven: ['rotate', 'translate'],
  },
  guitaristHit: {
    expectedFile: file('guitarist_hit.png'),
    required: false,
    status: 'placeholder',
    placeholder: 'CrowdPerformerPlaceholder',
    shownWhen: 'performers.guitarist.reacting',
    transparent: true,
    box: GUITARIST_BOX,
    anchor: FEET,
    zLayer: 20,
    codeDriven: ['rotate', 'translate'],
  },
} as const satisfies Record<string, CrowdArtSlot>;

export type CrowdArtSlotId = keyof typeof CROWD_ART_SLOTS;

/**
 * Where the waiter is drawn for a given hit rect (M32).
 *
 * The same `waiter.png`, scaled up to a foreground figure and stood on the
 * hit rect's feet line. Wider than the rect on purpose: the tray and the
 * trailing arm are drawn, not hittable.
 */
export const CROWD_WAITER_DRAW = { width: 334, height: 624 } as const;

export function crowdWaiterDrawRect(hit: CrowdRect): CrowdRect {
  return {
    x: hit.x + (hit.width - CROWD_WAITER_DRAW.width) / 2,
    y: hit.y + hit.height - CROWD_WAITER_DRAW.height,
    width: CROWD_WAITER_DRAW.width,
    height: CROWD_WAITER_DRAW.height,
  };
}
