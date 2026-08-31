# Current Continuation State

Last saved: 2026-08-30  
Branch: `m5/physical-playtest`  
Active stage: **M6B asset integration — automated gate green, device visual
smoke outstanding**

## Completed milestones and checkpoints

- M5A complete: `4aa553752c5ed1fdfc47d03a3f8548a44aeb43f3`.
- M6 complete: `6506698fd6d399c97d2960332996f98d78c63765`.
- M6A contract complete: `90cf9d7b29bb895d7283d017352424426e000a4c`.
- Required Pack 1 art complete: `7e36afc05b014e6bf959d4987a4bdf8219c5df1d`.
- Art Gate: `PASS_ART_READY` — 33/33 required present, 0 missing, 0 invalid;
  optional whiskey bottle and dust puff intentionally absent.

Nothing has been pushed. No EAS command, publication, submission, or store
action has been run.

## M6B implementation

- `game/rendering/artAssets.ts` — the sole runtime registry for all 33 required
  Pack 1 PNGs, statically required so Metro bundles them.
- `game/rendering/composition.ts` — where each bitmap sits on the reference
  canvas and which side of the drum kit it belongs on. Imports no React and no
  React Native, so it is tested directly.
- `game/rendering/SceneRenderer.tsx` — graybox blocks replaced by layered art:
  background, light overlay, rear crowd, three-frame front crowd, performers,
  far projectiles, far debris, far bursts, drum kit, near projectiles, near
  debris, near bursts, drumstick strike, HUD.
- Ambient cycle expanded from two frames to the locked `idle → loopA → loopB`.
- `pointerEvents="none"` on the scaled canvas and the M5A `measureInWindow`
  page-coordinate mapping are both preserved exactly.
- Target positions, rotation, apparent bounds, configured hit radii, score
  resolution, one-hit idempotency, and Matter debris behaviour are unchanged.

## Defects found by running the build (ADR 0009)

The composited-frame pass below was not enough: it drew every layer where the
code said it went, not where React Native actually put it. Running the web
build showed a different scene entirely.

1. **Three layers were never positioned.** `CROWD_BACK_RECT`,
   `CROWD_FRONT_RECT`, and `DRUM_KIT_RECT` were passed straight to `style`;
   React Native has no `x`/`y` style props and lays a view out in flow without
   `position: 'absolute'`, so the crowds and the kit stacked down the screen.
   Every rect now goes through `absolute()`, and a test fails if a bare rect is
   ever used as a style again.
2. **The scene root had zero height on web.** `flex: 1` inside the engine's
   non-flex web container resolved to 0, and `overflow: hidden` clipped the
   whole scene; the web build showed nothing but the letterbox. The root now
   fills its parent explicitly. This predates M6B and is why the earlier
   attempt at a web visual pass never produced a screenshot.
3. **The lights strobed.** `beatPulse` snapped from 0 back to 1 every beat, on
   an overlay swinging 0.36–0.78. It is now a continuous raised cosine on a
   0.58–0.72 overlay; measured mean frame brightness varies by ~2/255.
4. **Pose changes blanked.** Swapping an `Image`'s `source` reloads it.
   `FrameStack` now mounts every frame once and switches opacity.

Measured on the running build, the largest change between consecutive frames
fell from 18% of pixels to 8%, and quiet frames now sit at 0.1%.

## The ambient loop art is not a loop

With all of the above fixed the band still flickered, and the cause is the art.
Between consecutive ambient frames, 60–87% of the drawn subject changes — they
are three separate drawings of each character, not three poses of one, against
M6's frozen continuity rule. `AMBIENT_LOOP_ART_READY = false` holds the first
ambient frame until they are regenerated. Nothing was substituted.

## Composition defects found and fixed

Found by compositing the real layers at their authored rects against real round
state — not visible from the diff. Full reasoning in
`docs/decisions/0008-m6b-scene-composition.md`.

1. **The end of every throw was hidden by the drum kit.** Measured across a
   full round, the kit covered 44% of a target's drawn area on average through
   the last tenth of its flight and hid >60% of it 38% of the time, plus every
   landing point on all five lanes and the break burst that confirms a hit.
   Fixed by splitting targets, bursts, and debris at `STAGE.drumkitNearY`:
   below that line they draw in front of the kit.
2. **The vocalist stood off the band's floor line** — 80 px higher and a third
   smaller, from a graybox-era `VOCALIST_IDLE_RECT`, while the domain anchor
   places them nearer to the drummer than the others. Fixed by giving all three
   performers one frame and one baseline off `PERFORMER_ANCHORS`.
   `VOCALIST_BLOCKING_RECT`, which is a tap region, is untouched.
3. **The graybox danger line leaked over final art** at the canvas edges. Now
   gated behind `SHOW_GRAYBOX_DEBUG` alongside the tap-radius ring.

`STAGE.drumkitTopY` (812) described a graybox block that no longer exists and
had no consumer; it is replaced by `STAGE.drumkitNearY` (740). Presentation
only — no rule reads it.

## Verification performed (2026-08-30, after the fixes)

- `git diff --check` — clean.
- `npm run type-check` — pass.
- `npm run lint` — pass.
- `npm test` — 135/135 pass.
- `npm run verify` — pass.
- `npx expo export --platform android` — succeeds.
- `npx expo export --platform web` — succeeds.
- `npm run validate:art -- --require-ready` — `PASS_ART_READY`.
- No runtime MIDI reference; the only occurrence is a comment in
  `game/audio/audioAssets.ts` explaining why there is none.
- Composited reference frames inspected at READY, mid-flight, arriving target,
  and the vocalist blocking event.

`tests/composition.test.ts` now asserts the floor line, the performer anchors,
the authored aspect, the kit placement, and — by running a full round — that no
arriving target is left behind the kit.

## Exact resume steps

1. **Regenerate the ambient loop art.** Per set (bassist, guitarist, vocalist,
   front crowd), `idle`/`loopA`/`loopB` must be one drawing in three slightly
   different poses: same outline weight, palette, proportions, silhouette,
   camera, and foot anchor, differing only by body/head/instrument movement.
   Generating each frame independently is what produced the current set.
   Then set `AMBIENT_LOOP_ART_READY = true` in
   `game/rendering/SceneRenderer.tsx` and confirm the loop reads as animation.
2. Run the M6B visual smoke on the Android emulator or a device: drum-kit
   foreground, drummer POV, crowd facing the drummer, band facing the crowd,
   projectiles visible through the whole arc including arrival, the depth swap
   at `drumkitNearY` reading as passing rather than popping, reaction anchors,
   clipping, missing-image blocks.
3. Fix only rendering composition/scale/anchor defects. Do not tune gameplay
   difficulty silently.
4. Record the result in `project-status.md` and here.
5. Continue to `prompts/08-m7-stage-chaos-interactions.md` once the visual
   smoke passes.

## Emulator smoke done (2026-08-30)

`npx expo run:android` on the `Pixel_9` AVD builds, installs, launches, and
plays. The scene composes correctly in landscape and matches the browser pass.

One operational note that looks like a failure and is not: when a dev server is
already listening on 8081, `expo run:android` prints `Waiting on
http://localhost:8081`, installs, launches, and **exits**, returning the
prompt. It only stays attached when it owns the bundler. Stop the other
`expo start` first if you want the interactive menu in that terminal.

## How to look at the running build

Judge the scene from the running app, not from composited frames — that method
missed four of the defects above.

```sh
npx expo start --web --port 8099
```

Then drive it with a browser: wait for the asset requests to settle *before*
starting the round (the dev server serves each PNG separately, and the show
ends in about 20 s if nobody taps), use `domcontentloaded` or `load` rather
than `networkidle`, and screenshot during play.

## Still prohibited

- Do not push.
- Do not run EAS.
- Do not publish or submit anything.
- Do not add third-party substitute art.
- Do not expand gameplay scope or change M5A tuning to make art fit.
