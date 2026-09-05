# ADR 0010 — Product rename to Worst Gig Ever, and the identifiers deliberately left behind

- Status: Accepted
- Date: 2026-08-31
- Milestone: M9 product rename and rhythm-pivot freeze
- Spec: `docs/specs/M9-product-rename-and-rhythm-pivot.md`
- Supersedes the naming half of ADR 0004; its orientation and identifier
  decisions still stand.

## Context

`START-HERE.md` recorded *Worst Band Ever* as a provisional working title and
said naming must not block the MVP. It has not: the game is now a playable
round on final art, and the pivot in `RHYTHM-PIVOT-README.md` changes what the
game is about. The joke was never that the band is bad — it is that the gig is
a disaster, which is what the thrown bottles, the singer walking into the
drummer's face, and every absurd stage event planned after this one are all
expressions of.

The rename is therefore a product decision, not a cosmetic one, and M9 makes it
before any rhythm code is written so that no new file is born under the old
name.

## Decision

The product is **Worst Gig Ever**. The tagline is **Keep the beat. Survive the
gig.**

Renamed:

| Where | From | To |
|---|---|---|
| `app.json` `expo.name` (the launcher label) | Worst Band Ever | Worst Gig Ever |
| `package.json` `name` | `worst-band-ever` | `worst-gig-ever` |
| `package-lock.json` root package name | `worst-band-ever` | `worst-gig-ever` |
| READY overlay kicker and tagline | WORST BAND EVER / Survive the worst gig ever. | WORST GIG EVER / Keep the beat. Survive the gig. |
| `AGENTS.md` mission, `README.md`, `project-status.md`, `docs/specs/M0-product-brief.md`, the art provenance template, the art style bible | old name | new name |

## Deliberately not renamed

Every remaining occurrence of the old name is one of two things: a historical
record, or a technical identifier with state attached somewhere this milestone
must not reach.

**Technical identifiers, retained on purpose:**

| Identifier | Value | Why it stays |
|---|---|---|
| Expo slug | `worst-band-ever` | The slug is part of the linked EAS project's identity. Changing it locally while the remote project keeps the old slug is exactly the inconsistency M9 forbids. It is also what the development-client deep link `exp+worst-band-ever://` is derived from, so changing it silently breaks `docs/running-the-game.md`. |
| `extra.eas.projectId` | `ff27b73c-…` | Points at a real remote project. Editing it does not rename anything; it re-points the build at a different (or nonexistent) project. |
| GitHub repository / `origin` remote | `alessandrolorenz/worst-band-ever` | A remote mutation, out of scope by the master prompt and by M9. |
| `ios.bundleIdentifier`, `android.package` | `com.worstbandever.app` | Already provisional under ADR 0004. An application identifier cannot be changed after a store release, and changing it now invalidates every installed playtest build — including the APK the owner is about to play. |
| EAS project name / owner | `alessandrolorenz` | Remote state. |
| Native signing credentials | — | Remote state, and tied to the package name above. |

**Historical records, kept as authored:** `START-HERE.md`,
`NEXT-STAGES-README.md`, `PACKAGE-MANIFEST.json`,
`PACKAGE-MANIFEST-next-stages.json`, the M0–M8 specs' body text, ADR 0004, and
the `prompts/00`–`prompts/09` execution prompts. These describe what was
decided and delivered under the old name; rewriting them would falsify the
record. `START-HERE.md`, `NEXT-STAGES-README.md`, and `M0-product-brief.md`
carry a banner pointing at the rename so a reader cannot mistake them for
current identity.

## Consequences — this is pre-release debt, not a finished job

The app's launcher label now says Worst Gig Ever while its package name says
`com.worstbandever.app` and its Expo slug says `worst-band-ever`. That
mismatch is invisible to a playtester and fine for a playtest. It is **not**
fine for a store release.

Before any store submission, a dedicated identity milestone must:

1. decide the final publisher domain and application identifier — the current
   one is provisional under ADR 0004 and this ADR does not make it final;
2. migrate the Expo slug and the remote EAS project together, not separately;
3. rename the GitHub repository and update `origin`;
4. re-create or migrate signing credentials against the final package name;
5. accept that step 4 invalidates every previously installed build, so it
   happens before there is an installed base, not after;
6. remove the `RECORD_AUDIO` permission that expo-audio's config plugin adds
   although the game never records (ADR 0006).

Items 1 and 6 were already open before this ADR; the rename adds 2 through 5.
`project-status.md` carries them in its open-items list.

## What M9 did not do

No gameplay file changed behavior. The one source edit outside metadata is the
READY overlay's kicker and tagline, which are strings. Scoring, spawn cadence,
hitboxes, approach speeds, Show Integrity, the vocalist event, round duration,
and the audio lifecycle are untouched, and the rhythm mechanic itself starts at
M10.

---

> **Superseded by M18.5 (2026-09-04).** The identifiers this document reasons
> about were migrated before internationalization: the Expo slug is now
> `worst-gig-ever` and the application id is `com.worstgigever.app` on both
> platforms. The reasoning below is preserved as the record of why they were
> retained at the time, and is no longer the current state.
>
> Authoritative record: `docs/release/product-identity.md`.
> Migration: `docs/specs/M18.5-final-release-identity-report.md`.
