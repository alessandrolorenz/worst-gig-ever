# V2 — Internationalization

**Status:** proposed, 2026-09-04. Nothing here is started.
**Owner decision:** *"o foco da v2 será a internacionalização."*

## What this actually costs here

Surveyed rather than estimated, because the cost of i18n is almost entirely
decided by two things — how the strings are stored, and whether text is baked
into art.

| | State | Consequence |
|---|---|---|
| UI strings | **Hardcoded literals**, ~88 in `Overlays.tsx` alone, plus `stages.ts` briefings, `storyState.ts` captions, HUD and countdown labels | Every one has to be extracted. Mechanical, large, low-risk. |
| i18n library | **None.** No `expo-localization`, no catalogue, no locale detection | Has to be introduced. One new dependency. |
| Art with text | **One file.** `01_poster.jpg` has "WORST GIG EVER" hand-lettered into it, plus a background "BAR" sign | See below — cheap if the title stays English. |
| Everything else in art | **Text-free**, because the V2 style bible forbids text, logos and readable branding (rule 12) | 33 production assets need no work at all. This is the expensive thing the project already avoided. |
| Story | Five stills with **runtime captions**, not baked text | Translatable as strings. |

**The art is the good news.** The one rule that looked like an art constraint —
no text, no branding — is what makes this a string project rather than an
asset-regeneration project.

### The title should not be translated

`01_poster.jpg` is the only art that would need regenerating, and only if
*Worst Gig Ever* becomes *Pior Show da História*. It should not. The title is
the game's name and its store identity; translating it fragments the thing
people search for and costs an art regeneration per locale. The background
"BAR" sign reads the same in Portuguese and Spanish anyway.

Recommendation: **the title stays English in every locale.** Everything else
translates.

## The bug that is about to happen four more times

On 2026-09-04 stage 1's briefing overflowed its card: about 300 px of content
in a 150 px scroll with the indicator off, so the mug rule was on screen and
unreadable. It was fixed by raising the scroll and shortening the copy.

**That fix does not survive translation.** Portuguese runs roughly 15–25%
longer than English for the same meaning; German and French are worse. Stage 1
now fits its 200 px card *in English*, with little to spare. In pt-BR it
overflows again, and the failure mode is silent — text that does not fit is
absent and looks exactly like text that was never written.

This is the single most important thing i18n changes about this codebase, and
it is a layout problem rather than a translation problem. **Every text surface
has to become length-independent instead of tuned to English.** That is M20,
and it is where the real work is.

## Order

Corrected at M18.5. The earlier draft of this plan placed release identity
*after* localization; that was wrong for the reason M18.5 acts on — an Android
package id is effectively permanent once published, and internationalizing is a
decision to reach more people, every one of whom would install a build the
migration invalidates.

### M18.5 — Final release identity — **DONE (2026-09-04)**

Expo slug `worst-gig-ever`, application id `com.worstgigever.app` on both
platforms, `RECORD_AUDIO` removed, `package-lock.json` tracked, and an identity
contract at `docs/release/product-identity.md` with a test that guards it.

One external action remains and it **blocks EAS builds**: the EAS project is
still named `worst-band-ever` on expo.dev and must be renamed there. See
`docs/specs/M18.5-final-release-identity-report.md`.

### M19 — Locale foundation

Every user-visible string into typed localization catalogues. **English only —
no translation yet.** Locale detection plus an explicit in-game language
selector, because a language you cannot select is a language you cannot check.

Ends with the game looking identical, running out of a catalogue, and a test
that fails if any user-visible literal is left behind.

### M20 — Translation-safe layout

The milestone the briefing bug demands. Pseudo-locale expansion, English-length
layout assumptions removed, silent clipping prevented.

Before translating, not after: translating into a layout that cannot hold it
produces four broken languages instead of one.

### M21 — pt-BR

Complete Brazilian Portuguese translation, with human review of the humour and
voice. The owner's own language, so the only one that can be judged rather than
trusted.

### M22 — Local memory and sharing

Local high scores, progress and preferences that survive a cold start, and
result sharing. No backend, no accounts.

One constraint from M15 and not negotiable: session progress must never gate a
cold start. Persistence records what happened; it does not lock anything.

### M23 — Monetization and store readiness

AdMob interstitials at natural stage boundaries, a one-time Remove Ads
purchase, and privacy/consent/store configuration.

### M24 — Music Pack 01

Additional commercially safe tracks on the same rhythmic contract.

## Not on the road above, and why

| | |
|---|---|
| **Music on the beat clock** | The owner already decided this — *"drift is not accepted"* — and open item 13's condition ("only worth building if the mechanic proves fun") is met. It is the biggest quality jump still available and it has nothing to do with i18n. It wants its own milestone, and it is the strongest candidate to slot in beside M21. |
| **Audio weight** | `crowd_applause.wav` is still the untrimmed 39 s / 6.9 MB source and the effects are not volume-normalized. Store-relevant, so M23 at the latest — but it belongs with the music work above if that lands first. |
| **Integrity healing, drunk meter** | Deferred at M18 with reasons; each needs its own playtest. |
| **`level01` retune (M17.1)** | Owner is leaning yes — *"acho que sim, nao estou certo"* — and it makes every past device observation incomparable when it lands. Better decided than carried. |
| **Hermes** | Named as the lever *if* performance failed. It passed. |

## What I would not do

**Do not machine-translate and ship.** The game's voice is its whole
personality — *"One night only. Nobody asked for it."*, *"You kept the groove
alive. Somehow."* A literal translation of those lines produces a game that is
correct and not funny, which is worse than English. pt-BR should be written by
the owner, not generated; the other locales should at minimum be reviewed by
someone who would laugh at them.

**Do not add a HUD flourish for the language switch.** It belongs on the title
and in the pause overlay, nowhere else.

## Open questions

1. **Which languages?** pt-BR is certain. Spanish is the cheapest next reach;
   English is already there. Every added locale is ongoing cost on every copy
   change, so this is a commitment, not a checkbox.
2. **Does the title translate?** Recommended no — see above. Saying yes costs
   an art regeneration of `01_poster.jpg` per locale and a store identity per
   market.
3. **Who writes pt-BR?** Recommended: the owner, because the jokes are the
   product. If it is me, the lines need reviewing rather than accepting.
4. **Where does the music sync go?** It is decided, unbuilt, and unrelated to
   i18n — but it is the largest single improvement still on the table, and the
   longer it waits the longer every playtest is told to ignore a flaw in the
   thing the game is about.
5. **Does the GitHub repository get renamed?** M18.5 migrated everything in
   source control; the remote is still `alessandrolorenz/worst-band-ever` and
   nothing in the code depends on it. Cosmetic, external, and cheap.
