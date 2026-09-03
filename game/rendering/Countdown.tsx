/**
 * The `3 -> 2 -> 1 -> GO!` pre-roll numerals (M13.1).
 *
 * Presentation only. It owns no clock and no state: the numeral is a pure
 * function of `pulseClockMs`, the same gameplay time the pad pulses from, so
 * the number on screen and the beat the player is being counted into can never
 * disagree.
 *
 * It sits above the pad rather than on it, so the pulse the countdown exists
 * to teach is never covered, and it breathes on the same swell — that shared
 * motion is what makes the numerals and the pad read as one instruction rather
 * than as a timer bolted onto the front of the round (M13.1, "countdown and
 * pulse visually feel related").
 *
 * The box is absolutely positioned and fixed, so nothing here can shift the
 * HUD, and it is simply absent once `GO!` has aged out.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COUNTDOWN, GROOVE_PULSE, countdownStep } from '../config/rhythm.ts';
import { REFERENCE_CANVAS } from '../config/stage.ts';
import { COUNTDOWN_BOX } from './hudLayout.ts';
import { THEME } from './theme.ts';
import { padPulse, pulseClockMs } from '../state/rhythmState.ts';
import type { RoundState } from '../state/roundState.ts';

/** What the countdown is showing right now, or null once it is over. */
export function countdownLabel(round: RoundState): string | null {
  if (round.state === 'COUNTDOWN') return String(countdownStep(round.countdownMs));
  // `GO!` belongs to the round, not the pre-roll: the boundary it marks is the
  // instant the round clock starts, so it is shown against elapsed time.
  if (round.state === 'PLAYING' && round.elapsedMs < COUNTDOWN.goTextMs) return 'GO!';
  return null;
}

export function Countdown({ round }: { round: RoundState }) {
  const label = countdownLabel(round);
  if (label === null) return null;

  const clockMs = pulseClockMs(round.state, round.elapsedMs, round.countdownMs);
  const pulse = padPulse(clockMs);

  return (
    <View pointerEvents="none" style={styles.box}>
      {/*
       * The numeral rides on a dark plate rather than on the stage itself.
       * Drawn straight onto the scene it was barely legible on device: the
       * middle of the canvas is the singer, the crowd and the lights, which is
       * the busiest, brightest area there is, and a shadowed glyph over it
       * reads as part of the artwork. The plate breathes and fades with the
       * numeral, so it is still one object with the pulse rather than a panel.
       */}
      <View
        style={[
          styles.plate,
          {
            opacity: 0.75 + pulse * 0.25,
            transform: [{ scale: 1 + pulse * GROOVE_PULSE.peakScale }],
          },
        ]}
      >
        <Text
          style={[
            styles.numeral,
            { color: label === 'GO!' ? THEME.cymbal : THEME.hudText },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    left: 0,
    top: COUNTDOWN_BOX.y,
    width: REFERENCE_CANVAS.width,
    height: COUNTDOWN_BOX.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plate: {
    paddingHorizontal: 54,
    paddingVertical: 6,
    borderRadius: 40,
    backgroundColor: 'rgba(8, 7, 12, 0.62)',
    borderWidth: 3,
    borderColor: 'rgba(244, 236, 216, 0.22)',
  },
  numeral: {
    fontSize: 170,
    lineHeight: 200,
    fontWeight: '900',
    letterSpacing: 8,
    textAlign: 'center',
    textShadowColor: THEME.letterbox,
    textShadowOffset: { width: 4, height: 4 },
    textShadowRadius: 14,
  },
});
