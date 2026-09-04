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

### M19 — The locale layer

Every user-visible string into a catalogue, keyed and typed, with locale
detection and an explicit in-game language switch. **No translations yet** —
this milestone ends with the game running in English out of a catalogue,
looking identical, with a test that fails if any user-visible literal is left
behind.

The switch matters as much as the detection: the owner tests on one phone, and
a language you cannot select is a language you cannot check.

### M20 — Layout that survives translation

The milestone the briefing bug demands. Every text surface — briefing cards,
results, title, story captions, HUD, buttons — measured against a **pseudo-
locale** that is deliberately 30–40% longer than English, and required to stay
readable without silent clipping.

Concretely: the briefing card stops being a 200 px scroll with hand-trimmed
copy and starts being a container that adapts, and the tests that guard it stop
using an English character budget.

Do this **before** translating, not after. Translating into a layout that
cannot hold it produces four broken languages instead of one.

### M21 — The languages

pt-BR first — it is the owner's own language, so it is the only one that can be
judged rather than trusted. Others after, and each one is cheap once M19 and
M20 exist.

Open question below on which.

### M22 — Release identity (ADR 0010)

Must land **before v2 ships**, and the reason is now stronger than it was.

The launcher says *Worst Gig Ever*; the Expo slug (`worst-band-ever`), the EAS
project, the GitHub repository and `com.worstbandever.app` still say the old
name. Migrating means new signing credentials against the final package name,
which **invalidates every installed build**.

Internationalizing a game is a decision to reach more people. Every one of them
installs a build that the migration would later invalidate. Today it costs one
reinstall on one phone; after v2 ships it costs the audience v2 was built to
reach. It is not part of i18n and it is not optional to sequence.

## Not in v2, and why

| | |
|---|---|
| **Music on the beat clock** | The owner already decided this — *"drift is not accepted"* — and open item 13's condition ("only worth building if the mechanic proves fun") is met. It is the biggest quality jump available and it has nothing to do with i18n. It should be its own milestone, before or after v2, but not folded in. |
| **Memory** | Nothing survives a cold start today — no high score, no progress. Real gap, unrelated to i18n. |
| **Store readiness** | `RECORD_AUDIO` is declared and unused, `package-lock.json` is git-ignored, `crowd_applause.wav` is the untrimmed 6.9 MB source. All required for a store, none for v2. |
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
4. **Does the music sync land before or after v2?** It is decided, unbuilt, and
   unrelated — but it is the largest single improvement still on the table.
