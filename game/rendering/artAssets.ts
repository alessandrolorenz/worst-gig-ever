/**
 * Pack 1 visual asset registry.
 *
 * This is the only runtime module that names concrete art files. Gameplay and
 * configuration continue to use semantic state; the renderer performs the
 * final mapping from that state to a bundled image (M6B).
 */

/* Metro resolves bundled PNG files through static `require` calls. */
/* eslint-disable @typescript-eslint/no-var-requires */

import type { PerformerId, PerformerPose } from '../systems/stageMotion.ts';

type PerformerArtSet = Readonly<Record<PerformerPose, number>>;

export const STAGE_ART = {
  background: require('../../assets/art/backgrounds/stage_bg_base.png'),
  lights: require('../../assets/art/backgrounds/stage_lights_overlay.png'),
  crowdBack: require('../../assets/art/crowd/crowd_back.png'),
  crowdFrames: [
    require('../../assets/art/crowd/crowd_front_01.png'),
    require('../../assets/art/crowd/crowd_front_02.png'),
    require('../../assets/art/crowd/crowd_front_03.png'),
  ],
  drumKit: require('../../assets/art/drums/drumkit_pov.png'),
} as const;

export const PERFORMER_ART: Readonly<Record<PerformerId, PerformerArtSet>> = {
  vocalist: {
    idle: require('../../assets/art/band/vocalist_idle.png'),
    loopA: require('../../assets/art/band/vocalist_loop_a.png'),
    loopB: require('../../assets/art/band/vocalist_loop_b.png'),
    hitReaction: require('../../assets/art/band/vocalist_hit_reaction.png'),
    dodge: require('../../assets/art/band/vocalist_dodge.png'),
  },
  bassist: {
    idle: require('../../assets/art/band/bassist_idle.png'),
    loopA: require('../../assets/art/band/bassist_loop_a.png'),
    loopB: require('../../assets/art/band/bassist_loop_b.png'),
    hitReaction: require('../../assets/art/band/bassist_hit_reaction.png'),
    dodge: require('../../assets/art/band/bassist_dodge.png'),
  },
  guitarist: {
    idle: require('../../assets/art/band/guitarist_idle.png'),
    loopA: require('../../assets/art/band/guitarist_loop_a.png'),
    loopB: require('../../assets/art/band/guitarist_loop_b.png'),
    hitReaction: require('../../assets/art/band/guitarist_hit_reaction.png'),
    dodge: require('../../assets/art/band/guitarist_dodge.png'),
  },
};

export const VOCALIST_BLOCKING_ART = require('../../assets/art/band/vocalist_blocking.png');

export const TARGET_ART = {
  beerBottle: require('../../assets/art/props/beer_bottle.png'),
  beerMug: require('../../assets/art/props/beer_mug.png'),
} as const;

export const DRUMSTICK_ART = require('../../assets/art/props/drumstick.png');
export const HIT_BURST_ART = require('../../assets/art/effects/hit_burst.png');

/** The two-frame POV drink, in play order (M18). */
export const MUG_DRINK_ART = [
  require('../../assets/art/effects/mug_drink_01_catch.png'),
  require('../../assets/art/effects/mug_drink_02_drink.png'),
];

export const GLASS_SHARD_ART = [
  require('../../assets/art/effects/glass_shard_01.png'),
  require('../../assets/art/effects/glass_shard_02.png'),
  require('../../assets/art/effects/glass_shard_03.png'),
  require('../../assets/art/effects/glass_shard_04.png'),
  require('../../assets/art/effects/glass_shard_05.png'),
  require('../../assets/art/effects/glass_shard_06.png'),
] as const;
