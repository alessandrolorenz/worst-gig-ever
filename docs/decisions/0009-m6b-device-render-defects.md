# ADR 0009 — M6B render defects found on a running build

- Status: Accepted
- Date: 2026-08-30
- Milestone: M6B asset integration
- Spec: `docs/specs/M6B-art-integration.md`, `docs/specs/M6-art-direction-lock.md`
- Supersedes nothing; extends ADR 0008

## Context

ADR 0008's composition pass was done by compositing the Pack 1 layers at their
authored rects. That method is only as good as its assumption — it drew every
layer where the code *said* it went, so it could not see that the code did not
actually put them there. Running the build showed a scene that matched none of
those frames: two crowd bands stacked down the screen, the drum kit reduced to
slivers in the corners, and the whole stage flashing.

Four defects, in the order they hid one another.

## 1. Three layers were never positioned at all

`CROWD_BACK_RECT`, `CROWD_FRONT_RECT`, and `DRUM_KIT_RECT` were handed straight
to `style`. React Native has no `x`/`y` style properties — it wants `left` and
`top` — and without `position: 'absolute'` it lays a view out in normal flow.
So the three layers stacked vertically: rear crowd at y 0–520, front crowd at
520–940, and the drum kit from 940, leaving only the tops of the cymbals on
screen. That is exactly the reported "two crowd layers".

TypeScript could not catch it. Excess-property checking only applies to object
literals, so a variable carrying extra `x`/`y` keys satisfies a style type on
its `width`/`height` alone.

Decision: **`absolute(rect)` in `composition.ts` is the only way a rect becomes
a style**, and `tests/composition.test.ts` fails if the renderer ever passes a
bare `SCREAMING_CASE` rect to `style` again.

## 2. The scene root collapsed to zero height on web

`styles.root` used `flex: 1`. The game engine's web container is a plain block
element, not a flex parent, so the root resolved to **height 0** — and its own
`overflow: hidden` then clipped the entire scene away. The web build rendered
nothing but the letterbox colour and the pause button.

It also fed a height of 0 into `fitCanvas`, which fell back to the reference
height and offset the canvas by half a screen, so even the geometry read back
from the DOM was wrong.

Decision: the root **fills its parent explicitly** with
`StyleSheet.absoluteFillObject`. That means the same thing on both platforms
and does not depend on the host being a flex container. This defect predates
M6B — it is why the earlier attempt at a web visual pass never produced a
screenshot — and it blocks the M6B gate's own "inspect at a landscape
viewport" step, so it is fixed here rather than deferred.

## 3. The light overlay strobed instead of pulsing

`beatPulse` ramped from 1 down to 0 across each beat and then snapped back to
1. That reset is a discontinuity, and the renderer mapped it onto a
full-canvas overlay between 0.36 and 0.78 opacity: the whole stage jumped in
brightness twice a second.

Decisions:

- **`beatPulse` is a raised cosine** — peak on the beat, trough between two,
  continuous everywhere. It breathes rather than decays, and it still marks
  the beat. A test now fails if the pulse ever moves more than 0.05 in 4 ms.
- **The overlay swings 0.58–0.72 instead of 0.36–0.78.** Measured on a running
  build, mean frame brightness now varies by about 2 points out of 255.

## 4. Swapping an Image's source blanks it

Each pose change replaced the `source` on a single `Image`, so the platform
loaded and repainted a different bitmap — a blank frame where a pose change
should be. Across three performers and the crowd at tempo, that alone reads as
flicker.

Decision: **`FrameStack` mounts every frame once and switches opacity.** All
bitmaps stay decoded and resident, so a pose change is a style update and
nothing loads.

The ambient cadence also moved from three frames over two beats to
`beatsPerLoop: 3` — one pose per beat — so poses land on the beat instead of
holding 300 ms each off it. M6 explicitly allows M6B to change the
presentation cadence.

## 5. The Pack 1 loop frames are not a loop

With all of the above fixed, the band still flickered, and the cause is the
art rather than the code. Measuring how much of the drawn subject changes
between consecutive ambient frames:

| Layer | idle→loopA | loopA→loopB | loopB→idle |
|---|---|---|---|
| front crowd | 84.6% | 79.8% | 77.1% |
| bassist | 71.2% | 63.9% | 77.0% |
| guitarist | 86.9% | 62.8% | 86.2% |
| vocalist | 47.0% | 72.9% | 75.0% |

They are three separate drawings of each character, not three poses of one:
proportions, line weight, palette, silhouette, and foot anchor all move
between frames. M6 froze the opposite — "the same fictional person, outfit,
instrument, proportions, hair, palette, line weight, camera angle, and
approximate foot anchor", and "differences are subtle: body/head/instrument
movement, fixed camera, stable feet/ground anchor". Cutting between drawings
that differ by 60–87% at tempo is a flicker by construction, and no renderer
technique turns three unrelated drawings into a loop. A cross-fade would only
trade the flicker for a double exposure.

Decision: **`AMBIENT_LOOP_ART_READY = false` holds the first ambient frame**
until the loop art is regenerated. Per AGENTS.md rule 14 nothing is
substituted and the shortfall is reported rather than absorbed. The
choreography keeps running and stays tested — only the bitmap choice is
pinned — so the flag becomes `true` again with no other change. Reactions are
unaffected: `hitReaction` and `dodge` are one-shots answering an event, where
a hard change reads as a reaction rather than as a flicker.

`npm run validate:art` cannot see this. It checks the PNG signature,
dimensions, and alpha capability, all of which pass. A loop-continuity check
belongs in that script and does not exist yet.

## Consequences

- The band and crowd hold a pose until the loop art is regenerated. The stage
  is quieter than M5A's ambience intended; that is a visible, recorded
  shortfall, not a silent one.
- `loopA`, `loopB`, and `crowd_front_02`/`_03` are bundled but unused while the
  hold is on. They are kept: they are the frames to replace.
- Verification method changed. Composited reference frames are not evidence
  that a scene renders — three of the five defects above were invisible to
  them. The M6B visual check now runs against the live build.

## Still open

- **The ambient loop art must be regenerated** so each set is one drawing in
  three slightly different poses, sharing outline weight, palette, proportions,
  and foot anchor. The prompts in `prompts/assets/` describe the intent but did
  not enforce continuity across a set; generating each frame independently is
  what produced this.
- Android emulator/device smoke has still not been run. Everything above was
  verified on the web build.
