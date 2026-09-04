/**
 * The Groove Pad: a code-drawn pulse over the lower-centre face of the drum
 * kit (M10, moved to the centre by M13.1).
 *
 * No new art. The kit stays one bitmap and is not cropped; this draws an
 * ellipse and a glow on top of it, positioned from `GROOVE_PAD` in
 * `game/config/rhythm.ts` — the same ellipse hit resolution uses, so what the
 * player aims at and what the rules judge are one number.
 *
 * Drawn with `react-native-svg` rather than a scaled `View`, because the pad
 * is now three times wider than it is tall: a circular `View` stretched into
 * that shape stretches its border with it, and the sides of the ring would
 * come out three times thicker than the top. The library is already in the
 * bundle for the quit icon.
 *
 * Nothing here is interactive. There is no `Pressable`, no touch handler, and
 * no responder anywhere in this tree: the pad is hit-tested by the surface
 * input pipeline like every other tap (M5A), and the whole scene canvas is
 * `pointerEvents="none"`. A Pressable inside the scaled drum art would
 * re-introduce exactly the bubbling-touch coordinate bug M5A fixed.
 *
 * It owns no clock. Every value drawn is a pure function of the round's
 * gameplay time — `pulseClockMs`, which runs negative through the pre-roll and
 * hits zero on `GO` — so the pulse cannot drift away from the judgement, and
 * the countdown beats animate on the same schedule as the scored ones.
 *
 * This draws the pad and nothing else. The Groove score, streak and
 * PERFECT/GOOD text are the HUD's job (`Hud.tsx`, M12) and the countdown
 * numerals are `Countdown.tsx`'s.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, Polygon } from 'react-native-svg';

import {
  BEAT_BAR,
  BEAT_MARKERS,
  GROOVE_PAD,
  GROOVE_PULSE,
  isUnscoredLeadBeat,
} from '../config/rhythm.ts';
import { absolute } from './composition.ts';
import { PAD_SURFACE } from './hudLayout.ts';
import { THEME } from './theme.ts';
import {
  barPosition,
  isPadPulsing,
  judgementFreshness,
  markerOpacity,
  markerTravel,
  padPulse,
  pulseBeatIndex,
  pulseClockMs,
  upcomingBeatIndex,
  type RhythmState,
} from '../state/rhythmState.ts';
import type { RoundState } from '../state/roundState.ts';

/**
 * Resting size of the drawn mark, as a fraction of the tappable ellipse.
 *
 * Chosen so that the swell reaches exactly the tap boundary at its peak:
 * `RING_SCALE * (1 + peakScale) === 1`. That makes the drawn pad and the
 * configured tap area one promise rather than two — nothing this component
 * draws ever reaches past what a tap actually resolves, and nothing stops
 * short of it on the beat. `tests/hudContract.test.ts` holds it there.
 */
const RING_SCALE = 1 / (1 + GROOVE_PULSE.peakScale);

export interface GroovePadProps {
  round: RoundState;
  rhythm: RhythmState;
}

/** An ellipse concentric with the pad, sized as a fraction of its tap area. */
function PadEllipse({
  scale,
  opacity,
  color,
  strokeWidth,
  filled = false,
}: {
  scale: number;
  opacity: number;
  color: string;
  strokeWidth: number;
  filled?: boolean;
}) {
  return (
    <Ellipse
      cx={GROOVE_PAD.centerX}
      cy={GROOVE_PAD.centerY}
      rx={GROOVE_PAD.halfWidthPx * scale}
      ry={GROOVE_PAD.halfHeightPx * scale}
      stroke={strokeWidth > 0 ? color : 'none'}
      strokeWidth={strokeWidth}
      fill={filled ? color : 'none'}
      opacity={opacity}
    />
  );
}

/**
 * The pair of markers that slide inward along the pad's axis and touch at its
 * centre exactly on the beat (M16).
 *
 * Triangles rather than dots, because a triangle says which way it is going
 * and therefore where it will be — half of what makes the cue predictive. The
 * other half is that `markerTravel` is linear.
 */
function BeatMarkers({ travel }: { travel: number }) {
  const opacity = markerOpacity(travel);
  if (opacity <= 0) return null;

  const meetOffset = BEAT_MARKERS.widthPx / 2;
  const startOffset = BEAT_MARKERS.startFraction * GROOVE_PAD.halfWidthPx;
  const offset = meetOffset + travel * (startOffset - meetOffset);

  const cy = GROOVE_PAD.centerY;
  const halfHeight = BEAT_MARKERS.heightPx / 2;
  const width = BEAT_MARKERS.widthPx;

  // Each triangle's apex points at the centre, so the two apexes are what
  // meet. Written as explicit points rather than a mirrored transform: the
  // native and web SVG renderers disagree about nested transform origins, and
  // a cue that lands 30 px off on one platform is worse than four numbers.
  const leftX = GROOVE_PAD.centerX - offset;
  const rightX = GROOVE_PAD.centerX + offset;

  return (
    <>
      <Polygon
        points={`${leftX + width / 2},${cy} ${leftX - width / 2},${cy - halfHeight} ${leftX - width / 2},${cy + halfHeight}`}
        fill={THEME.cymbal}
        opacity={opacity}
      />
      <Polygon
        points={`${rightX - width / 2},${cy} ${rightX + width / 2},${cy - halfHeight} ${rightX + width / 2},${cy + halfHeight}`}
        fill={THEME.cymbal}
        opacity={opacity}
      />
    </>
  );
}

/**
 * Four marks inside the pad showing where in the bar this beat falls (M16).
 *
 * The lit mark changes *on* the beat rather than ahead of it, so the counter
 * confirms what just happened while the markers predict what is coming — two
 * different jobs that would fight each other if both were predictive.
 *
 * Beat 1 is drawn larger, because a bar the player cannot find the start of is
 * four blinks rather than a phrase.
 */
function BarCounter({ beatIndex, lit }: { beatIndex: number; lit: boolean }) {
  const current = lit ? barPosition(beatIndex) : 0;
  const cy = GROOVE_PAD.centerY + BEAT_BAR.offsetY;
  const first = -((BEAT_BAR.beats - 1) / 2) * BEAT_BAR.spacingPx;

  return (
    <>
      {Array.from({ length: BEAT_BAR.beats }, (_, index) => {
        const position = index + 1;
        const isDownbeat = position === 1;
        const isCurrent = position === current;
        return (
          <Circle
            key={position}
            cx={GROOVE_PAD.centerX + first + index * BEAT_BAR.spacingPx}
            cy={cy}
            r={BEAT_BAR.radiusPx * (isDownbeat ? 1.35 : 1)}
            fill={isCurrent ? THEME.cymbal : THEME.hudText}
            /*
             * The unlit marks were 0.22 and effectively invisible on a device.
             * Verified headless at 923x411 — the smallest real target viewport
             * — where each mark is about four pixels across: the lit one read,
             * the other three did not, so the row showed a single dot drifting
             * rather than a position in a bar. A counter you cannot see the
             * empty slots of is not a counter.
             */
            opacity={isCurrent ? 1 : 0.5}
            /*
             * The row crosses the snare's cream head, the black kick head and
             * the red shell inside its own width, so no single fill survives
             * the whole run. A dark contour does.
             */
            stroke={THEME.letterbox}
            strokeWidth={2.5}
            strokeOpacity={isCurrent ? 0.9 : 0.55}
          />
        );
      })}
    </>
  );
}

export function GroovePad({ round, rhythm }: GroovePadProps) {
  const clockMs = pulseClockMs(round.state, round.elapsedMs, round.countdownMs);
  const pulsing = isPadPulsing(round.state);

  // One clock, read three ways: the swell, the confirmation flash, and which
  // beat is being counted toward all come off the same gameplay time.
  const pulse = pulsing ? padPulse(clockMs) : 0;
  const flash = judgementFreshness(rhythm, round.elapsedMs, GROOVE_PULSE.hitFlashMs);
  const judgement = rhythm.lastJudgement;

  // The GO beat and the pre-roll beats are pulsed but never scored, and are
  // marked dimmer so the player is not waiting for points that cannot come.
  const leadIn = pulsing && (clockMs < 0 || isUnscoredLeadBeat(upcomingBeatIndex(clockMs)));
  const swell = RING_SCALE * (1 + pulse * GROOVE_PULSE.peakScale);

  return (
    <View pointerEvents="none" style={styles.layer}>
      <Svg
        pointerEvents="none"
        width={PAD_SURFACE.width}
        height={PAD_SURFACE.height}
        viewBox={`${PAD_SURFACE.x} ${PAD_SURFACE.y} ${PAD_SURFACE.width} ${PAD_SURFACE.height}`}
      >
        {/**
         * Resting mark. Always visible, so the pad is findable before the
         * first beat and during a stage-light peak — the overlay above it
         * swings only 0.58-0.72 opacity, but a mark drawn purely by the pulse
         * would vanish between beats and the player would lose the pad.
         */}
        <PadEllipse scale={RING_SCALE} opacity={0.4} color={THEME.hudText} strokeWidth={4} />

        {/**
         * The swell. Scale *and* brightness, never colour alone (M12).
         *
         * Its stroke came down from 10 to 6 in M16. It is no longer the cue —
         * the markers are — and it now does the job it was always better at:
         * confirming, a frame later, that the beat the player just tapped on
         * was the beat. Two heavy signals on one small pad is how M13.1's
         * readability problem came back the second time.
         */}
        <PadEllipse
          scale={swell}
          opacity={0.25 + pulse * 0.75}
          color={leadIn ? THEME.hudDim : THEME.cymbal}
          strokeWidth={6}
        />

        {/** Glow inside the ring, so the pad brightens rather than just growing. */}
        <PadEllipse
          scale={swell * 0.86}
          opacity={pulse * 0.3}
          color={THEME.cymbal}
          strokeWidth={0}
          filled
        />

        {/**
         * Where in the bar this beat falls. Drawn under the markers and the
         * flash, because it is reference rather than cue.
         */}
        <BarCounter beatIndex={pulseBeatIndex(clockMs)} lit={pulsing} />

        {/**
         * The cue itself: two markers converging on the centre, touching on
         * the beat. Mounted only while the pad is animating, so a title screen
         * and a results overlay draw nothing that moves.
         */}
        {pulsing && <BeatMarkers travel={markerTravel(clockMs)} />}

        {/**
         * Confirmation that a tap actually landed on a beat: a ring that
         * expands out to the tap boundary as it fades, and never past it.
         */}
        {flash > 0 && judgement !== null && (
          <PadEllipse
            scale={RING_SCALE + (1 - flash) * (1 - RING_SCALE)}
            opacity={flash * 0.85}
            color={judgement.grade === 'perfect' ? THEME.integrityFull : THEME.burst}
            strokeWidth={8}
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    // Android rasterizes the SVG at its native size before the parent scales
    // the scene. Do not allocate a full-screen bitmap for a small ellipse.
    ...absolute(PAD_SURFACE),
  },
});
