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
import Svg, { Ellipse } from 'react-native-svg';

import { GROOVE_PAD, GROOVE_PULSE, isUnscoredLeadBeat } from '../config/rhythm.ts';
import { absolute } from './composition.ts';
import { PAD_SURFACE } from './hudLayout.ts';
import { THEME } from './theme.ts';
import {
  isPadPulsing,
  judgementFreshness,
  padPulse,
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

        {/** The swell. Scale *and* brightness, never colour alone (M12). */}
        <PadEllipse
          scale={swell}
          opacity={0.25 + pulse * 0.75}
          color={leadIn ? THEME.hudDim : THEME.cymbal}
          strokeWidth={10}
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
