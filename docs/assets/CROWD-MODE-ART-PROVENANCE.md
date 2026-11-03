# Crowd Mode Art Provenance

Recorded: 2026-10-08 · Milestone: M31

All production files below are original project-specific generations made with
OpenAI's built-in image generation tool. No third-party assets, commercial
logos, celebrity likenesses, album art, or branded alcohol labels were used.
The generation inputs are existing original **Worst Gig Ever** art documented
in this repository.

High-resolution generation outputs are preserved under
`design-reference/crowd-mode/`. Exact-size runtime derivatives live only under
`assets/art/crowd_mode/`.

| Asset key | Runtime path | Preserved source | Generator output | Prompt | Reference used | Manual edits | Rights/licensing note |
|---|---|---|---|---|---|---|---|
| stagePlate | `assets/art/crowd_mode/crowd_stage_plate.jpg` | `design-reference/crowd-mode/crowd-stage-plate-source.png` | `exec-8ad83cf6-d8e2-437e-ac55-565268e1559d.png` | P1 | audience performance source | resized to 1920×1080; JPEG quality 85 | original/generated for this project |
| amplifierIntact | `assets/art/crowd_mode/amplifier_intact.png` | `design-reference/crowd-mode/amplifier-intact-source.png` | `exec-f8086e2f-68de-4902-8ff3-903e5e88dacd.png` | P2 | audience performance source | resized to 180×230 | original/generated for this project |
| amplifierDamaged | `assets/art/crowd_mode/amplifier_damaged.png` | `design-reference/crowd-mode/amplifier-damaged-source.png` | `exec-b0635dbe-8616-4595-a6e4-1f12587801aa.png` | P3 | generated intact amplifier | resized to 180×230 | original/generated for this project |
| cymbal | `assets/art/crowd_mode/cymbal.png` | `design-reference/crowd-mode/cymbal-source.png` | `exec-8e05c506-2145-4636-bb36-a4df5f7c0d4b.png` | P4 | audience performance source | resized to 165×90 | original/generated for this project |
| bassistPerforming | `assets/art/crowd_mode/bassist_performing.png` | `design-reference/crowd-mode/bassist-performing-source.png` | `exec-cc7a1e75-41dc-4301-8e2f-44ba40032cb5.png` | P5a | audience source + `bassist_idle.png` | resized to 570×600 | original/generated for this project |
| bassistDisarmed | `assets/art/crowd_mode/bassist_disarmed.png` | `design-reference/crowd-mode/bassist-disarmed-source.png` | `exec-c91632a6-037d-4058-af1c-37bac5ea7672.png` | P6a | generated performing frame | resized to 570×600 | original/generated for this project |
| vocalistPerforming | `assets/art/crowd_mode/vocalist_performing.png` | `design-reference/crowd-mode/vocalist-performing-source.png` | `exec-f798bac2-8013-4a34-9f91-ae2776428d28.png` | P5b | audience source + `vocalist_idle.png` | resized to 500×740 | original/generated for this project |
| vocalistDisarmed | `assets/art/crowd_mode/vocalist_disarmed.png` | `design-reference/crowd-mode/vocalist-disarmed-source.png` | `exec-7b0519bd-67aa-4431-b563-eaa04eaed275.png` | P6b | generated performing frame | resized to 500×740 | original/generated for this project |
| guitaristPerforming | `assets/art/crowd_mode/guitarist_performing.png` | `design-reference/crowd-mode/guitarist-performing-source.png` | `exec-a248a6cb-29d1-4187-b48f-45a22cc98901.png` | P5c | audience source + `guitarist_idle.png` | resized to 495×755 | original/generated for this project |
| guitaristDisarmed | `assets/art/crowd_mode/guitarist_disarmed.png` | `design-reference/crowd-mode/guitarist-disarmed-source.png` | `exec-7d81f2e9-42cd-43a7-868a-e6fc73bc54d2.png` | P6c | generated performing frame | resized to 495×755 | original/generated for this project |
| microphoneProp | `assets/art/crowd_mode/microphone_prop.png` | `design-reference/crowd-mode/microphone-prop-source.png` | `exec-f55b0947-8c27-426c-8d93-398a53896a98.png` | P7a | generated vocalist frame | resized to 100×100 | original/generated for this project |
| guitarProp | `assets/art/crowd_mode/guitar_prop.png` | `design-reference/crowd-mode/guitar-prop-source.png` | `exec-4f7738bc-a065-4376-86e6-21bc1d34f3c2.png` | P7b | generated guitarist frame | resized to 380×340 | original/generated for this project |
| bassProp | `assets/art/crowd_mode/bass_prop.png` | `design-reference/crowd-mode/bass-prop-source.png` | `exec-3b9b7148-2027-46b3-8944-e0720a44c3ce.png` | P7c | generated bassist frame | resized to 475×330 | original/generated for this project |
| waiter | `assets/art/crowd_mode/waiter.png` | `design-reference/crowd-mode/waiter-source.png` | `exec-2890d44f-e44f-42a7-abfa-8298e5379322.png` | P8 | audience performance style | resized to 230×430 | original/generated for this project |
| throwHand | `assets/art/crowd_mode/throw_hand.png` | `design-reference/crowd-mode/throw-hand-clean-source.png` | `exec-2ccc57e1-fcba-48f1-977f-ecd71741d61e.png` | P9 | audience foreground hands | cleared residual alpha below 32; resized to 300×200 | original/generated for this project |

## Generation prompt record

Every prompt also included the shared contract constraints: exact established
punk-arcade cartoon style, dark uneven outlines, painterly cel shading, source
lighting, no real people or brands, no text/logos/watermarks, exact requested
box, and straight-alpha transparency except the opaque plate.

- **P1 — clean plate:** edit the audience performance source without changing
  camera or composition; preserve the room, all eight cans, audience, drummer,
  whole kit, small hi-hat, bare large-cymbal stands, left amp and floor cables;
  remove the three front performers, held instruments, microphone/cable, two
  large cymbal discs and right amp; naturally reconstruct hidden wall/floor.
- **P2 — intact amplifier:** isolate the unbranded right black combo amp,
  front-facing with slight screen-left turn, grey grille, control strip and
  handle; transparent, standing square, no damage or baked motion.
- **P3 — damaged amplifier:** edit P2 in place; preserve silhouette and
  footprint; cave and tear the grille, reveal a split speaker, contain a thin
  smoke curl and tiny sparks inside the box; no flames.
- **P4 — cymbal:** one level brass disc seen from below/front with centred bell
  and lathing; no stand, wing nut, motion or baked rotation.
- **P5a/b/c — performing performers:** isolate each canonical audience-view
  performer with exact identity, costume, held instrument, pose, lighting and
  foot anchor; use the existing Band Mode idle only for costume continuity.
- **P6a/b/c — disarmed performers:** edit the matching P5 frame; preserve
  identity, scale, lighting and exact boot positions; remove the full held
  instrument/strap/cable and give each character a readable empty-handed
  disbelief reaction.
- **P7a/b/c — loose props:** isolate the microphone, cream/teal guitar and
  red/cream bass from their generated performer frames; upright/at-rest,
  transparent, no hands or baked fall motion.
- **P8 — waiter:** one original staff character walking screen-right in
  three-quarter profile, white shirt and black waistcoat/apron, full body and
  level two-drink tray wholly inside 230×430; darker/cooler than the band with
  warm rim; no band styling or branded drinks.
- **P9 — throwing hand:** one first-person brown-skinned right hand/wrist from
  the bottom edge, empty relaxed bottle-neck grip registered at canvas
  (960,960), no bottle. A cleanup edit removed the generated amber aura; the
  clean high-resolution source then had residual alpha values below 32 cleared
  before the runtime resize.

## Reused production art

Crowd Mode continues to reuse these unchanged, with their existing provenance:

- `assets/art/props/beer_bottle.png`
- `assets/art/effects/hit_burst.png`

## Not generated in M31

The four optional slots remain intentionally absent: `audienceForeground`,
`bassistHit`, `vocalistHit`, and `guitaristHit`. The stage plate already carries
the foreground audience, and the existing code-driven recoil/hit flash remains
clear, so they were not worth additional generation cost.

The M28–M30 prose heading originally said “16” required assets, while both its
own enumerated list and `crowdArtSlots.ts` contain 15. M31 corrected the heading
to 15; no slot was removed or silently omitted.
