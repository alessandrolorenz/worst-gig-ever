# M14 V2 Integration Runbook

How to put V2 art into the game without repeating the Pack 1 failure.

## Before you start

Integration is blocked until all of the following are true:

1. the owner has approved the V2 direction past `V2_VISUAL_DIRECTION_REVIEW`;
2. that approval explicitly covers the corrected independent crowd cast, the
   drum kit with a clear snare and no resting sticks, and the simplified bottle;
3. production begins in the staging directory, never directly in `assets/art/`.

All three conditions were satisfied on 2026-09-02 by owner decision
`V2_DIRECTION_APPROVED`.

## Why this is a runbook and not a single pass

Pack 1 passed its own art gate and still could not animate. `validate:art`
reads PNG headers — signature, dimensions, alpha channel — so it approved three
different drawings of each character as an animation loop. The runtime held
`AMBIENT_LOOP_ART_READY = false` until the M14 production pass, showing one frame.

`npm run measure:art` decodes the pixels instead, and is the check that was
missing. On the pre-refresh Pack 1 art it reported:

```text
CONTINUITY vocalist  | drift 15px | change 43%, 70%
CONTINUITY bassist   | drift 42px | change 68%, 62%
CONTINUITY guitarist | drift 10px | change 88%, 63%
CONTINUITY crowdFront| drift 51px | change 82%, 76%
```

Provisional gates are drift ≤ 8 px and change ≤ 25%. They are thresholds, not
physics — tune them from measurements once a real V2 triplet exists, and record
why in this file.

## Staging

Generate into `design-reference/m14-v2-staging/`, mirroring the production tree.
Nothing under `assets/art/` changes until a family passes its checks. The raw sources and conditioned candidates remain separate from production;
never use a blanket checkout to roll back a dirty worktree.

## Order

Families are ordered so the riskiest thing is proven first. The performer
triplets are what failed in Pack 1 and what `AMBIENT_LOOP_ART_READY` waits on,
so they go first — if the derivation workflow cannot hold a character steady
across three frames, that must surface before 30 more files exist.

| # | Family | Prompt | Files |
|---|---|---|---|
| 1 | Vocalist | `prompts/assets-v2/10-vocalist-pack.md` | 6 — integrated; owner continued past checkpoint |
| 2 | Bassist | `prompts/assets-v2/11-bassist-pack.md` | 5 — integrated |
| 3 | Guitarist | `prompts/assets-v2/12-guitarist-pack.md` | 5 — integrated |
| 4 | Crowd | `prompts/assets-v2/13-crowd-3frame.md` | 4 — integrated |
| 5 | Drum kit | `prompts/assets-v2/14-drumkit-pov.md` | 1 — integrated |
| 6 | Stage | `prompts/assets-v2/15-stage-environment.md` | 2 — integrated |
| 7 | Props | `prompts/assets-v2/16-props.md` | 3 — integrated |
| 8 | FX | `prompts/assets-v2/17-break-fx.md` | 7 — integrated |

Stop after family 1 and review it with the owner before continuing. One
approved character family is the proof that the workflow holds.

## Per-family loop

```bash
# 1. copy one family from staging into place
cp design-reference/m14-v2-staging/band/vocalist_*.png assets/art/band/

# 2. contract: dimensions, alpha, presence
npm run validate:art        # expect PASS_ART_READY, required 33/33

# 3. pixels: anchors, continuity, target bounds
npm run measure:art

# 4. code contracts
npm run verify              # code tests and strict art gates
```

If step 2 or 3 fails, fix the art. Do not adjust dimensions, hitboxes, anchors,
or thresholds to make a family pass — that inverts the gate.

## The props exception

Replacing `beer_bottle.png` or `beer_mug.png` requires a code edit, and it is
the only one in the whole refresh.

`TARGET_ART_CONTENT` in `game/rendering/composition.ts` hardcodes the measured
opaque bounds of the Pack 1 props, because the runtime discounts transparent
padding when it fits art into the draw box. New art means new bounds.

```bash
npm run measure:art     # prints the measured TARGET_ART_CONTENT values
# paste them into game/rendering/composition.ts
npm test                # tests/composition.test.ts enforces the tap-circle rule
```

The budget is tight: the current bottle clears its tap circle by 1.7 px at the
tightest approach scale, the mug by 5.3 px. A bottle whose opaque box is taller
than 494 px will not fit. The fix is always the art, never the hit radius —
`hitRadiusAtDangerLine` is a difficulty value and is frozen.

## Turning the ambient loop on

Only after families 1–4 all report `PASS_AMBIENT_LOOP_READY` together:

1. set `AMBIENT_LOOP_ART_READY = true`;
2. `npm run verify`;
3. run the app and watch a full round — the band should bob on the beat with
   no flicker, no character swapping identity, and no feet sliding;
4. `npm run measure:art -- --require-continuity` in the verification pipeline
   from then on (now included in `npm run verify`; no hosted CI is configured).

Flipping it earlier reintroduces the flicker that the flag exists to suppress.

## Derived icon and splash art

After the props family is accepted:

```bash
node scripts/make-app-icon.mjs
```

That regenerates `assets/icon.png`, `assets/adaptive-icon.png`,
`assets/favicon.png`, and `assets/splash.png` from the bottle and drumstick.

## Final smoke

Automated checks cannot see the scene. Before calling M14 done:

- web export, and look at a full round;
- `npx expo run:android` on `Pixel_9` for launch, countdown, and pad readability;
- a physical device round — the emulator cannot inject taps into the game
  engine's play-surface handler, so target and pad hit feel is only answerable
  on hardware.

Check specifically that the crowd no longer competes with bottles crossing it,
that the Groove Pad still reads as part of the kit, and that a bottle is still
identifiable at its smallest approach scale.

## Not in scope

No gameplay, hitbox, timing, scoring, spawn, or input value changes. No new
animation states. No increase in frame count. No second Groove Pad. If V2 art
seems to need one of those, stop and raise it — that is a design change wearing
an art change's clothes.
