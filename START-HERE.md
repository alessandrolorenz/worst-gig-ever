# Worst Band Ever — SDD Bootstrap Package

> **Historical document.** This is the original bootstrap package, kept as
> delivered. The product was renamed to **Worst Gig Ever** at M9 (2026-08-31)
> with the tagline *Keep the beat. Survive the gig.*, and the core loop pivoted
> to Groove + Defense. For the current identity and continuation state start
> from `README.md` and `project-status.md`; the rhythm-pivot package itself is
> retained in `RHYTHM-PIVOT-README.md` as historical context. The names below
> record what was decided at bootstrap; they are not the current product name.

## Working identity

- **Working title:** Worst Band Ever
- **Playtest tagline:** Survive the worst gig ever.
- **Naming status:** Provisional. Naming must not block the MVP.
- **Alternative candidate:** Crazy Gigs
- **Hold for later review:** Punk Stock Concert
- **Resolved at M9:** Worst Gig Ever.

## Goal

Create a playable, funny, low-cost vertical slice of a mobile arcade game where the player experiences a chaotic rock show from the drummer's point of view.

The player is not being evaluated as a musician. The fantasy is surviving an absurd live show while protecting the drum kit, smashing thrown objects, reacting to bandmates, and reaching the end of the song.

## Fast-track plan

M0, M1, and M2 are intentionally compressed into one bootstrap execution.

1. **M0 — Concept Definition**
2. **M1 — Gameplay Specification**
3. **M2 — Technical Foundation**
4. **M3 — Art, Asset, and Audio Contract**
5. **M4 — Vertical Slice**
6. **M5 — Playtest and Feasibility Gate**
7. **M6 — Expansion Decision**

There are no separate approval pauses between M0, M1, and M2 unless Claude finds a blocker that materially changes scope, licensing, or engine feasibility.

## Recommended starting repository

Use the MIT-licensed template:

https://github.com/nightness/react-native-game-engine-expo-typescript-template

The template already provides Expo, TypeScript, React Native Game Engine, Matter.js, game states, a touch-based Balloon Pop example, scoring, and EAS configuration.

Treat it as a **prototype accelerator**, not as a permanent architecture commitment.

## Suggested local bootstrap

```bash
git clone https://github.com/nightness/react-native-game-engine-expo-typescript-template worst-band-ever
cd worst-band-ever
git remote rename origin upstream
npm install
npm run type-check
```

Then copy this package into the repository root and give Claude Code:

`prompts/00-m0-m2-fast-track-bootstrap.md`

## MVP definition

The first playable build contains only:

- landscape gameplay;
- drummer point-of-view composition;
- one stage;
- one short rock track;
- beer bottle target;
- beer mug target;
- tap-to-hit interaction;
- visible drumstick strike feedback;
- break effect and glass sound;
- score;
- combo;
- three-point Show Integrity meter;
- 60-second round;
- one vocalist interruption event;
- win state: Show Complete;
- lose state: Show Ruined.

Everything else is deferred.

## First success question

> Is hitting objects and surviving the chaotic show fun enough that someone immediately wants to play another round?

If the answer is not clearly yes, do not expand the game.
