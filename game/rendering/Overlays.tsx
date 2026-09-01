/**
 * Round overlays and the pause control.
 *
 * Rendered as engine children rather than inside the scaled canvas: they sit
 * above the play surface, so their touches never reach the game, and their
 * text stays readable at device scale instead of being scaled with the
 * 1920x1080 canvas.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { QuitSVG } from '../../assets/SVG/QuitSVG';
import { THEME } from './theme.ts';
import type { GameState } from '../state/gameState.ts';
import {
  judgedBeats,
  meanAbsTimingErrorMs,
  type RhythmState,
} from '../state/rhythmState.ts';
import type { RoundState } from '../state/roundState.ts';

interface OverlayProps {
  state: GameState;
  round: RoundState;
  rhythm: RhythmState;
  audioAvailable: boolean;
  onStart(): void;
  onPause(): void;
  onResume(): void;
  onRestart(): void;
  onQuit(): void;
}

function Button({
  label,
  onPress,
  tone = 'primary',
  icon = false,
}: {
  label: string;
  onPress(): void;
  tone?: 'primary' | 'secondary';
  icon?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.buttonRow}>
        {icon && <QuitSVG color={THEME.hudDim} size={18} />}
        <Text
          style={[
            styles.buttonText,
            tone === 'secondary' && styles.buttonTextSecondary,
            icon && styles.buttonTextWithIcon,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * The two performances, side by side and never added together (M12).
 *
 * Both columns read straight off the domain, so a number here cannot disagree
 * with the number the rules used. There is no combined score and no overall
 * grade: hiding one dimension behind a blend would defeat the point of the
 * pivot, which is to see whether the player is good at one job, the other, or
 * both.
 */
function Summary({ round, rhythm }: { round: RoundState; rhythm: RhythmState }) {
  const meanError = meanAbsTimingErrorMs(rhythm);

  return (
    <View style={styles.summary}>
      <View style={styles.summaryColumn}>
        <Text style={[styles.summaryHeading, { color: THEME.cymbal }]}>GROOVE</Text>
        <SummaryRow label="Groove score" value={String(rhythm.score)} />
        <SummaryRow label="Beats hit" value={`${rhythm.hits} / ${judgedBeats(rhythm)}`} />
        <SummaryRow label="Perfect" value={String(rhythm.perfects)} />
        <SummaryRow label="Good" value={String(rhythm.goods)} />
        <SummaryRow label="Beats missed" value={String(rhythm.misses)} />
        <SummaryRow label="Best beat streak" value={String(rhythm.bestStreak)} />
        <Text style={styles.summaryDetail}>
          {meanError === null
            ? 'No beats landed this round.'
            : `Average timing ${Math.round(meanError)} ms off the beat.`}
        </Text>
      </View>

      <View style={styles.summaryColumn}>
        <Text style={[styles.summaryHeading, { color: THEME.accent }]}>DEFENSE</Text>
        <SummaryRow label="Defense score" value={String(round.score)} />
        <SummaryRow label="Objects destroyed" value={String(round.targetsDestroyed)} />
        <SummaryRow label="Objects missed" value={String(round.misses)} />
        <SummaryRow label="Best hit combo" value={String(round.bestCombo)} />
        <Text style={styles.summaryDetail}>
          Show Integrity left: {round.integrity} of {round.level.startingIntegrity}.
        </Text>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function Overlays(props: OverlayProps) {
  const { state, round, rhythm, audioAvailable } = props;

  if (state === 'PLAYING' || state === 'VOCALIST_EVENT') {
    return (
      <View style={styles.hudControls} pointerEvents="box-none">
        <Pressable onPress={props.onPause} style={styles.pauseButton}>
          <Text style={styles.pauseGlyph}>| |</Text>
        </Pressable>
      </View>
    );
  }

  if (state === 'READY') {
    return (
      <View style={styles.scrim}>
        <Text style={styles.title}>WORST GIG EVER</Text>
        <Text style={styles.tagline}>Keep the beat. Survive the gig.</Text>
        <Text style={styles.body}>
          Tap the pulsing cymbal on the beat.{'\n'}
          Break bottles before they hit your kit.
        </Text>
        <Button label="Start the show" onPress={props.onStart} />
        {!audioAvailable && (
          <Text style={styles.warning}>
            Audio unavailable in this build — rebuild the development client to hear the show.
          </Text>
        )}
      </View>
    );
  }

  if (state === 'PAUSED') {
    return (
      <View style={styles.scrim}>
        <Text style={styles.title}>Paused</Text>
        <Summary round={round} rhythm={rhythm} />
        <Button label="Resume" onPress={props.onResume} />
        <Button label="Quit to title" onPress={props.onQuit} tone="secondary" icon />
      </View>
    );
  }

  const complete = state === 'SHOW_COMPLETE';
  return (
    <View style={styles.scrim}>
      <Text style={[styles.title, { color: complete ? THEME.integrityFull : THEME.accent }]}>
        {complete ? 'SHOW COMPLETE' : 'SHOW RUINED'}
      </Text>
      <Text style={styles.body}>
        {complete
          ? 'You kept the groove alive. Somehow.'
          : 'The gig fell apart. Try to keep the beat while you defend the kit.'}
      </Text>
      <Summary round={round} rhythm={rhythm} />
      <Button label="Play again" onPress={props.onRestart} />
      <Button label="Quit to title" onPress={props.onQuit} tone="secondary" icon />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hudControls: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    padding: 18,
  },
  pauseButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(8, 7, 12, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.hudDim,
  },
  pauseGlyph: {
    color: THEME.hudText,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    color: THEME.hudText,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 6,
  },
  tagline: {
    color: THEME.accent,
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 14,
  },
  body: {
    color: THEME.hudDim,
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    marginBottom: 20,
  },
  warning: {
    color: THEME.burst,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 18,
    maxWidth: 460,
  },
  /**
   * Two columns rather than one list. In landscape the width is there, and
   * side by side is what makes the two dimensions read as two performances
   * instead of one long tally. It wraps on a narrow viewport rather than
   * clipping.
   */
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 18,
  },
  summaryColumn: {
    minWidth: 300,
    maxWidth: 360,
    marginHorizontal: 18,
    marginBottom: 8,
  },
  summaryHeading: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 236, 216, 0.12)',
  },
  summaryLabel: { color: THEME.hudDim, fontSize: 15 },
  summaryValue: { color: THEME.hudText, fontSize: 15, fontWeight: '700' },
  summaryDetail: {
    color: THEME.hudDim,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  button: {
    backgroundColor: THEME.accent,
    paddingVertical: 14,
    paddingHorizontal: 42,
    borderRadius: 28,
    marginTop: 10,
    minWidth: 260,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: THEME.hudDim,
  },
  buttonPressed: { opacity: 0.75 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWithIcon: { marginLeft: 10 },
  buttonText: {
    color: THEME.hudText,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonTextSecondary: { color: THEME.hudDim },
});
