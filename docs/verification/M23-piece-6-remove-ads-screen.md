# M23 piece 6 — the Remove Ads screen, on the emulator

**Date:** 2026-09-22
**Device:** `Pixel_9` emulator, landscape, locale pt-BR
**Build:** debug dev-client, New Architecture on, compileSdk 36
**Store state:** no RevenueCat project, no `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`,
no Play Console product — so the adapter correctly reports `unavailable`
throughout. That is the state this piece was written to render, not a failure.

## Why the emulator was worth using here, having not been before

Every previous milestone recorded the same limitation: no adb input method
reaches the game engine's bubbling play-surface handler, so the emulator cannot
exercise gameplay. The same note always added that **Pressables do receive
taps**.

The Remove Ads screen is nothing but Pressables. It is the first screen in this
project the emulator can drive end to end, so it was driven rather than
reasoned about — which matters more here than usual, because the project's own
history contains a build where every domain test passed while the results
buttons were dead (`project-status.md`, item 17a).

## What was exercised, by tapping

| Step | Expected | Observed |
|---|---|---|
| Title screen | a `REMOVER ANÚNCIOS` entry in the button row | present |
| Tap it | the support screen opens | opens |
| Buy | **absent** — no store price, so nothing to draw it with | absent |
| Privacy choices | **absent** — UMP answers `NOT_REQUIRED` in Brazil | absent |
| Status line | **absent** — nothing has been asked of the store yet | absent |
| Tap Restore | the store-unavailable line, **not** "nothing to restore" | correct line |
| Tap Back | returns to the title | returns |
| Re-open | the previous outcome sentence is gone | cleared |
| Throughout | no crash, no redbox | `logcat` clean — no `FATAL`, no `AndroidRuntime` exception |

**The Restore result is the one worth calling out.** With no API key the
adapter never runs the call, and a restore that never ran and a restore that
ran and found nothing both produce `unavailable`. Piece 5B could not tell them
apart, so the screen would have said "No previous purchase found on this
account" to a device that never asked. `restorePurchases()` now also reports
`completed`, and the emulator showed the right sentence:

> A loja não está disponível neste aparelho agora, então não há o que comprar
> por aqui.

## One defect the emulator found, which no test would have

The body is a `ScrollView`, and a `ScrollView` in a centred flex column grows
to fill it. The first render put the heading hard against the top of the screen
and the buttons hard against the bottom, with an empty third of the screen
between them — on a surface holding two sentences.

The layout budget test passed the whole time and was right to: the content
*fits*, which is all it measures. Nothing in the repository measures whether a
screen looks composed.

Fixed with `flexGrow: 0` on `removeAdsScroll`. The briefing card uses the same
`flexShrink: 1` pattern and never showed this, because its content is tall
enough to fill the space it was taking anyway.

## Automated gate at the same commit

- `npm run verify` — pass. **665 tests**, type-check, lint, and every art,
  provenance, tempo, library and monetization gate.
- `git diff --check` — pass.
- `npx expo export --platform web` — **pass, and it did not before**. See the
  2026-09-22 amendment in the spec: the web export had been failing since piece
  5A on a native-only import inside the ads SDK, and nothing in the repository
  could have reported it because the verification suite does not export web.
- `npm run build:release` — pass. Release APK 195 MB,
  `PASS_ANDROID_PERMISSIONS`, `com.android.vending.BILLING` present and
  attributed to the Billing Library.

## What this does not establish

**No purchase has been made.** Everything above runs against an adapter with no
API key, so the paths that matter commercially are untouched: a product loading
with a Play-formatted price, a purchase succeeding, ads actually disappearing,
pending, cancellation, already-owned, and the destructive
reinstall-and-restore case. ADR 0015 §"Still open" lists them and is unchanged
by this piece.

Those need the RevenueCat project, the Play Console product, and an internal
test track — a one-time product cannot be purchased from a locally-signed APK.
They remain an external gate.

**The `owned` state has never been rendered.** Its copy, its colour and its
dropping of the Buy button are asserted in tests and have not been seen on a
screen, because nothing can grant the entitlement yet.
