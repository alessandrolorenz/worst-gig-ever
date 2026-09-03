# Generate Stage Environment Pack

Read `00-style-bible.md` first.

Create separate assets:
1. `assets/art/backgrounds/stage_bg_base.png` — 1920×1080 opaque PNG. View from the drummer at the rear of the stage looking outward across the band positions and audience area toward the venue's far wall. Show a little stage floor at the lower edge, the open audience floor/room, far venue wall/doors/balcony or rough architecture, and overhead/side rigging. Do not depict the backline wall as if the camera were standing in the audience looking at the stage. Keep center/mid-stage clear for separate band and crowd layers. No characters, crowd, drum kit, flying props, HUD.
2. `assets/art/backgrounds/stage_lights_overlay.png` — 1920×1080 transparent PNG. Simple concert beams/glows/spots, overlayable/pulsable by code, never obscuring projectile readability.

Environment should feel funny/rough-around-the-edges rather than glamorous.

Perspective invariant: the camera is the drummer's eyes. The audience will be
overlaid beyond the performers and will face back toward the camera/stage.
