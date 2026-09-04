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

A mug caught **near the drummer** is drunk and pays a bonus; a mug hit while it
is still far away breaks with the stick exactly as it does today. Everything
else about a mug stays exactly what it was.

## Required work

1. **Branch the mug on distance.** On `TARGET_HIT` with `kind === 'beerMug'`,
   compare `closenessAt(progress)` against a new
   `DRINK_MIN_CLOSENESS = 0.5` in `game/config/targets.ts`:
   - **at or above** — no glass shards, no `glassBreak`, drink plays, bonus
     awarded. The impact burst stays.
   - **below** — the existing break path, untouched: burst, five shards,
     `glassBreak`, `75 × multiplier` and no bonus.

   **Gate on `closenessAt`, never on `progress`.** They are not the same axis:
   `progress` is linear in time, and at `progress` 0.60 a mug has crossed only
   **26%** of the visible distance (`STAGE.farDepth` is 4.2). Gating on time
   would put the drummer's forearm on screen for a mug still small and near the
   vanishing point — the exact "pode ficar estranho" this milestone was told to
   avoid. `closeness` 0.5 is `progress` 0.808, mug at 62% size, y 655, leaving
   346–452 ms to land the hit on a normal mug and 260–298 ms on a fastball.
   The spec's section A carries the full table.
2. **Two-frame POV drink** — `mug_drink_01_catch.png` held 120 ms, then
   `mug_drink_02_drink.png` held 240 ms, then a 120 ms fade: **480 ms total,
   the same as the three-frame version**. The owner cut the middle `raise`
   frame on 2026-09-04 after seeing the renders, and the measurement backs it:
   catch→drink holds the arm to 2–6 px, catch→raise drifts 14–15 px against an
   8 px budget. Keeping the total at 480 ms preserves every density number in
   the spec and doubles the payoff frame's screen time. One slot; a second mug
   landing mid-drink **cuts to the drink frame** rather than restarting from
   the catch, so the payoff always lands. The show throws
   two mugs closer than 480 ms apart twice a round (measured; the Encore never
   does), and those are exactly the cases a restart would spoil. Presentation
   state only, aged in elapsed ms, cleared by `clearEffects`.
3. **Placement**, bottom-right, proposed rect x 1380–1900 / y 640–1080. It must
   intersect neither `padBounds()` (x 640–1280, y 865–1075) nor the central
   lane corridor. Occluding the guitarist's legs is accepted — it is the
   drummer's own arm, nearer to the camera than anything on stage.
4. **`SCORING.drinkBonus`, flat, 25**, added on top of
   `basePoints: 75 × comboMultiplier` **only on a mug that is drunk** — a mug
   smashed early pays `75 × multiplier` and nothing more, or waiting buys the
   player nothing. **Not multiplied by the combo** — the mug is the easier target (120 px radius against 104, slower at
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
   supposed to change more than that and its second frame is supposed not to
   match its first. Exclude it from the loop-continuity gate and add **two**
   manifest entries with `requiredForMvp: false`.

   **Do not claim the 8 px anchor is covered by the existing gate — it is not.**
   `measure-art-bounds.mjs` anchors on the lowest opaque row, and the arm runs
   to the frame edge in both frames, so the drift reads 0 however far the arm
   swims sideways. Add a real sequence check that measures the arm's edge
   position and thickness at matched rows; the delivered pair's worst case is
   6 px and it should stay a passing case.

8. **Record the conditioning flag.** The family conditions at
   `--card-chroma 40` (card measured 27–35, foam 47), not at the default 30.
   Put it in the provenance record, or nobody can reproduce the staging output.
8. **Record the score discontinuity** in `project-status.md`: Defense scores
   are not comparable across the M18 boundary, as Groove scores are not across
   M13/M13.1.

## Do not

- Change the mug's `basePoints`, hitbox, approach windows, integrity cost, or
  combo behaviour. The bonus is additive and flat.
- Gate the drink on `progress`, or on a raw `y`/`scale` comparison of your own.
  `closenessAt` is the one source for "how near is it".
- Add a glow, rim, or HUD cue marking a mug as drinkable. Deliberately excluded
  — whether the two outcomes read as a rule is a device-review question.
- Vary `DRINK_MIN_CLOSENESS` by stage, by kind, or over a round.
- Restore Show Integrity on a drink, or add any drunk meter. Both are deferred
  by the spec, on purpose.
- Give the bottle a drink animation. The bottle breaking is the contrast that
  makes the joke work.

## Verification

`npm run verify` plus:

- a mug hit at `closeness ≥ 0.5` spawns zero shards and fires no `glassBreak`;
  a mug hit below 0.5 produces the pre-M18 break in every respect; a bottle hit
  is unchanged at every distance;
- **a mug hit at `progress` 0.60 breaks** — `closeness` there is 0.26. This
  case fails loudly if the gate is ever moved onto the time axis;
- a drunk mug awards `75 × multiplier + 25`, asserted at the ×1, ×2, ×3 and ×4
  tiers, with the bonus never multiplied; a mug smashed early awards
  `75 × multiplier`;
- on a replayed seed, combo, `targetsDestroyed` and integrity match their
  pre-M18 values exactly at both distances; only the score differs, and only by
  25 per mug actually drunk;
- the drink rect intersects neither `padBounds()` nor the lane corridor;
- a second mug drunk within 480 ms runs one animation, never two;
- the frames are excluded from the loop-continuity gate and present in the
  manifest;
- animation and SFX are cleared on quit, restart, and unmount (rule 11).

## Return

1. Incoming branch/HEAD.
2. What was changed, per file, and why.
3. Gulp SFX provenance, or the reason it shipped without one.
4. Measured score delta over one replayed Stage 3 seed, before and after, plus
   how many of that seed's mugs were drunk against smashed.
5. Verification results, with test counts.
6. Current git status.
7. Final state: `M18_DRINK_DEVICE_REVIEW`.

Then STOP. Do not push. Do not launch an EAS build.
