# M32 — Physical Playtest Tuning & UX Cleanup

Status: **implemented; repository, web and Android-emulator gates pass; physical retest pending**  
Created: 2026-10-08  
Baseline branch: `m23/admob-compat-15.8.3`  
Baseline HEAD: `922c98b2efffed3d10e1a35b6c31786c54059bae` (M26–M31 uncommitted in the worktree, preserved)  
Baseline gate: `npm run verify` pass, 712/712 tests

## Source

The first physical-phone playtest. It confirmed the Crowd core — swipe throw,
three stages, limited beers, destruction, the 5/3/2 aim guide — and asked for
five things, in this order. Nothing else was changed.

## P1 — Crowd round screen

> **Checklist placement superseded by M33** (2026-11-04): the checklist now
> stands in the two bottom corners, split in half. See
> `M33-crowd-checklist-and-optional-beat.md`. The rest of P1 still holds.

- The round HUD is two edge columns. Left: stage name and checklist. Right:
  score, beers, Retry, Stages. On a 20:9 phone both sit mostly in the letterbox
  bars beside the 16:9 stage.
- Nothing is drawn in the lower or middle of the stage. The standing cue that
  sat over the bottle (`SWIPE UP…`, `RELEASE…`, `BOTTLE AWAY!`) is gone.
- The only text over the stage is the result of a throw, top centre, above
  `CROWD_THROW.impactBounds.top`. A hit is outlined green; hitting the waiter
  is the one filled red cue.
- The checklist is one column at every stage and rows wrap instead of
  clipping. The M31 two-column Stage 3 layout is retired with the bottom panel
  it existed to shorten.

## Instructions

- New flow screen `CROWD_BRIEFING` (`showCrowdBriefing`): picker → how-to card
  → round. Three sentences, the stage's target and beer counts, and the waiter
  sprite labelled "do not hit". The stage is drawn dimmed behind it.
- Shown from the picker only. Retry and Next stage skip it.
- Removed catalogue keys: `crowd.instruction`, `ready`, `aiming`, `flying`,
  `reset`. Added: `crowd.howTo.*`, `crowd.spareWaiter`,
  `crowd.result.nextStage`.

## P2 — Waiter

The playtest called him too small and floating. Two causes, both integration:
his feet were at y = 700, above every performer's, and he was drawn at his
430 px file height in front of 600–750 px performers.

- `CROWD_WAITER` (hit rect): `y` 270 → 255, `height` 430 → 615, feet at 870,
  in front of the band. **Width stays 230**, so a crossing blocks a target
  for the same share of the stage as before. New `overscan: 60` lengthens the
  run so the wider drawn figure enters and leaves off-canvas; crossing speed
  rises about 6% for the same `travelMs`.
- Drawn at 334x624 from the same `waiter.png` (`crowdWaiterDrawRect`). No new
  art. The upscale is 1.45x on the canvas, which is about 1.4x in device
  pixels on a 1080p phone: slightly soft next to the performers, and the
  first thing a larger waiter source would fix.
- He now covers a standing performer's torso and legs from head to floor.
  A throw above y = 255 still clears him; that is the head-height pass the
  M31 notes flagged, narrowed by 15 px rather than closed.
- Step instead of hover, a floor shadow, a struck-out red disc over his head,
  a red wash on the penalty, "Spare the waiter" at the foot of the checklist.
- `Sprite` in `CrowdPlaceholders.tsx` now sets width and height explicitly.
  On web an asset image keeps its file size unless told otherwise; that was
  invisible while every box equalled its file.

## P3 — Progression

`nextCrowdStageId`. A ruined gig offers **Next stage** first when one exists,
then Retry and Stages. All three stages remain open; nothing is persisted.

## P4 — Music

- `CrowdStageConfig.music`: `showTheme`, `grooveBed`, `showBed` — the three
  beds of the official Band show, already licensed and in the catalogue.
- One audio system. `GameEngine.playCrowdMusic` is the single Crowd call into
  the existing `AudioService.playMusic`; `tests/setlist.test.ts` pins it.
- Lifecycle: loaded at the how-to card (alongside the Band setlist, never
  evicting it), starts on Start, plays through Retry and the result, changes
  on Next stage, stops on Stages, pauses and resumes with the app.
- A later song choice replaces the read of `stage.music`. No selection UI,
  unlock or purchase was built.

## P5 — Band stage picker

- The screen scrolls, using the same surface as the full-show result.
- Story and Remove Ads left this screen's button row. Both are on the title,
  one Back away, including the privacy-choices control behind Remove Ads.
  The row is now How to play, Custom setlist (when unlocked), Click, Back.

## Deviations and notes

- `crowdConfig.ts` and `crowdState.ts` were listed as stable in the M31
  handoff. M32 changed the waiter rect and path in them deliberately, as the
  playtest asked; targets, scoring, throw physics, objectives and stage
  tuning are untouched.
- `tests/setlist.test.ts` "exactly one place turns a stage into a sound" was
  widened by name to admit Crowd Mode's single call site, as M24B did for the
  audition preview.

## Validation

- `npm run verify`: pass, 717/717 tests.
- Production web export at 923x411 (Pixel 9 landscape, dp): picker, how-to,
  Stage 1 played to a win, waiter crossing and penalty, Next stage into
  Stage 2, Stages, Stage 3, Retry, Band picker and Band briefing. Music
  confirmed playing and looping in the round and paused on leaving.
- Android emulator (Pixel 9, API 37, dev client, pt-BR): Band picker and its
  scroll, Band Stage 1 briefing, Crowd picker, how-to card, Stage 2 with a
  native swipe hit, waiter crossing, and the music player observed started in
  the round, paused in the background, started again on return and stopped
  at the picker.
- Evidence: `docs/verification/m32-evidence/`.
- Physical device: **not performed**.
