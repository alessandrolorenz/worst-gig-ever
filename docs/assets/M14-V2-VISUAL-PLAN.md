# M14 V2 Visual Refresh Plan

## Status

Planning and proof review are complete. The owner approved the direction on
2026-09-02 and continued past the vocalist checkpoint. All 33 production assets
are integrated as of 2026-09-03; the historical audit below describes Pack 1.

An earlier generation attempt was interrupted; its two drafts were rejected
for staying too close to Pack 1, converging on similar character shapes, and
failing the requested background contract. They never entered the repository.

The owner clarified that the three performers needed stronger differentiation.
A new lineup gate established compact/angular, broad/grounded, and tall/narrow
silhouettes before the individual sheets were derived. A crowd draft that
copied band identities was also rejected and regenerated with an independent
cast. The drum-kit proof was edited at the owner's request to remove the two
drumsticks resting on the snare.

The seven-image proof set is retained as approved reference material. Production
replacements use the canonical `assets/art/` paths. See the integration runbook
and M14 verification gate for current evidence.

Current gate: `V2_DEVICE_REVIEW` — final physical-device owner review pending.

## Proof set state — 2026-09-02

Rendered under `design-reference/m14-v2-proof/`. Reference sheets are RGB on
the flat warm-gray studio card the style bible allows; they are direction
proofs, not runtime cutouts, so the alpha contract does not apply to them.

| # | Prompt | File | Result |
|---|---|---|---|
| 0 | `00-performer-lineup-proof.md` | `performer-lineup-v2.png` | candidate — three distinct builds, faces, heights, and postures |
| 1 | `01-vocalist-reference.md` | `vocalist-reference-v2.png` | candidate — front/rear views preserve the compact angular identity |
| 2 | `02-bassist-reference.md` | `bassist-reference-v2.png` | candidate — front/rear views preserve the broad grounded identity |
| 3 | `03-guitarist-reference.md` | `guitarist-reference-v2.png` | candidate — front/rear views preserve the tall narrow identity |
| 4 | `04-crowd-sample.md` | `crowd-sample-v2.png` | corrected candidate — independent cast and clear centre channel |
| 5 | `05-drumkit-sample.md` | `drumkit-sample-v2.png` | corrected candidate — snare clear, no resting drumsticks |
| 6 | `06-beer-bottle-sample.md` | `beer-bottle-sample-v2.png` | candidate — simplified silhouette and blank teal label |

### Resolved proof corrections

1. The corrected crowd candidate uses a new cast rather than copying performer
   faces, hair, clothing, or palettes. It keeps left/right clusters and a clear
   central projectile channel.
2. The drum-kit candidate contains no resting drumsticks. Strike feedback
   remains the separate runtime `drumstick` asset, and the snare stays clear
   for the lower-centre code-drawn Groove Pad.
3. The beer-bottle candidate is rendered with a strong narrow silhouette,
   minimal highlights, and an unbranded blank teal label.

All seven remain subject to explicit owner visual approval before production.

## Direction

**Stylized Punk Arcade Cartoon**: cleaner and more readable than Pack 1's
detailed comic rendering, while preserving faces, personality, instruments,
humor, venue depth, and the deliberately choppy three-frame motion language.

The target balance is:

- confident outer contours and large color masses;
- medium internal detail, with one shadow tone and sparse texture;
- expressive fictional faces and readable body language;
- slightly exaggerated arcade proportions;
- saturated punk colors over a dark venue;
- stronger silhouette separation than Pack 1;
- no silhouettes-only treatment, generic corporate vector style, realism,
  cross-hatching, branded labels, real people, logos, or baked text.

Before individual character references, use one performer-lineup gate. The
three figures must not share a generic face or body template: vocalist is
compact/angular, bassist broad/grounded, and guitarist very tall/narrow. If
that distinction is not immediate at thumbnail size, reject the lineup before
generating any state family.

## Audit of Pack 1

The existing architecture is suitable for direct substitution: all 33 required
PNGs are isolated, statically registered in `game/rendering/artAssets.ts`, and
placed through pure composition data. No renderer rebuild is needed.

Observed strengths to preserve:

- drummer-eye camera and layered venue depth read correctly;
- the band has distinct palettes and silhouettes;
- the crowd faces the drummer and communicates comic hostility;
- bottle and mug are recognizable while rotating and scaling;
- the drum kit sells the POV and leaves a central opening;
- filenames, state vocabulary, and alpha/dimension contracts are complete.

Readability problems to solve:

- characters use dense folds, seams, hair strands, instrument hardware, and
  anatomy shading that collapse at phone scale;
- the crowd carries performer-level detail: tattoos, fishnets, clothing seams,
  individual facial rendering, and many competing contours;
- the background has high-frequency brick, railing, truss, cable, door, and
  floor texture across the full projectile field;
- the drum kit has dense wear, reflections, stand hardware, tape, and cymbal
  texture, making the foreground visually heavier than necessary;
- the characters were generated independently across states. The existing
  ambient subjects change by roughly 60–87% between frames, so runtime keeps
  `AMBIENT_LOOP_ART_READY = false` and displays only the first frame;
- Pack 1's illustration rendering is coherent in isolation but more detailed
  than the code-drawn HUD, countdown, Groove Pad, and timing feedback.

## Composition invariants

- Reference canvas remains 1920 × 1080 landscape.
- Preserve all canonical production filenames, dimensions, transparency,
  manifest keys, aliases, runtime state names, and performer ground anchors.
- Preserve `PERFORMER_FRAME`, `PERFORMER_BASELINE_Y`, crowd rectangles,
  `DRUM_KIT_RECT`, and the existing target draw boxes.
- Do not change hitboxes, target paths, scoring, timing, input, or z-order.
- Preserve the five-lane projectile envelope and the open centre sightline.
- Keep the M13.1 Groove Pad at lower centre. The pad is code-drawn over the
  kick/snare region; do not paint its pulse or timing ring into drum art.
- Target artwork must stay within the current measured visible-content bounds
  used by `game/rendering/composition.ts`: bottle about 110 × 494 inside its
  256 × 512 frame; mug about 307 × 339 inside its 384 × 384 frame.

## Canonical V2 reference contracts

### Vocalist

- Original fictional adult; wiry, angular stage posture.
- Messy teal hair with one shaved side.
- Mustard sleeveless ripped vest, magenta shirt, black skinny jeans with one
  magenta repair, white high-top boots, simple black wrist pieces.
- Generic wired microphone; no logo.
- Ambient reference is three-quarter back toward the crowd; the approved
  design must also define the face for the later blocking/reaction states.
- Personality: tense, defiant, comically overcommitted rather than violent.
- Identity locks: face shape, teal hair mass, mustard/magenta palette, long
  legs, white boots, microphone, and stable feet anchor.

### Bassist

- Original fictional brown-skinned adult with a stocky, powerful build.
- Dark curly high puff with shaved sides.
- Teal ripped vest, burnt-orange shirt, purple cargo pants, amber work boots.
- Red-and-cream generic bass.
- Personality: grounded, stubborn, bracing against the bad show.
- Identity locks: face, hair mass, broad proportions, teal/orange/purple
  palette, red bass, boots, and stable feet anchor.

### Guitarist

- Original fictional light-brown-skinned adult with a tall, wiry build.
- Ambient, reaction, and dodge frames use a rear three-quarter
  stage-performance view toward the audience; the drummer sees the performer's
  back and only a facial profile.
- Large flame-orange hair shape.
- Electric-blue cropped jacket, dark shirt, magenta-and-black plaid trousers,
  teal boots.
- Cream offset generic guitar with teal pickguard.
- Personality: theatrical, twitchy, self-serious in a funny way.
- Identity locks: face, orange hair silhouette, narrow proportions,
  blue/plaid/teal palette, cream guitar, and stable feet anchor.

### Crowd

- Same fictional crowd composition across all three eventual front frames.
- Faces and front torsos point toward the drummer; selected front faces remain
  expressive, while background faces simplify into grouped shapes.
- Preserve playful scowls, booing, fists, horns, and empty-handed throwing
  wind-up/release/follow-through poses.
- Use grouped dark value masses with controlled magenta, teal, amber, green,
  blue, and orange accents.
- Remove tiny tattoos, fishnet grids, garment seams, and individual hair-line
  detail that compete with projectiles.
- Keep a low-detail negative-space channel through the central lanes.

### Stage and lights

- Preserve the drummer-facing room, balcony, stage lip near y≈828, and dark
  purple/charcoal base.
- Reduce brick cracks, rail segments, cable tangles, plank scratches, and tiny
  fixtures into larger architectural shapes.
- Preserve venue depth without turning the room into a flat poster.
- Keep lights as a separate transparent layer with broad magenta, amber, teal,
  and electric-blue beams that do not paint over projectile silhouettes.

### Drum kit

- Battered red shells, warm gold cymbals, pale worn heads, dark hardware.
- Preserve drummer POV, exact 1920 × 700 transparent frame, and open centre.
- Simplify stand hardware, dents, tape, grime, and reflection strokes.
- Keep cymbals, toms, snare, and implied kick unmistakable.
- Leave the lower-centre kick/snare area calm enough for the code-drawn M13.1
  ellipse to read as part of the kit. Do not bake glow, rings, labels, or UI.

### Props and FX

- Bottle: amber glass, teal blank label block, gold cap, strong narrow
  silhouette, minimal highlights, no bubbles or label text.
- Mug: squat clear/amber silhouette with one bold handle and limited foam.
- Drumstick: plain warm wood with one contour and one shadow tone.
- Hit burst: compact magenta/amber/cream arcade star with no text.
- Shards: six clearly different translucent teal/amber silhouettes with one
  highlight each and no painted motion blur.
- Optional whiskey bottle and dust puff remain deferred.

## Character production workflow

1. Approve one V2 reference per performer before generating state art.
2. Record the accepted reference path and identity locks in provenance.
3. Derive `idle` first on the canonical 640 × 900 transparent canvas.
4. Produce `loopA` and `loopB` as edits from `idle`, changing only small
   head/shoulder/instrument movements and keeping the feet fixed.
5. Produce reaction states from the same reference; larger movement is allowed
   but identity, outfit, proportions, instrument, palette, and camera persist.
6. Compare every family side by side on transparent, light, dark, and in-scene
   backgrounds before integration.
7. Enable `AMBIENT_LOOP_ART_READY` only after all three band triplets and the
   crowd triplet pass continuity review together.

Do not generate animation frames from unrelated text-only requests.

## Proof set

Proof outputs live under `design-reference/m14-v2-proof/`; they never overwrite
`assets/art/`. The exact prompts are in `prompts/assets-v2/`.

Required review samples:

0. three-performer silhouette/face lineup gate;
1. vocalist canonical reference derived after lineup approval;
2. bassist canonical reference derived after lineup approval;
3. guitarist canonical reference derived after lineup approval;
4. front-crowd style/composition sample;
5. drummer-POV drum-kit sample;
6. beer-bottle readability sample.

Owner review questions:

- Is the style visibly simpler but still expressive?
- Do the three performers remain distinct fictional people?
- Are faces, hair, instruments, and clothing readable at phone size?
- Does the crowd support rather than dominate the scene?
- Does the kit preserve POV and make room for the central Groove Pad?
- Does the bottle read instantly at small size and while rotating?

## Production prompt set and integration tooling — 2026-09-02

The full production specification now exists, covering all 33 required assets
across eight prompt files (`prompts/assets-v2/10-` … `17-`), indexed in
`prompts/assets-v2/README.md`. Each derives its outputs from an approved
canonical reference as edits of it, rather than from text alone. No production
image was generated in this pass. The seven candidate proof images were made
with the OpenAI built-in image generator and remain isolated under
`design-reference/m14-v2-proof/`.

Integration is specified in `docs/assets/M14-V2-INTEGRATION-RUNBOOK.md`:
staging directory, family-by-family order with the performer triplets first,
per-family checks, and the rollback path.

`scripts/measure-art-bounds.mjs` (`npm run measure:art`) closes the gap that let
Pack 1 pass its own gate. `validate:art` reads PNG headers; this decodes pixels
and reports:

- the opaque bounding box of each target, the resulting reach against
  `effectiveHitRadius` at every approach scale, and the exact
  `TARGET_ART_CONTENT` values to paste into `game/rendering/composition.ts`;
- per-triplet feet-anchor drift and frame-to-frame change ratio.

It independently reproduces the hardcoded Pack 1 bounds (bottle 110x494, mug
307x339) and the documented discontinuity, and surfaces two numbers that were
not previously written down: the bottle clears its tap circle by only **1.7 px**
at its tightest approach scale, and crowd anchor drift reaches **51 px**.

Provisional continuity gates are drift ≤ 8 px and change ≤ 25%, reporting-only
unless `--require-continuity` is passed.

## Approval boundary

At `V2_VISUAL_DIRECTION_REVIEW`, do not:

- overwrite production PNGs;
- generate full animation families;
- modify the manifest, renderer, composition, gameplay, or hitboxes;
- enable the ambient loop;
- create optional assets.

After owner approval, create a separate art-production milestone, update
provenance for every accepted output, replace files family by family, run the
Pack 1 validator and full project verification, then perform web and physical
device visual smoke tests.
