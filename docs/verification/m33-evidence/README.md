# M33 visual evidence

Captured: 2026-11-04, production web export (`npx expo export --platform web`),
headless Chromium, pt-BR, at **784x384 dp**, the owner's Galaxy S23 FE with
three-button navigation (derived from the playtest screenshot; see
`tests/crowdHudLayout.test.ts`). Zero page errors in every run. The same walk
was also run at 923x411 with the same result.

| File | What it shows |
|---|---|
| `web-s23fe-crowd-stage3-checklist.png` | Destroy the Gig: nine objectives, five in each bottom corner with "Spare the waiter" last on the right. Bassist, vocalist and guitarist unobstructed. |
| `web-s23fe-crowd-warmup-ticked.png` | Warm-up after a real swipe hit on the vocalist: the row ticked green and struck through in the right corner. The swipe started at the bottle and was not intercepted. |
| `web-s23fe-band-stage3-briefing-off.png` | Stage 3 briefing with Follow the beat off (the default): the beat-free bullets and the switch between Start and Back. |
| `web-s23fe-band-stage3-playing-off.png` | Stage 3 playing with it off: no pad, no Groove readout, the Stage 1 HUD. |
| `web-s23fe-band-stage3-paused-switched-on.png` | Paused after four seconds with it off, then switched on: the Groove column appears at 0/0, so the beats played while off were not counted. Two button rows fit. |
| `web-s23fe-band-stage3-playing-on.png` | Resumed: the pad and the Groove readout are back. |

Not captured: Android emulator or physical device.
