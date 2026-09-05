/**
 * Story still registry (M15).
 *
 * The only runtime module that names a story image file, in the same way
 * `artAssets.ts` is the only one that names a gameplay sprite. `storyState.ts`
 * knows panel ids and nothing about JPEGs; since M19 it does not know the
 * captions either.
 *
 * These are **flattened narrative stills**, not gameplay art: nothing moves in
 * them, nothing is composited against them, and no hitbox is measured from
 * them, so AGENTS.md rule 16 (keep movable assets isolated from backgrounds)
 * has nothing to isolate here.
 *
 * They are JPEG rather than PNG, which is the one place in the project that
 * deviates from the PNG art pipeline. The reason is size: the five source
 * renders are 11.5 MB of full-frame PNG and they are opaque, full-bleed
 * photographic-density illustrations with no alpha to preserve — exactly the
 * content JPEG is for. At 1600x900 and quality 85 they are 2.3 MB in total.
 * The `validate:art` gate is a PNG contract for the 33 gameplay assets and
 * deliberately does not cover these; `tests/storyContract.test.ts` covers them
 * instead.
 *
 * Provenance for all five: docs/assets/M15-STORY-ART-PROVENANCE.md.
 */

/* Metro resolves bundled image files through static `require` calls. */
/* eslint-disable @typescript-eslint/no-var-requires */

import { STORY_PANELS, type StoryPanelId } from '../state/storyState.ts';

export const STORY_ART: Readonly<Record<StoryPanelId, number>> = {
  poster: require('../../assets/art/story/01_poster.jpg'),
  arrival: require('../../assets/art/story/02_arrival.jpg'),
  setup: require('../../assets/art/story/03_setup.jpg'),
  performance: require('../../assets/art/story/04_performance.jpg'),
  soundDesk: require('../../assets/art/story/05_sound_desk.jpg'),
};

/**
 * The still for a panel id, or null if the registry has no entry.
 *
 * Null rather than a throw: a missing still must cost the player a picture,
 * not the app. The pairing is asserted in `tests/storyContract.test.ts`, so a
 * gap is a failing test long before it is a blank screen.
 */
export function storyImageFor(panelId: StoryPanelId): number | null {
  return STORY_ART[panelId] ?? null;
}

/** Panel ids the registry covers, for the contract test. */
export function storyArtIds(): readonly string[] {
  return Object.keys(STORY_ART);
}

/** Panel ids the story actually plays, for the contract test. */
export function storyPanelIds(): readonly string[] {
  return STORY_PANELS.map((panel) => panel.id);
}
