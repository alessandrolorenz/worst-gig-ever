# M18 gate — mug drink reaction

**Branch:** `feat/m16-beat-clarity`, at `d3ee675`.
**Outcome:** `M18_DRINK_APPROVED`. The owner played 1.0.7 on the Galaxy S23 FE
and approved it on 2026-09-04.

The approval covers the milestone as built: the 0.35 threshold, the two-frame
drink at 120/240/120, the enlarged arm, the taught rule, and the 900 ms results
delay. It does **not** cover the two things listed as deliberately undone below
— the drink still has no sound and no visible award, and both were open when
the verdict was given.

## Automated

`npm run verify` — type-check, lint, **360 tests**, `PASS_ART_READY`,
`PASS_AMBIENT_LOOP_READY`.

New suite: `tests/mugDrink.test.ts` (10). The Pack 1 asset contract in
`tests/assetsContract.test.ts` was split rather than renumbered — its counts are
the M6A freeze, and M18 is not Pack 1, so later packs are separated by prompt
family and asserted on their own terms.

## What the milestone does

A mug caught near the drummer is drunk for a flat bonus; a mug swatted while it
is still far away breaks with the stick for exactly what it always paid. The
bottle breaks at every distance — that contrast is the joke.

| | Value |
|---|---|
| `DRINK_MIN_CLOSENESS` | 0.35 |
| `SCORING.drinkBonus` | 25, flat, outside the multiplier |
| Animation | 2 frames, 120 ms catch + 240 ms drink + 120 ms fade |
| `DRINK_RECT` | x 1360, y 585, 600 x 510 |

The break path was not deleted. It is the default and the drink is the branch,
so nothing already validated changed shape.

## The one thing that could quietly be wrong

**The gate is on `closenessAt`, never on `progress`.** They are not the same
axis: `progress` is linear in time, but depth runs from `STAGE.farDepth` 4.2
down to 1, so at progress 0.60 a mug has crossed only **26%** of the visible
distance. A time gate would put the drummer's forearm on screen to catch an
object still small and near the vanishing point — a worse version of the
oddness this milestone was asked to avoid.

`tests/mugDrink.test.ts` taps a mug at progress 0.60 and asserts it **breaks**.
That case exists so that moving the comparison onto the time axis fails loudly
instead of shipping.

## Art

Two frames, chained rather than generated independently: frame 1 drawn, frame 2
an edit of it. The owner generated three and dropped the middle `raise` frame.
Measured on the conditioned 640x544 output at matched rows:

| Pair | arm edge drift | thickness drift |
|---|---|---|
| **catch → drink (shipping)** | **2–6 px** | **2–6 px** |
| catch → raise (dropped) | 14–15 px | 14–15 px |

The 8 px budget makes the shipped pair the only pair that passes.

**`npm run measure:art` cannot check this and did not.** It anchors on the
lowest opaque row, and the forearm runs to the frame edge in both frames, so
the drift reads 0 however far the arm swims sideways. The numbers above were
measured by hand. Turning that into a real sequence check is open work, listed
below.

Conditioning needs `--card-chroma 40`: the renders came back on a beige card
measuring 27–35 chroma against the script's ≤30 card model, and the nearest
subject colour is the foam at 47. The flag was added for this and defaults to
30, so every family conditioned before M18 is byte-identical — verified by
re-conditioning the bassist family with the modified script.

## Device build

Installed on the Galaxy S23 FE from a local release APK
(`./android/gradlew -p android assembleRelease`, ~25 s, 116 MB, no EAS).

| Version | Contents |
| --- | --- |
| 1.0.6 | M18 as first specified — `DRINK_MIN_CLOSENESS` 0.5, `DRINK_RECT` 520x440 |
| **1.0.7** | the five 1.0.6 playtest corrections below |

Both verified past "it installed": the embedded bundle was unzipped and grepped
for the symbols the build was supposed to add, and the app was launched with
logcat watched for runtime errors. Neither crashed.

## The 1.0.6 playtest, and what changed

The owner played 1.0.6 and returned five items. One was a bug.

1. **The results screen was stealing the last beat.** A stage ends abruptly and
   the button row sits in the lower centre, over the groove pad the player is
   still tapping — so the next tap of a beat that no longer exists landed on
   "Next stage" and skipped a stage nobody chose to leave. `RoundState` now
   carries a `settledMs` clock that runs only in a terminal state, and the
   buttons are drawn immediately but deaf for `RESULTS_ARM_MS` = 900 ms, dimmed
   so the delay reads as settling rather than as a dead button.
2. **The drink was gated behind patience.** `DRINK_MIN_CLOSENESS` 0.5 → 0.35.
   At 0.5 the drink existed only in the last 19% of a mug's flight, so a player
   who taps as soon as a mug is reliably hittable — which the forgiveness rules
   actively encourage — never saw the animation at all.

   | | 0.5 | 0.35 |
   |---|---|---|
   | window, normal mug | 346–452 ms | **552–721 ms** |
   | window, fastball | 260–298 ms | **414–475 ms** |

3. **The arm is bigger and further in**, 520x440 at x 1428 → 600x510 at x 1360.
   The box now matches the art's own 640x544 aspect, so `contain` letterboxes
   nothing and the bleed margins are real: content lands at 1928 and 1083, still
   outside the canvas, so the forearm runs off the corner instead of ending in a
   floating stump. Clears the groove pad by 80 px.
4. **The mug rule is taught in words**, as a new bullet on stage 1.
5. **And in pictures.** `briefingFigures` is a new optional field on
   `StageDefinition`: a captioned figure row above the bullets, using art the
   game already ships. It lives inside the briefing's scroll view, so it costs
   the bullets nothing on the 411 dp viewport the overlay stack is measured
   against.

## Not done, deliberately

- **The gulp SFX.** Needs a licence-verified CC0 file; AGENTS.md rules 13 and 14
  forbid substituting one silently. The drink currently plays the impact burst
  and nothing else.
- **The `+25 CHEERS` flourish.** The spec assumed a floating-award treatment
  existed to reuse. None does, and inventing one is a HUD decision rather than
  part of this milestone. The bonus reads only in the Defense score — which
  matters more now that the drink is easy to see.
- **A real sequence check** in `scripts/measure-art-bounds.mjs`, replacing the
  by-hand arm measurement above.

## Consequence to carry forward

**Defense scores are not comparable across the M18 boundary**, as Groove scores
are not across M13/M13.1. A round with mugs scores higher after M18 for the same
play, and the gap widens with how many mugs the player chooses to drink.
