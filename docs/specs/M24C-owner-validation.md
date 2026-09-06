# M24C — owner device validation

> **SUPERSEDED (2026-09-06) — historical, not the current checklist.**
>
> This was never executed, and nothing in it is recorded as passed. It was
> deliberately not run: M25 changes the first screen, the title screen and the
> results screen, so a device pass taken against the M24C build would have been
> evidence about a build that no longer exists.
>
> The current device-validation authority is
> `docs/verification/M25-final-device-validation.md`, which covers everything
> below plus the M25 changes, against the friend-beta APK.
>
> Kept for the record of what M24C asked for. Do not tick anything here.

**Status: NEVER EXECUTED. Nothing below has been executed by Claude or by the
owner.**

This is the checklist for the thing a machine cannot check: whether the custom
setlist is *good*. Everything mechanical — the eleven tracks are on the grid,
the setlist persists, the official show is byte-for-byte the show it was, the
audition row cannot ship — is asserted by `npm run verify` and is green
(523 tests, 0 failures). What follows is what only a person with the phone in
their hands can answer.

Print it, or keep it open on a laptop. **Do not tick anything you did not do.**

---

## The build

A standalone release build. No cable after installation, no Metro, no Wi-Fi.

```bash
npm run build:release                             # ~15 s incremental, writes build-out/
adb install -r build-out/worst-gig-ever-release.apk
```

Already built: `build-out/worst-gig-ever-release.apk`, **196,001,379 bytes
(186.9 MiB)**, universal, four ABIs. If you only want to install, skip straight
to the `adb install`.

> **If you have changed or moved any asset since the last build**, run
> `./android/gradlew -p android clean` first. An incremental Android build does
> not notice a directory rename and will happily ship both copies — that is how
> the first M24C APK came out 68 MiB too large.

Debug-keystore signed, like every local build in this project, so Play would
refuse it — which is the point. It is a release-type bundle: `__DEV__` is false
and `EXPO_PUBLIC_AUDITION_BUILD` is unset, so the development audition row is
**absent**. That is exactly the build a player would get, minus the signature.

No EAS credit is spent. Do not use one for this.

> If you want the audition row as well — to compare a track against the click
> outside a round — `npm run build:audition` still produces
> `build-out/worst-gig-ever-audition.apk`. It is not the build this checklist is
> for: item **R3** below is specifically that the row is *gone*.

### Start from a clean slate

The unlock is derived from saved progress, so an existing save will start you
already unlocked and you will not see items **U1–U3**.

```bash
adb shell pm clear com.alessandrolorenz.worstgigever
```

Confirm the package name with `adb shell pm list packages | grep worst` if that
fails.

---

## Official first run

The half of this milestone that is supposed to be invisible. If anything here
has changed, M24C broke something it was not allowed to touch.

```text
[ ] O1  Title screen has NO way into a setlist builder
[ ] O2  Stage 1 music is what it always was (the rock loop)
[ ] O3  Stage 2 is still the teaching bed — a drum floor, not a song
[ ] O4  Stage 3 music unchanged
[ ] O5  Stage 4 music unchanged
[ ] O6  Groove and Defense scoring feel identical to the previous build
[ ] O7  The beat click reads over every stage exactly as before
```

Play all four stages through to a completed show. You need to finish Stage 4 for
the rest of this document.

---

## The unlock

```text
[ ] U1  Completing Stage 4 shows "CUSTOM SETLIST UNLOCKED" on the results
[ ] U2  The line under it reads "You survived ours. Now make it worse."
[ ] U3  A "Custom setlist" button appears in the results button row
[ ] U4  The results screen is not clipped — outcome title and every button visible
[ ] U5  Back to the title: a "Custom setlist" button is now there too
[ ] U6  Play and complete Stage 4 again: the UNLOCK BANNER DOES NOT REAPPEAR
[ ] U7  ...but the "Custom setlist" button is still offered
```

**U6 is the one worth being fussy about.** The banner is a reward for a
first time. Seeing it after every show would make it wallpaper.

---

## The builder

```text
[ ] B1  All 11 songs are listed
[ ] B2  Four numbered slots, all reading "Tap to choose"
[ ] B3  Tapping a song fills slot 01 and the cursor moves to slot 02
[ ] B4  Four taps in the song list = a full setlist, no slot taps needed
[ ] B5  A song already chosen is dimmed with a ✓ and does not respond
[ ] B6  Tapping slot 03, then a different song, replaces only slot 03
[ ] B7  The song that was displaced becomes choosable again immediately
[ ] B8  START THE GIG is visibly dead until all four slots are filled
[ ] B9  The song list scrolls, and the ▾ mark appears when there is more below
[ ] B10 Nothing is clipped: heading, tagline, both columns, both buttons
[ ] B11 Back returns to the title
```

### Listening to the songs

The ▶ beside each title. This is the part you asked for, so it gets its own
block.

```text
[ ] B12 Tapping ▶ plays that song, and the glyph becomes ■ in the accent colour
[ ] B13 Tapping ■ stops it
[ ] B14 Tapping a different song's ▶ swaps — you never hear two at once
[ ] B15 The ▶ is easy to hit with a thumb without hitting the title by mistake
[ ] B16 A song ALREADY in the setlist can still be played — its ▶ is not dead
[ ] B17 Choosing a song while one is playing behaves sensibly
[ ] B18 Back to the title with a song playing: the music STOPS
[ ] B19 START THE GIG with a song playing: it stops, and Stage 1 starts clean
[ ] B20 The preview is loud enough to judge, and matches how it sounds in a round
```

**B15 and B20 are the ones a test cannot reach.** The row is short so that
eleven songs are one scroll rather than three, which makes the ▶ small — it has
an invisible margin around it to compensate. If you keep assigning a song when
you meant to hear it, that margin is wrong.

**B20 matters more than it looks.** The preview goes through the same service
and the same volume as a round, so what you hear here should be what you get.
If the preview sounds louder or quieter than the song does in play, say so.

**B9** is the one this project has got wrong before. Android's scrollbar is dark
grey on a near-black scrim and is effectively invisible; the `▾` under the
column is what tells you there is more. If you cannot tell there are songs below
the fold, that is a failure, not a preference.

---

## Custom gameplay

Build a setlist of four songs you will recognise, and write them down here:

```text
01 ______________________  02 ______________________
03 ______________________  04 ______________________
```

```text
[ ] C1  Stage 1 plays your slot 01
[ ] C2  Stage 2 plays your slot 02 — a real song, not the teaching bed
[ ] C3  Stage 3 plays your slot 03
[ ] C4  Stage 4 plays your slot 04
[ ] C5  The click still reads over all four
[ ] C6  Groove scoring feels the same as it did on the official run
[ ] C7  Defense is unchanged — same bottles, same speed, same timing
[ ] C8  No audio glitch at a stage transition; the outgoing song stops cleanly
[ ] C9  Pause and resume behave normally, music included
[ ] C10 Fail a stage on purpose, retry: the SAME song is still playing
[ ] C11 Complete the custom show: "TONIGHT'S SETLIST" lists your four, in order
```

### C2 is the open design question

Stage 2's first twelve seconds are nothing but the beat and the pad — no
bottles, nothing competing. It is the best showcase in the game for a song you
chose, and it is also the only place a busy arrangement could bury the beat you
are being scored on.

The official run keeps the teaching bed. The custom replay does not, because by
then you have already finished the show and there is nothing left to teach.
**If the beat is harder to read there than it should be, say so** — reverting
this is one line, and it is the specific thing M24D exists to ask.

```text
Stage 2 verdict: ____________________________________________
```

---

## Persistence

```text
[ ] P1  Force-stop the app (swipe away, or `adb shell am force-stop <package>`)
[ ] P2  Reopen it
[ ] P3  Custom setlist is still unlocked — the title button is there
[ ] P4  Open the builder: your four songs are still in their slots, in order
[ ] P5  START THE GIG is live immediately, without re-choosing anything
```

---

## Regression

```text
[ ] R1  Title → any stage card still starts the OFFICIAL music, not your setlist
[ ] R2  Quitting a custom run to the title does not lose your saved setlist
[ ] R3  NO development audition row anywhere — the title screen has no yellow box
[ ] R4  No crash, no audio error toast, no silent stage
[ ] R7  No song is ever left playing on a screen with no way to stop it
[ ] R5  Switch language to Português: the builder still fits and reads correctly
[ ] R6  Song titles are STILL IN ENGLISH in Portuguese — that is deliberate
```

**R1 is the safety property of the whole milestone.** A stage card must always
start the authored show. If pressing a stage card ever plays your custom
setlist, stop and report it — the first run a new player takes would be wrong.

---

## Layout, in both languages

The builder was measured against a 923 x 411 dp phone in landscape with a
pessimistic wrapping model, and one number in it —
`SETLIST_CHROME_HEIGHT` — is a **derived estimate rather than a measurement**.

```text
[ ] L1  English: nothing clipped, nothing overlapping
[ ] L2  Português: nothing clipped, START THE GIG still reachable
[ ] L3  A screenshot of the builder in each language, for the record
```

If **L3** is captured, `SETLIST_CHROME_HEIGHT` can be replaced with a real
measurement the way `BRIEFING_CHROME_HEIGHT` was, and the estimate note in
`game/rendering/overlayLayout.ts` deleted.

---

## Anything else

Free text. The audition asked whether these songs were good; this asks whether
choosing them is.

```text
______________________________________________________________
______________________________________________________________
______________________________________________________________
```

---

## Outcome

```text
[ ] PASS      — M24C is done; M24D can open
[ ] PASS with notes ____________________________________________
[ ] BLOCKED   — what failed: ___________________________________
```

Date: ____________
