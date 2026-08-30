# M6A — Asset Pack 1 Production Contract

## Objective
Convert M6 art direction into an exact, integration-safe Pack 1 production contract. M6A prepares files/prompts/manifest and provenance. Claude must not invent substitute art when required assets are missing.

## Canonical paths

Background/crowd:
- `assets/art/backgrounds/stage_bg_base.png` — 1920×1080 opaque
- `assets/art/backgrounds/stage_lights_overlay.png` — 1920×1080 transparent
- `assets/art/crowd/crowd_back.png` — 1920×520 transparent
- `assets/art/crowd/crowd_front_01.png` — 1920×420 transparent
- `assets/art/crowd/crowd_front_02.png` — 1920×420 transparent
- `assets/art/crowd/crowd_front_03.png` — 1920×420 transparent

Drums:
- `assets/art/drums/drumkit_pov.png` — 1920×700 transparent

Vocalist (640×900 transparent):
- `assets/art/band/vocalist_idle.png`
- `assets/art/band/vocalist_loop_a.png`
- `assets/art/band/vocalist_loop_b.png`
- `assets/art/band/vocalist_blocking.png`
- `assets/art/band/vocalist_hit_reaction.png`
- `assets/art/band/vocalist_dodge.png`

Bassist (640×900 transparent):
- `assets/art/band/bassist_idle.png`
- `assets/art/band/bassist_loop_a.png`
- `assets/art/band/bassist_loop_b.png`
- `assets/art/band/bassist_hit_reaction.png`
- `assets/art/band/bassist_dodge.png`

Guitarist (640×900 transparent):
- `assets/art/band/guitarist_idle.png`
- `assets/art/band/guitarist_loop_a.png`
- `assets/art/band/guitarist_loop_b.png`
- `assets/art/band/guitarist_hit_reaction.png`
- `assets/art/band/guitarist_dodge.png`

Props:
- `assets/art/props/beer_bottle.png` — 256×512 transparent
- `assets/art/props/beer_mug.png` — 384×384 transparent
- `assets/art/props/whiskey_bottle.png` — 280×560 transparent, optional current gameplay target
- `assets/art/props/drumstick.png` — 640×96 transparent

Effects:
- `assets/art/effects/glass_shard_01.png` … `glass_shard_06.png` — 128×128 transparent
- `assets/art/effects/hit_burst.png` — 256×256 transparent
- `assets/art/effects/dust_puff.png` — 256×256 transparent, optional

## Required-for-M6B
Everything above except whiskey and dust puff.

## Production consistency
Characters: establish one canonical character reference first, then derive states from that reference. Never generate poses independently without a shared reference.

Ambient loop: `idle → loopA → loopB → idle` with small shoulder/torso/head/instrument differences and stable anchor.

Dodge: clearly move torso/head away from projectile corridor without changing character identity.

Hit reaction: comic surprise/lean/stumble only, no injury/gore.

## Provenance
For every generated asset record canonical key, local path, generation tool/provider, prompt file, date, reference use, manual edits, and rights/licensing note.

## Manifest migration
The live manifest already has M3 keys. Preserve existing semantic keys, add new state-frame keys additively, do not delete audio entries, and do not create eager runtime references to files that do not yet exist.

## Implementation record

- `assets/manifest/asset-manifest.json` version 2 is the machine-readable Pack
  1 contract. Production entries record canonical path, dimensions,
  transparency, prompt, and M6B requirement.
- The pre-M6 `crowdFront` and `bassistGroove` semantic keys remain as
  deprecated aliases of `crowdFront01` and `bassistLoopA`; neither creates a
  second path or generation request.
- All five audio entries are retained byte-for-byte in the live manifest.
- The manifest is safe to merge before art exists because runtime code does
  not import it or eagerly require its art paths. M6B will add explicit image
  imports only after the art gate passes.
- `npm run validate:art` reports PRESENT/MISSING/INVALID using Node built-ins.
  Add `-- --require-ready` when a missing/invalid required file must fail the
  command.

## Exit
M6A is complete when exact files are defined, prompts are consistent, manifest merge plan is explicit, provenance exists, and ART GATE can mechanically report PRESENT/MISSING.
