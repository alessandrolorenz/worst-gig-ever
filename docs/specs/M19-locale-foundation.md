# M19 — Locale Foundation

**Status:** implemented and validated on emulator, 2026-09-05, on `m19/locale-foundation`.
Owner device verdict outstanding.
**Parent:** `docs/specs/V2-plan.md`, "M19 — Locale foundation".
**Depends on:** M18.5, which is done. The identity contract already fixes the
one product decision this milestone would otherwise have to make — the title is
never translated.

## What this milestone is

Every user-visible string in the game moves out of the code and into a typed
catalogue. **English only. Nothing is translated here.** The game must look
byte-for-byte identical to a player when this lands.

Alongside it: locale detection from the device, an explicit in-game language
control, and a test that fails if a user-visible literal is left behind in a
component.

## What this milestone is not

Not translation. Not pt-BR. Not pseudo-locale expansion, and not the
layout work that has to precede a real translation — that is M20, and it is
deliberately after this one. Translating into a layout that cannot hold the
text produces four broken languages instead of one.

No gameplay value moves. No timing window, BPM, point value, hitbox, spawn
schedule, or level definition changes. The copy itself does not change either:
every string that lands in the catalogue is the string that was on screen the
day before, character for character.

## The three decisions this milestone makes

### 1. A typed catalogue, not an i18n library

`expo-localization` is added — one dependency, for reading the device's
preferred languages, which React Native does not expose portably. No i18n
*runtime* is added.

The reason is AGENTS.md rule 18. What a library would give this project is
plural rules, gender, date and number formatting, and lazy catalogue loading.
The game has none of those problems: it has about a hundred short strings, no
dates, and numbers that are already rendered by the domain. What it does need
is the thing a library gives up — **compile-time completeness**. With

```ts
export type Catalogue = typeof en;
```

a locale that is missing a key, or has an extra one, or has the wrong shape,
does not fail at runtime in that locale. It fails in `tsc`, before the build.
That property is worth more here than everything a library would add.

Interpolation is `{name}` placeholders resolved by `format()`, deliberately
rather than functions in the catalogue. The owner is writing pt-BR (V2 plan,
open question 3), and a catalogue of data is something a person can translate.
A catalogue of arrow functions is something a programmer has to translate.

### 2. The domain holds ids; the catalogue holds prose

`stages.ts` and `storyState.ts` are pure domain modules, and AGENTS.md rule 4
keeps them testable without a renderer. They now carry **no prose at all**.

| Before | After |
|---|---|
| `stage.name`, `stage.subtitle`, `stage.briefing` | `strings.stages[stage.id]` |
| `briefingFigures: [{ id, caption }]` | `briefingFigures: ['smash', 'drink']` |
| `panel.caption` | `strings.story[panel.id]` |

The stage id and the panel id were already stable keys — `storyAssets.ts` maps
a panel id to a JPEG the same way. The catalogue is a second registry keyed by
the same ids, and `StageId` and `StoryPanelId` are literal unions, so a stage
without strings is a type error rather than a blank card.

This is a strictly better separation than the one it replaces. A stage
definition now describes what the stage *is*; it does not carry the English
sentences that describe it.

### 3. The product title is not a string, it is an identifier

`WORST GIG EVER` moves to `game/config/product.ts`, not into the catalogue,
because `docs/release/product-identity.md` forbids translating it — it is
lettered into `assets/art/story/01_poster.jpg` and it is the store identity.

Putting it in the catalogue would make it look translatable, and a future
locale would eventually translate it. Making it a constant makes that
impossible without deleting a documented contract.

## The language control

The V2 plan's reason for building it now: *a language you cannot select is a
language you cannot check.*

It is a `Button` in the two rows that already exist — the title screen and the
pause overlay, next to the click switch — and nowhere else. No settings screen,
and no HUD flourish; the V2 plan rules that out explicitly.

Its label is the endonym of the current locale (`English`, later
`Português (BR)`), so the control itself never needs translating. Endonyms live
in `locales.ts`, once, rather than once per catalogue: a language is called the
same thing in every language.

**It is rendered only when more than one locale is available.** M19 ships one
locale, so a player sees no change — which is the milestone's own acceptance
criterion. The mechanism is complete and covered by tests; M21 adding `pt-BR`
to `SUPPORTED_LOCALES` makes the control appear with no further work.

## Locale detection

Split in two, so that only the second half needs a device:

- `resolveLocale(tags, supported)` is pure. Given the device's preferred
  language tags in order, it returns the first supported locale, matching on
  the base language (`pt-BR` matches a device asking for `pt`, and the reverse),
  and falls back to English. Fully unit-tested in Node.
- `detectLocale()` is the adapter that reads `expo-localization` and hands the
  tags to `resolveLocale`. It is the only file in the repository that imports
  the dependency, and no test imports it.

The resolved locale is the initial value of `flow.locale`. It is session-only,
exactly like `clickEnabled` and `bestStageCleared` and for the same reason:
persistence needs storage, and storage is M22.

## The test that closes the milestone

`tests/localization.test.ts`, and it holds four things:

1. **No component contains user-visible text.** Every `.tsx` file under `game/`
   is scanned, with comments, imports and `StyleSheet.create` blocks removed.
   No JSX text node may contain a letter, and every remaining string literal
   must appear in an explicit allowlist of values that are provably not text —
   style keywords, accessibility roles, and state names.
2. **No domain module contains prose.** Every string literal in `stages.ts` and
   `storyState.ts` must be an identifier: no spaces.
3. **Every catalogue has the same shape.** Same key paths, same placeholders in
   each string. This is what makes a future translation fail loudly instead of
   silently dropping a `{count}`.
4. **Every stage and every story panel has strings**, and nothing in the
   catalogue is orphaned.

The allowlist in (1) is the deliberate part. It will need a line adding the
next time someone writes `resizeMode="cover"`, and that is the cost of the
guarantee: a test that cannot be tightened later is a test that was never doing
this job.

## Definition of done

- No user-visible string literal anywhere outside `game/i18n/catalogues/`.
- `Catalogue` is a type, and adding a locale is a compile error until it is
  complete.
- The device's language is detected; the resolution rule is unit-tested without
  a device.
- The language control exists, is wired to the flow, and is tested.
- The game is visually unchanged in English.
- `npm run verify` is green.

## Emulator validation, 2026-09-05

Pixel_9 (Android emulator, 2424x1080 landscape), debug build after
`npx expo run:android`. The APK was checked for the `ExpoLocalization` class
before anything else, because a native module that fails to link would be
caught by `detectLocale`'s try/catch and go silently missing — it is present in
`classes3.dex` and `classes6.dex`.

Confirmed rendering from the catalogue, screen by screen: the story caption and
Skip; the title's tagline, all four stage names and subtitles, How to play,
Story and Click: on; stage 1's kicker, name, both figure captions and all five
briefing bullets; Start the show and Back; the in-round DEFENSE, GROOVE,
SHOW INTEGRITY, GET READY and the `{seconds}s` timer; and the results screen's
SHOW RUINED, its outcome line, both summary headings, all ten row labels, and
both interpolated strings — `0 / 32` and `Show Integrity left: 0 of 3.`

**No language control is drawn**, which is the intended M19 state.

Not seen, because they need a round actually played: PERFECT/GOOD, the beat
streak, the hit combo, TAP THE SINGER, GO!, Paused/Resume, SHOW COMPLETE,
STAGE n CLEARED, Play again and Next stage. They use the same mechanism as the
strings above and are covered by the contract test, but they have not been read
off a screen.

The owner's phone was attached to adb throughout and was **not** installed to;
its package list is unchanged.

## What the emulator found, and it is M20's

Stage 1's briefing **overflows its card in English**, today, on this viewport:
at rest the third bullet is cut mid-sentence and bullets four and five are
below the fold. Scrolling reaches all five, so this is M18.1's fold rather than
a new defect and nothing about M19 caused it — no style, font size or sentence
changed. It is recorded here because M19 is where it was measured.

The part worth acting on is that **`tests/mugDrink.test.ts` passes on this**.
Its budget is `VIEWPORT_PX * 1.6` — 320 px against a 200 px card — so the gate
permits 60% overflow by construction. It was written as a loose proxy to catch
a briefing that had doubled in length, and it does that; it has never been a
fits-on-screen check, and reading it as one is a mistake this note exists to
prevent.

Measured against the test's own model, stage 1 scores 290 of an allowed 320.
Measured on the device, roughly 270 px of content sits in a 200 px scroll.
**The English card is already ~35% over**, before a translation that runs
15-25% longer. The V2 plan predicted this would start happening in pt-BR; it is
happening now.

## Known follow-on, recorded here rather than discovered later

The briefing-overflow budget in `tests/mugDrink.test.ts` now measures the
**English** catalogue. That is correct for M19 and insufficient from the moment
a second locale exists — it is the exact bug the V2 plan predicts will happen
four more times. Making that budget length-independent is M20's job, and this
milestone deliberately does not pre-empt it.
