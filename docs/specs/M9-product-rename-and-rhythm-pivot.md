# M9 — Product Rename & Rhythm Pivot Freeze

## Objective

Rename the user-facing product from **Worst Band Ever** to **Worst Gig Ever** and freeze the rhythm-pivot contract before gameplay code changes.

## New identity

Product name:

**Worst Gig Ever**

Primary tagline:

**Keep the beat. Survive the gig.**

Secondary descriptive line:

**Keep the groove while the crowd tries to destroy your kit.**

## Why the rename

The joke is the disastrous concert itself, not that the band is necessarily bad.

`Worst Gig Ever` better explains:
- the hostile/chaotic crowd;
- thrown bottles;
- stage interruptions;
- the survival fantasy;
- future absurd gig events.

## Required local rename

Update user-facing/local project identity where safe:

- Expo display name → `Worst Gig Ever`
- `package.json` package name → `worst-gig-ever`
- lockfile root package name if applicable
- title/ready/end copy that says `Worst Band Ever`
- README/project-status/spec wording when it clearly refers to the product name
- future docs use `Worst Gig Ever`

## Deliberately NOT renamed in M9

Do not perform remote/infrastructure migrations:

- GitHub repository name
- Git remotes
- EAS project ID
- remote EAS project name
- Expo project ownership
- native signing credentials

Do not automatically change:
- existing Expo slug if it risks linked-EAS inconsistency;
- `com.worstbandever.app` native bundle/package identifiers.

Those identifiers are already documented as provisional and can be migrated before store release in a dedicated identity milestone.

M9 must record this as technical debt, not pretend the strings do not exist.

## Pivot statement

Old core loop:

> Break incoming objects and survive the song.

New core loop:

> Keep a simple visual groove while breaking incoming objects and surviving the gig.

## Two performance dimensions

### Groove
How successfully the player follows the pulsing cymbal/pad.

### Defense
How successfully the player destroys incoming objects.

These remain separate metrics in the first rhythm MVP.

## Non-goals

M9 does not implement:
- rhythm logic;
- pad rendering;
- new score UI;
- audio synchronization;
- new art;
- difficulty changes.

## Exit criteria

- product-name contract updated;
- user-facing identity says Worst Gig Ever;
- rhythm-pivot contract is explicit;
- technical identifiers intentionally retained are documented;
- gameplay files are otherwise unchanged;
- verification gate passes.
