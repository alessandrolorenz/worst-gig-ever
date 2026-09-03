# M14 Visual Refresh Gate

Current result (2026-09-03): `V2_DEVICE_REVIEW`. Direction and first-family
checkpoints are approved; all 33 V2 assets are integrated. Final physical-device
owner approval is still pending. Earlier sections below are dated history.

Required:
1. M13.1 physical re-test completed and the owner explicitly chose to continue;
2. no gameplay change;
3. canonical replacement map preserved;
4. existing filenames/manifest keys reused wherever possible;
5. the M13.1 lower-centre Groove Pad geometry and readability remain part of
   every drum-kit art requirement;
6. 3-frame continuity requirements remain;
7. no copyrighted/real-person visual references;
8. full project verification remains green if code/docs are touched.

If V2 art is not owner-approved, stop at:
`V2_VISUAL_DIRECTION_REVIEW`

## Planning result — 2026-09-01

- M13.1 owner prerequisite: pass — `M13_1_VALIDATED`.
- Current visual audit: complete.
- Canonical replacement map: complete for 33 required files, two optional
  entries, two aliases, and four derived app-identity images.
- Character reference contracts: complete for vocalist, bassist, guitarist,
  crowd, drum kit, props, and FX.
- Proof prompts: complete under `prompts/assets-v2/`.
- Production art replacements: none.
- Gameplay/rendering changes: none.
- Early built-in drafts: rejected for staying too close to Pack 1 and making
  the performers too similar; one production-like draft also baked a
  checkerboard. None entered the candidate proof set.

Result: `V2_VISUAL_DIRECTION_REVIEW`

## Proof review — 2026-09-02

All seven candidate proof images are rendered under
`design-reference/m14-v2-proof/`. Details and the review questions are in
`docs/assets/M14-V2-VISUAL-PLAN.md`.

- Performer lineup, vocalist, bassist, and guitarist: candidates with three
  deliberately distinct builds, faces, heights, and postures.
- Crowd: corrected candidate with an independent cast, reduced detail, and a
  clear central projectile channel.
- Drum kit: corrected candidate with the snare clear and no drumsticks baked
  into the art.
- Beer bottle: candidate with a simplified silhouette and blank teal label.

Gate checks re-run against the working tree:

- M13.1 owner prerequisite: pass — `M13_1_VALIDATED`.
- No gameplay change: pass — no modification under `game/`, `tests/`,
  `assets/art/`, `android/`, or `app.json`. `package.json` changes are limited
  to the non-runtime `measure:art` tooling.
- Replacement map preserved, filenames/manifest keys reused: pass.
- Groove Pad geometry and readability in every drum-kit requirement: pass.
- Three-frame continuity requirements retained: pass.
- No copyrighted or real-person visual reference: pass — all seven proof prompts
  specify original fictional adults and forbid likenesses, logos, and text.
- Faces remain in the contract; no performer described as a silhouette: pass.
- Full V2 generation not started: pass — no file under `assets/art/` touched.
- `npm run type-check`, `npm run lint`, `npm test` (237/237),
  `npm run validate:art` (`PASS_ART_READY`, required 33/33): pass.

Result: `V2_VISUAL_DIRECTION_REVIEW` — held, pending explicit owner review of
the complete proof set. No production asset is authorized yet.

## Production preparation pass — 2026-09-02

The seven proof images were generated with the OpenAI built-in image generator
and stored only as design references. Early drafts that stayed too close to
Pack 1, copied band identities into the crowd, or left drumsticks on the snare
were rejected or corrected before this candidate set was assembled.

Delivered:

- eight production prompt files covering all 33 required assets, plus an index;
- corrected proof prompts for character differentiation, an independent crowd
  cast, and a drum kit with no baked drumsticks;
- `docs/assets/M14-V2-INTEGRATION-RUNBOOK.md`;
- `scripts/measure-art-bounds.mjs` and `npm run measure:art`, closing the
  frame-continuity gap recorded as open item 11.

Gate checks:

- Production art replacements: none — `assets/art/` untouched.
- Gameplay/rendering/composition/hitbox changes: none.
- Code changes: one new script under `scripts/`, one npm script, one declared
  devDependency (`pngjs`, already present transitively). No runtime file.
- `npm run type-check`, `npm run lint`, `npm test` (237/237): pass.
- `npm run validate:art`: `PASS_ART_READY`, required 33/33.
- `npm run measure:art`: reports `AMBIENT_LOOP_NOT_READY` against current Pack 1
  art, as expected — that is the known defect the flag already encodes.

Result: `V2_VISUAL_DIRECTION_REVIEW` — still held. The candidate proof set is
complete; explicit owner approval is the only gate before production begins.

## Candidate-set validation — 2026-09-02

- `git diff --check`: pass.
- `npm run verify`: pass — type-check, lint, and 237/237 tests.
- `npm run validate:art -- --require-ready`: `PASS_ART_READY`, required 33/33.
- `npm run measure:art`: reporting command completed; current Pack 1 remains
  `AMBIENT_LOOP_NOT_READY` with the four already-known continuity failures.
- `unzip -t prompts/assets-v2.zip`: pass; all prompt-package entries valid.
- Runtime production directory: untouched — no file under `assets/art/` changed.

Final result: `V2_VISUAL_DIRECTION_REVIEW`.

## Owner approval and production family 1 — 2026-09-02

The owner reviewed the corrected proof set and answered "Sim. Continue". This
is recorded as `V2_DIRECTION_APPROVED`, covering the independent crowd cast,
the drum kit with no resting drumsticks, and the simplified bottle.

The six-file vocalist family was generated from the approved canonical
reference, conditioned through one shared crop, aligned to one feet baseline,
and integrated at the existing canonical paths. The two ambient edits retain
only their intended upper-body motion region; all pixels outside it come from
the canonical idle frame.

- Production assets integrated: 6/33.
- Canonical dimensions/alpha: pass — six 640x900 RGBA files.
- Vocalist feet-anchor drift: 0 px, gate ≤ 8 px.
- Vocalist ambient change: 13% and 15%, gate ≤ 25%.
- `npm run validate:art -- --require-ready`: `PASS_ART_READY`, required 33/33.
- `npm run verify`: pass — type-check, lint, and 237/237 tests.
- Gameplay, hitboxes, timing, scoring, input, manifest, and renderer: unchanged.
- `AMBIENT_LOOP_ART_READY`: remains `false`; bassist, guitarist, and crowd
  families still use the non-continuous Pack 1 triplets.

Result: `V2_VOCALIST_FAMILY_REVIEW`. Per the runbook, production stops here for
owner review before family 2.

## Full production integration and smoke — 2026-09-03

The owner continued past the vocalist checkpoint. Families 2–8 are integrated,
bringing production to 33/33 V2 PNGs plus four derived app-identity images.

### Scope and visual corrections

- Canonical filenames, dimensions, manifest keys, layer geometry and anchors
  preserved. No change to gameplay, input, hitboxes, timing, spawn, or scoring.
- All band ambient/reaction/dodge states face the audience from behind; the
  front-facing guitarist draft was rejected after owner feedback. Vocalist
  blocking is the intentional turn toward the drummer.
- Crowd identities do not copy the performers. Snare has no resting sticks.
- All seven FX assets are V2; shard silhouettes are deliberately different.
- The gray-card light overlay looked opaque and hard-edged in live smoke.
  A built-in generator edit replaced it with genuine partial-alpha beams.
- Runtime edits: `AMBIENT_LOOP_ART_READY = true` and measured target-art
  content bounds (bottle94x470, mug306x312), plus explanatory comments.
- Source paths, dates, generator IDs, hashes, references and offline
  conditioning decisions are in `docs/assets/M14-V2-PRODUCTION-PROVENANCE.json`
  and its Markdown companion. Prompt archive refreshed.

### Automated gates

- `npm run verify`: type-check and lint pass; 241/241 tests pass; strict art
  contract and continuity are now included in this command.
- `PASS_ART_READY`: required33/33; optional whiskey/dust remain intentionally absent.
- `PASS_AMBIENT_LOOP_READY`: all four triplets, unchanged drift≤8px/change≤25%
  thresholds. Measurement now checks the final→first transition too and fails
  on missing/empty frames rather than skipping them.
- Target visible-content bounds match runtime configuration (regression test).
  Minimum tap-circle slack: bottle5.1px, mug8.1px. Hit radii unchanged.
- PNG enlargement clamps edge samples (regression test).
- Web and Android JavaScript/assets exports pass. No native dependency changed;
  Android smoke uses the existing installed development client and Metro.
- `git diff --check` and `unzip -t prompts/assets-v2.zip`: pass.

| Triplet | Anchor drift | idle→A | A→B | B→idle |
|---|---:|---:|---:|---:|
| Vocalist | 0px | 13% | 15% | 10% |
| Bassist | 0px | 7% | 18% | 15% |
| Guitarist | 0px | 7% | 20% | 17% |
| Front crowd | 0px | 13% | 23% | 19% |

### Live smoke

Chrome at 960x540 completed the actual 60-second round using UI clicks on
rendered targets and the pad, without changing game state. Results: SHOW
COMPLETE, defense10075, 37 destroyed/0 missed, groove3670, 43/89 beats hit,
integrity3/3, no page errors. The singer prompt appeared; this run let the
interruption expire and does not claim singer-tap validation. The temporary
smoke harness initially expected the wrong results label; the captured result
was SHOW COMPLETE, and its assertion was corrected (not a game defect).

The image snapshots show distinct performers, the corrected rear-facing
guitarist, clear foreground kit/pad, readable effects and translucent lighting.
Android Pixel_9 launched in landscape; Start/restart advances the round and an
unattended round correctly ends after three misses. Play-surface touch feel
is not established by injected emulator input. Release frame pacing and audio
latency are not claimed by this art smoke.

Evidence under `docs/verification/m14-evidence/`:

- `web-playing.png`: final lighting, kit, performers, and hit burst in scene.
- `web-results.png`: completed full browser round.
- `android-countdown.png`: native pre-roll.
- `android-playing.png`: native scene/pad after GO.

### Remaining owner gate

Play the V2 build on a physical phone and review target visibility through the
whole arc, pad readability and bottom-edge taps, distinct character identities,
rear-facing orientation, no resting sticks, and animation comfort. The M13.1
owner approval predates this art refresh and is not reused as M14 approval.

Result: `V2_DEVICE_REVIEW`. Do not close M14 or expand gameplay scope until
the owner approves this candidate or identifies visual corrections.
