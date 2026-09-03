# V2 Proof Shared Style Bible

Use case: `stylized-concept`

Game: **Worst Gig Ever**, a humorous drummer-POV mobile arcade game.

Camera/orientation contract: the drummer and camera are behind the band. All
ambient performer frames (`idle`, `loopA`, and `loopB`) face the audience in a
rear three-quarter stage-performance view. Reactions and dodges preserve that
audience-facing orientation unless a state explicitly says otherwise. The only
MVP exception is the vocalist `blocking` state, which turns back toward the
drummer/camera as part of the gag.

Direction: **Stylized Punk Arcade Cartoon**.

Use confident outer contours, simplified anatomy, large readable color areas,
medium internal detail, a single cel-shadow tone, sparse texture, expressive
fictional faces, clear hands and instruments, and slightly exaggerated arcade
proportions. Preserve character personality and humor.

Palette: dark charcoal and deep purple foundation; saturated magenta, amber,
teal, electric blue, orange, and acid-green accents. Separate neighboring
subjects by value as well as hue.

Phone-size test: hair, face, instrument, hands, major clothing blocks, and pose
must still read when the full character is approximately 260 pixels tall.

Avoid photorealism, comic-book cross-hatching, dense anatomy rendering,
micro-folds, tiny seams, many individual hair strands, realistic skin pores,
complex painted lighting, generic corporate flat vector art, pure silhouettes,
faceless figures, logos, trademarks, readable branding, text, celebrity or
real-musician likenesses, gore, watermark, and baked checkerboard backgrounds.

**Always render on one flat warm-gray studio card — including production
assets.** Do not ask the generator for transparency: chat image generators
return RGB and answer a transparency request with a painted checkerboard, which
is exactly what wrecked the first proof run. Alpha is cut from the card
afterwards by `scripts/condition-art.mjs`.

For that cut to be clean the card must be uniform: even lighting, no gradient,
no vignette, no cast shadow, no ground plane, and no scenery. Keep a generous
even margin around the subject.

Proof images live under `design-reference/m14-v2-proof/` and are not runtime
assets. Do not overwrite `assets/art/` before owner approval.
