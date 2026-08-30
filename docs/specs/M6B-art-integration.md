# M6B — Asset Integration

## Objective
Replace graybox scene visuals with validated Pack 1 artwork while keeping M5A gameplay behavior unchanged.

## Principles
1. Rendering consumes gameplay state; art never becomes gameplay truth.
2. Hitboxes remain config/domain data.
3. Visual asset bounds must not silently alter difficulty.
4. The M5A target-radius debug ring is removed from normal presentation once art makes targets readable, but a dev/debug switch may retain it.
5. First fix composition/scale/anchors rather than changing gameplay to make art fit.
6. Existing audio behavior is unchanged.

## Required integration
Stage:
- background base;
- stage-light overlay;
- rear crowd;
- 3-frame front crowd loop;
- drum kit foreground.

Band state mapping:
- `idle` → `*_idle`
- `loopA` → `*_loop_a`
- `loopB` → `*_loop_b`
- `hitReaction` → `*_hit_reaction`
- `dodge` → `*_dodge`
- vocalist `blocking` remains a dedicated event visual.

Targets:
- beer bottle and mug art follow the existing M5A arc pose/spin;
- no straight-line fallback in normal runtime.

Break FX:
- intact target disappears exactly once;
- hit burst appears;
- shard assets use existing temporary debris behavior;
- no bitmap owns collision/scoring state.

## Scaling/anchors
Placement derives from 1920×1080 reference canvas and existing scaling. Character anchors use a stable lower-body/feet baseline. Crowd/background cannot receive touch handling.

## Fallback policy
Required assets have no silent production fallback. Optional art may use an explicit documented code-drawn fallback.

## Exit criteria
- full scene uses Pack 1 art;
- ambient 3-frame states visibly cycle;
- reactions map correctly;
- M5A arcs/taps remain behaviorally equivalent;
- no touch regression from image layers;
- full automated gate green;
- Android local build/export remains viable.
