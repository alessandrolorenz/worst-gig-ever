# M22 — Local Memory and Sharing

**Status:** implemented and validated on emulator, 2026-09-05, on
`m22/local-memory-and-sharing`. Owner device verdict outstanding.
**Parent:** `docs/specs/V2-plan.md`, "M22 — Local memory and sharing".
**Depends on:** M19–M21. Every string this milestone adds goes into the
catalogues, in both shipping languages, and is measured against M20's budgets.

## What it is

Local high scores, progress and preferences that survive a cold start, and
result sharing. **No backend, no accounts, no cloud save.**

## The constraint that shapes everything

From M15, restated in the V2 plan and not negotiable:

> **Session progress must never gate a cold start. Persistence records what
> happened; it does not lock anything.**

M22 is the milestone where that is most likely to be broken by accident,
because storage is exactly the thing that makes locking *feel* fair. It is not
being added. Every stage stays selectable from the title on a fresh install, a
corrupt save, and a save from a future version.

It also has a second, sharper reading that this milestone takes seriously:
**the app must not wait for storage to render.** Blocking the first frame on a
disk read is letting persistence gate a cold start in the most literal way
available. So the game starts on defaults and applies what it loads when it
arrives.

## No new dependencies

AGENTS.md rule 18, and this time it costs nothing:

| Need | Used | Already a dependency? |
|---|---|---|
| Key-value storage | `expo-file-system` — one small JSON file in `documentDirectory` | **Yes**, since M2 |
| The share sheet | React Native's built-in `Share` | **Yes**, it is in React Native |

`@react-native-async-storage/async-storage` is the idiomatic choice and would
be a new native module for a single file that is written on discrete events and
read once. `expo-sharing` would be a new native module to do what `Share`
already does.

## Shape of the work

### The saved file is versioned from the first write

`schemaVersion` is in the file from day one, not added later when it is needed.
A save without one is a save that can only ever be discarded, and discarding is
what this milestone is trying to stop doing.

Unknown fields are preserved on read and written back, so a build that is one
version behind does not silently delete what a newer one saved.

### Three layers, and only one of them knows about a disk

- `game/state/records.ts` — pure domain. What a "best" is, and how a finished
  round merges into one.
- `game/state/persistence.ts` — pure. The schema, its version, and the parsing
  that turns whatever was on disk into something the domain can use. **Every
  hostile input is this module's problem**, and all of it is testable in Node.
- `game/state/storage.ts` — the adapter. The only file that imports
  `expo-file-system`, in the same way `deviceLocale.ts` is the only file that
  imports `expo-localization` (M19).

### What is remembered

| | Why |
|---|---|
| Best Defense and Groove score per stage | The point of the milestone |
| `bestStageCleared` | A tick mark on a stage button. **Not a gate** |
| `clickEnabled` | A preference the player set on purpose |
| `locale` | Same. It overrides device detection when present |

Deliberately **not** remembered: which screen the player was on, and anything
about a round in progress. A game that resumes into the middle of a round it
cannot reconstruct is worse than one that starts at the title.

### Sharing

One button on the results screen, opening the OS share sheet with a line of
text. The text is a catalogue string in the player's language, and it carries
the product name — which is the constant, not a translated string
(`docs/release/product-identity.md`).

No image rendering, no deep link, no URL. Those need something to link *to*,
and there is no backend.

## What could go wrong, and what happens instead

| | |
|---|---|
| No file yet (fresh install) | Defaults. The game is playable before anything has been written |
| File is not JSON, or is truncated | Defaults, and the bad file is left alone rather than deleted — it is evidence |
| `schemaVersion` is newer than this build | Read what is understood, keep the rest, never crash |
| A field has the wrong type | That field falls back; the rest of the save survives |
| Disk is full or read-only | The write fails silently and the session keeps its scores. A lost high score is not worth an error dialog |
| Storage is slow | The game has already started. The load applies when it lands |

The one visible cost: a player who overrode their language will see the first
frames in their device language before the saved preference lands. That is the
price of not blocking the first frame, and it is the right side of the trade.

## What building it found

**A prototype pollution route in the passthrough.** `JSON.parse` can produce an
own `__proto__` key, and copying unknown fields with `unknown[key] = value`
**replaces that object's prototype** rather than adding a property.
`Object.prototype` itself was never touched and `serializeSave`'s spread would
not have copied the result, so the blast radius was small — but a bag of
unknown fields whose prototype came off a file on disk is not something to
leave working by accident. `NEVER_CARRIED` now drops `__proto__`, `constructor`
and `prototype`. Found by writing the test, which failed.

**A test that imported the adapter.** `SAVE_FILE_NAME` started in `storage.ts`,
so the test that checks it against the identity contract pulled in
`expo-file-system` — which Node cannot type-strip out of `node_modules`, so the
whole suite failed to load. The name is part of the *contract*, not of the
mechanics, and it moved to `persistence.ts`. The failure was loud and the
boundary is the same one M19 drew around `expo-localization`.

## Emulator validation, 2026-09-05

Pixel_9, debug build, save read back with `adb run-as`.

**The write.** A finished round produced exactly the intended file:

```json
{"schemaVersion":1,"records":{"stage-1-defense":{"defenseScore":0,"grooveScore":null}},
 "bestStageCleared":-1,"clickEnabled":true,"locale":null}
```

`grooveScore: null` on a defense-only stage, `bestStageCleared: -1` after a
ruined show — a loss is a retry, not progress — and **`locale: null` even though
the game was running in Portuguese**, because the device had said so and the
player had not chosen. That distinction only exists in the code; this is the
first evidence it behaves.

**The read.** A save injected with known values, then a cold start: the game
came up in English *overriding the device's Portuguese*, with the click
switched off, stages 1 and 2 ticked — and **stages 3 and 4 still selectable**,
which is the constraint this milestone was most likely to break. The pause
summary showed Best 4560 and Best 880, the injected records.

**Forwards compatibility.** The injected file carried a `futureField` this build
knows nothing about. After the app wrote the file again — a preference toggle —
the field was still there, verbatim, at the front of the JSON.

## Definition of done

- Scores, progress and preferences survive a cold start.
- Nothing is gated on any of it, on any input including a hostile file.
- The app renders before storage has answered.
- Share works and its text is localized.
- All new strings in `en` and `pt-BR`, passing M20's budgets.
- `npm run verify` green, and the loop validated on a device across a real
  cold start.
