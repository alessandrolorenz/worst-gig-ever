# Pre-release narrative polish — gig payout and next booking

## Scope

The final `SHOW COMPLETE` result for both the official show and a Custom
Setlist show displays a fictional gig payment and says the bar owner booked the
band again. Stage completions and ruined shows display neither.

This is narrative payoff only. It does not add a wallet, balance, currency
inventory, purchase, upgrade, unlock cost, or persistent money field.

## Payout

The final round's existing Groove and Defense scores each add $10 per 1,000
points, capped at $100 per score, to a $200 base payment. The result is therefore
deterministic and bounded from 200 to 400. Beer consumption is not an input.

English presents the fictional value with `$`; pt-BR presents the same numeric
value with `R$`. This is presentation, not exchange-rate conversion. There is
no currency API, locale-pricing system, or claim about real monetary value.

## Result order

1. `SHOW COMPLETE` and its outcome line
2. payout / next-booking illustration
3. Groove / Defense summary and completed-show beer total
4. gig payout
5. next booking
6. first-completion Custom Setlist unlock, when applicable
7. custom setlist played, when applicable
8. actions

The payout is derived again whenever the completed result is rendered and is
not written to `AppFlowState` or `SavedState`.

## Final result surface

Only a successful full show receives the illustration and longer narrative
payoff. Its complete result stack is one vertically scrollable surface bounded
by the existing safe-area screen and overlay padding. The content remains
centered when it fits; when it exceeds the viewport, the same surface scrolls
from the title through the action row so no metric, unlock, setlist, or action
can be clipped permanently. Stage results and failed shows keep their existing
fixed presentation.

The illustration is decorative narrative support, not another screen and not a
source of critical information. It is a 1200 × 675 opaque PNG displayed at
480 × 270 dp. The runtime payout and next-booking text remain visible and
localized in English, pt-BR, and the pseudo locale. No micro-caption is added.

The scene and new bar-owner character are original. Existing production art is
reference-only and remains byte-identical.
