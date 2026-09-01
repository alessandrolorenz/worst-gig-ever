# ADR 0011 — The Groove domain, and routing one tap to two resolvers

- Status: Accepted
- Date: 2026-08-31
- Milestones: M10 visual beat clock and Groove Pad, M11 dual-task integration
- Specs: `docs/specs/M10-visual-beat-clock-and-groove-pad.md`,
  `docs/specs/M11-dual-task-gameplay.md`,
  `docs/architecture/rhythm-pivot-architecture.md`

## Context

The pivot adds a second job — keep a visual groove — alongside the existing
bottle defense, and asks whether doing both at once is fun before either side
is retuned. That makes two things load-bearing: the two systems must not be
able to corrupt each other's state, and one physical tap must be allowed to
satisfy both when it legitimately lands on both.

## 1. The Groove is handed the clock; it does not own one

`game/state/rhythmState.ts` takes a `BeatContext` — elapsed gameplay
milliseconds, the round length, and the game state — and judges against it. It
imports the rhythm config and the `GameState` vocabulary, and nothing else: no
React, no React Native, no audio, and **not the round state either**.

The payoff is that every pause rule M10 specifies comes for free. The round
clock already stops in READY, PAUSED, SHOW_COMPLETE, and SHOW_RUINED, and
already runs through `VOCALIST_EVENT`. Reading that clock means the Groove
inherits all five behaviors without a rule of its own, and it is structurally
impossible for the beat clock and the round clock to drift apart.

Rejected: an accumulator of its own, ticked by deltas like
`stageMotion`. Two accumulators fed the same deltas are two clocks, and they
diverge the first time one of them is skipped. The stage motion module has its
own clock deliberately, because it must keep breathing on the menus where round
time does not advance; the Groove must do the exact opposite.

**No audio coupling anywhere.** The beat clock never reads a playback position,
never seeks, never schedules against the music, and no test needs an audio
device. The music and the pad are simply not synchronized in this candidate,
and that is a stated property rather than an oversight — see "Known
mismatch" below.

## 2. Beats are finalized eagerly, not only on the next tick

This is the one non-obvious rule in the domain, and it was a real bug before it
was a decision.

A beat can be judged once. The first implementation remembered only
`lastHitBeatIndex` and let the per-frame tick close beats out as their windows
passed. That is correct as long as at most one beat is scored between two
ticks — and wrong the moment two are, because the tick then finds the *earlier*
hit beat still open, sees that it is not the most recent hit, and records it as
a miss. The same round scored differently at 16 ms steps and at 97 ms steps.

So a scored beat is closed out the instant it is scored, along with every beat
before it. That is sound rather than merely convenient: landing a tap on beat
*b* proves every earlier beat is already unreachable, because the tap can be at
most `goodWindowMs` early and beat *b-1*'s window shut a further
`beatInterval - 2 * goodWindowMs` (307 ms at 90 BPM) before that. The misses are
registered before the hit, so the streak reads in the order the beats actually
happened.

`tests/rhythm.test.ts` replays one tap schedule at 4 ms, 33 ms, and 97 ms steps
and requires the entire state to match.

## 3. Windows cannot overlap, and the domain is built on it

The GOOD window is ±180 ms and the beat interval is 667 ms, so 2 × 180 < 667:
for any instant there is **at most one** beat a tap could belong to, and it is
the nearest one. "The nearest unjudged beat inside the active window" is
therefore a single `Math.round`, beats finalize strictly in order, and two
integers describe everything that has happened.

This is an assumption, so it is a test: `RHYTHM.goodWindowMs * 2 <
beatIntervalMs()`. Raising the GOOD window past 333 ms at 90 BPM, or the BPM
past 166 at a 180 ms window, breaks the model rather than merely widening it.

## 4. One tap goes to both resolvers, with no priority

`resolvePoint` in `game/systems/roundSystem.ts` offers every unique tap to the
Groove and then to the Defense. Each decides for itself whether the point was
any of its business. Neither can veto the other.

If a bottle is over the hi-hat and one tap falls inside both regions, the
player gets the beat *and* the break. M11 is explicit that this is a reward for
timing and positioning rather than a double-processing bug, and that forcing an
artificial winner would make one mechanic silently fail exactly when the player
did something good.

Nothing about this weakens idempotency, because idempotency does not live here:
a beat is consumed by its own index and a target by its `active` status. One
point cannot score one beat twice or break one bottle twice however it is
routed, and `tests/dualTask.test.ts` asserts both directly.

Both resolvers are given the *same* instant — the clock as the frame began,
before `tickRound` advances it (ADR 0005, point 6). Two readings of one tap can
therefore never disagree about when it happened.

## 5. The tick is judged under the state the frame started in

`tickRhythm` runs after `tickRound` so beat windows close against the clock the
round just advanced — but it is passed `previousState`, not `round.state`.

`tickRound` advances the clock only when the state was PLAYING or
VOCALIST_EVENT on entry, and it may end the round on the way out. Reading the
state *after* the tick would mean a round that completes on this very tick
stops its beat clock before closing the beats that round contained. The
distinction currently costs nothing at 90 BPM in a 60-second round — the last
beat's window shuts at 59.5 s — but it is exactly the kind of arithmetic
coincidence that stops being true the moment the BPM or the round length is
tuned, which is the whole point of the upcoming playtest.

## 6. The Groove Pad is a circle in config, not a Pressable

The pad is `GROOVE_PAD` in `game/config/rhythm.ts` — a centre and a radius on
the reference canvas — hit-tested by the same surface pipeline as every other
tap. There is no `Pressable`, no touch handler, and no responder anywhere in
`GroovePad.tsx`; the scene canvas remains `pointerEvents="none"`.

That is not a style preference. A Pressable inside the scaled drum art would
re-introduce the exact defect M5A fixed: react-native-game-engine listens with
a *bubbling* `onTouchStart`, so a touch landing on any nested interactive view
reports `locationX` from that child's corner and resolves hundreds of pixels
from where the player aimed (ADR 0007). The M5A page-coordinate mapping is
untouched by this milestone.

**Which cymbal, and why.** The hi-hat, measured off `drumkit_pov.png` rather
than placed by eye: its gold pixels occupy x 0–431, y 385–462 in that 1920×700
bitmap, which `DRUM_KIT_RECT` puts at canvas y 885–962. It is the cymbal a
drummer keeps time on, so the mechanic reads without being explained; it is
bottom-left, where a thumb already rests in landscape; it is diagonally
opposite the pause button, so no pad tap is eaten by a control outside the game
surface; and it is clear of `VOCALIST_BLOCKING_RECT`, so the singer stepping
into the drummer's face can never cover it. A test holds all four properties.

## 7. The web input path collapsed multi-touch, and now does not

M11 requires two fingers in one frame to stay two gestures. Native already did:
react-native-game-engine delivers one `start` entry per finger, each with its
own page coordinates.

The web path did not. It read `event.payload.touches?.[0]`, which is wrong
twice over — two fingers landing together collapsed to one tap, and a second
finger landing while the first was *held* re-reported the held finger's
position, which is a phantom tap where nobody just tapped. It now iterates
`changedTouches` (the fingers that actually changed in this event), falling
back to `touches` and then to the event itself for a mouse.

The M5A duplicate-tap fold is unchanged and still does its job: a browser
reporting one finger as both `onTouchStart` and `onMouseDown` is still one
swing, because the two points are near-coincident.

## 8. A Groove hit plays the existing drumstick whoosh

A cymbal that makes no sound when struck reads as broken. `stickWhoosh` is
already loaded and already used for a target hit, so no asset is added
(AGENTS.md rules 13 and 14) and no provenance changes.

It is a one-shot answering a tap the player just made — not synchronization.
Nothing seeks or schedules against the music, and the beat clock never consults
the player.

A missed beat is deliberately **silent**. It already costs the streak, and a
failure noise up to twice a second while the player is still learning the pad
would be punishment out of all proportion to what a missed beat actually costs,
which by design is nothing.

## Independence, stated as rules

| Event | Groove | Defense |
|---|---|---|
| Groove miss | miss, streak reset | untouched — no Integrity, no combo reset |
| Groove hit | points, streak | untouched |
| Bottle missed | untouched | existing miss, Integrity, combo reset |
| Bottle hit | untouched | existing score and combo |
| Pause | frozen | frozen |
| Restart | reset | reset |

Each row is a test in `tests/dualTask.test.ts`, including a full round in which
every bottle is broken and every beat ignored: Show Integrity must end at 3.

## What did not change

No BPM, spawn cadence, throw-speed window, hitbox, forgiveness radius, Show
Integrity value, round length, vocalist timing, or Defense scoring value was
touched in M10 or M11. The point of the pivot is to learn whether combining the
two existing tasks is fun before adjusting either, so the difficulty under test
is the one the combination produces on its own.

## Known mismatch, deliberately left in

**The Groove Pad is not synchronized to the music.** The pulse runs at 90 BPM
off gameplay time; the track loops on its own clock and at its own tempo. They
will drift, and they are supposed to. M13 asks the owner to evaluate the pad
against the *visual* beat, and this mismatch must not be reported as a bug —
synchronizing them is a later milestone, and only worth building if the visual
mechanic proves fun first.
