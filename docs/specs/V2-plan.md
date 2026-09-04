# V2 — what comes after the MVP

**Status:** proposed, 2026-09-04. Nothing here is started.
**Decision needed before any of it:** what v2 is *for*. See the fork below.

## Where the MVP left things

Four stages, approved on device, closed on 1.0.11. Performance passed on a
release build. Every mechanic the game has works and has been played.

What the MVP is **not**: it has no memory. Nothing survives a cold start — no
high score, no stage progress, no settings but the click toggle for one
session. A player finishes the Encore and the game has no answer for what
happens next. That is the honest gap between "the mechanics are fun" and "this
is a game someone plays twice."

## The fork, and it changes the order of everything

**Is v2 aimed at a store, or at more game?**

- **Store.** Then the unglamorous work goes first, because two of the debts get
  strictly more expensive with every person who installs a build, and one of
  them invalidates every installed copy when it lands.
- **More game.** Then persistence and content go first, the identity migration
  waits, and v2 is judged on whether anyone plays it twice.

I recommend **store-shaped, in the order below** — not because a launch is
urgent, but because the two blocking debts are cheapest to pay *now*, while the
installed base is one phone, and neither gets easier by waiting. Content added
on top of an unmigrated identity is content that has to be re-signed later.

## Recommended order

### M19 — Release identity (ADR 0010)

**The one whose cost only goes up.** The launcher says *Worst Gig Ever*; the
Expo slug (`worst-band-ever`), the linked EAS project, the GitHub repository
and `com.worstbandever.app` all still say the old name. Migrating means new
signing credentials against the final package name, which **invalidates every
installed build**.

Right now that costs one reinstall on one phone. After any wider distribution
it costs everyone's save data and everyone's patience — and after M21 below,
there *is* save data to lose.

Not a player-facing milestone. Do it while it is free.

### M20 — Music on the beat clock

**The owner already decided this and it is still open**: *"Drift is not
accepted."* The game is a rhythm game whose music does not agree with its
rhythm — the pad pulses at 90 BPM off gameplay time while the bed loops on its
own clock, slipping about 417 ms per loop and landing in antiphase after two.
Playtests have been told to ignore it.

Open item 13 held this back on the grounds that syncing was "only worth
building if the visual mechanic proves fun". **It proved fun.** The condition
is met and the reason to wait is gone.

Every stage with a beat gets a bed whose loop is a whole number of 90 BPM
beats. This is also the moment to fix the audio weight: `crowd_applause.wav` is
still the untrimmed 39 s / 6.9 MB source and the five effects are not volume
normalized (open item 2).

Biggest single quality jump available, and the only one that improves the thing
the game is actually about.

### M21 — Memory

High score and best combo per stage, stage completion, and the click toggle,
surviving a cold start. Small, and it is what turns four rounds into a game
with a reason to play them again.

One constraint carried from M15 and not negotiable: **session progress must
never gate a cold start.** Every stage stays reachable from the title on a
fresh install; persistence records what happened, it does not lock anything.

Deliberately *not* in scope: leaderboards, accounts, cloud sync. Local storage
only.

### M22 — Store readiness

The remaining debts, none of which are interesting and all of which are
required:

- **`RECORD_AUDIO`** is declared in `app.json` and the game never records.
- **`package-lock.json` is git-ignored** by the template, so dependency
  resolution is not reproducible across machines — this already caused one
  autolinking failure (ADR 0006).
- Store assets: icon set, screenshots, description, privacy policy.
- A **production** build profile run end to end, which has never been done.

### M23 — Content

Only after the above, and only if v2 is still alive. More stages, more object
kinds, a real ending rather than a summary card. Unscoped on purpose: what to
build here depends on what M21 reveals about whether anyone replays it.

## Held back, with reasons

These are not rejected. Each is a separate decision with its own playtest.

| | Why it is waiting |
|---|---|
| **Drinking restores Show Integrity** | Thematically perfect and a direct change to the loss condition of a validated round. The owner asked for points, not health. |
| **Drinking too much blurs the pad** | Funny, and a difficulty mechanic wearing a costume. |
| **`level01` retune (M17.1)** | The owner is *leaning* yes and said so — *"acho que sim, nao estou certo"*. Retuning the validated round makes every earlier device observation incomparable, so it needs the measured before/after table and one explicit answer, not a leaning. |
| **Hermes** | Named as the lever *if* performance failed. It did not. An optimization nobody has asked for, and it wants its own comparison. |
| **A real art sequence gate** | `measure:art` is structurally blind to the drink frames; they were measured by hand. Worth fixing the next time a sequence is authored, not before. |

## What I would cut

**The `+25` flourish is not coming back**, and the same reasoning should be
applied to anything proposed for the HUD in v2: feedback placed next to the
thing it is about competes with it and loses. The game reads well because very
little is on the screen.

**No leaderboards, no accounts, no ads in v2.** Each one is a product decision
with a support burden, and none of them makes the game better at what the
owner has said he likes about it.

## Open questions only the owner can answer

1. **Store or more game?** Everything above assumes store-shaped. Say
   otherwise and M21 and M23 move to the front.
2. **Is the Encore the ending?** The game currently stops. Whether v2 needs a
   real ending is a content question with a real cost.
3. **`level01` retune — yes or no?** It has been a leaning since M17 and it
   blocks nothing, but it makes every past measurement incomparable the moment
   it lands, so it is better decided than carried.
