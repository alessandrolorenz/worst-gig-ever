/**
 * Heads-up display.
 *
 * Reads the domain snapshot directly and holds no state of its own, so the
 * numbers on screen can never disagree with the numbers the rules used.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { REFERENCE_CANVAS } from '../config/stage.ts';
import { THEME } from './theme.ts';
import { comboMultiplier, remainingMs, type RoundState } from '../state/roundState.ts';

export function Hud({ round }: { round: RoundState }) {
  const secondsLeft = Math.ceil(remainingMs(round) / 1000);
  const multiplier = comboMultiplier(round.combo);
  const timeFraction = 1 - remainingMs(round) / round.level.durationMs;

  return (
    <View style={styles.root} pointerEvents="none">
      <View style={styles.left}>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.score}>{round.score}</Text>
        {round.combo > 0 && (
          <Text style={styles.combo}>
            {round.combo} HIT COMBO {multiplier > 1 ? `x${multiplier}` : ''}
          </Text>
        )}
      </View>

      <View style={styles.centre}>
        <Text style={styles.timer}>{secondsLeft}s</Text>
        <View style={styles.timerTrack}>
          <View style={[styles.timerFill, { width: `${Math.min(100, timeFraction * 100)}%` }]} />
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.label}>SHOW INTEGRITY</Text>
        <View style={styles.pips}>
          {Array.from({ length: round.level.startingIntegrity }, (_, i) => (
            <View
              key={i}
              style={[
                styles.pip,
                {
                  backgroundColor:
                    i < round.integrity ? THEME.integrityFull : THEME.integrityLost,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: REFERENCE_CANVAS.width,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 56,
    paddingTop: 36,
  },
  left: { minWidth: 420 },
  centre: { alignItems: 'center', minWidth: 420 },
  right: { minWidth: 420, alignItems: 'flex-end' },
  label: {
    color: THEME.hudDim,
    fontSize: 24,
    letterSpacing: 3,
    fontWeight: '600',
  },
  score: {
    color: THEME.hudText,
    fontSize: 74,
    fontWeight: '800',
    lineHeight: 80,
  },
  combo: {
    color: THEME.burst,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 1,
  },
  timer: {
    color: THEME.hudText,
    fontSize: 56,
    fontWeight: '800',
  },
  timerTrack: {
    width: 380,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.integrityLost,
    overflow: 'hidden',
  },
  timerFill: {
    height: 12,
    backgroundColor: THEME.accent,
  },
  pips: {
    flexDirection: 'row',
    marginTop: 10,
  },
  pip: {
    width: 62,
    height: 30,
    borderRadius: 8,
    marginLeft: 14,
  },
});
