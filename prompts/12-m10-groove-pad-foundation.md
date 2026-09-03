# Execute M10 — Visual Beat Clock & Groove Pad Foundation

Read M10, rhythm architecture, current round/input/rendering architecture, and current tests.

Implement the smallest clean foundation.

Requirements:

1. Add config-driven 90 BPM visual beat clock with 2-beat count-in.
2. Add pure rhythm state/judgement logic.
3. Add one configured Groove Pad aligned to an existing cymbal.
4. Render its pulse from gameplay elapsed time.
5. Reuse the existing surface input pipeline; do not add nested Pressables.
6. Do not change bottle/target rules.
7. Rhythm missed beats do not touch Show Integrity.
8. Beat clock continues through vocalist event and freezes on pause.
9. Do not synchronize with audio.
10. Add strong deterministic tests.

Run `docs/verification/M10-gate.md`.

If green, local commit:

`feat: add M10 visual groove pad foundation`

Do not push.
