# Product identity — the authoritative record

**Established:** M18.5, 2026-09-04, before internationalization and before any
public release.

This document is the single source of truth for what this product is called and
what its technical identifiers are. Where it disagrees with anything else in the
repository, this document wins and the other place is a bug.

## The contract

| | Value |
|---|---|
| Product name | **Worst Gig Ever** |
| Store / display name | **Worst Gig Ever** |
| Launcher label (`expo.name`) | `Worst Gig Ever` |
| Expo slug | `worst-gig-ever` |
| Android package | `com.worstgigever.app` |
| iOS bundle identifier | `com.worstgigever.app` |
| npm package name | `worst-gig-ever` |
| Expo account (`owner`) | `alessandrolorenz` |
| EAS project id | `ff27b73c-8d2e-46ba-8ee8-999034aa757c` |
| Deep-link scheme | derived from the slug: `exp+worst-gig-ever://` |
| Google Play application id | not yet created — will be the Android package |

## Title translation policy

**Never translate the product name.** *Worst Gig Ever* is the canonical title in
every locale, including pt-BR.

Two reasons, and the second is the expensive one:

1. It is what people search for. A title that differs per market fragments the
   store identity the game is trying to build.
2. It is **painted into the art.** `assets/art/story/01_poster.jpg` has "WORST
   GIG EVER" hand-lettered onto the poster in the opening panel. Translating
   the title means regenerating that artwork once per locale, and it is the only
   asset in the game with readable text in it — every other asset is text-free
   because the V2 style bible forbids text, logos and readable branding.

## The rule for future contributors

**Do not derive any new technical identifier from "Worst Band Ever".** That
includes package ids, slugs, URLs, storage keys, analytics names, event names,
channel names, bucket names, file names and directory names.

The old name survives in this repository in exactly one legitimate role: as
**historical record**. A document describing what was decided at M9, or a build
URL that still resolves under the old slug, is accurate and must not be
rewritten — changing it would falsify project history. See the M18.5 report for
the full classification.

A test enforces the runtime half of this rule: `tests/identityContract.test.ts`
fails if `worst-band-ever` or `com.worstbandever.app` reappears in any file that
configures the running app or its build.

## Why this happened when it did

An Android package id is effectively permanent once an app is published. The
migration invalidates every installed build, because Android treats a new
package id as a different application entirely.

At M18.5 that cost was one reinstall on one phone. After internationalization —
which is a decision to reach more people — it would have cost every one of them.
The MVP closing and i18n starting is the last moment this is nearly free.
