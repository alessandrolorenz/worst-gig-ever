# V2 physical retest — 1.2.0

**Build:** local release APK, versionCode 7, `m22/local-memory-and-sharing`.
**Covers:** M19 locale foundation, M20 translation-safe layout, M21 pt-BR,
M22 local memory and sharing.
**Signed with the debug keystore.** Fine for testing, not for a store.

Nothing in this build changes gameplay. No timing window, BPM, point value,
hitbox, spawn schedule or level definition has moved since 1.1.0, so anything
that feels different about *playing* it is worth reporting as a surprise.

## 1. The one thing only you can decide

**Is the Portuguese funny?** M21 is code complete and not done until this is
answered. The lines that were re-invented rather than translated:

| English | pt-BR |
|---|---|
| *"You kept the groove alive. Somehow."* | *"Você manteve o groove vivo. Sabe-se lá como."* |
| *"The gig fell apart."* | *"O show desandou."* |
| *"You can hold the line. Now do it while you drum."* | *"Você aguenta o tranco. Agora aguente tocando."* |
| *"Hold the line"* (fase 1) | *"Segure as pontas"* |
| *"It keeps escalating"* (fase 4) | *"Só piora"* |
| *"Load in. Bolt it down. Hope."* | *"Descarrega. Parafusa. Reza."* |
| *"Then a beer found the mixing desk."* | *"Aí uma cerveja achou a mesa de som."* |
| *"GO!"* | *"VAI!"* |

`Groove` and `pad` were left in English on purpose — they are the on-screen
names of two mechanisms. Say if that reads wrong.

A line being *correct* is not the test. The test is whether it is the game's
voice.

## 2. Language

- [ ] The game opens in your phone's language, without you touching anything.
- [ ] The button on the title row (bottom right) switches language.
- [ ] **`WORST GIG EVER` stays English in both.** It is the store identity and
      it is painted into the opening poster.
- [ ] Switching language during a pause does not disturb the round.

## 3. Text that fits

The whole of M20. What to look for is text that is *absent*, since text that
does not fit looks exactly like text nobody wrote.

- [ ] Stage 1's briefing: the mug rule reads as one whole sentence.
- [ ] Where a briefing has more below the fold, a small **▾** appears above the
      buttons. Where it does not, no mark.
- [ ] Nothing on the HUD is cut: DEFESA, INTEGRIDADE DO SHOW, the timer, the
      combo, SEQUÊNCIA, PERFEITO / BOM.
- [ ] On the results screen, no label pushes its number off the edge.

## 4. Memory (M22)

- [ ] Play a stage. Note the Defense score.
- [ ] **Fully close the app** (swipe it away, not just Home) and reopen it.
- [ ] The stage's `Recorde` / `Best` row shows the score you set.
- [ ] A stage you cleared has a ✓ on the title.
- [ ] Turn the click off, close the app fully, reopen: it is still off.
- [ ] Pick a language different from your phone's, close fully, reopen: your
      choice survived.

**And the one that must not happen:** on a fresh install, before you have
played anything, **all four stages open**. Nothing in this build locks a stage,
ever, for any reason.

## 5. Sharing

- [ ] The results screen has a `Compartilhar` / `Share` button.
- [ ] It opens the phone's share sheet with a line naming the game and the
      scores, in your language.
- [ ] Cancelling it returns to the results screen with nothing broken.

## 6. The drink (M18, re-placed 2026-09-05)

Hold the phone the way you normally play — a hand at each side, thumbs on the
screen. The mug used to play in the bottom-right corner, under one of them.

- [ ] Catch a mug close in. The mug fills most of the screen's height and sits
      near the middle, not in the corner.
- [ ] **Neither thumb covers it**, in the grip you actually use.
- [ ] The Groove Pad stays visible underneath for the whole 480 ms — you can
      still see the beat while you drink.
- [ ] The arm still runs off the right edge, and still reads as your own arm
      rather than as a picture pasted on the screen.
- [ ] Two mugs drunk in quick succession still play one animation, not two.

## 7. The show's difficulty (M17.1, 2026-09-05)

Stage 3 was retuned. Its opening is deliberately the round you already
approved — flat 1800 ms cadence, bottles only, same approach speed — so the
first twenty seconds should feel like nothing changed. Everything after should
build.

- [ ] The first twenty seconds feel like the show you validated.
- [ ] The last third feels like a climax rather than just a busier middle.
      Measured, it now gets faster objects and more fastballs, not only a
      tighter cadence; before this it got *slower* objects.
- [ ] It is still clearly easier than the Encore.
- [ ] It is not *too* hard now: the round is net harder on purpose, about nine
      fastballs a play against seven and a half.

**This is the one to be honest about.** Every earlier device observation of the
show is now measured against a different round, so if the difficulty is wrong
here it has to be said rather than carried.

## 8. Anything that got worse

The briefing card, the HUD columns and the results summary all changed shape in
M20. They were measured, not eyeballed, so the thing to report is anything that
*looks* wrong rather than anything that is cut off — the second should now be
impossible and the first is a judgement only you can make.
