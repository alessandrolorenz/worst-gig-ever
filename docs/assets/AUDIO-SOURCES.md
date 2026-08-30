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

## Derivatives

Derivatives are produced locally from the verified CC0 sources above. They inherit CC0. Each entry records the exact command so the file can be regenerated from the recorded source SHA-256.

### `rock_theme_song_loop.wav`

Reason: the published loop is 24-bit PCM; Android guarantees only 8- and 16-bit linear PCM WAVE playback, and Android is the primary MVP validation platform.

```bash
ffmpeg -i rock_theme_songloop.wav -c:a pcm_s16le -ar 44100 -ac 2 \
  assets/audio/music/runtime/rock_theme_song_loop.wav
```

Result: 16-bit PCM, 44.1 kHz, stereo, 21.75 s, 3.66 MB (from 5.50 MB). No trimming, no resampling, no level change.

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
