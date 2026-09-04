# Execute M18 — Mug Drink Reaction

Only execute once the owner has approved the three drink frames as a
**sequence** — played at 120 ms each, judged as motion rather than as stills.
Art is rendered outside this repository; see
`prompts/assets-v2/18-mug-drink-3frame.md`.

Independent of M16 and M17. It may run before, after, or between them.

Read:

- `docs/specs/M18-mug-drink-reaction.md`
- `game/config/scoring.ts`, `game/config/targets.ts`
- `game/state/roundState.ts` (`resolveTap`), `game/state/roundEvents.ts`
- `game/systems/effects.ts`, `game/systems/shards.ts`
- `game/rendering/SceneRenderer.tsx`, `game/rendering/composition.ts`
- `game/audio/audioAssets.ts`, `docs/assets/AUDIO-SOURCES.md`
- `assets/manifest/asset-manifest.json`, `scripts/measure-art-bounds.mjs`

## Goal

A tapped mug is drunk, not smashed, and drinking it pays. Everything else about
a mug stays exactly what it was.

## Required work

1. **Stop breaking mugs.** On `TARGET_HIT` with `kind === 'beerMug'`: no glass
   shards, no `glassBreak`. The impact burst stays.
2. **Three-frame POV drink**, 120 ms per frame plus a 120 ms fade — 480 ms
   total. One slot; a second mug restarts it rather than stacking. Presentation
   state only, aged in elapsed ms, cleared by `clearEffects`.
3. **Placement**, bottom-right, proposed rect x 1380–1900 / y 640–1080. It must
   intersect neither `padBounds()` (x 640–1280, y 865–1075) nor the central
   lane corridor. Occluding the guitarist's legs is accepted — it is the
   drummer's own arm, nearer to the camera than anything on stage.
4. **`SCORING.drinkBonus`, flat, 25**, added on top of
   `basePoints: 75 × comboMultiplier` on a mug hit. **Not multiplied by the
   combo** — the mug is the easier target (120 px radius against 104, slower at
   both ends of both windows), so a multiplied premium would make the easy
   object the best scoring path at high combo. It goes to the Defense score;
   the Groove is untouched.
5. **Show the award.** `+25 CHEERS` beside the drink, on the animation's 480 ms
   life, using the existing floating-award treatment — no new HUD panel. A
   bonus the player cannot see is a number in a log.
6. **Gulp SFX**, one short CC0 file at `assets/audio/sfx/mug_drink.wav`, full
   provenance in `docs/assets/AUDIO-SOURCES.md` (rule 13). If it cannot be
   licence-verified, ship without it and report it — never substitute silently
   (rule 14).
7. **Register the frames as a sequence, not a loop.** `npm run measure:art`
   enforces under 25% frame-to-frame change on ambient triplets; a drink is
   supposed to change more than that and its last frame is supposed not to
   match its first. Exclude it from the loop-continuity gate, keep the 8 px
   wrist-anchor check, and add three manifest entries with
   `requiredForMvp: false`.
8. **Record the score discontinuity** in `project-status.md`: Defense scores
   are not comparable across the M18 boundary, as Groove scores are not across
   M13/M13.1.

## Do not

- Change the mug's `basePoints`, hitbox, approach windows, integrity cost, or
  combo behaviour. The bonus is additive and flat.
- Restore Show Integrity on a drink, or add any drunk meter. Both are deferred
  by the spec, on purpose.
- Give the bottle a drink animation. The bottle breaking is the contrast that
  makes the joke work.

## Verification

`npm run verify` plus:

- a mug hit spawns zero shards and fires no `glassBreak`; a bottle hit is
  unchanged in every respect;
- a mug hit awards `75 × multiplier + 25`, asserted at the ×1, ×2, ×3 and ×4
  tiers, with the bonus never multiplied;
- on a replayed seed, combo, `targetsDestroyed` and integrity match their
  pre-M18 values exactly; only the score differs, and only by 25 per mug;
- the drink rect intersects neither `padBounds()` nor the lane corridor;
- a second mug within 480 ms runs one animation, never two;
- the frames are excluded from the loop-continuity gate and present in the
  manifest;
- animation and SFX are cleared on quit, restart, and unmount (rule 11).

## Return

1. Incoming branch/HEAD.
2. What was changed, per file, and why.
3. Gulp SFX provenance, or the reason it shipped without one.
4. Measured score delta over one replayed Stage 3 seed, before and after.
5. Verification results, with test counts.
6. Current git status.
7. Final state: `M18_DRINK_DEVICE_REVIEW`.

Then STOP. Do not push. Do not launch an EAS build.
