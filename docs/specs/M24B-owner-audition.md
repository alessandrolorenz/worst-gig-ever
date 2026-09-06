# M24B — the audition

**Status:** eleven candidates are in the build and waiting to be listened to.
**Nothing here has been approved.** Every track is `release: 'candidate'` and
`ownerConfirmed: false`; a release build cannot reach any of them.

This document is the thing to have open while playing. Everything above the
checklists is what a machine could establish; everything in them is what it
could not.

---

## How to audition

**The standalone build is the one you want.** It needs no cable, no Metro server
and no Wi-Fi — install it and walk away with headphones on.

```bash
npm run build:audition                              # ~3 min, writes build-out/
adb install -r build-out/worst-gig-ever-audition.apk
```

That is a release-type build with `EXPO_PUBLIC_AUDITION_BUILD=1`, which is the
only thing that keeps the audition row in a bundle that has no `__DEV__`. See
`game/config/buildFlags.ts` for why that is not a way for unapproved music to
reach a player, and `npm run build:candidates -- --verify` for the audio itself.

A plain `npm run build:preview` or any EAS `preview`/`production` build has the
flag **off** and will show no audition row at all — that is deliberate, and it
is verified at the bundle level rather than assumed.

The tethered alternative, if you are already at the machine:

```bash
npx expo start --dev-client   # leave running
adb reverse tcp:8081 tcp:8081 # after every replug
```

Then, on the title screen, the yellow box at the bottom:

```
DEV MUSIC AUDITION · 1/11 · garageRock
◀   NO REFUNDS   ▶   [ PLAY ]  [ ALL 4 ]
PLAY A ROUND ON IT:  [S1] [S2] [S3] [S4]
```

- **◀ ▶** step through the eleven candidates. Switching stops whatever is
  playing, so two tracks can never overlap.
- **PLAY / STOP** previews the track through the real `AudioService`, at the
  real `MIX.music` of 0.38 — what you hear is what a round plays.
- **ALL 4 / ROTATE** decides what a gig does with the pool. `ALL 4` puts the
  selected track in every slot, so whichever stage you start you are hearing
  *that* track. `ROTATE` builds a real four-track setlist starting from the
  cursor, which is the only way to hear whether two of these clash back to back.
- **S1 S2 S3 S4** start a real round on that stage with the audition setlist —
  bottles, click, Groove scoring, all of it.

No rebuild between songs. No file renaming. No terminal.

**The official game is untouched.** Tapping a stage card at the top still starts
the authored show — Stage 1 on `showTheme`, Stage 2 on `grooveBed`, Stages 3 and
4 on `showBed`. Only the yellow box can start anything else, and backing out of
a round restores the authored setlist.

### The Stage 2 question

You wanted to know whether a real song can replace the teaching bed once the
tutorial has been learned. Press **S2** with any candidate selected. That is the
experiment, and it changes nothing about the first run a player takes.

---

## What is already known, and what it is worth

Every candidate below is:

- **CC0** — public domain dedication, verified on the source page on the day it
  was downloaded, with the page URL and the SHA-256 of the bytes recorded in
  `docs/assets/AUDIO-SOURCES.md`;
- **exactly 64 beats at 90 BPM** — sixteen bars, ending on a bar line, verified
  on disk by the test suite rather than by arithmetic on a duration;
- **on the grid** — its own onsets support a 90 BPM beat better than any
  incompatible tempo does (`npm run measure:tempo`);
- **seamless at the loop point** — measured, with a sampler-style crossfade
  baked into the wrap;
- **peak-normalised to 0.72**, the level both generated beds already sit at.

None of that says a track is any good, and one thing in particular is worth
naming: **nobody has heard these.** They were selected by measurement from a
pool of 130. The style labels come from each source page's own tags, not from
listening. If a track has vocals, drags, or is simply boring, this document
cannot tell you — that is what the checklists are for.

**Seven of the eleven carry a "needs a human ear" advisory.** That is not a
defect in those tracks. It means the measurement cannot cleanly separate 90 BPM
from 120 or 60 for them, because real rock puts genuine energy on the bar and
the half-bar in a way the synthesised beds do not. Your ear settles it; the
"beat is easy to feel" box below is where that answer goes.

---

## The candidates

| # | Title | Style | Real source | Author | Source BPM | Rate | Grid | Margin | Seam | Size | Technical |
|--:|---|---|---|---|--:|--:|--:|--:|--:|--:|---|
| 1 | **NO REFUNDS** | garage rock | 01 - rock city ransom | Ragnar Random | 90 | native | 0.590 | 0.049 | 0.77x | 7.18 MB | STRONG |
| 2 | **BROKEN AMP** | hard rock | loop 7 | johndekale | 90 | native | 0.750 | 0.024 | 0.45x | 3.59 MB | STRONG |
| 3 | **LAST CALL** | acoustic rock | g42 end | kbar1982 | 90 | native | 0.726 | 0.203 | 0.57x | 3.59 MB | STRONG |
| 4 | **STAGE DIVE DISASTER** | garage rock | 09 - chick with weapon | Ragnar Random | 90 | native | 0.407 | 0.082 | 0.99x | 3.59 MB | ACCEPTABLE |
| 5 | **CHEAP BEER RIOT** | punk | 15 - we got the crud | Ragnar Random | 95 | x0.9474 | 0.339 | 0.046 | 1.02x | 7.18 MB | ACCEPTABLE |
| 6 | **WRONG CHORD** | alt rock | 14 - here a captive heart busted | Ragnar Random | 95 | x0.9474 | 0.335 | 0.018 | 1.33x | 7.18 MB | ACCEPTABLE |
| 7 | **BAD SOUNDCHECK** | punk | 17 - digestive malady | Ragnar Random | 95 | x0.9474 | 0.305 | 0.028 | 0.95x | 7.18 MB | RISKY |
| 8 | **LOAD-OUT** | hard rock | 20 - it is dangerous to be lonely without a sword | Ragnar Random | 85 | x1.0588 | 0.323 | 0.064 | 0.84x | 7.18 MB | ACCEPTABLE |
| 9 | **FIRE EXIT** | acid / blues rock | B.M.I. (tales of Christ) | obscure music | 95 | x0.9474 | 0.425 | 0.053 | 1.66x | 7.18 MB | ACCEPTABLE |
| 10 | **NO ENCORE** | groove metal | heavy battle 2 bpm185 | MintoDog | 185 | x0.9730 | 0.394 | 0.023 | 0.26x | 7.18 MB | ACCEPTABLE |
| 11 | **WRONG VENUE** | hard rock | super wreck roadway | Umplix | 100 | x0.9000 | 0.316 | 0.079 | 1.58x | 7.18 MB | RISKY |

**Reading the columns.** *Grid* is how strongly the file's own onsets support a
90 BPM beat — the floor is 0.30, the two generated beds score 0.84 and 0.73, and
a 120 BPM track scores 0.02. *Margin* is how far 90 BPM leads the best
incompatible reading; under 0.05 the tool is saying "I cannot tell, listen." *Seam*
is the step across the loop point measured against the local sample-to-sample
delta; under about 2x is inaudible, and the raw cuts were 3x to 72x before the
crossfade. *Technical* is licensing, grid evidence, loop quality and how far the
tempo had to be moved — **it is not a judgement about the music.**

`STRONG` (3) — already at 90 BPM, no rate change, clean margin or clean loop.
`ACCEPTABLE` (6) — conditioned by 3-6%, comfortably over the grid floor.
`RISKY` (2) — **BAD SOUNDCHECK** passes the grid floor by 0.005, and **WRONG
VENUE** needed a 10% rate change, the largest kept. Both are worth hearing
before being believed.

---

## Owner audition queue

Work down the list. Tick what is true, then write a verdict. A track needs no
particular number of ticks to be kept — they are prompts, not a score.

### NO REFUNDS

```
TRACK:  NO REFUNDS
STYLE:  garage rock   (Ragnar Random — 01 - rock city ransom)
NOTE:   already at 90 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### BROKEN AMP

```
TRACK:  BROKEN AMP
STYLE:  hard rock   (johndekale — loop 7)
NOTE:   already at 90 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### LAST CALL

```
TRACK:  LAST CALL
STYLE:  acoustic rock   (kbar1982 — g42 end)
NOTE:   already at 90 BPM

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### STAGE DIVE DISASTER

```
TRACK:  STAGE DIVE DISASTER
STYLE:  garage rock   (Ragnar Random — 09 - chick with weapon)
NOTE:   already at 90 BPM

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### CHEAP BEER RIOT

```
TRACK:  CHEAP BEER RIOT
STYLE:  punk   (Ragnar Random — 15 - we got the crud)
NOTE:   conditioned -5.3% from 95 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### WRONG CHORD

```
TRACK:  WRONG CHORD
STYLE:  alt rock   (Ragnar Random — 14 - here a captive heart busted)
NOTE:   conditioned -5.3% from 95 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### BAD SOUNDCHECK

```
TRACK:  BAD SOUNDCHECK
STYLE:  punk   (Ragnar Random — 17 - digestive malady)
NOTE:   conditioned -5.3% from 95 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### LOAD-OUT

```
TRACK:  LOAD-OUT
STYLE:  hard rock   (Ragnar Random — 20 - it is dangerous to be lonely without a sword)
NOTE:   conditioned +5.9% from 85 BPM

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### FIRE EXIT

```
TRACK:  FIRE EXIT
STYLE:  acid / blues rock   (obscure music — B.M.I. (tales of Christ))
NOTE:   conditioned -5.3% from 95 BPM

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### NO ENCORE

```
TRACK:  NO ENCORE
STYLE:  groove metal   (MintoDog — heavy battle 2 bpm185)
NOTE:   conditioned -2.7% from 185 BPM  ·  thin margin: trust your ear over the meter

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

### WRONG VENUE

```
TRACK:  WRONG VENUE
STYLE:  hard rock   (Umplix — super wreck roadway)
NOTE:   conditioned -10.0% from 100 BPM

[ ] I like the song
[ ] feels like Worst Gig Ever
[ ] feels different from the others
[ ] beat is easy to feel
[ ] click remains clear
[ ] loop is acceptable
[ ] works during defense
[ ] I would choose it in my setlist

VERDICT: KEEP / MAYBE / REJECT
```

---

## After you decide

Send back the verdicts. Promotion is M24C's first job and it is not a formality:

1. rejected tracks are **deleted** — the WAV, the catalogue entry, the title
   strings and the provenance block, so nothing unapproved stays in the tree;
2. kept tracks become `release: 'production'` with `ownerConfirmed: true`, which
   is the only thing that lets a thin-margin track ship at all;
3. the size question reopens with a real list. Today's eleven are 68 MB of WAV,
   and the eight that are stereo carry genuine width — but three of the eleven
   measured as effectively mono and were downmixed on that evidence rather than
   by assumption. A mono library would be 39 MB. That trade is worth making
   against songs you have chosen, not against a pool you are still judging.

Do not promote anything by editing a field. `tests/audioContract.test.ts`
requires a conditioned track to have been listened to before it may ship, and
that is the check standing between an audition pool and a player's phone.
