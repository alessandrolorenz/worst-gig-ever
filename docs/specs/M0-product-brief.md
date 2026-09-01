# M0 — Product Brief

## Product name

**Worst Gig Ever**

> Renamed at M9 (2026-08-31). This brief was written under the working title
> *Worst Band Ever*; the rest of the document is kept as authored, so the
> original name still appears below in its historical sentences. The joke is
> the gig, not the band — see `docs/specs/M9-product-rename-and-rhythm-pivot.md`
> and ADR 0010.

### Tagline

**Keep the beat. Survive the gig.**

The M0 playtest tagline was *Survive the worst gig ever.*

## Product statement

Worst Gig Ever is a casual mobile arcade game seen from the drummer's point of view during a catastrophically chaotic rock concert. The player must survive the song by hitting incoming objects and reacting to absurd interruptions while the band keeps playing.

## Player fantasy

> I am trapped behind the drum kit in a ridiculous live show, everything is going wrong, and I somehow need to keep the gig alive until the song ends.

## Tone

- absurd;
- irreverent;
- energetic;
- cartoonish;
- rock/punk flavored;
- playful rather than realistic;
- slapstick violence rather than gore.

## Target session

- first session: under 2 minutes;
- one round: approximately 60 seconds;
- restart: immediate;
- intended reaction: "one more try."

## Target platforms

1. Android first for physical MVP validation.
2. iOS after the gameplay concept passes.

## Core MVP

The player sees:

- the drum kit in the foreground;
- band members on stage;
- crowd beyond the stage;
- incoming bottles/mugs moving toward the drummer;
- a minimal HUD.

The player:

- taps an incoming object;
- sees a drumstick strike response;
- destroys the object;
- earns score;
- builds combo;
- loses Show Integrity when dangerous objects are missed;
- survives until the music/round ends.

One vocalist interruption happens during the round as the first special event.

## Why this MVP exists

The purpose is not to prove long-term progression, monetization, or content volume. It exists to answer four questions:

1. Is the basic interaction satisfying?
2. Does the drummer POV read clearly on a phone?
3. Does music + impacts + crowd feedback create enough energy?
4. Is the selected React Native game stack technically viable for this style of game?

## Explicitly out of scope

See `AGENTS.md`. Any idea not required to answer the four MVP questions is deferred.

## Commercial direction after validation

Potential future model:

- free download;
- ad-supported rounds;
- rewarded continue/revive;
- optional ad removal;
- multiple themed venues and shows.

Monetization implementation is not part of this milestone.

## Content safety / IP rule

The game may parody the experience of a chaotic rock show, but it must not rely on real band identities, protected logos, recognizable celebrity likenesses, commercial recordings, album art, or branded alcohol packaging.
