# M21 — Brazilian Portuguese

**Status:** draft translation implemented, 2026-09-05, on `m21/pt-br`.
**The translation itself is not accepted until the owner has read it.**
**Parent:** `docs/specs/V2-plan.md`, "M21 — pt-BR".
**Depends on:** M19 (the catalogue) and M20 (the layout that can hold it), both
done and emulator-validated.

## The one thing to be clear about

The V2 plan says *"Do not machine-translate and ship"*, and its open question 3
recommends the **owner** writes these lines, "because the jokes are the
product". It also says: "If it is me, the lines need reviewing rather than
accepting."

That is the status of this milestone. The engineering is finished and tested.
The **words are a draft** — written rather than generated, with the voice taken
seriously, and every line where the joke had to be re-invented instead of
translated is marked `REVIEW:` in `game/i18n/catalogues/pt-BR.ts`.

A translation that is correct and not funny is worse than English. Nobody but
the owner can tell which of these are which.

## The lines that need a verdict first

| English | pt-BR | Why it is not a translation |
|---|---|---|
| *"You kept the groove alive. Somehow."* | *"Você manteve o groove vivo. Sabe-se lá como."* | "Somehow" is the whole joke. *"Sabe-se lá como"* is the deadpan equivalent; *"de alguma forma"* is correct and flat |
| *"The gig fell apart."* | *"O show desandou."* | *Desandar* is what a Brazilian says when something that was working comes apart — a recipe, a party, a plan |
| *"You can hold the line."* | *"Você aguenta o tranco."* | The idiom for taking a beating and staying up, which is what the stage proved |
| *"Hold the line"* (stage 1) | *"Segure as pontas"* | Literally "hold the ends" — the idiom for keeping something together while it tries to fall apart |
| *"It keeps escalating"* (stage 4) | *"Só piora"* | "It only gets worse". Funnier than a literal escalation, and it fits the card |
| *"Load in. Bolt it down. Hope."* | *"Descarrega. Parafusa. Reza."* | Three imperatives, like the English. *Reza* — pray — is doing what *Hope* does |
| *"Then a beer found the mixing desk."* | *"Aí uma cerveja achou a mesa de som."* | *Achou* keeps the beer as the one doing the finding, which is the joke |
| *"GO!"* | *"VAI!"* | What a Brazilian counts a band in with |
| *"Encore"* | *"Bis"* | What the audience actually shouts |

## What is deliberately not translated

**`Groove` and `pad`.** They are the on-screen names of two mechanisms, they
are what a Brazilian drummer says, and translating either would leave the
briefing describing something the HUD does not label.

**The product name.** `WORST GIG EVER` is a constant, not a catalogue string,
and a test fails if it appears in a catalogue — see
`docs/release/product-identity.md`.

**The owner's own words are reused verbatim** where they exist. The mug rule's
figure caption is *"Ao alcance da mão"*, which is his phrase from the M18.1
playtest correction and the tightest statement of the rule in either language.

## What the milestone actually changed in code

Almost nothing, and that is the point of the two milestones before it.

- `catalogues/pt-BR.ts`, typed `Catalogue`. It was written by adding keys until
  `tsc` stopped complaining, so there was never a moment where a missing string
  could have reached a screen.
- `'pt-BR'` added to `SUPPORTED_LOCALES` and an endonym to `LOCALE_ENDONYMS`.
- Registered in `CATALOGUES`.

That is the whole integration. **Every layout budget passed on the first run** —
no card was resized, no font changed, no sentence shortened to fit. M20 spent
its effort so that this milestone would not have to.

## The visible product change

**The language control now appears for players.** M19 built it to draw nothing
while there was one locale; there are two, so it is in the title screen's
button row and in the pause overlay, labelled with the endonym of the current
language. A Brazilian device gets pt-BR at startup without touching it.

## Two defects this milestone found in its own tooling

- **The pseudo-locale was not writing sentences.** Its padding went after the
  full stop, so every pseudo briefing entry ended in a vowel run. It passed
  M20's budgets and would have failed the copy rule the moment that rule was
  applied to it — which is what happened. The padding now goes before the
  terminal punctuation.
- **The "whole sentence, not a fragment" rule was English-only.** The defect it
  exists to catch — a rule written as fragments, each given its own bullet — is
  a property of how copy is written, not of which language it is in, and a
  translator splitting one sentence into two is exactly how it comes back. It
  now runs over every catalogue, with `\p{Lu}` instead of `A-Z` so a Portuguese
  sentence may open on an accented capital.

## Emulator validation, 2026-09-05

Pixel_9, debug build. The check worth having is the one only a device can do.

**The per-app locale was set to `pt-BR` and the app cold-started in
Portuguese without a control being touched.** That is the first time
`detectLocale()` has run against a real Android locale list — every test of the
resolution rule until now was `resolveLocale` in Node, which cannot prove the
adapter reads anything.

The AVD is a Google Play image and cannot be rooted, so `persist.sys.locale`
was not settable; `cmd locale set-app-locales` on API 37 does the same job
through the per-app language list, which is what `getLocales()` reads.

Read off the screen in pt-BR: the title screen with all four stage cards
(*Segure as pontas*, *Ache o ritmo*, *Segure o ritmo*, *Bis*), the button row
(*Como jogar*, *História*, *Clique: ligado*, *Português (BR)*), and stage 1's
briefing with both figure captions and the overflow cue. The card behaves
exactly as it does in English, which is what M20 was for.

`WORST GIG EVER` stayed English through all of it.

The per-app locale was reset afterwards. The owner's phone was not attached for
this run.

## Definition of done

- pt-BR is a shippable locale with a complete, typed catalogue.
- A Brazilian device resolves to it; `pt` and `pt-PT` resolve to it too.
- The language control appears and switches without disturbing the session.
- Every layout budget passes in pt-BR.
- `npm run verify` green.
- **Owner review of the copy.** Until that happens this milestone is code
  complete and not done.
