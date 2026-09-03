# Current Continuation State

- Last reconciled: 2026-09-03
- Source branch: `m9/rhythm-pivot`; integration target: `main`
- Pre-M14 implementation baseline: `7aa058b799e29e646dbba6442226d679d38d5de3`
- Active stage: **M14 Visual Refresh V2 — physical-device review**
- Gate outcome: `V2_DEVICE_REVIEW`

M13.1 is closed. The owner tested the build on a physical phone on 2026-09-01,
reported it as "very good", requested no tuning, and recorded
`M13_1_VALIDATED`, which unblocked M14 planning.

M14 planning is complete, the full production specification for all 33 assets
exists, and the integration runbook and tooling are built. The owner approved
the seven-image direction proof set on 2026-09-02 (`V2_DIRECTION_APPROVED`).
The owner continued past the first-family checkpoint. All 33 production assets
are now integrated at canonical paths, plus four regenerated app-identity images.

The proof set was generated with the OpenAI built-in image generator. Early
drafts that made the characters too similar, copied band identities into the
crowd, or left drumsticks on the snare were rejected or corrected. The current
set was approved. The performers retain distinct identities and face the audience. The
front-facing guitarist draft was rejected and replaced by a rear-three-quarter
family. The kit has no resting sticks. All four ambient triplets pass with
0 px anchor drift, including the wrap transition, so ambient loops are enabled.

## Current playable candidate

The current build is a 60-second **Groove + Defense** round:

- tap one visual Groove Pad at 90 BPM;
- break approaching bottles and mugs before they hit the kit;
- track Groove score/streak and Defense score/combo independently;
- survive with three-point Show Integrity;
- handle the existing vocalist interruption;
- review both jobs separately at the end, with no combined total.

M13.1 moved the Groove Pad from the left hi-hat to a larger lower-centre
ellipse and replaced the old two-beat preparation with a deterministic
`3 → 2 → 1 → GO` pre-roll. The round and all consequences begin only at
`GO`; the first scored Groove beat is one interval later.

No gameplay difficulty value changed in M13.1. BPM, timing windows, target
speeds, spawn cadence, fastball chance, hit forgiveness, scores, integrity,
vocalist timing, and round duration remain frozen for the re-test.

## Milestone state

- M0–M2 fast track: complete.
- M3–M6B asset contract, production, and integration: complete/gate green.
- M7 and M8: deferred when the project pivoted to rhythm; they are not next.
- M9 product rename and rhythm-pivot freeze: complete.
- M10 visual beat clock and Groove Pad foundation: gate green.
- M11 dual-task integration: gate green.
- M12 dual-score HUD and results: gate green.
- M13 rhythm candidate: played on a Galaxy S23 FE; the owner found the loop
  challenging but fun and asked to improve readability and entry.
- M13.1 readability and entry tuning: implemented, gate green, and validated
  by the owner on a physical device — `M13_1_VALIDATED`, no tuning requested.
- M14 Visual Refresh V2: 33/33 production assets integrated; final owner device
  review pending. Runtime changes are limited to enabling validated ambient
  bitmaps and updating measured prop-content bounds. Manifest keys, geometry,
  hitboxes, input, timing, scoring, and difficulty remain unchanged.

## Verification

Re-run on 2026-09-03 after completing the V2 set:

- `git diff --check` — pass.
- `npm run verify` — pass: type-check, lint, and 241/241 tests.
- `npm run validate:art -- --require-ready` — `PASS_ART_READY`, required 33/33.
- `npm run measure:art -- --require-continuity` — `PASS_AMBIENT_LOOP_READY`
  for all four triplets; now part of `npm run verify`.
- Web export and full 60-second browser round — complete, no page errors;
  37 targets destroyed, 0 missed, 43/89 beats hit, integrity 3/3.
- Updated Android development client — landscape launch and visual smoke;
  see the M14 gate for evidence and input limitations.
- `unzip -t prompts/assets-v2.zip` — pass.

The completed M13.1 gate also includes successful Android/web exports and a
native objective smoke on the `Pixel_9` emulator. Confirmed there: landscape
launch, ordered countdown, pulsing pad, no target before `GO`, targets after
`GO`, safe background cancellation during countdown, and a fresh countdown on
restart. No EAS command was used.

The emulator cannot inject taps into the game engine's bubbling play-surface
handler, so it does not establish touch comfort or target/pad hit resolution.
Those input contracts are covered by deterministic tests; ergonomics remain a
human device question.

## Exact next action

The owner requested a commit, merge, and EAS build on 2026-09-03. The selected
playtest profile is Android `preview:device` (installable internal APK), not a
store submission. This request does not close the visual-review gate.

**Owner plays the V2 build on a physical device.** Check target visibility
through the full arc, the lower-centre Groove Pad, character distinction,
rear-facing orientation, and animation comfort. Approve M14 or name specific
visual corrections; do not proceed to deferred gameplay features automatically.

## Known open items

1. M14 physical-device visual approval remains pending. The prior ambient
   continuity defect is fixed; all triplets pass and loops are enabled.
2. The bottom of the reference canvas can sit under the Android gesture area.
   The owner reported no swallowed taps during the M13.1 re-test; keep watching
   bottom-edge Groove Pad taps on other devices.
3. The Groove clock intentionally is not synchronized to the music.
4. `crowd_applause.wav` remains a 39-second, 6.9 MB source and the five audio
   files have not been volume-normalized.
5. Technical identifiers still use `worst-band-ever` /
   `com.worstbandever.app`; migrate them only in a dedicated pre-release
   identity milestone.
6. The generated Android manifest requests `RECORD_AUDIO` through the current
   Expo audio plugin even though the game does not record; remove it before a
   store submission.
7. `package-lock.json` remains ignored, so dependency resolution is not yet
   reproducible across machines.

## Operational constraints

- Do not push unless the owner asks.
- Do not run EAS, publish, submit, or mutate remote project identity without
  explicit owner authorization.
- Do not silently tune difficulty or add a second Groove Pad.
- Do not substitute unverified third-party assets.

For the complete narrative and historical detail, use `project-status.md`.
