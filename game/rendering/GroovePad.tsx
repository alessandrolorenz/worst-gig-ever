/**
 * The Groove Pad: a code-drawn pulse over the hi-hat already in the drum-kit
 * art (M10).
 *
 * No new art. The kit stays one bitmap and is not cropped; this draws rings
 * and a glow on top of it, positioned from `GROOVE_PAD` in
 * `game/config/rhythm.ts` — the same circle hit resolution uses, so what the
 * player aims at and what the rules judge are one number.
 *
 * Nothing here is interactive. There is no `Pressable`, no touch handler, and
 * no responder anywhere in this tree: the pad is hit-tested by the surface
 * input pipeline like every other tap (M5A), and the whole scene canvas is
 * `pointerEvents="none"`. A Pressable inside the scaled drum art would
 * re-introduce exactly the bubbling-touch coordinate bug M5A fixed.
 *
 * It owns no clock. Every value drawn is a pure function of the round's
 * gameplay elapsed time, so the pulse cannot drift away from the judgement.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GROOVE_PAD, GROOVE_PULSE, isCountInBeat } from '../config/rhythm.ts';
import { THEME } from './theme.ts';
import {
  isBeatClockRunning,
  judgementFreshness,
  padPulse,
  upcomingBeatIndex,
  type RhythmState,
} from '../state/rhythmState.ts';
import type { RoundState } from '../state/roundState.ts';

/**
 * Resting and peak sizes of the ring that marks the pad.
 *
 * The ring sits a little inside the configured tap radius so the drawn mark
 * never promises more reach than the rule gives — the opposite mistake to the
 * one `tests/composition.test.ts` guards for targets.
 */
const RING_RADIUS = GROOVE_PAD.radiusPx * 0.82;

export interface GroovePadProps {
  round: RoundState;
  rhythm: RhythmState;
}

/**
 * A circle centred on the pad, scaled about its own centre.
 *
 * Sized from a fixed radius and scaled with a transform rather than by
 * animating width/height, so the pulse cannot shift the pad's centre by half a
 * pixel each frame and read as a wobble.
 */
function PadRing({
  radius,
  scale,
  opacity,
  color,
  borderWidth,
  filled = false,
}: {
  radius: number;
  scale: number;
  opacity: number;
  color: string;
  borderWidth: number;
  filled?: boolean;
}) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: GROOVE_PAD.centerX - radius,
        top: GROOVE_PAD.centerY - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: radius,
        borderWidth,
        borderColor: color,
        backgroundColor: filled ? color : 'transparent',
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

export function GroovePad({ round, rhythm }: GroovePadProps) {
  const running = isBeatClockRunning(round.state);
  const elapsedMs = round.elapsedMs;

  // One clock, read three ways: the swell, the confirmation flash, and the
  // judgement label all age off the same gameplay time.
  const pulse = running ? padPulse(elapsedMs) : 0;
  const flash = judgementFreshness(rhythm, elapsedMs, GROOVE_PULSE.hitFlashMs);
  const labelAge = judgementFreshness(rhythm, elapsedMs, GROOVE_PULSE.judgementTextMs);
  const judgement = rhythm.lastJudgement;

  const countingIn = running && isCountInBeat(upcomingBeatIndex(elapsedMs));
  const pulseScale = 1 + pulse * GROOVE_PULSE.peakScale;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {/**
       * Resting mark. Always visible, so the pad is findable before the first
       * beat and during a stage-light peak — the overlay above it swings only
       * 0.58-0.72 opacity, but a mark drawn purely by the pulse would vanish
       * between beats and the player would lose the pad.
       */}
      <PadRing
        radius={RING_RADIUS}
        scale={1}
        opacity={0.4}
        color={THEME.hudText}
        borderWidth={4}
      />

      {/** The swell. Scale *and* brightness, never colour alone (M12). */}
      <PadRing
        radius={RING_RADIUS}
        scale={pulseScale}
        opacity={0.25 + pulse * 0.75}
        color={countingIn ? THEME.hudDim : THEME.cymbal}
        borderWidth={10}
      />

      {/** Glow inside the ring, so the pad brightens rather than just growing. */}
      <PadRing
        radius={RING_RADIUS * 0.86}
        scale={pulseScale}
        opacity={pulse * 0.3}
        color={THEME.cymbal}
        borderWidth={0}
        filled
      />

      {/** Confirmation that a tap actually landed on a beat. */}
      {flash > 0 && judgement !== null && (
        <PadRing
          radius={RING_RADIUS}
          scale={1 + (1 - flash) * 0.5}
          opacity={flash * 0.85}
          color={judgement.grade === 'perfect' ? THEME.integrityFull : THEME.burst}
          borderWidth={8}
        />
      )}

      {countingIn && (
        <Text style={[styles.countIn, { opacity: 0.35 + pulse * 0.65 }]}>COUNT IN</Text>
      )}

      {/**
       * PERFECT / GOOD as words, not only as a colour (M12 accessibility), and
       * placed above the pad so it never covers the mark the player is aiming
       * at while they are still tapping it.
       */}
      {labelAge > 0 && judgement !== null && (
        <Text
          style={[
            styles.judgement,
            {
              opacity: labelAge,
              color: judgement.grade === 'perfect' ? THEME.integrityFull : THEME.burst,
            },
          ]}
        >
          {judgement.grade === 'perfect' ? 'PERFECT' : 'GOOD'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  judgement: {
    position: 'absolute',
    left: GROOVE_PAD.centerX - 200,
    top: GROOVE_PAD.centerY - GROOVE_PAD.radiusPx - 62,
    width: 400,
    textAlign: 'center',
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: 3,
    textShadowColor: THEME.letterbox,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  countIn: {
    position: 'absolute',
    left: GROOVE_PAD.centerX - 200,
    top: GROOVE_PAD.centerY - GROOVE_PAD.radiusPx - 62,
    width: 400,
    textAlign: 'center',
    color: THEME.hudText,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 4,
    textShadowColor: THEME.letterbox,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
});
