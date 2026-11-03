# Crowd Mode — Visual Asset Contract

Recorded: 2026-10-07 · Milestones: M28–M31 · Status: **all required M31 art integrated**

This is the production brief for every image Crowd Mode needs. It is written
for an image-capable agent who has not seen the M28–M30 work. Gameplay, state,
objectives, difficulty and every animation are finished and tested; what is
left is drawing pictures that fit slots which already exist.

The machine-readable twin of this document is
`game/crowd/crowdArtSlots.ts`. `tests/crowdArtSlots.test.ts` fails if a slot
there is missing from this file, if a delivered file's slot still says
`placeholder`, or if a slot says `integrated` with no file on disk.

---

## 1. Read this first: why the new stage plate was the first asset

Before M31, Crowd Mode borrowed one flat picture as its whole stage: the M15
story still `assets/art/story/04_performance.jpg` (1600x900, stretched to the
1920x1080 canvas). The bassist, vocalist, guitarist, their instruments, the
microphone, both big cymbals and the right-hand amplifier were **painted into
that one image**.

A flat picture cannot lose a guitar. So today a destroyed prop is faked: a
dark "knockout" patch is drawn over the painted original and a code-drawn
shape falls to the floor. A disarmed guitarist still visibly holds a guitar
under the patch.

M31 split that picture into these production layers:

```text
crowd_stage_plate.jpg      the room, the drummer and kit, the audience — nothing destructible
 + amplifier               its own sprite, two frames
 + cymbal                  one sprite, drawn twice
 + three performers        two frames each: holding / not holding
 + three loose instruments microphone, guitar, bass — what falls
 + waiter, throwing hand
```

Everything destructible is now **absent from the plate** and delivered as its
own transparent sprite. The detailed entries below remain the production
contract used to validate those files.

## 2. Visual truth

Do not redesign the game. These existing files are the reference; new art
must look like it was cut from them.

| Reference | What it is the truth for |
|---|---|
| `assets/art/story/04_performance.jpg` | **Primary.** Camera, venue, lighting, every character's design, pose, scale and position, as seen from the crowd. |
| `design-reference/intro-performance/band-performance-audience-v1.png` | The 1672x941 source render of that still, with its generation notes in the sibling `README.md`. Use as the image reference when generating. |
| `assets/art/band/*.png` | The same three characters in Band Mode. Seen from **behind** (drummer's view), so use them for costume, colour and proportion only — never for pose or facing. |
| `assets/art/props/beer_bottle.png`, `assets/art/effects/hit_burst.png` | Outline weight and highlight style for small props and effects. Both are reused unchanged in Crowd Mode. |
| `docs/specs/M6-art-direction-lock.md` | The written tone and palette lock. |
| `docs/verification/m28-m30-evidence/*.png` | What Crowd Mode looks like today, state by state (section 8). |

Consistency required of every new asset:

- **Outline:** dark, slightly uneven ink outline, heavier on the silhouette
  than on interior detail, as in the still.
- **Exaggeration:** cartoon proportions exactly as the still draws each
  character — big heads and hands, chunky boots. Funny, not grotesque.
- **Shading:** painterly cel shading, two to three tones per colour, warm rim
  light. No photorealism, no flat vector fills.
- **Palette:** charcoal, blue-black and deep purple room; saturated magenta,
  amber, teal and electric blue accents.
- **Lighting:** stage cans overhead. Amber from upper-left and upper-right,
  blue and magenta from upper-centre. Light falls from above and slightly
  behind the band; faces are lit from above.
- **Texture:** the still's light grain. No halftone, no pixel art.
- **Perspective:** see section 3.

Never, in any asset (AGENTS.md rule 12): real band names or logos, celebrity
likenesses, album art, recognisable alcohol branding, or any readable text.

## 3. Shared conventions

These apply to every asset unless its entry says otherwise.

| Field | Value |
|---|---|
| Reference canvas | 1920x1080 landscape. All boxes below are in canvas pixels. |
| Scene perspective | The player stands in the crowd, centre, a few rows back. Eye level is about stage-floor height, looking slightly up at the band. Frontal, no dutch angle. |
| Delivered size | Exactly the slot's box size in pixels (1 file px = 1 canvas px). Keep a larger source render under `design-reference/crowd-mode/`. |
| Background | Transparent PNG, straight alpha, no matte fringe — except the stage plate, which is an opaque JPEG. |
| Padding | The drawn subject fills its box edge to edge on at least one axis. No decorative margin: boxes are placed by the numbers here. |
| Directory | `assets/art/crowd_mode/` — a new directory. |
| Baked shadows | None, apart from a soft contact shadow directly under a standing figure's feet. |
| Hitboxes | Never derived from art. They live in `game/crowd/crowdConfig.ts` and do not change when art arrives (AGENTS.md rule 17). Draw to the box; do not ask for the hitbox to move. |
| Provenance | Record every delivered file in a new `docs/assets/CROWD-MODE-ART-PROVENANCE.md`, from `docs/assets/ART-PROVENANCE-TEMPLATE.md` (AGENTS.md rule 13). |

**Must never be overwritten or edited:** anything under `assets/art/story/`,
`assets/art/band/`, `assets/art/backgrounds/`, `assets/art/crowd/`,
`assets/art/drums/`, `assets/art/props/`, `assets/art/effects/`,
`assets/art/results/` or `assets/art/ui/`. Band Mode and the opening story
use them. Crowd Mode art is new files in a new directory.

### What code does, so the art must not

| Motion | Applied to | Exactly |
|---|---|---|
| Wobble | cymbals | rotate ±12° about the box centre, four full swings over 700 ms |
| Fall | cymbals, microphone, guitar, bass | over 520 ms: translate x by `fall.dx`, y by `fall.dy` (accelerating), rotate to `fall.rotateDeg`; then it stays there |
| Shake | damaged amplifier | ±9 px horizontal, decaying over 450 ms |
| Recoil | a hit performer | up 14 px and tilt 4°, out and back over 600 ms |
| Crossing | waiter | linear left to right, off-canvas to off-canvas |
| Step | waiter | lifts up to 6 px off the floor line and back, twelve steps per crossing; never sinks below it (M32) |
| Ground and marks | waiter | code-drawn floor shadow, a struck-out red disc over his head, and a red wash of his own sprite while a hit on him is shown (M32) |
| Scale | the one cymbal sprite | drawn at 165x90 for the ride and 140x90 for the crash |

Fall offsets per target (`crowdConfig.ts`, `fall`): microphone
`dx -90, dy 330, rotate -115°`; crash `70, 400, 160°`; ride `-60, 420, -150°`;
guitar `-150, 215, -70°`; bass `150, 150, 65°`.

Consequence: every prop is **one upright, at-rest image**. No motion blur,
no tilted or mid-fall variants, no "wobble" frames.

### Paint order

`0` plate → `10` amplifier → `11` cymbals → `20–21` performers → `30` loose
instruments → `40` waiter → `45` audience foreground (optional) → `50`
throwing hand → bottle, burst, HUD.

---

## 4. Required assets (15)

Each entry's heading is the slot id in `crowdArtSlots.ts`.

### `stagePlate`

| Field | Value |
|---|---|
| Suggested filename | `crowd_stage_plate.jpg` |
| Purpose | The whole stage and room with nothing destructible in it. |
| Gameplay state | Always shown. |
| Current placeholder | The M15 story still, borrowed, with everything painted in. |
| Consumed by | `CrowdStagePlatePlaceholder` in `game/crowd/CrowdPlaceholders.tsx` |
| Replacement point | The `source` of that component's `<Image>`. |
| Reference | `04_performance.jpg` — same room, same camera, same audience. |
| Perspective / facing | Section 3. The drummer faces the camera. |
| Pose / expression | Drummer mid-beat and grinning, as in the still. |
| Transparent | **No.** Opaque JPEG, quality about 85. |
| Box (x, y, w, h) | 0, 0, 1920, 1080 |
| Delivered size | 1920x1080 |
| Anchor | Centre |
| Z-layer | 0 |
| Moves independently | No |
| Code rotation / scale / fall | None |
| Lighting | As the still. |
| Style | Section 2. |
| Must preserve | Brick room, light rig and all eight cans; the drummer and the whole drum kit **including both cymbal stands and the small hi-hat**; the left amplifier half-hidden at the far left; floor cables; the entire foreground audience; the position of all of it. Scale the still by exactly 1.2 — do not recompose. |
| Must change | Remove the bassist, vocalist and guitarist; the bass, guitar and microphone with its cable; the **two large cymbal discs** (leave the bare stand tops at canvas (885, 285) and (1292, 275)); the right-hand amplifier at canvas (1700, 480)–(1880, 710). Paint in the wall, floor and kit that were behind them. |
| Must not include | Any removed item, any ghost or shadow of one, any text. |
| State transition | None. |

### `amplifierIntact`

| Field | Value |
|---|---|
| Suggested filename | `amplifier_intact.png` |
| Purpose | The right-hand amplifier, undamaged. |
| Gameplay state | `stageProps.amplifier.status === 'intact'` |
| Current placeholder | None drawn — the amplifier painted into the still shows through. |
| Consumed by | `CrowdAmplifierPlaceholder` (`damaged={false}` currently returns `null`) |
| Replacement point | That component's `!damaged` branch. |
| Reference | The right amplifier in `04_performance.jpg`. |
| Perspective / facing | Front face toward the camera, turned very slightly to screen-left. |
| Pose / expression | Standing square on the floor. |
| Transparent | Yes |
| Box | 1700, 480, 180, 230 |
| Delivered size | 180x230 |
| Anchor | Bottom centre |
| Z-layer | 10 |
| Moves independently | No |
| Code rotation / scale / fall | None |
| Lighting | Amber key from upper-left. |
| Must preserve | Black tolex cabinet, grey grille cloth, top handle and control strip, as in the still. |
| Must change | Nothing. |
| Must not include | A brand badge or any lettering. |
| State transition | Swapped for `amplifierDamaged` on the first hit. |

### `amplifierDamaged`

| Field | Value |
|---|---|
| Suggested filename | `amplifier_damaged.png` |
| Purpose | The same amplifier, wrecked. An objective's "done" picture. |
| Gameplay state | `stageProps.amplifier.status === 'damaged'` (permanent until retry) |
| Current placeholder | A dark panel with a red border and two red cracks. |
| Consumed by | `CrowdAmplifierPlaceholder` (`damaged={true}`) |
| Replacement point | That component's `damaged` branch. |
| Reference | `amplifierIntact`, pixel-registered to it. |
| Perspective / facing | Identical to `amplifierIntact`. |
| Pose / expression | Still standing, same footprint; the cabinet may sag a few degrees. |
| Transparent | Yes |
| Box | 1700, 480, 180, 230 |
| Delivered size | 180x230 |
| Anchor | Bottom centre |
| Z-layer | 10 |
| Moves independently | No |
| Code rotation / scale / fall | Shake only (section 3). Does not fall. |
| Lighting | As intact, plus a small warm spark glow. |
| Must preserve | Silhouette and footprint of the intact frame, so the swap does not jump. |
| Must change | Torn, caved-in grille; a split speaker cone visible; a thin curl of smoke and a spark or two staying inside the box. |
| Must not include | Flames, or smoke leaving the box. |
| State transition | Terminal. |

### `cymbal`

| Field | Value |
|---|---|
| Suggested filename | `cymbal.png` |
| Purpose | One cymbal disc, used for both the crash and the ride. |
| Gameplay state | Every status of `crashCymbal` and `rideCymbal`: `intact`, `wobbling`, `falling`, `down`. |
| Current placeholder | Nothing while intact (painted in); a flat gold ellipse once hit. |
| Consumed by | `CrowdCymbalPlaceholder` |
| Replacement point | The body of that component. |
| Reference | The two large cymbals in `04_performance.jpg`. |
| Perspective / facing | Seen from below and in front: a wide, thin ellipse, underside visible. |
| Pose / expression | Level, at rest. |
| Transparent | Yes |
| Box | Ride 1210, 230, 165, 90 · Crash 815, 240, 140, 90 |
| Delivered size | 165x90 |
| Anchor | Centre (the bell, where it sits on the stand) |
| Z-layer | 11 |
| Moves independently | Yes |
| Code rotation | Yes — wobble, then the fall rotation |
| Code scale | Yes — drawn at 140x90 for the crash |
| Fall in code | Yes |
| Lighting | Top-lit; bright rim along the upper edge. |
| Must preserve | Brass colour and lathing lines of the still's cymbals. |
| Must change | Nothing. |
| Must not include | The stand, the wing nut, a drumstick, or motion lines. Disc only. |
| State transition | intact → wobbling (700 ms) → falling (520 ms) → down. One image throughout. |

### `bassistPerforming`

| Field | Value |
|---|---|
| Suggested filename | `bassist_performing.png` |
| Purpose | The bassist as in the still, bass in hand. |
| Gameplay state | `performers.bassist.armed` |
| Current placeholder | None drawn — painted into the still. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` in `CrowdScene.tsx` |
| Replacement point | Section 7, step 4. |
| Reference | The bassist in `04_performance.jpg`; costume from `assets/art/band/bassist_idle.png`. |
| Perspective / facing | Facing the crowd, body angled slightly to screen-right. |
| Pose / expression | Wide low stance, scowling, playing. Exactly the still's pose. |
| Transparent | Yes |
| Box | 130, 180, 570, 600 |
| Delivered size | 570x600 |
| Anchor | Bottom centre (between the boots) |
| Z-layer | 20 |
| Moves independently | No |
| Code rotation | Yes — the 4° recoil when hit |
| Code scale / fall | No |
| Lighting | Amber from upper-left. |
| Must preserve | Hair bun, teal vest over orange shirt, purple cargo trousers, yellow boots, wristband; the red bass with cream pickguard, its neck reaching the box's upper-right. |
| Must change | Nothing. The instrument is **painted into this frame** — one image, no separate hand layer. |
| Must not include | The amplifier behind them, stage floor, cables. |
| State transition | → `bassistDisarmed` when the `bass` target is hit. |

### `bassistDisarmed`

| Field | Value |
|---|---|
| Suggested filename | `bassist_disarmed.png` |
| Purpose | The bassist a moment after the bass is knocked away. |
| Gameplay state | `!performers.bassist.armed` (permanent until retry) |
| Current placeholder | The painted bassist with a dark patch over the bass body. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Replacement point | Section 7, step 4. |
| Reference | `bassistPerforming` — same character, same feet. |
| Perspective / facing | As performing. |
| Pose / expression | Feet planted exactly where they were; empty hands thrown wide; furious and disbelieving. |
| Transparent | Yes |
| Box | 130, 180, 570, 600 (identical, so the swap does not jump) |
| Delivered size | 570x600 |
| Anchor | Bottom centre |
| Z-layer | 20 |
| Moves independently | No |
| Code rotation | Yes — recoil |
| Code scale / fall | No |
| Lighting | As performing. |
| Must preserve | Boots at the same pixels as `bassistPerforming`; head size; costume. |
| Must change | No bass, no strap; both hands empty. |
| Must not include | Any part of the bass. It is `bassProp`, already on the floor. |
| State transition | Terminal for the round. Recoils on each direct hit. |

### `vocalistPerforming`

| Field | Value |
|---|---|
| Suggested filename | `vocalist_performing.png` |
| Purpose | The singer as in the still, microphone at the mouth. |
| Gameplay state | `performers.vocalist.armed` |
| Current placeholder | None drawn — painted into the still. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Replacement point | Section 7, step 4. |
| Reference | The vocalist in `04_performance.jpg`; costume from `assets/art/band/vocalist_idle.png`. |
| Perspective / facing | Facing the crowd, leaning toward it. |
| Pose / expression | Wide lunge, snarling into the microphone, free hand reaching at the crowd. |
| Transparent | Yes |
| Box | 555, 170, 500, 740 |
| Delivered size | 500x740 |
| Anchor | Bottom centre |
| Z-layer | 21 (in front of the other two) |
| Moves independently | No |
| Code rotation | Yes — recoil |
| Code scale / fall | No |
| Lighting | Blue and magenta from above. |
| Must preserve | Teal mohawk with shaved side, yellow studded vest over magenta top, black jeans with the magenta patch, white strapped boots. The microphone head must sit at canvas (733, 396) — that is where it is hit. |
| Must change | Nothing. Microphone and a short length of cable are painted into this frame. |
| Must not include | A microphone stand. This band has none. |
| State transition | → `vocalistDisarmed` when the `microphone` target is hit. |

### `vocalistDisarmed`

| Field | Value |
|---|---|
| Suggested filename | `vocalist_disarmed.png` |
| Purpose | The singer with the microphone gone. |
| Gameplay state | `!performers.vocalist.armed` |
| Current placeholder | The painted singer with a dark patch over the microphone hand. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Replacement point | Section 7, step 4. |
| Reference | `vocalistPerforming`. |
| Perspective / facing | As performing. |
| Pose / expression | Same lunge and boots; the microphone hand open and empty near the mouth; staring at it, mid-word. |
| Transparent | Yes |
| Box | 555, 170, 500, 740 |
| Delivered size | 500x740 |
| Anchor | Bottom centre |
| Z-layer | 21 |
| Moves independently | No |
| Code rotation | Yes — recoil |
| Code scale / fall | No |
| Lighting | As performing. |
| Must preserve | Boots at the same pixels; costume; hair. |
| Must change | No microphone, no cable. |
| Must not include | The microphone anywhere in frame. |
| State transition | Terminal for the round. |

### `guitaristPerforming`

| Field | Value |
|---|---|
| Suggested filename | `guitarist_performing.png` |
| Purpose | The guitarist as in the still, guitar in hand. |
| Gameplay state | `performers.guitarist.armed` |
| Current placeholder | None drawn — painted into the still. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Replacement point | Section 7, step 4. |
| Reference | The guitarist in `04_performance.jpg`; costume from `assets/art/band/guitarist_idle.png`. |
| Perspective / facing | Facing the crowd, head thrown back to screen-right. |
| Pose / expression | Tall, loose, eyes shut, lost in a solo. |
| Transparent | Yes |
| Box | 1330, 75, 495, 755 |
| Delivered size | 495x755 |
| Anchor | Bottom centre |
| Z-layer | 20 |
| Moves independently | No |
| Code rotation | Yes — recoil |
| Code scale / fall | No |
| Lighting | Blue from above, amber rim from upper-right. |
| Must preserve | Orange quiff, blue jacket over purple shirt, magenta checked trousers, teal boots; cream guitar with teal pickguard, headstock reaching the box's upper-right. |
| Must change | Nothing. The guitar is painted into this frame. |
| Must not include | The amplifier or the doorway behind. |
| State transition | → `guitaristDisarmed` when the `guitar` target is hit. |

### `guitaristDisarmed`

| Field | Value |
|---|---|
| Suggested filename | `guitarist_disarmed.png` |
| Purpose | The guitarist with the guitar gone. |
| Gameplay state | `!performers.guitarist.armed` |
| Current placeholder | The painted guitarist with a dark patch over the guitar body. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Replacement point | Section 7, step 4. |
| Reference | `guitaristPerforming`. |
| Perspective / facing | Facing the crowd; head now snapped forward. |
| Pose / expression | Same feet; hands still shaped around a guitar that is not there; eyes open, appalled. |
| Transparent | Yes |
| Box | 1330, 75, 495, 755 |
| Delivered size | 495x755 |
| Anchor | Bottom centre |
| Z-layer | 20 |
| Moves independently | No |
| Code rotation | Yes — recoil |
| Code scale / fall | No |
| Lighting | As performing. |
| Must preserve | Boots at the same pixels; costume; hair. |
| Must change | No guitar, no strap. |
| Must not include | Any part of the guitar. |
| State transition | Terminal for the round. |

### `microphoneProp`

| Field | Value |
|---|---|
| Suggested filename | `microphone_prop.png` |
| Purpose | The handheld microphone once it leaves the singer's hand. |
| Gameplay state | `stageProps.microphone.status` is `falling` or `down` |
| Current placeholder | A dark capsule on a grey stub. |
| Consumed by | `CrowdMicrophonePlaceholder` |
| Replacement point | The body of that component. |
| Reference | The microphone in the singer's hand in `04_performance.jpg`. |
| Perspective / facing | Upright, head at the top. |
| Pose / expression | — |
| Transparent | Yes |
| Box | 683, 346, 100, 100 |
| Delivered size | 100x100 |
| Anchor | Centre |
| Z-layer | 30 |
| Moves independently | Yes |
| Code rotation | Yes |
| Code scale | No |
| Fall in code | Yes — lands near canvas (643, 726) |
| Lighting | Neutral top light; it tumbles, so no strong directional shading. |
| Must preserve | Black mesh ball head, dark body, as in the still. |
| Must change | A hand's length of loose cable from the base. |
| Must not include | A hand, a stand, motion lines. |
| State transition | Appears on the hit, falls 520 ms, stays down. |

### `guitarProp`

| Field | Value |
|---|---|
| Suggested filename | `guitar_prop.png` |
| Purpose | The guitar once knocked out of the guitarist's hands. |
| Gameplay state | `stageProps.guitar.status` is `falling` or `down` |
| Current placeholder | A cream rounded block with a brown bar for a neck. |
| Consumed by | `CrowdInstrumentPlaceholder` (`kind="guitar"`) |
| Replacement point | That component's `guitar` branch. |
| Reference | The guitar in `04_performance.jpg`. |
| Perspective / facing | Front of the body to the camera; body lower-left, neck rising to the upper-right — the angle it is held at in the still. |
| Pose / expression | — |
| Transparent | Yes |
| Box | 1435, 230, 380, 340 |
| Delivered size | 380x340 |
| Anchor | The body, at 25% across and 70% down the box |
| Z-layer | 30 |
| Moves independently | Yes |
| Code rotation | Yes |
| Code scale | No |
| Fall in code | Yes |
| Lighting | Neutral top light. |
| Must preserve | Cream offset body, teal pickguard, maple neck, six-in-line headstock. Registered so that, drawn at its box, it overlays the guitar in `guitaristPerforming`. |
| Must change | A broken strap may trail from it. |
| Must not include | Hands or arms. |
| State transition | Appears on the hit, falls 520 ms, stays down. |

### `bassProp`

| Field | Value |
|---|---|
| Suggested filename | `bass_prop.png` |
| Purpose | The bass once knocked out of the bassist's hands. |
| Gameplay state | `stageProps.bass.status` is `falling` or `down` |
| Current placeholder | A red rounded block with a brown bar for a neck. |
| Consumed by | `CrowdInstrumentPlaceholder` (`kind="bass"`) |
| Replacement point | That component's `bass` branch. |
| Reference | The bass in `04_performance.jpg`. |
| Perspective / facing | Body lower-left, neck rising to the upper-right, as held in the still. |
| Pose / expression | — |
| Transparent | Yes |
| Box | 220, 330, 475, 330 |
| Delivered size | 475x330 |
| Anchor | The body, at 25% across and 70% down the box |
| Z-layer | 30 |
| Moves independently | Yes |
| Code rotation | Yes |
| Code scale | No |
| Fall in code | Yes |
| Lighting | Neutral top light. |
| Must preserve | Red body, cream pickguard, long dark fretboard, four tuners. Registered to the bass in `bassistPerforming`. |
| Must change | A broken strap may trail from it. |
| Must not include | Hands or arms. |
| State transition | Appears on the hit, falls 520 ms, stays down. |

### `waiter`

| Field | Value |
|---|---|
| Suggested filename | `waiter.png` |
| Purpose | The one thing the player must not hit: a bar waiter crossing the front of the stage with a tray of drinks. Costs 300 points. |
| Gameplay state | `crowdBlockerPose(elapsedMs, stage.waiter).visible` |
| Current placeholder | A blocky figure in a white shirt and black vest carrying a tray with two glasses. |
| Consumed by | `CrowdWaiterPlaceholder` |
| Replacement point | The body of that component. |
| Reference | Rendering style from `04_performance.jpg`. A new character: no existing reference. |
| Perspective / facing | **Walking to screen-right, in three-quarter profile.** Not facing the camera, not a portrait. |
| Pose / expression | Mid-stride, tray held high and level at shoulder height, eyes fixed on the tray, harried and determined. |
| Transparent | Yes |
| Box | File is 230x430. Since M32 it is drawn at 334x624 (uniform scale), centred on the hit rect and standing on its feet line at y = 870 — see `crowdWaiterDrawRect`. The hit rect is 230 wide, y = 255–870, and runs from x = −290 to 1980. |
| Delivered size | 230x430 |
| Anchor | Bottom centre |
| Z-layer | 40 — in front of the band and every prop |
| Moves independently | Yes |
| Code rotation / scale | No |
| Fall in code | No. Crossing and bob are code (section 3). |
| Lighting | Lit from above and behind by the stage: darker and cooler than the band, with a warm rim. He is nearer the crowd than they are. |
| Must preserve | The whole figure **and the whole tray inside the 230x430 box** — the box is exactly what is penalised, so nothing may hang outside it. |
| Must change | Read as staff at a glance and as *not the band*: white shirt, black waistcoat or apron, neat hair; no mohawk, studs, or band colours. |
| Must not include | Branded glasses or bottles, text on the apron, a second frame, a turned-around variant. |
| State transition | None. One static image; a single frame plus the code bob is the whole animation. Ask for walk frames only if this reads badly on a device. |

### `throwHand`

| Field | Value |
|---|---|
| Suggested filename | `throw_hand.png` |
| Purpose | The player's own hand, holding the waiting bottle. |
| Gameplay state | `phase` is `ready` or `aiming` |
| Current placeholder | A flat skin-toned oval rising from the bottom edge. |
| Consumed by | `CrowdThrowHandPlaceholder` |
| Replacement point | The body of that component (its style currently positions it; use the box below instead). |
| Reference | Hands of the foreground audience in `04_performance.jpg`. |
| Perspective / facing | First person: back of a right hand and wrist, rising from the bottom edge, fingers curled as if round a bottle neck. |
| Pose / expression | Relaxed grip. |
| Transparent | Yes |
| Box | 860, 880, 300, 200 |
| Delivered size | 300x200 |
| Anchor | Bottom centre; the grip sits at canvas (960, 960) |
| Z-layer | 50 — **behind** the bottle sprite |
| Moves independently | No |
| Code rotation / scale / fall | None |
| Lighting | Dim and backlit, like the audience. |
| Must preserve | Room for the existing bottle (118x236, centred at (960, 910)) to sit in the grip. |
| Must change | — |
| Must not include | The bottle. `assets/art/props/beer_bottle.png` is drawn over the hand and is reused unchanged. |
| State transition | Hidden while a bottle is in the air. |

---

## 5. Optional assets (4)

Not needed for a complete art pass. Code already covers these states.

### `audienceForeground`

| Field | Value |
|---|---|
| Suggested filename | `audience_foreground.png` |
| Purpose | The front rows as their own layer, so the waiter passes *behind* raised fists. |
| Gameplay state | Always, if delivered. |
| Current placeholder | None — the audience is part of the plate. |
| Consumed by | Nothing yet. Add one `<Image>` in `CrowdScene.tsx` after `<Waiter />`. |
| Reference | The foreground audience of `04_performance.jpg`. |
| Transparent | Yes |
| Box | 0, 660, 1920, 420 |
| Delivered size | 1920x420 |
| Anchor | Bottom centre |
| Z-layer | 45 |
| Code-driven | Nothing |
| Must preserve | Pixel registration with the audience already in `stagePlate`. |
| Must not include | Anything above y = 660. |
| Note | If delivered, the plate may keep its own audience underneath. |

### `bassistHit`, `vocalistHit`, `guitaristHit`

| Field | Value |
|---|---|
| Suggested filenames | `bassist_hit.png`, `vocalist_hit.png`, `guitarist_hit.png` |
| Purpose | A flinch frame for the 600 ms after a direct hit. |
| Gameplay state | `performers.<id>.reacting` |
| Current placeholder | A translucent red flash over the performer, plus the code recoil. |
| Consumed by | `CrowdPerformerPlaceholder` via `Performer` |
| Reference | That performer's `Disarmed` frame. |
| Pose / expression | Flinching from a bottle to the head, eyes screwed shut. **Hands empty.** |
| Transparent | Yes |
| Box | Identical to that performer's other frames |
| Anchor | Bottom centre |
| Z-layer | As that performer |
| Code-driven | Recoil |
| Caveat | A performer can be hit while still holding their instrument. A single hands-empty hit frame would make the instrument vanish for 600 ms. Either show this frame only when `!armed` and keep the code recoil otherwise, or do not make it. Without these three files the recoil plays on whichever frame is current, which is always correct. |

---

## 6. Assets deliberately not requested

- **Cymbal hit, wobble and fallen frames** — one disc, transformed in code.
- **A microphone stand** — the band in the reference has none; the target is
  the handheld microphone.
- **Falling or broken instruments** — one image each, tumbled in code.
- **Walk-cycle frames for the waiter** — one image and a bob.
- **A drummer sprite** — the drummer is not a target and stays in the plate.
- **Target markers, the aim-guide dots, the checklist and the result
  screen** — interface, drawn in code, not art.
- **A destroyed-stage background** — the destruction is the sum of the layers.
- **A stage-light target** — not a target in M28–M30.

---

## 7. Integration order

Each step leaves the game runnable and `npm run verify` green.

1. **Plate, amplifier and cymbal together.** A clean plate with nothing over
   it would show an empty stage, so these three arrive in one change.
   In `CrowdScene.tsx`, `propArt` returns `null` for an intact prop because
   the still shows it; with a clean plate, draw the sprite in every state.
2. **Delete `CrowdKnockoutPatch`** and its use in `StageProp`. It only exists
   to hide painted-in art.
3. **Loose instruments:** `microphoneProp`, `guitarProp`, `bassProp`.
4. **Performers.** `Performer` in `CrowdScene.tsx` is positioned at the hit
   rect because all it draws today is a flash. Position it at the slot `box`
   instead and pick the frame from `crowdPerformerPose(...).base`
   (`'performing'` or `'disarmed'`). All six frames arrive together with the
   plate that no longer contains the band.
5. **Waiter and throwing hand** — independent of everything else.
6. For every file: add its `require` to a new `game/crowd/crowdArt.ts`
   (mirroring `game/rendering/artAssets.ts`), swap the placeholder's body,
   and set the slot's `status` to `'integrated'` in `crowdArtSlots.ts`.
7. Never edit `crowdConfig.ts` rects, `crowdState.ts`, or `crowdStages.ts`
   to make art fit. If art cannot fit a box, change the box in
   `crowdArtSlots.ts` and say so in the provenance file.

Steps 1 and 4 both need the clean plate. If the plate is delivered before the
performers, keep the story still until both are ready.

## 8. Reference screenshots

Captured from the web build at 1280x720 on 2026-10-07. They show
**placeholder** art and exist to show state, position and scale — not style.

| File in `docs/verification/m28-m30-evidence/` | Shows |
|---|---|
| `web-stage1-initial.png` | Start of a round: every prop intact, target brackets, checklist, bottle and hand. |
| `web-stage1-waiter-crossing.png` | The waiter's size and height against the band. |
| `web-stage1-waiter-hit.png` | The penalty moment. |
| `web-singer-microphone-down.png` | Singer disarmed; microphone on the floor. |
| `web-stage1-partially-destroyed.png` | Microphone and crash down, amplifier wrecked. |
| `web-stage1-singer-hit.png` | A direct performer hit, mid-recoil. |
| `web-guitarist-disarmed.png` | Guitar knocked loose and where it lands. |
| `web-bassist-disarmed.png` | Bass knocked loose and where it lands. |
| `web-stage2-all-objectives-completed.png` | The most destroyed the stage gets on stage 2. |
| `web-stage1-result-success.png` | Result screen over the wrecked stage. |
| `web-ptbr-stage3-initial.png` | Stage 3, all nine targets bracketed, in Portuguese. |
| `web-crowd-stage-select.png`, `web-ptbr-stage-select.png`, `web-ptbr-stage3-result-failure.png` | Interface only. |
