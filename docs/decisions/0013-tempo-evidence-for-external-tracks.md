# ADR 0013 — Tempo compatibility is evidence, not a boolean

Date: 2026-09-05
Status: Accepted
Milestone: M24A
Supersedes: the M16 meaning of `MUSIC_TEMPO_LOCKED` / `MUSIC_GENERATOR`

## Context

The game scores taps against a **visual** beat clock derived from gameplay
elapsed time. Music is a bed played over that clock, never read from it. A track
whose pulse disagrees with `RHYTHM.bpm` therefore tells the player two different
things about when "now" is, on every stage where beats are scored.

M16 encoded that rule as a boolean, `MUSIC_TEMPO_LOCKED`, with
`MUSIC_GENERATOR` beside it naming the script that produced each locked file.
Two problems, one historical and one structural.

**The historical one.** `rock_theme_song_loop.wav` was recorded for three
milestones as a 90 BPM track that slipped 417 ms per loop. It is a **120 BPM**
track. The claim was arithmetic on the file's 21.75 s duration against a 90 BPM
grid, and a duration cannot see a pulse: trimming that file to 21.333 s would
have turned every check in the repository green without changing a note anyone
hears. M17.1 corrected the record and narrowed the boolean to mean "generated
here at `RHYTHM.bpm` by a committed script", which is checkable.

**The structural one, and the reason for this ADR.** That narrowing left the
model with exactly two states — *we generated it* and *nobody knows* — and M24
is built around a third: a track that came from outside and can nonetheless be
shown to match. Under the boolean there was no honest way to record such a
track, and the only ways to ship one were to lie in a `Record<K, boolean>` or to
weaken the rule for everybody.

## Decision

### 1. The claim becomes `TempoEvidence`, a discriminated union

In `game/audio/musicCatalogue.ts`:

- **`generated`** — rendered at `RHYTHM.bpm` by a committed, deterministic
  script, which is named. There is no source page to go dead and no licence to
  re-verify, and the tempo is a constant under version control.
- **`conditioned`** — external in origin, conformed onto the grid by a
  reproducible command from a source whose SHA-256 is recorded, carrying the
  **measured** pulse of that source, the confidence of the measurement, and
  whether a person has confirmed it by ear.
- **`unverified`** — nobody has shown this file's pulse matches. Not a failure
  state: `showTheme` lives here and plays Stage 1 perfectly well, because Stage 1
  scores no beat. It is a *usage* restriction — never under a scored slot, never
  player-selectable.

`MUSIC_TEMPO_LOCKED` and `MUSIC_GENERATOR` are deleted rather than kept as
shims. They were two halves of one fact stored in two places, which is the
condition that lets a claim and its evidence drift apart.

### 2. The rule is written against setlist slots, not stages

M24 lets a run resolve its music through a setlist, so "no stage that scores
beats plays an unlocked bed" becomes "no **slot** that scores beats does", plus
a catalogue-level invariant that makes every possible player setlist safe
without enumerating any: **every `release: 'production'` library track must be
grid-qualified.** There are hundreds of setlists and one catalogue.

### 3. `npm run measure:tempo` measures the pulse, and gates on the grid

`scripts/measure-track-tempo.mjs` computes an onset envelope (spectral flux over
1024-sample frames, hop 256, locally normalised), autocorrelates it, and scores
candidate tempi with a comb over the 4/4 metrical tree — the beat, two beats, the
bar, two bars. Nothing in it reads a file's duration except to iterate over it.

It answers two different questions and keeps them apart:

- **`gridScore` / `gridRank`** — do this file's own onsets support `RHYTHM.bpm`?
  This is the gate. It is a narrower question than "what tempo is this?" and far
  more robust, because a track can have an ambiguous tempo and still be
  unambiguously wrong for 90 BPM.
- **`bpm` / `gridMargin`** — the unconstrained best fit, and how far it leads its
  best incompatible rival. Advisory: M24B needs a tempo estimate to know how to
  condition a track, and a thin margin means a person has to listen.

Half and double are not treated as rivals. A 180 BPM track lands a beat on every
90 BPM beat; it is the same metre read at another level, and counting it as a
competitor would penalise every correctly detected track, since a bed with
eighth-note hats always has its own octave as its nearest peak.

`npm run verify` runs it with `--require-locked`.

### 4. Measurement is necessary and not always sufficient

`conditioned` evidence carries `ownerConfirmed`, and a conditioned track may not
be `release: 'production'` without it. This is not ceremony. A metrical comb
finds the strongest *periodicity*, and in some music that is not the beat —
see below. The tool is built to say "ambiguous" rather than to guess, and a
human ear is how an ambiguous track gets resolved.

## Consequences

An external track now needs, before it may back a scored slot: a provenance
record in `docs/assets/AUDIO-SOURCES.md`; a recorded source hash; a measured
pulse; a reproducible conditioning command; a whole-number-of-beats file that
lands on a bar line; a passing `measure:tempo`; and, where the measurement is
thin, an owner listen. That is a lot of ceremony for a background loop, and it
is exactly proportionate to having shipped a 120 BPM track under a scored stage
for three milestones.

Cheaper routes remain available and unchanged: a generated bed needs only its
script.

### What the measurement cannot do, recorded because it is load-bearing

`rock_theme_song_loop.wav` measures **~96 BPM**, not 120.

That is not a bug and it was not tuned away. Its committed source MIDI is
unambiguous — one tempo event, 500 000 µs per quarter, 4/4, 480 ppq — so its
notated tempo is 120 BPM. But its riff is a five-sixteenth cycle repeating every
625 ms, and its onsets are spread near-evenly across the eighth-note grid rather
than accenting the beat. Measured autocorrelation of its onset envelope:

| lag | 250 ms | **500 ms** | **625 ms** | 1000 ms | 2000 ms |
|---|--:|--:|--:|--:|--:|
| agreement | 0.15 | **0.04** | **0.30** | 0.21 | 0.11 |

The notated beat period has almost no energy; the riff cycle has seven times as
much. Magnitude flux, log flux, band-limited flux and complex-domain onset
detection all agree. Any detector that reported 120 for this file would be one
fitted to this file, which is the class of mistake this ADR exists to prevent.

**The gate is unaffected, because it asks the narrower question.** What the
project needs to know about this track is that it is *not* 90 BPM, and the
measurement says so on four independent grounds: grid agreement −0.02 against a
0.30 floor, eight incompatible tempi explaining it better, a best fit that is
not 90 or an octave of it, and a negative margin. Against 0.84 and 0.73 for the
two generated beds, that is the musical difference stated in numbers.

The algorithm is verified against **synthetic** signals of known tempo in
`tests/audioContract.test.ts` — 72, 90, 100, 120 and 140 BPM, each recovered to
within 1.5 BPM, and each a whole number of beats long at 90 BPM as well as at
its own tempo, so duration divisibility cannot tell them apart. That is the
acceptance test for the tool, and it does not name a file.

## Rejected alternatives

- **A filename that says `_90`.** Names are not measurements. `groove_bed_90.wav`
  is correctly named and that is a coincidence of care.
- **A `bpm` metadata field on the track.** This is the boolean with more digits.
  The catalogue deliberately has no `bpm` field: the grid is `RHYTHM.bpm` for
  every track, and what varies is the *evidence* that a file meets it.
- **Duration divisibility.** The mistake already made. It blessed a 120 BPM
  track, and it would have blessed a trimmed one for ever.
- **Setting `tempoLocked: true` by hand.** An assertion is not evidence. Every
  variant above names something a machine goes and checks.
- **Trusting a source page's stated BPM.** Better than nothing and still
  somebody's word about a file we have in our hands and can measure.
- **Keeping the boolean and adding an `externalOk` escape hatch.** Two
  mechanisms for one question, and the escape hatch is the one that gets used
  under deadline.
