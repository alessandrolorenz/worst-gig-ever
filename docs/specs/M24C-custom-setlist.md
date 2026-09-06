# M24C — Custom Setlist unlock and the production music library

**Status:** implementation complete, 2026-09-06. Owner device validation
pending — `docs/specs/M24C-owner-validation.md`.
**Branch:** `m24/custom-setlist`, from `m24/music-library` at `2d7ded3`.
**Companions:** `M24-custom-setlist.md` (the ten decisions),
`M24-architecture.md` (the code shape), `M24-implementation-plan.md`
(the sequence), `M24B-owner-audition.md` (the verdict this milestone acts on).

---

## What happened

The owner auditioned the eleven M24B candidates on a phone and kept all eleven:

```text
11 / 11 KEEP
0 MAYBE
0 REJECT
```

> All of the songs worked well in the actual game.
> The more groove-oriented tracks were especially enjoyable.
> None should be removed.

So M24C is the milestone that turns eleven auditioned assets into a feature the
player owns. The first playthrough is still authored. The reward for surviving
it is **BUILD THE WORST SETLIST**.

---

## 1. The promotion

All eleven are `release: 'production'` with `ownerConfirmed: true`. Nothing else
about any of them moved: the same source SHA-256, the same conditioning command,
the same measured source tempo, the same provenance record, the same bytes on
disk.

`npm run measure:tempo -- --require-locked` after the promotion:

| | rank | grid agreement | groove-qualified |
|---|--:|--:|---|
| all eleven library tracks | 1 | 0.305 – 0.750 | yes |
| `grooveBed`, `showBed` | 1 | 0.731 – 0.839 | yes |
| `showTheme` | 9 | −0.018 | **no**, and unchanged |

`showTheme` is still `unverified` and still unselectable. It backs Stage 1,
which scores no beat, and the gate that rejects it was not touched.

### The files moved

`assets/audio/music/candidates/` → `assets/audio/music/library/`.

A deliberate decision, not churn (§36 of the brief). Three reasons, and the
third is the one that made it worth the diff:

- they are not candidates any more, and the path is read by people;
- the release bundle's meaning becomes legible — this directory is shipped
  music;
- **`candidates/` is a directory somebody eventually tidies up.**
  `scripts/build-candidates.mjs` said in its own header that ten of them would
  be deleted once the owner chose. Leaving eleven shipped tracks under that name
  is leaving a trap.

`scripts/build-candidates.mjs` became `scripts/build-library.mjs`,
`npm run build:candidates` became `npm run build:library`, and its verification
token `PASS_CANDIDATE_SOURCES` became `PASS_LIBRARY_SOURCES`. The move is a
`git mv`, so history follows the files, and
`scripts/audit-provenance.mjs`'s `SEARCH_ROOTS` was repointed in the same
commit — a provenance block whose file the auditor cannot find reports **zero
claims rather than a failure**, which is the silent way this could have gone
wrong. It did not: the audit checks 43 claims before the move and 43 after.

`release: 'candidate'` stays in the type. There are no candidates today, and the
pipeline that produces them is still here — the next track this project acquires
enters as one, is heard, and is promoted. The rule that a conditioned track may
not ship unheard needs both states to have anything to say.

---

## 2. Production availability does not depend on the audition flag

The distinction §6 of the brief insists on, and it is now load-bearing in two
directions:

```text
production music availability   <- what availableTracks(false) returns
audition UI visibility          <- what showsAuditionTools() decides
```

Before M24C these coincided: the library was empty in a release build *because*
every track was a candidate. Now `availableTracks(false)` returns all eleven,
`availableTracks(true)` returns the same eleven, and
`tests/setlist.test.ts` asserts the two answers are equal and that a build with
`EXPO_PUBLIC_AUDITION_BUILD` unset can still build and parse a setlist.

The builder reads `availableTracks()`. In a release build that is the eleven; in
a development or audition build it would additionally carry any future
candidate, which is the audition mechanism `M24-architecture.md` §9 always
intended — the builder *is* the audition tool, at zero extra UI.

---

## 3. The official show is unchanged

| Stage | Official music | Changed? |
|---|---|---|
| 1 — the gig | `showTheme` | no |
| 2 — find the beat | `grooveBed` | no |
| 3 — the show | `showBed` | no |
| 4 — encore | `showBed` | no |

`OFFICIAL_SETLIST` is still `STAGES.map((s) => s.music)`, still frozen, still
pinned to a literal by a test. Every entry point except START THE GIG assigns
it: stage cards, "Next stage", quitting, returning to the title.

---

## 4. The unlock

Derived, exactly as M24A designed it. No new persisted state:

```ts
isCustomSetlistUnlocked(flow) === flow.bestStageCleared >= STAGES.length - 1
```

`recordStageCleared` now also **reports the crossing**:

```ts
{ hasNext: boolean; unlockedCustomSetlist: boolean }
```

computed by asking `isCustomSetlistUnlocked` on either side of the one line that
can change the answer. That is what makes the reward moment a transition rather
than a state — `CUSTOM SETLIST UNLOCKED` is right the first time and wrong every
time after — without persisting an "unlock message seen" flag. It is idempotent
where it matters: the effect that calls it re-runs on re-render, and a second
call raises no high-water mark and reports `false`.

### The first-completion screen

```text
SHOW COMPLETE
You kept the groove alive. Somehow.

CUSTOM SETLIST UNLOCKED
You survived ours. Now make it worse.

[ GROOVE / DEFENSE columns, unchanged ]

[ Play again ] [ Custom setlist ] [ Share ] [ Quit to title ]
```

The outcome title stays `SHOW COMPLETE`. The brief sketched
`YOU SURVIVED THE WORST GIG EVER`, which cannot be a catalogue string —
`docs/release/product-identity.md` forbids translating the product name — and
the existing results architecture already says the same thing in the line under
it. The banner is added, not substituted.

On every later completion the banner is absent and the `Custom setlist` button
remains, which is §37's "BUILD ANOTHER SETLIST" without a second string.

---

## 5. The builder

One new screen, `'SETLIST'`, between `'TITLE'` and `'BRIEFING'` in
`APP_SCREENS`. No modal, no new primitive, no new dependency.

```text
              BUILD THE WORST SETLIST
        You survived ours. Now make it worse.

  ┌────────────────────────┐   YOUR SONGS
  │ 01  NO REFUNDS         │   ┌──────────────────────────┐
  │ 02  — Tap to choose —  │◂  │  NO REFUNDS            ✓ │
  │ 03  — Tap to choose —  │   │  BROKEN AMP              │
  │ 04  — Tap to choose —  │   │  LAST CALL               │
  └────────────────────────┘   │  STAGE DIVE DISASTER     │
                               │  …                       │
                               └──────────────────────────┘
                                          ▾
              [ START THE GIG ]  [ Back ]
```

- one slot is active; tapping a slot arms it;
- tapping a song fills the active slot and **advances to the next empty one**,
  so four taps in the right column is a whole setlist;
- a song already in the draft is drawn with `✓`, dimmed, and is deaf;
- replacing a slot is: tap the slot, tap a different song. The displaced song
  becomes choosable again immediately, because availability is read off the
  draft rather than from a second set;
- `START THE GIG` is deaf until `completedDraft(flow)` is non-null — the same
  function `startCustomGig` calls, so a live-looking button and a refusing gig
  cannot disagree.

Every judgement lives in `game/state/appFlow.ts` and is tested without a
renderer. The component draws state and reports taps.

### Layout

The slot column is a **fixed box** — four rows are the whole feature, and a
setlist you scroll to see is not one you can read at a glance. It needs 198 dp
of the ~248 dp a 411 dp phone leaves after chrome.

The library column **scrolls**: eleven rows need about 335 dp. It measures
itself and draws the same `▾` the briefing card uses, because Android's
scrollbar is dark grey on a near-black scrim and a player will not see it.
`tests/layoutBudget.test.ts` checks both rules in English, pt-BR and pseudo, and
asserts the library genuinely overflows so the cue is not being tested
vacuously.

Widest row content at 1.4x pseudo expansion is 28 characters against 30 that
fit — two characters of slack, which is why the one-line rule on slot titles is
a hard assertion rather than a preference.

`SETLIST_CHROME_HEIGHT` is **derived and then corrected**, not measured: 135 dp
of declared stylesheet sum times 1.2, the ratio between the briefing's declared
118 and its measured 141. It errs high, which makes the columns smaller than the
device will draw them — the direction that rejects a layout rather than passing
one that clips. Replace it with a screenshot measurement at M24D.

### Genre labels: omitted

The metadata exists and the production builder does not draw it (§26). Eleven
rows in a 380 dp column with a second line of grey type each is noise, and it
would put seven more strings in front of a translator for a decoration. The
title is what the player is choosing.

---

## 6. The custom run

| Setlist slot | Stage | Runtime music source |
|---|---|---|
| 1 | Stage 1 — the gig | `flow.setlist[0]` |
| 2 | Stage 2 — find the beat | `flow.setlist[1]` |
| 3 | Stage 3 — the show | `flow.setlist[2]` |
| 4 | Stage 4 — encore | `flow.setlist[3]` |

Resolved by `trackForStage(scene.flow.setlist, scene.flow.stageIndex)` in
`GameEngine.resetScene` — the same single line the official show goes through.
There is no second music path and no second gameplay engine.

### Stage 2

```text
Official run  -> grooveBed
Custom run    -> the player's slot-2 song
```

The decision in §15 of the brief and Q3 of the spec, implemented without a
special case: slot 2 is a slot. What protects the player is not `grooveBed` but
that **every production track is on the beat clock**, which
`tests/audioContract.test.ts` holds for the whole library rather than for one
file.

Reverting it later is one line — pin slot 1 in `startCustomGig` — and the
architecture never needs to know. M24D is where the owner answers whether a full
arrangement in Stage 2's exposed twelve-second intro is still legible.

### Failure and retry

A ruined stage is a retry and never touches `flow.setlist`, so a retry replays
the same stage on the same songs. Quitting to the title restores
`OFFICIAL_SETLIST` on the run and **leaves the draft alone** — those are two
different fields for exactly this reason (§38).

---

## 7. Persistence

`SavedState.customSetlist: Setlist | null`, added to `KNOWN_FIELDS`,
`emptySave`, `parseSave` and `serializeSave`. **`SCHEMA_VERSION` stays 1**: the
field is additive and optional, an older build carries it through untouched via
the existing unknown-field passthrough, and a newer build reading an older file
gets `null`, which is correct for a player who never built one.

`parseSave` runs the value through `parseSetlist`, which **rejects rather than
repairs**. A wrong length, a duplicate, a bed, a hole, a track from a bigger
library — every one becomes `null`, which puts the player in front of an empty
builder they know how to fix rather than into a run they never built.

Written on the same events every other saved field is, plus explicitly at START
THE GIG — the moment the draft stops being a screen's state and becomes their
setlist. A half-built draft is never saved.

On load the setlist becomes the **draft**, never the run: a cold start opens on
the title, and the title plays the authored show.

### Reset

**There is no reset-progress control in the game.** `clearSave()` exists in
`game/state/storage.ts` for development and nothing calls it, so "reset" means
the save file going away — reinstall, cleared app data, or that function.

Both facts live in the same file, so they cannot come back separately: a cleared
save is `bestStageCleared: -1` *and* `customSetlist: null`, which relocks the
feature and empties the builder in one step. And the gate is the unlock, never
the presence of a setlist: `openSetlist` and `startCustomGig` both refuse while
locked, so even a save holding a valid setlist without the progress that earns
it cannot be played.

---

## 8. Audio

`preloadSetlist(setlist)` at START THE GIG — four tracks, at the builder,
before the briefing, so the async player creation is finished before the round
needs it. Never the library: `tests/setlist.test.ts` reads every
`preloadSetlist` call in `GameEngine.tsx` and fails if one is passed
`availableTracks`, `trackIds`, `libraryTracks`, `MUSIC_TRACKS` or
`selectableTracks`.

Resident players: **at most `SETLIST_SLOTS` — four** for a custom run, three for
the official show (`showBed` twice), and **one** while the player is browsing
the library with the ▶. Eleven decoders are never open at once — browsing
releases the previous preview rather than accumulating them.

Every way onto and off the builder routes through one `stopPreview` helper, so
nothing the player cannot stop is left sounding on a screen with no control for
it — and a fourth exit cannot forget, because there is one thing to call.

### Track preview

**Implemented, on the library rows** — owner decision, 2026-09-06: *"i think is
necessary to listen to the songs to choose them in the custom setlist."*

This reverses the first draft of this milestone, which deferred preview and
recommended putting it on the four *slot* rows instead. That recommendation was
wrong in a way worth recording: a slot-row `▶` only plays a song you have
already chosen, and the owner's sentence is about the other direction — you
cannot choose from eleven names you have never heard. Preview belongs where the
choosing happens.

Each library row is therefore two targets, not one:

```text
┌──────────────────────────────────────┐
│  NO REFUNDS                  ▶     ✓ │
│  └── tap to choose ──┘       └ tap to listen
└──────────────────────────────────────┘
```

- **choosing** goes deaf once the song is in the draft — the no-duplicates rule,
  drawn;
- **listening never goes deaf**, including for a song already in the setlist.
  "What did I put in slot 3?" is exactly as real a question as "what is this
  one?", and a control that dies the moment you use the row reads as broken
  rather than as a rule;
- it is a toggle: `▶` becomes `■` in the accent colour, and pressing the
  sounding song stops it. One song at a time — two at once is a preview of
  neither, the same rule the audition row already follows;
- the accessible name is `Play {title}` / `Stop {title}`, because the control is
  a glyph and eleven buttons all called "Play" is not a name.

The title column gives up 34 dp for it and still fits the longest pseudo-locale
title on one line (28 characters of 38). The row stays short — eleven songs
should be one scroll, not three — so the `▶`'s own box is about 24 dp tall and
`hitSlop` buys the rest of a thumb-sized target without buying it in layout.

### The one service change this needed

`preloadSetlist` deliberately never releases what is sounding. A previewed song
that has been **stopped** is not sounding, but `music` still pointed at it — so
it survived every later preload, and a player who listened to a song and did not
choose it carried a fifth decoder through the whole show.

The guard is now "is the current player **and is actually playing**", and
`playing === false` rather than `!playing`: if a platform shim does not report
the field, the answer is `undefined` and the safe reading of *I cannot tell* is
the old conservative one. Releasing the current player also nulls `music`, which
would otherwise dangle at a removed one.

Order matters at START THE GIG, and a test pins it: the preview is stopped
**before** the setlist is preloaded. Reversed, the preview would still be
playing when the release decision was taken.

---

## 9. Localization

| | |
|---|---|
| English | complete — one new `setlist` block, ten keys |
| pt-BR | complete, hand-written, `REVIEW:` notes on the two judgement calls |
| pseudo | generated from English, as always |

Song titles stay canonical in every locale. `NO REFUNDS` on a Brazilian setlist
reads as the name of a song, which is the joke; translated it reads as a
description of one. `tests/localization.test.ts` pins the policy rather than
skipping it.

Two pt-BR choices deliberately differ from the brief's suggestions:

- `CUSTOM SETLIST UNLOCKED` → **`SETLIST PRÓPRIO LIBERADO`**, not
  `SETLIST PERSONALIZADO DESBLOQUEADO`. "Liberado" is what a Brazilian says
  about something that has opened up; "desbloqueado" is the app-store word. It
  is also 34 characters shorter in a banner that has one line.
- `setlist` stays English, for the reason `Groove` and `pad` already do: it is
  what a musician says. "Repertório" is correct and is what an orchestra has.

`START THE GIG` → `COMEÇAR O SHOW`, matching the briefing's existing
`Começar o show` rather than inventing a second verb for the same act.

---

## 10. What was deferred, and why

- **The four-row `TONIGHT'S SETLIST` card** the brief sketches. The results
  screen has 411 dp and the two score columns already claim most of it, so the
  run's songs are one heading and one line instead. It answers the same
  question and is the shape a share card would reuse.
- **Sharing a setlist.** Not implemented, no dependency added. `flow.setlist` is
  live at `SHOW_COMPLETE` and `isCustomRun(flow)` distinguishes the run, which
  is the whole obligation this milestone accepts.
- **Compressing the library.** Trigger-based; see §11.

---

## 11. Size

| | bytes | MiB |
|---|--:|--:|
| the eleven library tracks | 71,501,284 | 68.19 |
| the three runtime beds | 6,659,306 | 6.35 |
| all bundled `.wav` | 79,395,416 | 75.72 |

Unchanged by this milestone — the same eleven files, moved.

| Standalone universal APK (4 ABIs) | bytes | MiB |
|---|--:|--:|
| `build-out/worst-gig-ever-release.apk` | 196,001,379 | 186.9 |
| `build-out/worst-gig-ever-audition.apk` | 196,001,379 | 186.9 |

Both contain **20 `.wav` resources totalling 79,395,416 bytes**, which is the
source tree exactly. Identical in size because the audition flag changes one
folded boolean, not an asset.

### A stale-build trap, and why the first number was wrong

The first release APK came out at **255.1 MiB** and it was not real. Gradle's
merged resources still held the eleven tracks at their old `candidates/` paths
*alongside* the new `library/` ones: **31 bundled `.wav` files where the tree
has 20**, and a 68.2 MiB delta that is almost exactly one extra copy of the
library.

A directory rename is invisible to an incremental Android build.
`npm run build:audition`'s existing cleanup — `rm -rf` the generated JS bundle
assets — does **not** cover this, because the duplicates were in merged
resources rather than in the bundle directory.

**After moving or renaming any asset, run `./android/gradlew -p android clean`
once before measuring anything.** The figures above are from a clean rebuild.
Recording it here because the failure mode is a plausible-looking number in a
document, which is the exact species of stale claim
`scripts/audit-provenance.mjs` exists to fight.

---

## 11a. The audition flag, checked in the bundle

The one thing about this flag that no runtime test can check. Both bundles were
decompiled and `isAuditionBuild()` is **constant-folded at build time**:

```text
release  … function o(){if('undefined'==typeof process||void 0===process.env)return!1;return!1}
audition … function o(){if('undefined'==typeof process||void 0===process.env)return!1;return!0}
```

`return!1` and `return!0`. Expo's Babel transform substituted the literal member
expression and the minifier folded the comparison away, so a shipping build does
not merely *evaluate* the flag as false — it has no flag left to evaluate. This
is the check that caught M24B writing `process.env[AUDITION_BUILD_FLAG]`, which
every test passed and no bundle honoured.

`BUILD THE WORST SETLIST` is present in **both** bundles, which is the other
half of §6: the builder is production UI and does not depend on the flag.

**Play delivery is not estimated here and should not be.** An AAB splits by ABI
and the 73%-of-the-app native libraries are what that split addresses; audio is
delivered whole. The number that matters is a real Play internal-track download,
and guessing it is how `docs/assets/AUDIO-SOURCES.md` acquired three stale
claims in a day.

If a download-size target ever arrives, the escape hatch is unchanged and
unchosen: 96 kbps mono AAC of the same 16-bar derivative, ~7x smaller, at the
cost of a decode step in the tempo audit and a loop-seam risk that has to be
measured on the device. **Do not take it pre-emptively** — the owner approved
these tracks as they sound.

---

## 12. Automated verification

```text
npm run verify                              523 tests, 0 failures
  npm run type-check                        clean
  npm run lint                              clean
  npm run validate:art -- --require-ready   PASS_ART_READY
  npm run measure:art -- --require-continuity  PASS_AMBIENT_LOOP_READY
  npm run audit:provenance -- --require-clean  PASS_PROVENANCE_CURRENT  (43 claims, 0 drifted)
  npm run measure:tempo -- --require-locked    PASS_TEMPO_EVIDENCE      (14 tracks, 0 findings)
  npm run build:library -- --verify            PASS_LIBRARY_SOURCES     (11 tracks, 0 problems)

npx expo export --platform web              exit 0
git diff --check                            clean
```

Baseline before this milestone: 487 tests. M24C adds 36.
