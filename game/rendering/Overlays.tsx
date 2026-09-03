/**
 * Every screen that is not the round itself, plus the pause control.
 *
 * Rendered as engine children rather than inside the scaled canvas: they sit
 * above the play surface, so their touches never reach the game, and their
 * text stays readable at device scale instead of being scaled with the
 * 1920x1080 canvas.
 *
 * M15 turned this from "the overlay for the current round state" into the
 * app's screen switch. The order it reads in is the order the player meets
 * them: story, title, briefing, then the round's own overlays.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';

import { QuitSVG } from '../../assets/SVG/QuitSVG';
import { THEME } from './theme.ts';
import { StoryIntro } from './StoryIntro.tsx';
import type { GameState } from '../state/gameState.ts';
import type { AppFlowState } from '../state/appFlow.ts';
import { isStageCleared } from '../state/appFlow.ts';
import type { StoryState } from '../state/storyState.ts';
import { STAGES, hasNextStage, type StageDefinition } from '../levels/stages.ts';
import {
  judgedBeats,
  meanAbsTimingErrorMs,
  type RhythmState,
} from '../state/rhythmState.ts';
import type { RoundState } from '../state/roundState.ts';

interface OverlayProps {
  flow: AppFlowState;
  /** The stage the mounted round belongs to. */
  stage: StageDefinition;
  /** The round's own state, which decides the in-round overlays. */
  state: GameState;
  round: RoundState;
  rhythm: RhythmState;
  story: StoryState;
  audioAvailable: boolean;
  onStoryAdvance(): void;
  onStorySkip(): void;
  onSelectStage(index: number): void;
  onReplayStory(): void;
  onShowBriefing(): void;
  onBeginRound(): void;
  onBackToTitle(): void;
  onPause(): void;
  onResume(): void;
  onRestart(): void;
  onNextStage(): void;
  onQuit(): void;
}

function Button({
  label,
  onPress,
  tone = 'primary',
  icon = false,
  compact = false,
}: {
  label: string;
  onPress(): void;
  tone?: 'primary' | 'secondary';
  icon?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        compact && styles.buttonCompact,
        pressed && styles.buttonPressed,
      ]}
    >
      <View style={styles.buttonRow}>
        {icon && <QuitSVG color={THEME.hudDim} size={18} />}
        <Text
          style={[
            styles.buttonText,
            tone === 'secondary' && styles.buttonTextSecondary,
            compact && styles.buttonTextCompact,
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
 * One stage on the title screen: its number, its name, and what it asks for.
 *
 * Nothing here is locked. See `appFlow.ts` — a progression that cannot survive
 * a relaunch must not be allowed to block one. The tick mark is the only thing
 * clearing a stage changes on this screen.
 */
function StageButton({
  stage,
  cleared,
  onPress,
}: {
  stage: StageDefinition;
  cleared: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.stageCard, pressed && styles.buttonPressed]}
    >
      <Text style={styles.stageNumber}>
        STAGE {stage.number}
        {cleared ? '  ✓' : ''}
      </Text>
      <Text style={styles.stageName}>{stage.name}</Text>
      <Text style={styles.stageSubtitle}>{stage.subtitle}</Text>
    </Pressable>
  );
}

/**
 * The performances this stage actually asked for, side by side and never added
 * together (M12).
 *
 * Both columns read straight off the domain, so a number here cannot disagree
 * with the number the rules used. There is no combined score and no overall
 * grade: hiding one dimension behind a blend would defeat the point of the
 * pivot, which is to see whether the player is good at one job, the other, or
 * both.
 *
 * On a defense-only stage the Groove column is not printed at all rather than
 * printed as zeroes (M15) — a 0 / 0 next to "beats missed" would read as a
 * failure at something the stage never offered.
 */
function Summary({
  round,
  rhythm,
  grooveEnabled,
}: {
  round: RoundState;
  rhythm: RhythmState;
  grooveEnabled: boolean;
}) {
  const meanError = meanAbsTimingErrorMs(rhythm);

  return (
    <View style={styles.summary}>
      {grooveEnabled && (
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
      )}

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
  const { flow, stage, state, round, rhythm, story, audioAvailable } = props;

  if (flow.screen === 'STORY') {
    return (
      <StoryIntro story={story} onAdvance={props.onStoryAdvance} onSkip={props.onStorySkip} />
    );
  }

  if (flow.screen === 'TITLE') {
    return (
      <View style={styles.scrim}>
        <Text style={styles.title}>WORST GIG EVER</Text>
        <Text style={styles.tagline}>Keep the beat. Survive the gig.</Text>
        <View style={styles.stageRow}>
          {STAGES.map((entry, index) => (
            <StageButton
              key={entry.id}
              stage={entry}
              cleared={isStageCleared(flow, index)}
              onPress={() => props.onSelectStage(index)}
            />
          ))}
        </View>
        <View style={styles.buttonRowLayout}>
          <Button label="How to play" onPress={props.onShowBriefing} tone="secondary" compact />
          <Button label="Story" onPress={props.onReplayStory} tone="secondary" compact />
        </View>
        {!audioAvailable && (
          <Text style={styles.warning}>
            Audio unavailable in this build — rebuild the development client to hear the show.
          </Text>
        )}
      </View>
    );
  }

  /*
   * The briefing card: what this stage asks for, immediately before it starts.
   *
   * Per stage rather than one rulebook at the title, because the two stages
   * ask for different things and the second one only needs to name what is
   * new. Reachable from the title too, for a player who wants to re-read it
   * without starting a round.
   */
  if (flow.screen === 'BRIEFING') {
    return (
      <View style={styles.scrim}>
        <Text style={styles.briefingKicker}>STAGE {stage.number}</Text>
        <Text style={styles.briefingTitle}>{stage.name}</Text>
        <ScrollView
          style={styles.briefingScroll}
          contentContainerStyle={styles.briefingList}
          showsVerticalScrollIndicator={false}
        >
          {stage.briefing.map((line) => (
            <View key={line} style={styles.briefingItem}>
              <Text style={styles.briefingBullet}>▸</Text>
              <Text style={styles.briefingText}>{line}</Text>
            </View>
          ))}
        </ScrollView>
        <View style={styles.buttonRowLayout}>
          <Button label="Start the show" onPress={props.onBeginRound} />
          <Button label="Back" onPress={props.onBackToTitle} tone="secondary" compact />
        </View>
      </View>
    );
  }

  if (state === 'PLAYING' || state === 'VOCALIST_EVENT') {
    return (
      <View style={styles.hudControls} pointerEvents="box-none">
        <Pressable onPress={props.onPause} style={styles.pauseButton}>
          <Text style={styles.pauseGlyph}>| |</Text>
        </Pressable>
      </View>
    );
  }

  /*
   * The pre-roll shows the scene and nothing else (M13.1). No scrim, because
   * the point of the countdown is to let the player read the stage before it
   * fills up, and deliberately no pause control: there is nothing yet to
   * pause, and a button appearing for three seconds and then moving would be
   * worse than not having one.
   */
  if (state === 'COUNTDOWN') return null;

  /*
   * READY inside the ROUND screen is the instant between the briefing's Start
   * and the pre-roll actually beginning, and after a quit that has reset the
   * round but not yet swapped the screen. Nothing to draw either way.
   */
  if (state === 'READY') return null;

  if (state === 'PAUSED') {
    return (
      <View style={styles.scrim}>
        <Text style={styles.title}>Paused</Text>
        <Summary round={round} rhythm={rhythm} grooveEnabled={stage.groove} />
        <View style={styles.buttonRowLayout}>
          <Button label="Resume" onPress={props.onResume} />
          <Button label="Quit to title" onPress={props.onQuit} tone="secondary" icon />
        </View>
      </View>
    );
  }

  const complete = state === 'SHOW_COMPLETE';
  const nextStageWaiting = complete && hasNextStage(flow.stageIndex);

  return (
    <View style={styles.scrim}>
      <Text style={[styles.title, { color: complete ? THEME.integrityFull : THEME.accent }]}>
        {nextStageWaiting ? `STAGE ${stage.number} CLEARED` : complete ? 'SHOW COMPLETE' : 'SHOW RUINED'}
      </Text>
      <Text style={styles.body}>{outcomeLine(stage, complete, nextStageWaiting)}</Text>
      <Summary round={round} rhythm={rhythm} grooveEnabled={stage.groove} />
      <View style={styles.buttonRowLayout}>
        {nextStageWaiting ? (
          <Button label="Next stage" onPress={props.onNextStage} />
        ) : (
          <Button label={complete ? 'Play again' : 'Retry stage'} onPress={props.onRestart} />
        )}
        <Button label="Quit to title" onPress={props.onQuit} tone="secondary" icon />
      </View>
    </View>
  );
}

/**
 * The one line under the outcome title.
 *
 * Stage-aware, because the encouragement after a defense-only stage must not
 * tell the player they failed to keep a beat they were never asked for.
 */
function outcomeLine(stage: StageDefinition, complete: boolean, nextStageWaiting: boolean): string {
  if (nextStageWaiting) return 'You can hold the line. Now do it while you drum.';
  if (complete) return 'You kept the groove alive. Somehow.';
  if (!stage.groove) return 'The kit took three hits. Watch the crowd, not the floor.';
  return 'The gig fell apart. Try to keep the beat while you defend the kit.';
}

const styles = StyleSheet.create({
  /*
   * Sized for the shortest viewport this actually runs on. A 1080p phone in
   * landscape at 420 dpi is 923 x 411 *dp*, not pixels — so the whole results
   * screen has 411 dp of height to work with. The M12 summary overflowed it
   * and clipped the outcome title off the top and the quit button off the
   * bottom, which is how the emulator run for M13 found it. Everything below
   * is measured against that budget, and M15's two new screens are measured
   * against it too: the title spends 30 + 16 on its heading and the rest on
   * two button rows, and the briefing's list scrolls rather than growing.
   */
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlayScrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 10,
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
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 2,
  },
  tagline: {
    color: THEME.accent,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    color: THEME.hudDim,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 10,
  },
  warning: {
    color: THEME.burst,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 460,
  },

  /** Title screen: the stages, side by side. */
  stageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  stageCard: {
    minWidth: 210,
    maxWidth: 260,
    marginHorizontal: 8,
    marginVertical: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.accent,
    backgroundColor: 'rgba(255, 80, 100, 0.12)',
  },
  stageNumber: {
    color: THEME.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  stageName: {
    color: THEME.hudText,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stageSubtitle: {
    color: THEME.hudDim,
    fontSize: 12,
    marginTop: 1,
  },

  /** Briefing card. */
  briefingKicker: {
    color: THEME.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },
  briefingTitle: {
    color: THEME.hudText,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
  },
  /* Scrolls rather than grows, so a longer briefing can never clip a button. */
  briefingScroll: { maxHeight: 150, alignSelf: 'stretch' },
  briefingList: { alignItems: 'center', paddingBottom: 4 },
  briefingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: 560,
    marginBottom: 5,
  },
  briefingBullet: {
    color: THEME.accent,
    fontSize: 14,
    lineHeight: 20,
    marginRight: 8,
  },
  briefingText: {
    color: THEME.hudText,
    fontSize: 15,
    lineHeight: 20,
    flexShrink: 1,
  },

  /**
   * Two columns rather than one list. In landscape the width is there, and
   * side by side is what makes the two dimensions read as two performances
   * instead of one long tally. It wraps on a narrow viewport rather than
   * clipping, and centres itself when a stage supplies only one column.
   */
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryColumn: {
    minWidth: 280,
    maxWidth: 330,
    marginHorizontal: 14,
  },
  summaryHeading: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 5,
    marginBottom: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(244, 236, 216, 0.12)',
  },
  summaryLabel: { color: THEME.hudDim, fontSize: 13 },
  summaryValue: { color: THEME.hudText, fontSize: 13, fontWeight: '700' },
  summaryDetail: {
    color: THEME.hudDim,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
  },
  buttonRowLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: THEME.accent,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 24,
    marginTop: 6,
    marginHorizontal: 6,
    minWidth: 200,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: THEME.hudDim,
  },
  buttonCompact: { minWidth: 150, paddingHorizontal: 20, paddingVertical: 8 },
  buttonPressed: { opacity: 0.75 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWithIcon: { marginLeft: 10 },
  buttonText: {
    color: THEME.hudText,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonTextCompact: { fontSize: 14 },
  buttonTextSecondary: { color: THEME.hudDim },
});
