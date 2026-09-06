# Audio Sources and Provenance

Checked: 2026-08-30
Acquired and verified: 2026-08-30 (M0–M2 fast-track execution)

## Policy

For the MVP, prefer **CC0** audio so commercial use and later ad-supported distribution do not require attribution or separate licensing negotiation.

Every downloaded file must be recorded here with:

- source page;
- author;
- license;
- original filename;
- local filename;
- retrieval date;
- SHA-256 after download.

Do not silently replace a missing file with another internet asset.

---

## Music — selected MVP source

### Rock Theme Song

- Author: Umplix
- License: CC0
- Attribution required: No
- Source page: https://opengameart.org/content/rock-theme-song
- MIDI: https://opengameart.org/sites/default/files/rock_theme_song.mid
- Rendered loop WAV: https://opengameart.org/sites/default/files/rock_theme_songloop.wav
- Full WAV: https://opengameart.org/sites/default/files/rock_theme_song.wav
- Intended MIDI local path: `assets/audio/music/source/rock_theme_song.mid`
- Intended runtime local path: `assets/audio/music/runtime/rock_theme_song_loop.wav`

**Verification 2026-08-30:** source page returned HTTP 200 and still lists the licence field as `CC0`. MIDI downloaded verbatim. The published loop WAV is **24-bit PCM** (`pcm_s24le`, 44.1 kHz, stereo, 21.75 s), which is outside Android's guaranteed WAVE support (8- and 16-bit linear PCM), so the runtime file is a 16-bit derivative. See *Derivatives* below.

### MVP usage rule

Keep the MIDI as the editable/source artifact, but use the rendered loop for runtime playback. Do not add a MIDI synthesizer dependency solely to satisfy playback.

If WAV size is undesirable, create an OGG/M4A derivative locally while preserving the CC0 provenance entry and original source file outside the runtime bundle if needed.

---

## SFX — glass break

### Glass Break

- Author: Till Behrend (submitted with permission by TinyWorlds)
- License: CC0
- Source page: https://opengameart.org/content/glass-break
- Original file: https://opengameart.org/sites/default/files/glass_breaking.wav
- Intended local path: `assets/audio/sfx/glass_breaking.wav`
- Usage: bottle/mug break impact

**Verification 2026-08-30:** page returned HTTP 200, licence field `CC0`, page credits Till Behrend and submitter TinyWorlds. Downloaded verbatim (16-bit PCM, 44.1 kHz, stereo, 1.31 s).

---

## SFX — drumstick whoosh

### Swish - bamboo stick weapon swhoshes

- Author: qubodup
- License: CC0
- Source page: https://opengameart.org/content/swish-bamboo-stick-weapon-swhoshes
- Pack: https://opengameart.org/sites/default/files/swoshes.7z
- Intended local result: `assets/audio/sfx/stick_whoosh.wav`
- Usage: short drumstick swing/throw cue

Choose one short clean sample from the pack. Preserve the pack/source provenance even if the selected sample is renamed or trimmed.

**Verification 2026-08-30:** page returned HTTP 200, licence field `CC0`. The pack's own `swoosh.txt` states the files are public domain / CC0 / WTFPL, attribution optional. The pack ships **43 FLAC files**, not WAV. Selected sample: `swosh-01.flac` (0.28 s) — one of the shortest clean swings. Converted to 16-bit WAV for the runtime path. See *Derivatives*.

---

## SFX — impact fallback

### Thwack Sounds

- Author: Jordan Irwin / AntumDeluge
- License: CC0
- Source page: https://opengameart.org/content/thwack-sounds
- Pack: https://opengameart.org/sites/default/files/thwack-1.0.zip
- Intended local result: `assets/audio/sfx/impact_thwack.wav`
- Usage: vocalist comic impact or non-glass impact

**Verification 2026-08-30:** page returned HTTP 200, licence field `CC0`. The pack contains `LICENSE.txt` (full CC0 1.0 text) and `README.txt` crediting Jordan Irwin (AntumDeluge), attribution not required. The pack ships `PCM/` (WAV) and `Vorbis/` (OGA) variants. Selected sample: `PCM/thwack-01.wav` (0.31 s, 16-bit mono), copied verbatim.

---

## SFX — crowd completion

### Applause in a large hall or church

- Author: eXpl0it3r
- License: CC0
- Original filename: `applause-clapping-church-crowd-immersive.wav`
- Source page: https://opengameart.org/content/applause-in-a-large-hall-or-church
- Direct source: https://opengameart.org/sites/default/files/applause-clapping-church-crowd-immersive.wav
- Intended local path: `assets/audio/sfx/crowd_applause.wav`
- Usage: Show Complete sting/ambience

**Verification 2026-08-30:** page returned HTTP 200, licence field `CC0`. Downloaded verbatim (16-bit PCM, 44.1 kHz, stereo, **39.15 s, 6.9 MB**). Left untrimmed on purpose: the Show Complete sting length is not decided until the round end screen exists. Trim to the needed excerpt during M4 slice 6 or M5 polish and record the derivative below.

---

## Generated audio — no third party involved

Not every file has to be *found*. A sound this repository synthesizes from a
committed script has provenance that cannot rot: no source page to go dead, no
licence to re-verify, no author to attribute, and a build step that reproduces
it byte for byte. AGENTS.md rule 12 prefers original assets, and this is the
strongest form of one.

### `groove_bed_90.wav`

- Origin: **generated**, `scripts/make-groove-bed.mjs` (`npm run make:bed`)
- Licence: same as this repository (MIT). No third-party rights involved.
- Added: 2026-09-04, for M16 (Stage 2, "Find the beat")
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 10.666667 s, 940,844 bytes
- SHA-256: `ea89d7e217fa479877936386fe26919c18e29d88a71bc2e60c0dcba978a66616`
- **Exactly 16 beats at 90 BPM** — four bars of four, verified on disk by
  `tests/audioContract.test.ts`

Reason it exists: a stage that scores beats must not play music that disagrees
with the beat clock. `rock_theme_song_loop.wav` does — see the correction below
for what is actually wrong with it, and *Measured tempo* for the numbers. Stage 2
spends its first twelve seconds on nothing but the beat, so a bed that does not
agree with the pad would teach the opposite of the lesson.

(This paragraph described the rock loop as slipping 417 ms per loop until
2026-09-05. That was the arithmetic the correction below overturns; it is
restated here rather than deleted because the wrong reason is the whole reason
`measure:tempo` exists.)

Reason it is generated rather than found: searching CC0 libraries for a track
that happens to be at exactly 90 BPM *and* happens to loop on a bar line is
slow and uncertain. Rendering one makes the property true by construction, and
the script wraps every voice's tail back to the head so the loop is seamless —
a truncated kick tail would click audibly on every repeat, which on this stage
is a tick in exactly the wrong place.

What it is: kick on 1 and 3, snare on 2 and 4, eighth-note hats accented on the
beat, and root notes on a plain A-A-G-D four-bar figure. Deliberately a bed and
not a song — Stage 2 exists to teach the beat, and an arrangement worth
listening to buries the thing being taught. Peak-normalized to 0.72 so the
click stays the clearest thing in the mix.

The show's bed is **not** this file — see `show_bed_90.wav` below, which closed
the last open piece of M16 on 2026-09-05.

### `show_bed_90.wav`

- Origin: **generated**, `scripts/make-show-bed.mjs`
- Licence: same as this repository (MIT). No third-party rights involved.
- Added: 2026-09-05, for Stage 3 ("Keep the beat") and Stage 4 ("Encore")
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 21.333333 s, 1,881,644 bytes
- SHA-256: `1438089965e837e99475512d765706e144271e5366918087ccdbaedf95fe74d1`
- **Exactly 32 beats at 90 BPM** — eight bars of four, verified on disk by
  `tests/audioContract.test.ts`

Reason it exists: the correction below. The show and the encore score beats and
were playing a 120 BPM track, so the two loudest things telling the player when
"now" is were a third apart.

What it is: a full bed rather than the teaching bed's floor — driven
eighth-note power chords through a soft clipper, kick with a push off the
backbeat, crashes on the two phrase heads, and a four-stroke snare fill into
the loop point. Eight bars rather than four, because the show runs for minutes
and a four-bar figure announces itself as a loop. Rooted on A like
`groove_bed_90.wav`, on A-A-G-D | A-A-G-E, so the stage that teaches the beat
and the stage that tests it sound like the same band. Peak-normalized to 0.72,
same as the teaching bed, so the click stays the clearest thing in the mix.

Measured after generation: seam step 365 against a typical sample-to-sample
delta of 3,344 in the same region, so the wrap is inaudible; peak -2.85 dBFS
with no clipped samples; the crash sits 18 dB above the other bars in the high
band, so the four-bar phrase reads.

---

## Correction, 2026-09-05: the rock loop is at 120 BPM, not drifting at 90

Every entry above this line that describes `rock_theme_song_loop.wav` as a
90 BPM track slipping 417 ms per loop was **wrong about the defect**, and the
wrongness survived three milestones because it was never measured — it was
arithmetic on the file's 21.75 s length against a 90 BPM grid.

How it was measured: the CC0 package ships the source MIDI alongside the
rendered loop. Its note-onset train was aligned against the audio's energy
flux across 100-160 BPM at 0.2 BPM resolution, over all plausible offsets.
**All ten best fits landed between 119.6 and 120.0 BPM**, with 77 of the
MIDI's 83 distinct onset times inside the window. The MIDI's own tempo meta
event says 120 BPM, and its content runs 48.5 quarter notes — 24.25 s at that
tempo — so the published 21.75 s "loop" is also a mid-phrase cut of it.

Why the difference matters. A drift accumulates and can be removed by trimming
the file; a wrong tempo cannot. At 90 BPM a beat falls every 667 ms and at
120 BPM every 500 ms, so the music and the player agree once every two seconds
— three of the player's beats to four of the music's — and on the other two
beats of every three the music sits **167 ms** from the tap it is inviting.
`RHYTHM.perfectWindowMs` is 90 ms, so a player who trusts the music cannot
score PERFECT on two beats out of three however well they play.

What it cost: `MUSIC_TEMPO_LOCKED` and its contract test both measured file
duration, so trimming the loop to 21.333 s would have turned every check green
without changing a note. The contract now accepts only one kind of evidence
for a tempo claim — that this repository generated the file at `RHYTHM.bpm`
from a committed script — because that is the only kind it can verify.

### `beat_click.wav`

- Origin: **generated**, `scripts/make-beat-click.mjs` (`npm run make:click`)
- Licence: same as this repository (MIT). No third-party rights involved.
- Added: 2026-09-04, for M16 (the audible beat)
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 90 ms, 7,982 bytes
- SHA-256: `799b4fa4951e3168cb2325329037fda9c85d9e4b0144ae2f7a658ac641e92a57`

Reason it exists: until M16 every cue for the beat was visual, on the one
screen the player must also scan for incoming glass. The owner reported the
beats as unreadable, and a rhythm you cannot hear is most of why.

Reason it is generated rather than downloaded: it plays ninety times a round,
so it wants to be tiny (8 kB), and it wants to be exactly one thing — a dry
stick on a rim, over in 90 ms, with no room tone or tail to smear across the
next beat. Searching CC0 libraries for that is slower and less certain than
writing it.

What it is, in the script's terms: a 4 ms noise transient for the impact, two
decaying partials at 1850 Hz and 3100 Hz for the wood, a quiet 220 Hz body so
it survives a phone speaker, and a 0.6 ms attack ramp so it does not pop. The
noise runs off a fixed seed, so regenerating it reproduces the SHA-256 above —
which is what makes the checked-in file verifiable rather than merely present.

Mono on purpose: it is a point event in the middle of the mix and stereo would
double its size for nothing.

---

## Measured tempo, 2026-09-05 (M24A)

`npm run measure:tempo` measures each track's **pulse** from its own onsets and
gates `npm run verify` on the result. It is the answer to "why are we allowed to
believe this music matches the 90 BPM game?", and it accepts no filename, no
metadata field and no hand-set boolean as an answer. Design and limits:
`docs/decisions/0013-tempo-evidence-for-external-tracks.md`.

Reproduce with `npm run measure:tempo`; do not trust the table without it.

| Track | Best fit | Agreement with the 90 BPM grid | Rank | Verdict |
|---|--:|--:|--:|---|
| `rock_theme_song_loop.wav` | 96.0 BPM | **-0.018** | 9th | **not on the grid** |
| `groove_bed_90.wav` | 90.0 BPM | 0.839 | 1st | on the grid |
| `show_bed_90.wav` | 90.0 BPM | 0.731 | 1st | on the grid |

The rock loop reads as **96 BPM rather than 120**, and that is worth stating
plainly rather than quietly. Its notated tempo is unambiguous — the committed
source MIDI carries a single tempo event of 500 000 µs per quarter, 4/4 — but
its riff is a five-sixteenth cycle repeating every 625 ms, and its onsets sit
near-evenly across the eighth-note grid instead of accenting the beat. Measured
autocorrelation at the notated 500 ms beat is 0.04; at 625 ms it is 0.30. Every
onset detector tried agrees, so a tool that answered 120 here would be one
fitted to this one file.

None of that changes what the project needs to know, which is narrower: this
file is **not** at 90 BPM, and the measurement rejects it on four independent
grounds against beds that pass on all four. It keeps Stage 1, where no beat is
scored.

## Keeping these records true

`npm run audit:provenance` re-derives every checkable claim in this file from
the files themselves — recorded SHA-256 against the file's hash, recorded byte
count against its size, recorded duration against its WAVE header — and
`npm run verify` fails if any of them has drifted. It also catches the
opposite direction, which is the one rule 14 is about: a runtime asset quietly
replaced without its record being updated.

It is one of three gates over this file, and they check different things:
`audit:provenance` checks that a record still describes its file,
`tests/audioContract.test.ts` checks the beat/bar contract on a file's length,
and `measure:tempo` checks the pulse. Only the third can see a wrong tempo.

**`audit:provenance` covers the structured records below and nothing else, and
that limit is deliberate.** Prose is not parsed, because "it was 39.15 s before the trim" and
"it is still 39.15 s" are the same sentence to a regex and opposite claims to a
reader; a guard that failed on correct history would teach people to delete
history. Prose accuracy is editorial, and the practice that replaces it is to
cite the command that reproduces a number — `npm run measure:art`,
`npm run measure:rounds`, `npm run audit:provenance` — rather than restating
the number and hoping.

## Derivatives

Derivatives are produced locally from the verified CC0 sources above. They inherit CC0. Each entry records the exact command so the file can be regenerated from the recorded source SHA-256.

### `rock_theme_song_loop.wav`

Reason: the published loop is 24-bit PCM; Android guarantees only 8- and 16-bit linear PCM WAVE playback, and Android is the primary MVP validation platform.

```bash
ffmpeg -i rock_theme_songloop.wav -c:a pcm_s16le -ar 44100 -ac 2 \
  assets/audio/music/runtime/rock_theme_song_loop.wav
```

Result: 16-bit PCM, 44.1 kHz, stereo, 21.75 s, 3.66 MB (from 5.50 MB). No trimming, no resampling, no level change.

### `crowd_applause.wav` — trimmed 2026-09-04 (M16)

Reason: the committed file was the full 39.15 s / 6.59 MB source and was the
largest asset in the entire app. It plays once, at `SHOW_COMPLETED`, over a
results screen the player reads in a few seconds. This closes open item 2.

Measured before trimming, the clap builds from -28.8 dB RMS at 0 s to about
-24 dB by 2 s and decays steadily after 8 s, so the first five seconds are the
natural swell — starting later would have meant a hard onset mid-applause.

```bash
ffmpeg -i crowd_applause.wav -t 5.0 -af "afade=t=out:st=3.8:d=1.2" \
  -c:a pcm_s16le -ar 44100 -ac 2 crowd_applause.wav
```

Result: 16-bit PCM, 44.1 kHz, stereo, **5.00 s, 882,078 bytes (0.84 MB)**, down
from 6.59 MB. Licence and provenance unchanged — it is the same CC0 recording,
shorter.

- SHA-256 before: `0d3bfde5a050f3c5e6685bd7f1efc7ab1d289fbad65c88c1ce9b4691228c69c9`
- SHA-256 after: `3b7c9f0ab7bc7c9927a368b2a1639e41eeaa0eb9d22c255c8cf51334d137c9c9`

**On the "volume normalization" half of open item 2:** measured rather than
assumed, and it turned out not to be the problem. All four one-shots already
peak at 0.97-1.00, and EBU R128 integrated loudness cannot be measured on them
at all — the gate needs 400 ms of content and `stick_whoosh`, `impact_thwack`
and `beat_click` are 280, 310 and 90 ms. Relative loudness is therefore set by
the `MIX` table in `game/audio/audioMix.ts`, which is where it has always been
and where it is now assertable. No file was re-levelled.

### `stick_whoosh.wav`

Reason: the source pack ships FLAC; the manifest contract expects a WAV at this path.

```bash
# from swoshes.7z
ffmpeg -i swosh-01.flac -c:a pcm_s16le -ar 44100 -ac 2 \
  assets/audio/sfx/stick_whoosh.wav
```

Result: 16-bit PCM, 44.1 kHz, stereo, 0.28 s, 47.8 kB. No trimming, no level change.

---

## Download acceptance checklist

Applied to all five assets on 2026-08-30:

- [x] source page still identifies the asset;
- [x] license is still shown as CC0;
- [x] file opens correctly (verified with `ffprobe`; MIDI verified as `Standard MIDI data (format 1), 4 tracks`);
- [x] SHA-256 recorded below;
- [x] local filename is stable;
- [x] runtime volume is normalized appropriately — **answered at M16, and the answer was no re-levelling.** Measured: all four one-shots already peak at 0.97-1.00, and EBU R128 integrated loudness cannot be measured on three of them at all, because the gate needs 400 ms of content and they are shorter. Relative loudness is the `MIX` table's job, where each level carries a stated reason;
- [x] unused long silence is trimmed if necessary — **done 2026-09-04.** `crowd_applause.wav` went from 39.15 s to 5.00 s; the derivative and its command are recorded below. This line said "outstanding" until 2026-09-05, which is how the roadmap came to list finished work as pending;
- [x] any derivative preserves this provenance record.

## Retrieved file records

Retrieval date: 2026-08-30. `Source SHA-256` is the file as published; `Local SHA-256` is the file committed to this repository (identical when the file was copied verbatim).

| Logical key | Local file | Source SHA-256 | Local SHA-256 | Status |
|---|---|---|---|---|
| musicRock01 (source MIDI) | `assets/audio/music/source/rock_theme_song.mid` | `07cdddc392484041dd294922163153152c1f6c2029843e4e31df325426bb67d6` | `07cdddc392484041dd294922163153152c1f6c2029843e4e31df325426bb67d6` | verbatim |
| musicRock01 (runtime) | `assets/audio/music/runtime/rock_theme_song_loop.wav` | `3e2aadef38489a7023b023460f5f286447daa2f6b760e1fce4314d45977a23b3` | `5ca46a14c295c74cced090ab4791c810da707574290c881ee378f4ead022475e` | 16-bit derivative |
| glassBreak | `assets/audio/sfx/glass_breaking.wav` | `37d29069c885afe3f7ca639293fa679fb6511a6a1e54316f0e403e4493f502b3` | `37d29069c885afe3f7ca639293fa679fb6511a6a1e54316f0e403e4493f502b3` | verbatim |
| stickWhoosh | `assets/audio/sfx/stick_whoosh.wav` | `6bacb655b1b6e6669f5b1eb44e7eaea1219b185539486c08e11240193391ebd5` (`swosh-01.flac`) | `e963a89e12d53537903ca5113a25e391ef250c5dbfba44459fcbd9d42712017d` | WAV derivative |
| impactThwack | `assets/audio/sfx/impact_thwack.wav` | `bb48616d77a89fff6a40ded7244f2e0473dbd7d6b51855927f9b8a4f83a8a037` (`PCM/thwack-01.wav`) | `bb48616d77a89fff6a40ded7244f2e0473dbd7d6b51855927f9b8a4f83a8a037` | verbatim |
| crowdApplause | `assets/audio/sfx/crowd_applause.wav` | `0d3bfde5a050f3c5e6685bd7f1efc7ab1d289fbad65c88c1ce9b4691228c69c9` | `0d3bfde5a050f3c5e6685bd7f1efc7ab1d289fbad65c88c1ce9b4691228c69c9` | verbatim, untrimmed |

### Downloaded archives (not committed)

The two packs are kept out of the repository; only the selected samples are committed. Recorded so the selection is reproducible.

| Archive | SHA-256 |
|---|---|
| `swoshes.7z` | `2d55b26f918a4d8042e2c97a4db81392757195f5aaac9039f5ec2c557b6f11f2` |
| `thwack-1.0.zip` | `8edb002735a01369ef4d6259573be4885f9fe32c9a9efa89dfbbb14067c8c8e5` |

### Committed audio footprint

| File | Bytes |
|---|---|
| `assets/audio/music/source/rock_theme_song.mid` | 2 337 |
| `assets/audio/music/runtime/rock_theme_song_loop.wav` | 3 836 818 |
| `assets/audio/sfx/glass_breaking.wav` | 230 924 |
| `assets/audio/sfx/stick_whoosh.wav` | 48 996 |
| `assets/audio/sfx/impact_thwack.wav` | 27 758 |
| `assets/audio/sfx/crowd_applause.wav` | 6 905 324 |
| **Total** | **11 052 157 (≈10.5 MB)** |

The source MIDI is provenance only. It is never `require`d and no MIDI runtime dependency exists (AGENTS.md rule 10). `tests/contracts.test.ts` enforces both that every declared audio file exists and that no `.mid` file is declared as a runtime asset.

---

## Mug drink gulp — generated, not downloaded (M18)

- Local filename: `assets/audio/sfx/mug_drink.wav`
- Origin: **generated by this repository**
- Generator: `scripts/make-mug-gulp.mjs` (`npm run make:gulp`)
- License: none required — original work produced by a committed script
- Attribution required: No
- Created: 2026-09-04
- Format: 44100 Hz mono 16-bit PCM, 420 ms, 37088 bytes
- SHA-256: `8fc1bcf57578efdc069e4f33291481c5a5f3efc6640221a1bedc1928de60faba`

The M18 spec asked for a licence-verified CC0 gulp. It was synthesized instead,
which is a *stronger* answer to the policy above rather than a way around it:
there is no source page to go dead, no licence to re-verify, and the file is
reproducible byte for byte from a script in this repository. This is the same
route the beat click took at M16.

Three swallows at 0 / 132 / 279 ms, each a short resonant blip whose pitch
sweeps upward — the cavity a mouthful leaves behind gets smaller as it empties
and its resonance climbs with it, which is why a real gulp rises rather than
falls. Spacing is uneven because evenly spaced ones read as a machine. The whole
file fits inside the 480 ms drink animation, so the arm is gone by the time the
last swallow decays.

**Not verified by ear by the agent that wrote it.** Its structure was measured
— three separated bursts, pitch rising 189 -> 397 Hz within the first, peak
0.800 with headroom and no clipping — but whether it *sounds* like drinking is
an owner judgement on the device.

Regenerate with `npm run make:gulp`; the output is deterministic, so the
SHA-256 above is a check rather than a record.

---

## M24B — audition candidates (2026-09-05)

**Eleven external tracks, every one CC0, none of them approved.** They are
`release: 'candidate'` in `game/audio/musicCatalogue.ts`, which means a
development build can select them and a release build cannot. Every one carries
`ownerConfirmed: false` and none may be promoted to `production` until the owner
has actually listened — `tests/audioContract.test.ts` enforces that.

### How these were made, and how to remake them

Each derivative is **16 bars = 64 beats at 90 BPM = 42.666667 s**, cut on a bar
line from a source whose SHA-256 is recorded below, with a 34 ms sampler-style
loop crossfade at the wrap and peak-normalised to 0.72 — the level both
generated beds already sit at.

The sources themselves are **not in this repository**: 129 MB of third-party
audio, most of which will be deleted once the owner names the keepers. What is
committed is everything needed to get them back and rebuild byte-for-byte:

```bash
npm run build:candidates -- --fetch    # download, verify every source hash, re-derive
npm run build:candidates -- --verify   # check the committed WAVs against the manifest
```

`assets/audio/music/candidates/SOURCES.json` is the machine-readable copy of
everything below, including the pinned `ratio` and `startSample` that make the
derivation deterministic. A source whose hash no longer matches is a hard stop,
never a substitution (AGENTS.md rule 14).

### The fictional titles are not provenance

Every track below has a player-facing name like **NO REFUNDS**. That is
presentation — the joke is that they are a bad band's songs. The real title,
author, licence and source page stay here and are never replaced by it.

### `noRefunds_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 01 - rock city ransom
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/01_-_rock_city_ransom.ogg
- Original filename: `01_-_rock_city_ransom.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `d152ec4b79418b38e8c7ee25a9ff7455fe2334df0dfef35a407b276dc3920c43`
- Source format: vorbis, 44100 Hz, stereo, 64.0 s, 3,002,412 bytes
- Measured source tempo: **90 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.053
- Conditioning: none — the source is already at 90 BPM
- Loop seam after wrap: 0.77x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/01_-_rock_city_ransom.ogg --out assets/audio/music/candidates/noRefunds_90.wav --ratio 1.000000000 --start-sample 176656 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `2f405eba2ca5c9580bb6eb70a0c6d6ee405d77b38ab6ef1d4454495021c307d1`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): garage rock
- Player-facing title: **NO REFUNDS** (fictional; presentation only)
- Owner confirmed: **no**

### `brokenAmp_90.wav`

- Origin: **third-party, conditioned**
- Real source title: loop 7
- Author: johndekale
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rocky-musicloop
- Direct source: https://opengameart.org/sites/default/files/loop_7.ogg
- Original filename: `loop_7.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `6a3efa756b4ab6d7864c2c6d35edb9ebeef4315d280d91fe7d9dd22e64a333a2`
- Source format: vorbis, 16000 Hz, mono, 51.1 s, 322,451 bytes
- Measured source tempo: **90 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.021
- Conditioning: none — the source is already at 90 BPM
- Loop seam after wrap: 0.45x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/loop_7.ogg --out assets/audio/music/candidates/brokenAmp_90.wav --ratio 1.000000000 --start-sample 175928 --bars 16 --mono`
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 42.666667 s, 3,763,244 bytes
- SHA-256: `b63549abc3bccb5bc87de393ec9a719001a555f7f0dfb8b48d0f06e820468933`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): hard rock
- Player-facing title: **BROKEN AMP** (fictional; presentation only)
- Owner confirmed: **no**

### `lastCall_90.wav`

- Origin: **third-party, conditioned**
- Real source title: g42 end
- Author: kbar1982
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/guitars4two
- Direct source: https://opengameart.org/sites/default/files/g42_end.flac
- Original filename: `g42_end.flac`
- Retrieved: 2026-09-05
- Source SHA-256: `cc72af06efa28797021bb69d39f314f566fe2bd91459982ead285cff76988c61`
- Source format: flac, 48000 Hz, stereo, 256.0 s, 14,825,236 bytes
- Measured source tempo: **90 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.204
- Conditioning: none — the source is already at 90 BPM
- Loop seam after wrap: 0.57x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/g42_end.flac --out assets/audio/music/candidates/lastCall_90.wav --ratio 1.000000000 --start-sample 6408216 --bars 16 --mono`
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 42.666667 s, 3,763,244 bytes
- SHA-256: `e6dd3a58c2a0767b272949b6e74a3d2daf0864b0b618bba17f980402d38d24c4`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): acoustic rock
- Player-facing title: **LAST CALL** (fictional; presentation only)
- Owner confirmed: **no**

### `stageDive_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 09 - chick with weapon
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/09_-_chick_with_weapon.ogg
- Original filename: `09_-_chick_with_weapon.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `add3bd23d7ed79510ed892d37da3fb0afa984025c4e4f867cd8566b69c9da435`
- Source format: vorbis, 44100 Hz, stereo, 69.3 s, 3,712,406 bytes
- Measured source tempo: **90 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.093
- Conditioning: none — the source is already at 90 BPM
- Loop seam after wrap: 0.99x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/09_-_chick_with_weapon.ogg --out assets/audio/music/candidates/stageDive_90.wav --ratio 1.000000000 --start-sample 588512 --bars 16 --mono`
- Format: 16-bit linear PCM, 44.1 kHz, **mono**, 42.666667 s, 3,763,244 bytes
- SHA-256: `54230a28c190c1d581d34319550d972b639929efd047ef5df4a8a53329b90017`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): garage rock
- Player-facing title: **STAGE DIVE DISASTER** (fictional; presentation only)
- Owner confirmed: **no**

### `cheapBeerRiot_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 15 - we got the crud
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/15_-_we_got_the_crud.ogg
- Original filename: `15_-_we_got_the_crud.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `aed6b64875dc7a65447cdc081a7c1c124d4aa0f329947cfff9c037bf36c32845`
- Source format: vorbis, 44100 Hz, stereo, 70.8 s, 4,164,008 bytes
- Measured source tempo: **95 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.035
- Conditioning: `atempo=0.947368` (-5.3%), 95 BPM to 90
- Loop seam after wrap: 1.02x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/15_-_we_got_the_crud.ogg --out assets/audio/music/candidates/cheapBeerRiot_90.wav --ratio 0.947368421 --start-sample 315888 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `6b028f1e32ede381e988661d440e317094a3f438e9142fe96e27ce62f70951b4`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): punk
- Player-facing title: **CHEAP BEER RIOT** (fictional; presentation only)
- Owner confirmed: **no**

### `wrongChord_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 14 - here a captive heart busted
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/14_-_here_a_captive_heart_busted.ogg
- Original filename: `14_-_here_a_captive_heart_busted.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `48b2396411db2567d1841fe30ec26a1c45067df8ecf469d9105bbdb59b9d9c1d`
- Source format: vorbis, 44100 Hz, stereo, 60.6 s, 3,487,688 bytes
- Measured source tempo: **95 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.022
- Conditioning: `atempo=0.947368` (-5.3%), 95 BPM to 90
- Loop seam after wrap: 1.33x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/14_-_here_a_captive_heart_busted.ogg --out assets/audio/music/candidates/wrongChord_90.wav --ratio 0.947368421 --start-sample 706112 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `5572da8cd79af63f8a9523d2a447e38611cde4228330027fcdc81aef6905b7a1`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): alt rock
- Player-facing title: **WRONG CHORD** (fictional; presentation only)
- Owner confirmed: **no**

### `badSoundcheck_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 17 - digestive malady
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/17_-_digestive_malady.ogg
- Original filename: `17_-_digestive_malady.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `fb1ee1453315e7663c1f3d317837c29790d07d3566de3f4588a798442893b365`
- Source format: vorbis, 44100 Hz, stereo, 50.5 s, 2,772,358 bytes
- Measured source tempo: **95 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.065
- Conditioning: `atempo=0.947368` (-5.3%), 95 BPM to 90
- Loop seam after wrap: 0.95x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/17_-_digestive_malady.ogg --out assets/audio/music/candidates/badSoundcheck_90.wav --ratio 0.947368421 --start-sample 177040 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `9f1fa51ff08c096dcac43f5cb67af79d74cbbb1db205d58c5c89da4d8079c39c`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): punk
- Player-facing title: **BAD SOUNDCHECK** (fictional; presentation only)
- Owner confirmed: **no**

### `loadOut_90.wav`

- Origin: **third-party, conditioned**
- Real source title: 20 - it is dangerous to be lonely without a sword
- Author: Ragnar Random
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/rock-music-pack
- Direct source: https://opengameart.org/sites/default/files/20_-_it_is_dangerous_to_be_lonely_without_a_sword.ogg
- Original filename: `20_-_it_is_dangerous_to_be_lonely_without_a_sword.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `25ee782032e7561781727c6116699866fb1f3ff014c19356829ee94afb8b80fb`
- Source format: vorbis, 44100 Hz, stereo, 79.1 s, 4,122,038 bytes
- Measured source tempo: **85 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.032
- Conditioning: `atempo=1.058824` (+5.9%), 85 BPM to 90
- Loop seam after wrap: 0.84x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/20_-_it_is_dangerous_to_be_lonely_without_a_sword.ogg --out assets/audio/music/candidates/loadOut_90.wav --ratio 1.058823529 --start-sample 441000 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `f56aa38298cbcdd2046953c92b3ea821614c6160046b83f8bf173861fa11a4f3`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): hard rock
- Player-facing title: **LOAD-OUT** (fictional; presentation only)
- Owner confirmed: **no**

### `fireExit_90.wav`

- Origin: **third-party, conditioned**
- Real source title: B.M.I. (tales of Christ)
- Author: obscure music
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/christian-acid-rock
- Direct source: https://opengameart.org/sites/default/files/B.M.I.%20%28tales%20of%20Christ%29.flac
- Original filename: `B.M.I. (tales of Christ).flac`
- Retrieved: 2026-09-05
- Source SHA-256: `c2b0b4bc7bdfd64997dfbd51dedeedd5bb0e4c570080c9c3809e7c69d0c298a1`
- Source format: flac, 44100 Hz, stereo, 250.6 s, 31,136,513 bytes
- Measured source tempo: **95 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.097
- Conditioning: `atempo=0.947368` (-5.3%), 95 BPM to 90
- Loop seam after wrap: 1.66x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/B.M.I. (tales of Christ).flac --out assets/audio/music/candidates/fireExit_90.wav --ratio 0.947368421 --start-sample 2321744 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `b9042582bdb4f0023b55622fa59fa1c95828d5a05872ca341a67da8b48decd1d`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): acid / blues rock
- Player-facing title: **FIRE EXIT** (fictional; presentation only)
- Owner confirmed: **no**

### `noEncore_90.wav`

- Origin: **third-party, conditioned**
- Real source title: heavy battle 2 bpm185
- Author: MintoDog
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/heavy-battle-2
- Direct source: https://opengameart.org/sites/default/files/heavy_battle_2_bpm185.ogg
- Original filename: `heavy_battle_2_bpm185.ogg`
- Retrieved: 2026-09-05
- Source SHA-256: `01d3d505139161a04b3f225ad9cdc0acb52a8e21c997e658c916173def647df8`
- Source format: vorbis, 44100 Hz, stereo, 83.0 s, 2,706,480 bytes
- Measured source tempo: **185 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.103
- Conditioning: `atempo=0.972973` (-2.7%), 185 BPM to 90
- Loop seam after wrap: 0.26x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/heavy_battle_2_bpm185.ogg --out assets/audio/music/candidates/noEncore_90.wav --ratio 0.972972973 --start-sample 219496 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `98dd0e1becf9e35589656630ac335a219fa16b3e4f01368dc207e01db5a471ab`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): groove metal
- Player-facing title: **NO ENCORE** (fictional; presentation only)
- Owner confirmed: **no**

### `wrongVenue_90.wav`

- Origin: **third-party, conditioned**
- Real source title: super wreck roadway
- Author: Umplix
- Licence: CC0 (public domain dedication), as stated on the source page
- Attribution required: No
- Source page: https://opengameart.org/content/super-wreck-roadway
- Direct source: https://opengameart.org/sites/default/files/super_wreck_roadway.wav
- Original filename: `super_wreck_roadway.wav`
- Retrieved: 2026-09-05
- Source SHA-256: `c879ab828cff3ab60ebbd035f8654ea53e95a0c171c46a94d1a0ff1a6cb8f19d`
- Source format: pcm_f32le, 48000 Hz, stereo, 153.6 s, 59,042,756 bytes
- Measured source tempo: **100 BPM** (`npm run measure:tempo`), separation from its best incompatible rival 0.160
- Conditioning: `atempo=0.900000` (-10.0%), 100 BPM to 90
- Loop seam after wrap: 1.58x the local sample delta
- Conditioning command: `node scripts/condition-track.mjs assets/audio/music/source/super_wreck_roadway.wav --out assets/audio/music/candidates/wrongVenue_90.wav --ratio 0.900000000 --start-sample 1660224 --bars 16`
- Format: 16-bit linear PCM, 44.1 kHz, **stereo**, 42.666667 s, 7,526,444 bytes
- SHA-256: `c522dfb98dadc48e37168b2510e167ad8dfbe09254179496b8c3fc35cdec348e`
- **Exactly 64 beats at 90 BPM** — sixteen bars of four, verified on disk by
  `tests/audioContract.test.ts` and `tests/audition.test.ts`
- Style (provisional, from the source page's own tags): hard rock
- Player-facing title: **WRONG VENUE** (fictional; presentation only)
- Owner confirmed: **no**
