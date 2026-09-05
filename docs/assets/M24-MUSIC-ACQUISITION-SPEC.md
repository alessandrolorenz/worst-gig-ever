# M24 — Music acquisition specification

**Status:** specification only, 2026-09-05. **No music downloaded.**
**Executed by:** M24B (`docs/specs/M24-implementation-plan.md`).
**Provenance lands in:** `docs/assets/AUDIO-SOURCES.md` — the authoritative
file, per AGENTS.md rule 13. This document says *how*; that one is the record.

---

## What is being acquired

**Eight to ten candidate tracks**, from which the owner picks **six** to ship.

| Property | Requirement |
|---|---|
| Pulse | 90 BPM, or conformable to 90 BPM by a recorded command without audible artefact (see *Conditioning*) |
| Usable section | At least **16 consecutive bars** (64 beats, 42.667 s) that loop convincingly |
| Style | Live-band rock. Six distinct styles across the shipping six |
| Licence | Permits commercial use in an ad-supported mobile game, with no attribution the app cannot satisfy |
| Format at source | Anything `ffmpeg` reads. The shipped derivative is 16-bit mono 44.1 kHz WAV |

### Style targets — one each

1. garage rock
2. punk
3. dirty blues rock
4. surf / trashy guitar rock
5. groove metal
6. hard rock / arena

**All six are at 90 BPM and they must not feel like it.** Feel comes from
subdivision, not tempo: a punk track at 90 with double-time drums reads as 180;
a groove-metal track with half-time backbeat reads as 45. Selecting for
subdivision variety is what stops six 90 BPM tracks sounding like one track.
This is a selection criterion, not a nice-to-have.

---

## Licensing

### Accept

- **CC0 / public domain dedication** — preferred, and what every existing
  third-party asset in this project is.
- **Public domain** by age or explicit dedication.
- **Permissive royalty-free licences that explicitly allow commercial
  distribution inside an application**, with terms the app can satisfy.
- **Pixabay Content License**, when the *individual track's* current terms on
  its own page satisfy the above. Verify per track, on the day, and record what
  the page said.

### Reject, without exception

- non-commercial (CC-BY-NC, "free for personal use");
- attribution the app cannot honestly satisfy (an in-app credits screen does
  not exist and is out of scope);
- **CC-BY** — the project has never shipped one, and adding an attribution
  obligation for a background bed is a poor trade;
- unclear or contested ownership;
- ripped commercial tracks, in any form;
- "no copyright music" from YouTube or similar without a licence document that
  names a licensor;
- anything with recognisable branding, band logos, celebrity likeness or a
  named commercial product in its title or artwork (AGENTS.md rule 12).

### Evidence to capture, per candidate, at download time

```
- Source page URL          (must return HTTP 200 on the day)
- Author / uploader        (as the page states it)
- Licence, quoted verbatim from the page
- Whether attribution is required          yes / no
- Original filename
- Direct file URL
- Retrieval date
- SHA-256 of the file as published         BEFORE anything touches it
```

A screenshot or a saved copy of the licence text is worth taking where a page
looks likely to change. **If verification fails, keep a placeholder and report
it — never silently substitute** (rule 14).

### Sources to try, in order

1. **OpenGameArt** — CC0 filter. Every existing third-party asset here came
   from it, and its licence field is explicit and per-asset.
2. **Free Music Archive** — filter to CC0 / public domain only.
3. **Pixabay Music** — per-track licence check.
4. **Internet Archive** — public-domain and Netlabel collections.
5. **CC0 loop / stem packs** — often better than songs: already loopable,
   often tempo-labelled, and a stem set lets a 16-bar section be assembled
   cleanly.

Prefer a **loop or stem pack over a finished song.** A finished song has an
arrangement that fights being cut; a loop already is one.

---

## The workflow, and where the owner sits in it

```
Claude discovers candidates
    ↓
Claude verifies licensing, records evidence
    ↓
Claude downloads, records source SHA-256
    ↓
Claude measures pulse            npm run measure:tempo
    ↓
Claude conditions to 16 bars     recorded ffmpeg command
    ↓
Claude records provenance        docs/assets/AUDIO-SOURCES.md
    ↓
Claude registers as `candidate`  dev-only, cannot ship
    ↓
─────────── OWNER LISTENS ───────────
    ↓
OWNER APPROVES SIX
    ↓
Claude promotes to `production`, deletes the rest and their records
```

Claude can determine licensing evidence, file integrity, tempo evidence, loop
suitability and technical compatibility. **Claude cannot determine whether a
song is fun.** No step above is allowed to imply otherwise.

### Network

Checked 2026-09-05: `curl https://opengameart.org/` returned **HTTP 200**, and
web search and fetch tooling are available to the session. Acquisition is
therefore executable directly.

**If a future session has no network**, the milestone does not stall — it
returns a manifest instead and stops:

```
For each candidate:
  - authoritative source page URL
  - exact direct file URL
  - expected original filename
  - licence evidence, quoted
  - destination path in this repository
  - the exact ffmpeg conditioning command
  - the exact `shasum -a 256` command to record the source hash
```

The owner downloads; the next session imports and verifies. Nothing about the
provenance record changes.

---

## Measuring the pulse

`npm run measure:tempo <file>` (built at M24A). It correlates the audio's
energy-flux onset envelope against a beat train across 60–200 BPM at 0.2 BPM
resolution over all plausible phases, and reports the ten best fits with a
confidence and the offset of beat one.

This is the method that caught `showTheme`: recorded for three milestones as a
90 BPM track that slipped 417 ms per loop, actually a **120 BPM** track, and
invisible to the duration arithmetic that was checking it.

**Acceptance rules for a candidate:**

| Rule | Threshold |
|---|---|
| Best-fit BPM | within 0.5 BPM of 90, **or** of a conformable relative (45, 180) |
| Fit confidence | the top fit clearly separated from the rest; an ambiguous train is a reject |
| Downbeat | identifiable, so the derivative can be cut on a bar line |
| Rubato / live drift | none tolerated. A track that wanders is a reject, not a conditioning problem |

A track at 89.3 BPM is conformable by resampling; a track that is *sometimes*
90 is not conformable at all.

---

## Conditioning

Every shipped file is a derivative produced from the hashed source by a
**recorded, reproducible command** — the standing `stick_whoosh.wav` and the
trimmed `crowd_applause.wav` already have.

Target: **16 bars = 64 beats = 42.666667 s**, 16-bit mono 44.1 kHz PCM WAV,
**3 763 244 bytes**.

```bash
# 1. exact tempo, cut from the measured downbeat (T0), no rate change
ffmpeg -i source.wav -ss <T0> -t 42.666667 \
  -c:a pcm_s16le -ar 44100 -ac 1 \
  assets/audio/music/runtime/<track>_90.wav

# 2. source measured slightly off grid — resample by the measured ratio
ffmpeg -i source.wav -ss <T0> -af "atempo=<90/measured>" -t 42.666667 \
  -c:a pcm_s16le -ar 44100 -ac 1 \
  assets/audio/music/runtime/<track>_90.wav
```

Then, matching the existing beds:

- **peak-normalize to 0.72**, the level both generated beds use, so the click
  stays the clearest thing in the mix at `MIX.beatClick` 0.85 over
  `MIX.music` 0.38;
- **check the loop seam** — measure the sample step across the wrap against the
  typical sample-to-sample delta in the same region, the way `show_bed_90.wav`
  was measured (step 365 against a typical delta of 3 344). A visible step is a
  click on every repeat;
- **mono**, because these play under a click and behind gameplay, and stereo
  doubles the file for nothing this game uses.

---

## Provenance record shape

Each track gets a block in `docs/assets/AUDIO-SOURCES.md` in the form
`audit:provenance` already parses — a `### \`filename.wav\`` heading followed by
structured lines. Anything else is prose and is not checked.

```markdown
### `no_refunds_90.wav`

- Origin: **third-party, conditioned**
- Author: <as the source page states>
- Licence: <verbatim>
- Attribution required: No
- Source page: <url>
- Direct source: <url>
- Original filename: <name>
- Retrieved: 2026-__-__
- Source SHA-256: `…`
- Measured source tempo: __._ BPM (npm run measure:tempo), downbeat at __.___ s
- Conditioning command: `ffmpeg …`
- Format: 16-bit linear PCM, 44.1 kHz, mono, 42.666667 s, 3763244 bytes
- SHA-256: `…`
- **Exactly 64 beats at 90 BPM**, verified on disk by `tests/audioContract.test.ts`
- Player-facing title: **NO REFUNDS** (fictional; presentation only)
```

**The last line is the rule from §20 of the brief, made concrete.** The
fictional name is presentation. The author, the licence and the original title
are never renamed away, never replaced by the fictional name, and never
omitted.

---

## Fictional titles — proposals only

Not added to any catalogue by this milestone. Offered so the owner can react to
them, and assigned to whichever track fits once the six exist.

`NO REFUNDS` · `CHEAP BEER RIOT` · `BROKEN AMP` · `LAST CALL` ·
`SOUND GUY'S REVENGE` · `LOAD-OUT` · `TWO DRINK MINIMUM` · `WRONG VENUE` ·
`FIRE EXIT` · `NOBODY'S LISTENING`

Constraints they must satisfy: no real band, song, product or brand name; short
enough to fit a slot row in pt-BR and pseudo (`layoutBudget.test.ts` decides);
readable as a title for a **bad** band's song, which is the joke.

---

## Definition of done for M24B

- 8–10 candidates in the tree with complete provenance and tempo evidence;
- `npm run verify` green including `measure:tempo --require-locked` and
  `audit:provenance --require-clean`;
- a dev-only build the owner can listen to;
- **the owner has named six.**

The last item is not a formality. Everything before it is preparation for a
decision Claude is not qualified to make.
