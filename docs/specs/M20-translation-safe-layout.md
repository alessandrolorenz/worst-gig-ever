# M20 — Translation-Safe Layout

**Status:** implemented and validated on emulator, 2026-09-05, on
`m20/translation-safe-layout`. Owner device verdict outstanding.
**Parent:** `docs/specs/V2-plan.md`, "M20 — Translation-safe layout".
**Depends on:** M19, which is done and emulator-validated. Every user-visible
string is in a catalogue, which is what makes a locale swappable at all.

## Why this is corrective, not preparatory

The V2 plan predicted that stage 1's briefing "now fits its 200 px card *in
English*, with little to spare" and would overflow in pt-BR. The M19 emulator
run on 2026-09-05 measured it. **It does not fit in English.** On a 2424x1080
landscape phone the card shows two and a half of its five bullets at rest, and
the sentence cut in half is the mug rule — the one the owner corrected twice.

Everything is reachable by scrolling, so this is M18.1's fold rather than a new
break. What makes it a milestone rather than a tweak is the second finding:

**`tests/mugDrink.test.ts` passes on it.** Its budget is `VIEWPORT_PX * 1.6` —
320 px against a 200 px card — so the gate permits 60% overflow by
construction. It was written as a loose proxy to catch a briefing that had
doubled in length. At that job it works. It has never been a fits-on-screen
check, and the mistake to avoid is reading it as one.

So the layout is already failing in the language it was tuned for, and the test
that was supposed to notice is calibrated not to.

## The rule this milestone establishes

**No text surface may clip silently.**

There are exactly two ways to satisfy it, and which one applies is a property
of the surface:

| Surface kind | Rule | Why |
|---|---|---|
| **Fixed box** — HUD rows, stage cards, summary rows, buttons | The text must **fit**, at the longest locale | It cannot scroll. Text that does not fit is gone, and gone looks identical to never written |
| **Scrollable** — the briefing card | It must take **all the height available**, and when there is still more, say so **visibly** | Forcing five bullets into 411 dp would mean cutting the copy, and the copy is the product |

This is deliberately not "everything must fit". Forcing that rule onto the
briefing would put the owner's voice on a diet to satisfy a layout constant,
which is the wrong thing to sacrifice. The briefing is allowed to scroll. It is
not allowed to scroll *invisibly*.

## What is being fixed, concretely

### 1. The briefing card is a fixed 200 px in a viewport that has more

`briefingScroll: { maxHeight: 200 }` is a number chosen at M18.1 by raising 150
until stage 1 looked better. On the shortest viewport the project designs for
— 411 dp — the briefing screen spends 98 dp on its kicker, title and button
row and 20 on padding, which leaves **293 dp available and 200 in use**.
Ninety-three dp of empty screen, and the mug rule below the fold.
`briefingCardHeight()` is that arithmetic, and the test asks it rather than
mirroring a number.

Replaced with `flexShrink: 1` and no maximum: the card takes what the screen
has and shrinks when the screen is smaller. Length-independent by construction
rather than by a tuned constant, which is the whole point of the milestone.

### 2. Scrolling is invisible at rest

Android fades the scroll indicator seconds after a scroll ends, so a card with
more content looks exactly like a card without. `persistentScrollbar` keeps it
drawn. That is the entire difference between "there is more below" and "that is
all there is".

### 3. A summary row lets its label push the number off the edge

`summaryRow` is `justifyContent: 'space-between'` with neither child shrinking.
`Beats missed` is short in English. *Batidas perdidas* is not, and `Best beat
streak` becomes *Melhor sequência de batidas*. With no `flexShrink` the label
wins and the value it exists to caption is pushed out of the column. The label
shrinks and wraps; the number never moves.

### 4. There is no way to see any of this before the translation exists

A pseudo-locale, generated from English rather than written: every string
accented and expanded to **1.4×**. Portuguese runs 15-25% longer and German and
French are worse, so 1.4 is a target with margin rather than a prediction.

It is a **development locale**. It ships in the catalogue registry but not in
`SUPPORTED_LOCALES`, so a release build cannot select it and the language
control stays invisible in production exactly as M19 left it.

The accents are not decoration. They are how you notice that a string is *not*
translated, and they prove the font renders the diacritics pt-BR is made of.

## The gate that replaces the proxy

`tests/layoutBudget.test.ts`, built on `game/rendering/textMetrics.ts` — a pure
line-wrapping model, no renderer, in the same spirit as `hudLayout.ts`
(AGENTS.md rule 4).

A model is still a model. Two things make this one honest where the old one was
not:

1. **It is calibrated against a measurement.** On the emulator, stage 1's
   205-character third bullet wrapped to three lines in a 538 dp text column at
   15 dp — about 0.52 em of width per character. The model uses **0.55**, which
   is deliberately pessimistic: for a gate whose failure mode is silent
   clipping, over-predicting a wrap is the safe direction to be wrong in.
2. **The budget is the box.** Content must be `<= ` the space, not `<= 1.6x`
   it. Where a surface is allowed to scroll, the assertion is that it is
   *visibly* scrollable, not that it fits.

Every bounded surface is asserted in **every locale including the pseudo one**,
which is what makes the gate say something about a translation that has not
been written yet.

`tests/mugDrink.test.ts` keeps its "one whole sentence per bullet" rule, which
is about copy and still correct. Its height proxy is deleted rather than
loosened further — the new gate is the replacement, and two overlapping budgets
with different numbers would only make it unclear which one is the contract.

## Out of scope

No copy changes. Not one sentence is shortened to make a layout constant work;
if a surface cannot hold the pseudo-locale, the surface changes. No new
locales, no translation, no pt-BR. No font swap. No change to the reference
canvas, the scene composition, or anything a hit test reads.

## What building it changed about the plan

Three things the plan above got wrong, all found by measuring rather than
reasoning. They are recorded because each one is a lesson about the method
rather than about this card.

### The chrome is measured now, not derived

`briefingCardHeight()` first summed the declared font sizes at 1.2 em and got
118 dp. The emulator gave the card **270 of a 411 dp screen**, so the real
chrome is 141. The missing 23 dp is line boxes at `fontWeight: '800'` with
letter spacing — something a stylesheet does not state and a pure module cannot
compute.

The derived version looked more principled and was wrong in the **optimistic**
direction, which is the direction that lets text disappear. `BRIEFING_CHROME_HEIGHT`
is now a number taken off a screenshot, with the screenshot named.

### The rule is "the words fit; the pictures may scroll"

The first version of the gate asserted that the whole card fits in English.
Satisfying that would have meant cutting the owner's copy or shrinking the
figures to uselessness, and this spec forbids the first.

What a player needs is that the **rules** are readable in one screenful. The
two captioned pictures illustrate the third bullet, they sit above it, and
scrolling them away costs nothing. So the budget is on the bullets alone, and
the figures are allowed to push them off the bottom.

### `persistentScrollbar` was necessary and not sufficient

It works. On this scrim it also draws dark grey on near-black, which is an
affordance only someone who already knows it is there can find — visible in the
screenshot only after cropping to the edge and looking for it.

So the card measures itself (`onLayout` against `onContentSizeChange`) and
draws a `▾` in the card's own accent when there is more. Its row always
reserves its height, so the card does not jump when the measurement lands —
the same reason the HUD's combo row is a fixed height.

## What the gate caught that review had not

- **The HUD columns had a minimum width and no maximum.** At 1.4x the combo
  label needed two lines in a 420 px column — and with no maximum it would not
  have wrapped at all, it would have grown toward the timer in the middle of
  the screen. A collision is worse than a clip because nothing looks broken
  until two things are on top of each other. `HUD_TYPE.columnMaxWidth` makes
  the wrap defined and the test can then check it.
- **The bullet column was 560 dp inside a 923 dp landscape screen.** That was a
  line-length choice for English, and it cost a line of wrapping per bullet.
  At 640 the column runs 75 characters — the top of the comfortable range for
  prose — and stage 1's sentences went from 264 dp to 224 against a 254 dp
  card, which is the difference between failing the gate and having 30 dp of
  headroom for the locale after pt-BR.
- **A summary label with no `flexShrink` pushes its own number out of the
  column.** Invisible in English, guaranteed in Portuguese.

## Emulator validation, 2026-09-05

Pixel_9, debug build, Metro over `adb reverse`.

- Stage 1 in English: all five bullets readable, nothing cut mid-sentence, the
  `▾` cue drawn above the buttons. Before M20 this card showed two and a half
  bullets and cut the mug rule in half.
- Stage 2 in English: four bullets, everything fits, and **no cue** — it is
  driven by measurement rather than drawn always.
- Stage 1 in pseudo: overflows, as the rule allows, and says so.
- The title screen in pseudo: all four stage cards hold their expanded names
  and subtitles, and **`WORST GIG EVER` stays English**, which is the identity
  contract holding under a locale switch.
- The language control appears, labelled `Pseúdó`. It is in `DEV_LOCALES`, so a
  release build still has one locale and still draws nothing.

The owner's phone was attached to adb throughout and was not installed to.

## Definition of done

- The briefing card uses the height the viewport actually has.
- Overflow is visible at rest, on Android, without touching the screen.
- Summary labels shrink; values never move.
- A pseudo-locale exists, is selectable in development, and cannot be selected
  in a release build.
- Every fixed-box surface fits at 1.4x expansion, asserted per locale.
- The `1.6x` proxy is gone.
- `npm run verify` green, and the briefing re-measured on the emulator.
