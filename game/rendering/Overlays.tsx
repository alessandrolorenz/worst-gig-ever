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
import type { RoundState } from '../state/roundState.ts';

interface OverlayProps {
  state: GameState;
  round: RoundState;
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

function Summary({ round }: { round: RoundState }) {
  return (
    <View style={styles.summary}>
      <SummaryRow label="Score" value={String(round.score)} />
      <SummaryRow label="Best combo" value={String(round.bestCombo)} />
      <SummaryRow label="Objects destroyed" value={String(round.targetsDestroyed)} />
      <SummaryRow label="Misses" value={String(round.misses)} />
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
  const { state, round, audioAvailable } = props;

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
        <Text style={styles.kicker}>WORST BAND EVER</Text>
        <Text style={styles.title}>Survive the worst gig ever.</Text>
        <Text style={styles.body}>
          Tap the bottles and mugs before they reach your kit.{'\n'}
          Three get through and the show is over.
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
        <Summary round={round} />
        <Button label="Resume" onPress={props.onResume} />
        <Button label="Quit to title" onPress={props.onQuit} tone="secondary" icon />
      </View>
    );
  }

  const complete = state === 'SHOW_COMPLETE';
  return (
    <View style={styles.scrim}>
      <Text style={[styles.title, { color: complete ? THEME.integrityFull : THEME.accent }]}>
        {complete ? 'Show Complete' : 'Show Ruined'}
      </Text>
      <Text style={styles.body}>
        {complete
          ? 'You survived the whole song. Barely.'
          : 'The kit took too many hits. The crowd noticed.'}
      </Text>
      <Summary round={round} />
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
  kicker: {
    color: THEME.accent,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 6,
  },
  title: {
    color: THEME.hudText,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
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
  summary: {
    minWidth: 320,
    marginBottom: 22,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 236, 216, 0.12)',
  },
  summaryLabel: { color: THEME.hudDim, fontSize: 16 },
  summaryValue: { color: THEME.hudText, fontSize: 16, fontWeight: '700' },
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
