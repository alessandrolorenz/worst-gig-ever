# Audio Sources and Provenance

Checked: 2026-08-30

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

---

## SFX — impact fallback

### Thwack Sounds

- Author: Jordan Irwin / AntumDeluge
- License: CC0
- Source page: https://opengameart.org/content/thwack-sounds
- Pack: https://opengameart.org/sites/default/files/thwack-1.0.zip
- Intended local result: `assets/audio/sfx/impact_thwack.wav`
- Usage: vocalist comic impact or non-glass impact

---

## SFX — crowd completion

### Applause in a large hall or church

- Author: eXpl0it3r
- License: CC0
- Source page: https://opengameart.org/content/applause-in-a-large-hall-or-church
- Original filename: `applause-clapping-church-crowd-immersive.wav`
- Direct source: https://opengameart.org/sites/default/files/applause-clapping-church-crowd-immersive.wav
- Intended local path: `assets/audio/sfx/crowd_applause.wav`
- Usage: Show Complete sting/ambience

---

## Download acceptance checklist

For each asset actually added to the repository:

- [ ] source page still identifies the asset;
- [ ] license is still shown as CC0;
- [ ] file opens correctly;
- [ ] SHA-256 recorded below;
- [ ] local filename is stable;
- [ ] runtime volume is normalized appropriately;
- [ ] unused long silence is trimmed if necessary;
- [ ] any derivative preserves this provenance record.

## Retrieved file records

Populate during M0–M2 fast-track execution.

| Logical key | Local file | SHA-256 | Status |
|---|---|---|---|
| musicRock01 | TBD | TBD | pending |
| glassBreak | TBD | TBD | pending |
| stickWhoosh | TBD | TBD | pending |
| impactThwack | TBD | TBD | pending |
| crowdApplause | TBD | TBD | pending |
