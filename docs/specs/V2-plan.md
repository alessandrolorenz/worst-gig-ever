# V2 — Internationalization

**Status:** proposed, 2026-09-04. Nothing here is started.
**Owner decision:** *"o foco da v2 será a internacionalização."*

## What this actually costs here

Surveyed rather than estimated, because the cost of i18n is almost entirely
decided by two things — how the strings are stored, and whether text is baked
into art.

| | State | Consequence |
|---|---|---|
| UI strings | **Hardcoded literals**, ~88 in `Overlays.tsx` alone, plus `stages.ts` briefings, `storyState.ts` captions, HUD and countdown labels | Every one has to be extracted. Mechanical, large, low-risk. |
| i18n library | **None.** No `expo-localization`, no catalogue, no locale detection | Has to be introduced. One new dependency. |
| Art with text | **One file.** `01_poster.jpg` has "WORST GIG EVER" hand-lettered into it, plus a background "BAR" sign | See below — cheap if the title stays English. |
| Everything else in art | **Text-free**, because the V2 style bible forbids text, logos and readable branding (rule 12) | 33 production assets need no work at all. This is the expensive thing the project already avoided. |
| Story | Five stills with **runtime captions**, not baked text | Translatable as strings. |

**The art is the good news.** The one rule that looked like an art constraint —
no text, no branding — is what makes this a string project rather than an
asset-regeneration project.

### The title should not be translated

`01_poster.jpg` is the only art that would need regenerating, and only if
*Worst Gig Ever* becomes *Pior Show da História*. It should not. The title is
the game's name and its store identity; translating it fragments the thing
people search for and costs an art regeneration per locale. The background
"BAR" sign reads the same in Portuguese and Spanish anyway.

Recommendation: **the title stays English in every locale.** Everything else
translates.

## The bug that is about to happen four more times

On 2026-09-04 stage 1's briefing overflowed its card: about 300 px of content
in a 150 px scroll with the indicator off, so the mug rule was on screen and
unreadable. It was fixed by raising the scroll and shortening the copy.

**That fix does not survive translation.** Portuguese runs roughly 15–25%
longer than English for the same meaning; German and French are worse. Stage 1
now fits its 200 px card *in English*, with little to spare. In pt-BR it
overflows again, and the failure mode is silent — text that does not fit is
absent and looks exactly like text that was never written.

This is the single most important thing i18n changes about this codebase, and
it is a layout problem rather than a translation problem. **Every text surface
has to become length-independent instead of tuned to English.** That is M20,
and it is where the real work is.

## Order

Corrected at M18.5. The earlier draft of this plan placed release identity
*after* localization; that was wrong for the reason M18.5 acts on — an Android
package id is effectively permanent once published, and internationalizing is a
decision to reach more people, every one of whom would install a build the
migration invalidates.

### M18.5 — Final release identity — **DONE (2026-09-04)**

Expo slug `worst-gig-ever`, application id `com.worstgigever.app` on both
platforms, `RECORD_AUDIO` removed, `package-lock.json` tracked, and an identity
contract at `docs/release/product-identity.md` with a test that guards it.

One external action remains and it **blocks EAS builds**: the EAS project is
still named `worst-band-ever` on expo.dev and must be renamed there. See
`docs/specs/M18.5-final-release-identity-report.md`.

### M19 — Locale foundation — **IMPLEMENTED (2026-09-04), emulator-validated (2026-09-05)**

Every user-visible string into typed localization catalogues. **English only —
no translation yet.** Locale detection plus an explicit in-game language
selector, because a language you cannot select is a language you cannot check.

Ends with the game looking identical, running out of a catalogue, and a test
that fails if any user-visible literal is left behind.

Delivered as specified, on `m19/locale-foundation`. Spec and decisions:
`docs/specs/M19-locale-foundation.md`. `npm run verify` green at 390 tests.

Three things the plan above did not settle, decided in the spec:

- **No i18n runtime.** `expo-localization` is the one dependency, and only for
  reading the device's languages. `Catalogue = typeof en` makes a locale's
  completeness a `tsc` error, which is worth more here than plural rules and
  lazy loading.
- **The domain lost its prose.** `stages.ts` and `storyState.ts` hold ids;
  the catalogue holds the sentences, keyed by the same ids.
- **The language control is invisible until there is a choice.** It is built,
  wired and tested; adding `pt-BR` to `SUPPORTED_LOCALES` is all that makes it
  appear.

Validated on the Pixel_9 emulator on 2026-09-05: every screen reachable without
playing a round renders from the catalogue, both interpolated strings included,
and no language control is drawn. Owner device verdict outstanding.

### M20 — Translation-safe layout — **IMPLEMENTED (2026-09-05), emulator-validated**

The milestone the briefing bug demands. Pseudo-locale expansion, English-length
layout assumptions removed, silent clipping prevented.

Before translating, not after: translating into a layout that cannot hold it
produces four broken languages instead of one.

**Upgraded from preparatory to corrective by the M19 emulator run.** The
prediction above — that stage 1 "now fits its 200 px card *in English*, with
little to spare" — is wrong. It does not fit. On a 2424x1080 landscape phone
the card shows two and a half of its five bullets at rest, and the mug rule is
the sentence cut in half. Everything is reachable by scrolling, so it is
M18.1's fold rather than a new break, but the card is already ~35% over in the
language it was tuned for.

And `tests/mugDrink.test.ts` passes on it, because its budget allows 320 px
against a 200 px card. **The first job of M20 is a gate that measures what fits,
not one that permits 60% overflow.**

Done, on `m20/translation-safe-layout`. Spec and decisions:
`docs/specs/M20-translation-safe-layout.md`. `npm run verify` green at 402
tests.

The rule it settled on: **no text surface may clip silently**, satisfied two
ways — a fixed box must fit, a scrollable one must take all the height there is
and say visibly when there is more. The briefing card is the second kind, so
the budget is on its sentences and the two pictures are allowed to scroll. No
copy was shortened.

What made it work, and none of it was in the plan:

- A **pseudo-locale**, generated from English at 1.4x with accents, registered
  as a `DEV_LOCALES` entry so a release build cannot select it and still draws
  no language control.
- A wrapping model **calibrated against a device measurement** rather than
  derived — the derived chrome was 23 dp optimistic, which is the direction
  that lets text vanish.
- The bullet column widened 560 → 640 dp. That was an English line-length
  choice inside a 923 dp landscape screen, and it cost a line of wrapping per
  bullet.
- `HUD_TYPE.columnMaxWidth`, because the HUD columns had a minimum and no
  maximum: at 1.4x the combo label would not have wrapped, it would have grown
  toward the timer.
- A `▾` cue, because `persistentScrollbar` draws dark grey on a near-black
  scrim and is invisible to anyone not looking for it.

### M21 — pt-BR — **DRAFT IMPLEMENTED (2026-09-05), awaiting owner review**

Complete Brazilian Portuguese translation, with human review of the humour and
voice. The owner's own language, so the only one that can be judged rather than
trusted.

Code complete on `m21/pt-br`; `npm run verify` green at 405 tests. Spec:
`docs/specs/M21-pt-br.md`.

**The words are a draft and the milestone is not done until they are read.**
Open question 3 above recommends the owner writes these lines. What exists is
written rather than generated, and every line where the joke had to be
re-invented instead of translated is marked `REVIEW:` in the catalogue and
tabled in the spec — *"Sabe-se lá como"* for *"Somehow"*, *"O show desandou"*,
*"Segure as pontas"*, *"Só piora"*, *"Descarrega. Parafusa. Reza."*

The integration was three lines and no layout work: a typed catalogue, an entry
in `SUPPORTED_LOCALES`, an endonym. **Every layout budget passed on the first
run.** That is what M20 was spent on.

Validated on the emulator by setting a per-app locale and cold-starting: the
game opened in Portuguese with nothing touched, which is the first proof that
`detectLocale()` reads a real device.

### M22 — Local memory and sharing — **IMPLEMENTED (2026-09-05), emulator-validated**

Local high scores, progress and preferences that survive a cold start, and
result sharing. No backend, no accounts.

One constraint from M15 and not negotiable: session progress must never gate a
cold start. Persistence records what happened; it does not lock anything.

Done on `m22/local-memory-and-sharing`; `npm run verify` green at 427 tests.
Spec: `docs/specs/M22-local-memory-and-sharing.md`.

**No new dependencies.** `expo-file-system` has been a dependency since M2 and
writes one small JSON file; React Native's own `Share` opens the share sheet.
`async-storage` and `expo-sharing` would each have been a native module for a
job the existing stack already does (AGENTS.md rule 18), and a test now fails
if either appears.

The constraint is asserted directly rather than trusted: twenty hostile saves —
truncated, not JSON, wrong types, a version from the future, a prototype
pollution attempt — are each parsed and then used to build a flow, and every
stage must still open. A corrupt save costs a high score and never the game.

The file is versioned from its first write and unknown fields are preserved, so
an older build cannot silently delete what a newer one saved. Validated on
device: a `futureField` survived a write by a build that knows nothing about it.

Also validated on device, and only observable there: the *detected* locale is
not persisted, only a chosen one. A player whose phone is Portuguese gets
Portuguese every launch; a player who picked English keeps English until they
pick otherwise.

### M23 — Monetization and store readiness

AdMob interstitials at natural stage boundaries, a one-time Remove Ads
purchase, and privacy/consent/store configuration.

### M24 — Music Pack 01

Additional commercially safe tracks on the same rhythmic contract.

## Not on the road above, and why

| | |
|---|---|
| **Music on the beat clock** | The owner already decided this — *"drift is not accepted"* — and open item 13's condition ("only worth building if the mechanic proves fun") is met. It is the biggest quality jump still available and it has nothing to do with i18n. It wants its own milestone, and it is the strongest candidate to slot in beside M21. |
| **Audio weight** | `crowd_applause.wav` is still the untrimmed 39 s / 6.9 MB source and the effects are not volume-normalized. Store-relevant, so M23 at the latest — but it belongs with the music work above if that lands first. |
| **Integrity healing, drunk meter** | Deferred at M18 with reasons; each needs its own playtest. |
| **`level01` retune (M17.1)** | Owner is leaning yes — *"acho que sim, nao estou certo"* — and it makes every past device observation incomparable when it lands. Better decided than carried. |
| **Hermes** | Named as the lever *if* performance failed. It passed. |

## What I would not do

**Do not machine-translate and ship.** The game's voice is its whole
personality — *"One night only. Nobody asked for it."*, *"You kept the groove
alive. Somehow."* A literal translation of those lines produces a game that is
correct and not funny, which is worse than English. pt-BR should be written by
the owner, not generated; the other locales should at minimum be reviewed by
someone who would laugh at them.

**Do not add a HUD flourish for the language switch.** It belongs on the title
and in the pause overlay, nowhere else.

## Open questions

1. **Which languages?** pt-BR is certain. Spanish is the cheapest next reach;
   English is already there. Every added locale is ongoing cost on every copy
   change, so this is a commitment, not a checkbox.
2. **Does the title translate?** **Settled: no.** Recorded at M18.5 in
   `docs/release/product-identity.md` and enforced at M19 by keeping
   `WORST GIG EVER` a constant in `game/config/product.ts` rather than a
   catalogue string, with a test that fails if it becomes one.
3. **Who writes pt-BR?** Recommended: the owner, because the jokes are the
   product. If it is me, the lines need reviewing rather than accepting.
4. **Where does the music sync go?** It is decided, unbuilt, and unrelated to
   i18n — but it is the largest single improvement still on the table, and the
   longer it waits the longer every playtest is told to ignore a flaw in the
   thing the game is about.
5. **Does the GitHub repository get renamed?** M18.5 migrated everything in
   source control; the remote is still `alessandrolorenz/worst-band-ever` and
   nothing in the code depends on it. Cosmetic, external, and cheap.
