/**
 * Heads-up display: two independent performances, side by side (M12).
 *
 * Reads the domain snapshots directly and holds no state of its own, so the
 * numbers on screen can never disagree with the numbers the rules used.
 *
 * There is deliberately **no combined total**. The pivot exists to find out
 * whether Groove and Defense are fun together, and a single blended number
 * would hide exactly the thing being measured — a player who is good at one
 * and bad at the other must be able to see that at a glance.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { GROOVE_PULSE, isUnscoredLeadBeat } from '../config/rhythm.ts';
import { REFERENCE_CANVAS } from '../config/stage.ts';
import { GROOVE_PANEL, GROOVE_PANEL_ROWS, HUD_MARGIN, HUD_TYPE } from './hudLayout.ts';
import { THEME } from './theme.ts';
import { format } from '../i18n/format.ts';
import { useStrings } from '../i18n/LocaleContext.tsx';
import {
  isPadPulsing,
  judgementFreshness,
  pulseClockMs,
  upcomingBeatIndex,
  type RhythmState,
} from '../state/rhythmState.ts';
import { comboMultiplier, remainingMs, type RoundState } from '../state/roundState.ts';

export function Hud({
  round,
  rhythm,
  grooveEnabled,
}: {
  round: RoundState;
  rhythm: RhythmState;
  grooveEnabled: boolean;
}) {
  const strings = useStrings();
  const secondsLeft = Math.ceil(remainingMs(round) / 1000);
  const multiplier = comboMultiplier(round.combo);
  const timeFraction = 1 - remainingMs(round) / round.level.durationMs;

  return (
    <>
      <View style={styles.root} pointerEvents="none">
        <View style={styles.left}>
          <Text style={styles.label}>{strings.hud.defense}</Text>
          <Text style={styles.score}>{round.score}</Text>
          {/* Fixed-height row, so the combo appearing cannot move the score. */}
          <View style={styles.comboRow}>
            {round.combo > 0 && (
              <Text style={styles.combo}>
                {multiplier > 1
                  ? format(strings.hud.comboMultiplied, { count: round.combo, multiplier })
                  : format(strings.hud.combo, { count: round.combo })}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.centre}>
          <Text style={styles.timer}>{format(strings.hud.secondsLeft, { seconds: secondsLeft })}</Text>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${Math.min(100, timeFraction * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.label}>{strings.hud.showIntegrity}</Text>
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

      {/**
       * One readout on a defense-only stage (M15). A GROOVE column reading 0
       * with no pad on screen would tell the player they were failing a job
       * nobody gave them.
       */}
      {grooveEnabled && <GrooveHud round={round} rhythm={rhythm} />}
    </>
  );
}

/**
 * The Groove readout, stacked directly above the pad.
 *
 * Every row has a fixed height and the panel has a fixed box, so a score
 * gaining a digit, a streak appearing, or a PERFECT flashing cannot shift
 * anything else (M12, no layout jumps). It sits above the pad rather than
 * beside it because to the right of the hi-hat is where lane 430 and lane 700
 * targets arrive — see `hudLayout.ts`.
 */
function GrooveHud({ round, rhythm }: { round: RoundState; rhythm: RhythmState }) {
  const strings = useStrings();
  const clockMs = pulseClockMs(round.state, round.elapsedMs, round.countdownMs);
  const leadIn =
    isPadPulsing(round.state) && (clockMs < 0 || isUnscoredLeadBeat(upcomingBeatIndex(clockMs)));
  const labelAge = judgementFreshness(rhythm, round.elapsedMs, GROOVE_PULSE.judgementTextMs);
  const judgement = rhythm.lastJudgement;

  return (
    <View style={styles.groovePanel} pointerEvents="none">
      <Text style={styles.grooveLabel}>{strings.hud.groove}</Text>
      <Text style={styles.grooveScore}>{rhythm.score}</Text>

      <View style={styles.grooveStreakRow}>
        {rhythm.streak > 0 && (
          <Text style={styles.grooveStreak}>
            {format(strings.hud.beatStreak, { count: rhythm.streak })}
          </Text>
        )}
      </View>

      {/*
       * PERFECT / GOOD as words, never as colour alone (M12 accessibility).
       * The pre-roll shares the row, so the player is told that the beats they
       * are being counted in on do not score, instead of wondering why they
       * scored nothing (M13.1).
       */}
      <View style={styles.grooveJudgementRow}>
        {leadIn ? (
          <Text style={styles.grooveLeadIn}>{strings.hud.getReady}</Text>
        ) : (
          labelAge > 0 &&
          judgement !== null && (
            <Text
              style={[
                styles.grooveJudgement,
                {
                  opacity: labelAge,
                  color: judgement.grade === 'perfect' ? THEME.integrityFull : THEME.burst,
                },
              ]}
            >
              {judgement.grade === 'perfect' ? strings.hud.perfect : strings.hud.good}
            </Text>
          )
        )}
      </View>
    </View>
  );
}

const shadow = {
  textShadowColor: THEME.letterbox,
  textShadowOffset: { width: 2, height: 2 },
  textShadowRadius: 6,
} as const;

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: REFERENCE_CANVAS.width,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: HUD_MARGIN.x,
    paddingTop: HUD_MARGIN.top,
  },
  /*
   * A minimum and, since M20, a maximum. Without the maximum a longer locale's
   * combo label did not wrap — it grew toward the timer in the centre of the
   * screen, which is a collision rather than a clip and is worse. The width is
   * bounded well clear of the centre column: the left rail starts at
   * `HUD_MARGIN.x` and the centred column begins at 750 on the reference
   * canvas.
   */
  left: { minWidth: HUD_TYPE.columnMinWidth, maxWidth: HUD_TYPE.columnMaxWidth },
  centre: {
    alignItems: 'center',
    minWidth: HUD_TYPE.columnMinWidth,
    maxWidth: HUD_TYPE.columnMaxWidth,
  },
  right: {
    minWidth: HUD_TYPE.columnMinWidth,
    maxWidth: HUD_TYPE.columnMaxWidth,
    alignItems: 'flex-end',
  },
  label: {
    color: THEME.hudDim,
    fontSize: HUD_TYPE.label.fontSize,
    letterSpacing: 3,
    fontWeight: '600',
    ...shadow,
  },
  score: {
    color: THEME.hudText,
    fontSize: 74,
    fontWeight: '800',
    lineHeight: 80,
    ...shadow,
  },
  comboRow: { height: 38, justifyContent: 'center' },
  combo: {
    color: THEME.burst,
    fontSize: HUD_TYPE.combo.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
    ...shadow,
  },
  timer: {
    color: THEME.hudText,
    fontSize: 56,
    fontWeight: '800',
    ...shadow,
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

  groovePanel: {
    position: 'absolute',
    left: GROOVE_PANEL.x,
    top: GROOVE_PANEL.y,
    width: GROOVE_PANEL.width,
    height: GROOVE_PANEL.height,
    justifyContent: 'flex-end',
  },
  grooveLabel: {
    height: GROOVE_PANEL_ROWS.label,
    color: THEME.cymbal,
    fontSize: HUD_TYPE.groove.label.fontSize,
    letterSpacing: 4,
    fontWeight: '800',
    ...shadow,
  },
  grooveScore: {
    height: GROOVE_PANEL_ROWS.score,
    color: THEME.hudText,
    fontSize: 62,
    lineHeight: 70,
    fontWeight: '800',
    ...shadow,
  },
  grooveStreakRow: { height: GROOVE_PANEL_ROWS.streak, justifyContent: 'center' },
  grooveStreak: {
    color: THEME.cymbal,
    fontSize: HUD_TYPE.groove.streak.fontSize,
    fontWeight: '700',
    letterSpacing: 1,
    ...shadow,
  },
  grooveJudgementRow: { height: GROOVE_PANEL_ROWS.judgement, justifyContent: 'center' },
  grooveJudgement: {
    fontSize: HUD_TYPE.groove.judgement.fontSize,
    fontWeight: '900',
    letterSpacing: 3,
    ...shadow,
  },
  grooveLeadIn: {
    color: THEME.hudDim,
    fontSize: HUD_TYPE.groove.leadIn.fontSize,
    fontWeight: '800',
    letterSpacing: 4,
    ...shadow,
  },
});
