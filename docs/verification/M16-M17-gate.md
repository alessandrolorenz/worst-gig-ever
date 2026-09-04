# M16 + M17 gate — browser round

**Branch:** `feat/m16-beat-clarity`, at `25f5bc3` plus one correction found here.
**Outcome:** `M16_M17_DEVICE_REVIEW`. The automated gate is green and the
render has been seen; only a physical device is left.

## Automated

`npm run verify` — type-check, lint, **348 tests**, `PASS_ART_READY`,
`PASS_AMBIENT_LOOP_READY`. Web export succeeds.

New suites: `tests/audioContract.test.ts` (11) and
`tests/difficultyCurve.test.ts` (13), plus additions to the rhythm, round
system, stage flow, stage motion, HUD and asset contract suites.

## Browser round

Driven headless at **923 x 411** — the smallest real target viewport, a 1080p
phone in landscape at 420 dpi — against the actual web export, the same rig
M15's gate used. **Zero page errors and zero console errors.**

Confirmed in order:

1. The story still plays and Skip still exits to the title.
2. **The title carries four stages and the click toggle without overflowing.**
   `scrollWidth` 923 against `innerWidth` 923 and `scrollHeight` 411 against
   `innerHeight` 411 — no scrolling in either axis. The picker wraps 3 + 1, with
   Stage 4 centred on a second row, and the three buttons sit below it.
3. Stage 2's briefing reads the four new lines.
4. The pre-roll runs and the round opens on `GO`.
5. **Stage 2's first twelve seconds are the beat alone** — nothing is thrown,
   and the pad, the markers and the bar counter are the only things moving.
6. **The converging markers read.** Two triangles slide inward along the pad's
   axis and meet at its centre on the beat.
7. The pause overlay carries `Click: on` between Resume and Quit.
8. Stage 4's briefing reads, and the Encore opens with objects in flight.
9. An unplayed Encore ends `SHOW RUINED` with both summary columns and
   `Objects missed 3`, which is the schedule working.

Evidence: `docs/verification/m16-evidence/`.

## One defect found and fixed

**The bar counter was invisible.** At the target viewport each mark is about
four pixels across, and the unlit ones were drawn at 0.22 opacity over the
drum kit art. The lit mark read; the other three did not — so the row showed a
single dot drifting sideways rather than a position within a bar, which is the
whole reason the counter exists.

Fixed by raising the unlit marks to 0.5 and giving every mark a dark contour.
The row crosses the snare's cream head, the black kick head and the red shell
inside its own width, so no single fill survives the whole run; an outline
does.

`pad-cue-zoom-before.png` and `pad-cue-zoom-after.png` are the same crop of the
same frame, at 4x, before and after.

This is exactly what the browser round is for. Nothing in the test suite could
have caught it: the geometry was correct and asserted, and the geometry was
never the problem.

## Device review — owner verdict

**Played on the Galaxy S23 FE (SM-S711B, Android 16) on 2026-09-04. Owner's
verdict: "Ficou muito legal."** Direction approved.

Installed as the local development client over USB, with Metro reached through
`adb reverse tcp:8081` rather than the network. Nothing was uninstalled — the
device had no previous build on it. Zero errors in logcat across the session.
The owner cleared Stage 1 on the first attempt: 5300 defense, 29 objects
destroyed, 1 through, best combo 19.

**What this verdict does and does not cover.** It is an approval of the
direction, taken on a **debug build running JSC**. That is enough to judge
reading, audio, and the new stages. It is *not* enough to judge frame pacing or
tap latency, which is precisely the open M14.1 question (open item 5). That
retest still needs a release build and is still open.

## What a device still has to answer

1. **Is the beat readable now?** The whole of M16. The markers, the bar
   counter, the click, and the venue running on one tempo.
2. **Tap responsiveness**, still open from M14.1 and never retested. M16 adds
   two moving cues to the pad's SVG without growing its surface by a pixel,
   which was deliberate, but only a device can price it.
3. **Does the Encore escalate the way it measures?** 55 spawns against the
   show's 37, mean gaps 1508 / 769 / 564, eight volleys. Whether that reads as
   a climax or as noise is not something a headless browser can say.
4. **Does the click help or nag** over a full round, and is the toggle where a
   player would look for it.

## Known and deliberate

- The show still plays the drifting rock loop. Only the teaching stage and the
  Encore are on a tempo-locked bed; picking the show's is the owner's call.
- The title picker wraps 3 + 1 rather than 2 + 2. It fits and it is legible;
  balancing it is cosmetic and was not done here.
- `level01` is untouched, proven by spawn-stream signatures, so the pending
  M14.1 retest still measures the round it was set up to measure.
