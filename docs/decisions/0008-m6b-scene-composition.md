# ADR 0008 — M6B scene composition: depth around the drum kit

- Status: Accepted
- Date: 2026-08-30
- Milestone: M6B asset integration
- Spec: `docs/specs/M6B-art-integration.md`, `docs/specs/M6-art-direction-lock.md`

## Context

M6B replaced every graybox block with Pack 1 art. The swap itself was
mechanical — one registry module, one image per state — but the first
composition it produced failed two of M6B's own exit criteria, and the failures
were only visible by looking at a composed frame rather than by reading the
diff.

The scene was checked by compositing the real layers at their authored rects
against real round state, using the same rectangles and resize modes the
renderer uses. Three defects came out of that pass. None of them is an art
defect: every Pack 1 file is correct at the size M6 froze.

No gameplay rule, hitbox, trajectory, scoring value, or timing value changed.

## 1. The projectile layer is split by depth, not drawn wholly behind the kit

M6 froze a back-to-front order with the projectile flight space at layer 5 and
the drum kit foreground at layer 7. Implemented literally, that hides the end
of every throw: measured across a full round, the kit covers **44% of a
target's drawn area on average in the last tenth of its flight, and hides more
than 60% of it 38% of the time**. Everything before that point is essentially
unoccluded (≤3.5%). The bottle is largest, nearest, and most urgent exactly
where it disappears, and the break burst that confirms a hit disappears with
it.

That is not a placement problem to be solved by sliding the kit — the kit art
is authored at canvas width and reads as sitting on the bottom edge, and every
vertical position trades corridor coverage against band coverage. It is a depth
problem. A bottle at the end of its arc is a hand's width from the player's
face; it is **nearer than their own toms**, not behind them.

Decision: **`STAGE.drumkitNearY` splits the impact layer.** Targets, hit
bursts, and glass debris below that line draw in front of the kit; everything
above it stays behind. The rule is one pure predicate over a y coordinate the
domain already produces, it is crossed exactly once per flight (the arc is
monotonic below the line), and it changes nothing about where a tap resolves.

This refines M6's layer list rather than contradicting it: the kit is still the
foreground, and the near field is a new layer above it. M6's own flight-space
constraint — "art must support the existing authored trajectories rather than
forcing them to move" — is what makes the refinement necessary, since the
authored lanes land at `y=880` and all five landing points were opaque kit.

## 2. All three performers share one frame and one floor line

The vocalist kept a graybox-era rectangle (`VOCALIST_IDLE_RECT`, 300×420 at
y=300) while the bassist and guitarist used a 370×520 frame on a floor line at
y=800. With real art that read as the singer standing 80 px above the band, a
third smaller than them, in the middle of the crowd — while the domain anchor
places the vocalist *nearer* to the drummer than either of them.

Decision: **one `PERFORMER_FRAME` and one `PERFORMER_BASELINE_Y` for all
three**, horizontally centred on the `PERFORMER_ANCHORS` that reaction
proximity already uses, at the 640×900 aspect the art is authored at. M6
requires "the same ground anchor"; this is that requirement expressed once
instead of per performer.

`VOCALIST_IDLE_RECT` was removed rather than left stale. The blocking event
keeps `VOCALIST_BLOCKING_RECT`, which is a tap region owned by the domain and
therefore untouched — the singer stepping into the drummer's face is the one
pose that deliberately leaves the shared floor line.

## 3. The graybox danger line is a debug affordance, not scenery

The red line at `y=880` sat behind the kit, so it was invisible except for a
few pixels leaking through transparent kit corners at the canvas edges — a
stray red artifact over final art. It belongs to the same family as the M5A
tap-radius ring: a tuning aid that the art has made unnecessary, since the kit
now shows where "reaching the drummer" is.

Decision: both are gated behind one `SHOW_GRAYBOX_DEBUG` flag, off in normal
play. The flag is kept rather than deleted because the next playtest may still
want to see the tap radius.

## Consequences

- `STAGE.drumkitTopY` (812) described the top of a graybox block that no longer
  exists and had no consumer left. It is replaced by `STAGE.drumkitNearY`
  (740), measured off the kit art's solid mass. Presentation only: no rule
  reads it, and the M5A near-miss assist, hit radii, and arc parameters are
  untouched.
- Composition rules moved into `game/rendering/composition.ts`, which imports
  neither React nor React Native. `tests/composition.test.ts` asserts the floor
  line, the anchors, the aspect, the kit placement, and — by running a full
  round — that no arriving target is left behind the kit. Whether the player
  can see what they are hitting is now a test, not an opinion.
- The front crowd stays **behind** the band, where M6's numbered list puts it in
  front. The camera is the drummer's eyes at the rear of the stage, so the
  crowd is beyond the band; drawing a full 1920×420 crowd row over the band's
  legs would invert the perspective. M6's intent for that layer — "where they
  do not obscure gameplay" — is satisfied by keeping it out of the corridor.

## Still open

The visual pass was done on composited reference frames, not on a device. The
M6B gate's Android emulator/device smoke and any judgement about how the scene
reads in motion at phone size remain outstanding.
