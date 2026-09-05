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
with the beat clock. `rock_theme_song_loop.wav` is 21.75 s, which at 90 BPM is
32.625 beats — it slips about 417 ms every loop, more than twice the GOOD
window, and is in antiphase with the pad after two. Stage 2 spends its first
twelve seconds on nothing but the beat, so a bed sliding out of phase
underneath would teach the opposite of the lesson.

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
- [ ] runtime volume is normalized appropriately — **deferred to M4 slice 6**, when the mix is auditioned together;
- [ ] unused long silence is trimmed if necessary — **outstanding for `crowd_applause.wav` only** (39 s);
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
