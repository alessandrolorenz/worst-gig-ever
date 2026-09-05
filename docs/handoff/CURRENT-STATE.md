# Current Continuation State

- Last reconciled: 2026-09-03
- Branch: `feat/m15-story-and-stages`, **not yet merged to `main`**
- M15 baseline: `4571f30` (M14.1), which sits on `main`
- M14 merge: `f277e0430ece4bcd7f429e3529fd33e801bdb61f`
- Active stage: **M15 story, briefings, and two stages — device review pending**
- Gate outcome: `M15_DEVICE_REVIEW`

The owner supplied five narrative illustrations on 2026-09-03 and asked for a
story before the game starts, a how-to-play screen, and two stages beginning
with a defense-only one. All three are implemented and the automated gate is
green: 299 tests, both art gates, web and Android exports, and three headless
browser runs at 923x411 with zero page errors. See
`docs/verification/M15-gate.md` and
`docs/specs/M15-story-briefings-and-two-stages.md`.

Four design decisions were taken with the owner before implementation: the
story auto-plays and is skippable and replayable; the stages are two separate
rounds rather than one continuous one; how-to-play is a briefing card per stage
rather than a single rulebook; and M14.1 was committed first so this is a
separate diff.

## Installable builds

Both are Android `preview:device` APKs (internal distribution, same EAS
signing key, so one installs over the other).

| Build | App version | Contents | APK |
| --- | --- | --- | --- |
| `9d1dd65c-8c08-411b-80d4-aa89098df279` | 1.0.3 | M14.1 only, **no M15** | [apk](https://expo.dev/artifacts/eas/--xeDgVDdNhyNOsG_gWwV138fLjzO0Doco0U2R7Hvz4.apk) |
| `62edf299-c0bb-4f5a-8512-22980fdfe64b` | **1.0.4** | M14.1 + M15, commit `5df6f0b` | [apk](https://expo.dev/artifacts/eas/pji0xP0kt4ebfNrLkbuspc8N7CFJGsxDoBR6lrlI6wA.apk) |
| `f397efc9-954b-4b16-bea1-e28287440a64` | **1.1.0** | **the closed MVP** — all four stages, commit `c749f1f` | [apk](https://expo.dev/artifacts/eas/WdW0g-bfHBBVxgNyqv5rxHVhns3P6-dGO1H8NkLixuI.apk) |

Both requested by the owner on 2026-09-03 and both finished. 1.0.4 is 126 MB
and was built in ten minutes.

**1.1.0 is the MVP-complete build**, requested by the owner on 2026-09-04 after
he closed the MVP, and built in 11 minutes. It is the first EAS build since
1.0.4 and the first one that contains M16, M17 and M18 at all.

Two things about it are worth knowing before it is handed to anyone:

- **EAS assigned it `versionCode` 1**, the same as 1.0.3 and 1.0.4, because
  `cli.appVersionSource` is not set and remote versioning started over. They
  install over each other on the shared signing key, so this is harmless today
  and would not be in a store. Setting `appVersionSource` is v2 work.
- **`RECORD_AUDIO` was still declared** in that build, and the game never
  records. It was left in deliberately so the 1.1.0 APK is the build the owner
  approved rather than an untested variation of it. **Removed at M18.5**, which
  is after this build: 1.1.0 still requests it, anything built since does not.

### Local release builds — no EAS, no cost, no queue

Since 2026-09-04 the project builds its own release APKs.
`./android/gradlew -p android assembleRelease` succeeds in ~25 s and produces
`android/app/build/outputs/apk/release/app-release.apk` — 116 MB, all four ABIs,
`assets/index.android.bundle` embedded, JSC, signed with the debug keystore
through the stock `signingConfig`. **`npx expo run:android --variant release` is
the thing that does not work**; it dies on the `lintVitalAnalyze` tasks, and the
gradlew invocation does not run them. That distinction is why the project
carried a "local release builds are broken" note for four days that was never
true of this command.

These install over each other but **not** over the EAS APKs above — different
signing key. Uninstall first when switching.

| App version | versionCode | Contents | Commit |
| --- | --- | --- | --- |
| 1.0.5 | 2 | M14.1 + M15 + M16 + M17, the first release build | `02b1345` |
| 1.0.6 | 3 | + M18 as first specified (closeness 0.5, rect 520x440) | `6826894` |
| **1.0.7** | **4** | + the five 1.0.6 playtest corrections | `d3ee675` |

Every version number is distinct on purpose: six builds now exist across two
signing keys, and none of them can be mistaken for another from the app info.

Before handing any of these over, two checks are worth the thirty seconds they
cost, because "it installed" is not "it shipped what you think":

```sh
# 1. the bundle really contains what the build was supposed to add
unzip -o -q app-release.apk assets/index.android.bundle -d /tmp/apk
grep -c YOUR_NEW_SYMBOL /tmp/apk/assets/index.android.bundle

# 2. it launches without a runtime error
adb shell monkey -p com.worstgigever.app -c android.intent.category.LAUNCHER 1
adb logcat -d -t 300 | grep -iE "AndroidRuntime|FATAL|redbox"
```

If autolinking is ever suspect, `npx expo-modules-autolinking resolve -p android`
must report **15** modules (ADR 0006).

The version numbers differ on purpose: every build before 1.0.4 reported 1.0.3,
so two APKs on one phone could not be told apart from the app info — in a
playtest whose point is comparing them. `versionCode` stays at 1, which is what
the previous internal APKs installed over each other with.

~~**Use 1.0.3 to answer the M14.1 performance question in isolation**~~ —
**moot.** The question was answered on 2026-09-04 against **1.0.7**, which
carries M14.1 plus four further milestones and therefore strictly more work per
frame than this isolated build. It passed. An isolation run can no longer
improve on that answer; do not request one.

**M14.1 is committed as `4571f30` on `main`.** The owner approved the M14
APK visually but reported delayed taps on the Galaxy S23 FE and authorized
investigation/correction. M14.1 keeps all art unchanged, crops the pad's SVG
drawing surface, avoids unchanged pose-tree renders, uses fixed-layout sprite
transforms, and preserves new hit feedback through a slow frame. See
`docs/verification/M14.1-gate.md` for measurements.

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

The build now opens on a five-panel story (poster, stormy arrival, load-in, the
show working, the beer that hits the mixing desk) and then a title screen with
two stages. Each stage opens with its own briefing card.

**Stage 1 — "Hold the line", 40 s, defense only.** No Groove Pad, no Groove
readout, no beat scheduled, scored or missed, one summary column, and no
vocalist interruption. Its first two spawn phases are identical to the show's
(1800 ms bottles, then 1300 ms with mugs) so it teaches the round the player is
about to play; only the last phase is gentler, 950 ms against the show's 850 ms.
Seed 2, so it does not spoil the show's opening throws.

**Stage 2 — "Keep the beat", `level01`, unchanged.** The 60-second
**Groove + Defense** round:

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
- M14 Visual Refresh V2: 33/33 production assets integrated; owner approved the
  visuals on device. M14 runtime changes were limited to enabling validated ambient
  bitmaps and updating measured prop-content bounds. Manifest keys, geometry,
  hitboxes, input, timing, scoring, and difficulty remain unchanged.
- M14.1 render performance: committed as `4571f30`; device retest still open.
- M15 story, briefings and two stages: implemented, gate green, awaiting the
  owner's physical review.

## Verification

Latest M14.1 verification: 248/248 tests, type-check, lint and strict art gates
pass; Android export succeeds; full browser round completes with 36 objects
destroyed, zero missed and integrity 3/3. Native visual smoke passes. Browser
JavaScript work decreased 36.3% in a single comparative probe; physical-device
responsiveness remains unmeasured. See `docs/verification/M14.1-gate.md`.

Historical M14 integration verification (2026-09-03):

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

**Install 1.0.4 on the Galaxy S23 FE and answer two questions in one sitting.**

1. **Performance (M14.1).** Compare tap-to-feedback response from the first
   target through repeated breaks. If it still reads as sluggish, fall back to
   1.0.3 to confirm the new screens are not the cause. The visual direction is
   approved; do not regenerate artwork or change difficulty. Browser results
   are not device FPS.
2. **M15 review.** Does the story read at arm's length, and is 3.6 s per panel
   right? Does Stage 1 teach the defense job well enough to be worth 40
   seconds? Do the briefing cards say enough without saying too much? Then
   decide whether `feat/m15-story-and-stages` merges into `main`.

The one path never exercised outside an automated test is **clearing Stage 1
and landing in Stage 2** — the results button should read "Next stage" and go
straight to Stage 2's briefing without passing through the title.

## Known open items

1. M14.1 physical-device performance retest is pending. Visual direction is
   approved; all triplets pass and loops remain enabled.
2. M15 physical-device review is pending; the branch is unmerged.
3. Stage progression is not persisted across launches, and no stage is locked.
   A real unlock needs storage, which is an MVP non-goal — lifting it is an
   owner decision, not an implementation detail.
2. The bottom of the reference canvas can sit under the Android gesture area.
   The owner reported no swallowed taps during the M13.1 re-test; keep watching
   bottom-edge Groove Pad taps on other devices.
3. The Groove clock intentionally is not driven by the music, and that has not
   changed. What changed on 2026-09-05 is that the music no longer *disagrees*
   with it: the show's bed used to be a 120 BPM track under a 90 BPM clock.
   See `docs/assets/AUDIO-SOURCES.md`.
4. **Done, and this entry was stale from M16 to 2026-09-05.** The applause was
   trimmed on 2026-09-04 — it is 5.00 s / 0.88 MB, not 39 s / 6.9 MB — and the
   derivative was recorded in `docs/assets/AUDIO-SOURCES.md` at the time; only
   this list was never updated. The "not volume-normalized" half is not a
   defect either: `MIX` sets a per-sound level with a stated reason for each,
   so normalizing the files would discard tuning rather than add any.
5. **Done at M18.5.** The Expo slug is `worst-gig-ever` and the application id
   is `com.worstgigever.app`. Anything installed before M18.5 uses the old
   package id and will not upgrade — uninstall it. The EAS project rename on
   expo.dev is an external action and is still outstanding; **EAS builds fail
   until it is done**. See `docs/release/product-identity.md`.
6. **Done at M18.5.** `RECORD_AUDIO` is gone. The game only ever calls
   `createAudioPlayer` and `setAudioModeAsync`, so it was provably unused;
   expo-audio's plugin adds it by default, so it is switched off explicitly
   with `microphonePermission: false` rather than merely dropped from the
   permissions array, or prebuild would put it back.
7. **Done at M18.5.** `package-lock.json` is tracked. It was ignored by
   the template default, which is what made dependency resolution
   non-reproducible across machines.

## Operational constraints

- Do not push unless the owner asks.
- Do not run EAS, publish, submit, or mutate remote project identity without
  explicit owner authorization.
- Do not silently tune difficulty or add a second Groove Pad.
- Do not substitute unverified third-party assets.

For the complete narrative and historical detail, use `project-status.md`.
