# Crowd Mode Implementation Status

Last updated: 2026-10-08

## Status

**M26–M32 implemented. All 15 required Crowd Mode art files are generated,
integrated and covered by the art-slot gate.** The four optional M31 images
remain intentionally deferred. Gameplay, hitboxes, scoring, timing, stage
tuning and objectives were not changed by the art pass. M32 then changed the
waiter's rect and path, and nothing else in the domain (see below).

The branch and dirty worktree predate M31 and remain uncommitted. No existing
M26–M30 work was reset or discarded.

## Final visual structure

- `assets/art/crowd_mode/` contains exact-size runtime art only.
- `design-reference/crowd-mode/` preserves every high-resolution generation
  source, including the cleaned throwing-hand source.
- `game/crowd/crowdArt.ts` is the one static Metro registry for Crowd art.
- `game/crowd/CrowdPlaceholders.tsx` retains its stable component names but
  now renders production assets. Only target brackets and the optional hit
  flash remain code-drawn.
- `game/crowd/CrowdCompositionPreview.tsx` is an opt-in M31 composition
  harness. It activates only when a build sets
  `EXPO_PUBLIC_CROWD_ART_PREVIEW=1`; `artState=performing|disarmed` and
  `foreground=1` make comparison deterministic. Preview builds bypass normal
  navigation and production overlays; production builds never take that path.
- `CrowdScene.tsx` draws the clean plate, rear props, performer frames, loose
  instruments, waiter and throwing hand in the contract paint order. The old
  borrowed story still and `CrowdKnockoutPatch` are gone from production Crowd
  rendering.

## Art and provenance

- Contract: `docs/assets/CROWD-MODE-ASSET-CONTRACT.md`
- Generation/source ledger: `docs/assets/CROWD-MODE-ART-PROVENANCE.md`
- Required files: 15. The previous prose heading said 16, but its enumerated
  list and `crowdArtSlots.ts` always contained 15; M31 corrected the heading.
- Reused unchanged: `assets/art/props/beer_bottle.png` and
  `assets/art/effects/hit_burst.png`.
- Optional and absent: `audience_foreground.png`, `bassist_hit.png`,
  `vocalist_hit.png`, `guitarist_hit.png`.

## Validation

- Pre-M31 baseline on 2026-10-07: `npm run verify` passed, 709/709 tests.
- M31 focused gate: type-check, lint, all Crowd domain tests, slot/file
  agreement, exact dimensions and alpha, static Metro registration, and
  removal of the story-still/knockout workaround pass.
- Composition harness at the real 1920×1080 canvas: performing and disarmed
  states, intact/damaged amplifier, reusable cymbals, terminal loose-prop
  positions, waiter crossing scale, and hand/bottle registration visually
  checked at 1280×720. No performer regeneration or box/anchor correction was
  needed.
- Full post-M31 `npm run verify`: **pass**, 712/712 tests. TypeScript, ESLint,
  art readiness/continuity, provenance, tempo, audio-library and monetization
  gates all pass.
- Production web export: **pass**. The Expo export contains all 15 Crowd art
  files as bundled assets.
- Production browser smoke at 1280×720: **pass**. Covered the Crowd picker,
  Warm-up, Stage 2, Stage 3, all three disarms, direct musician hit, both
  cymbals, amplifier, waiter penalty, win, loss, retry, and Band Mode entry.
- The Stage 3 nine-objective checklist now wraps into two readable columns;
  the production Stage 3 initial state was visually inspected at 1280×720.
- Android emulator (Pixel 9, API 37): **pass for the requested native smoke**.
  Entered Crowd Mode, selected Warm-up, used native swipe input, hit a
  performer and the amplifier, and inspected scale, HUD, waiter crossing and
  destroyed prop states. Evidence is under `docs/verification/m31-evidence/`.
- Physical device: **not performed**.

## M32 — physical playtest tuning (2026-10-08)

Spec and full record: `docs/specs/M32-physical-playtest-tuning.md`.

- Round HUD is two edge columns; nothing sits over the throw.
- Instructions live on a how-to card (`CROWD_BRIEFING`) between the picker
  and the round.
- The waiter stands on the stage front at foreground scale, with a shadow, a
  "not a target" mark and a red penalty wash. Same `waiter.png`.
- A ruined gig offers Next stage.
- Crowd Mode has music: one track per stage through the existing audio
  service.
- The Band stage picker scrolls and carries a shorter button row.
- `npm run verify` passes, 717/717. Web (phone viewport) and Android emulator
  checked. Physical device: **not performed**.

## Stable gameplay files

Do not change these to make art fit:

- `game/crowd/crowdConfig.ts` — targets, hit rects, scores, fall offsets,
  reaction timing and waiter geometry.
- `game/crowd/crowdStages.ts` — three stage definitions, difficulty data and
  each stage's music track.
- `game/crowd/crowdState.ts` — throws, hit resolution, props, performers,
  objectives, bottles and outcomes.
- `game/systems/crowdSystem.ts` — input and elapsed-time adapter.

## Known playtest issues

- Every value in `crowdStages.ts` is still first-pass tuning. The first phone
  playtest liked all three stages, so none was changed.
- The waiter's rect begins at y=255, so a throw at a performer's head can
  still pass over him.
- Hitting the drummer or drum kit remains a miss by design.
- Crowd Mode has music but no sound effects of its own.
- The waiter sprite is drawn 1.45x its file size, so it is slightly softer
  than the performers. A larger source file would fix it; no new art was
  made in M32.
- On a 16:9 screen there are no letterbox bars, so the HUD columns sit over
  the stage wings rather than beside them.

## Remaining verification

Run a second physical-phone playtest on Crowd HUD clarity, waiter
readability, progression flow, Band picker fit and music feel.
