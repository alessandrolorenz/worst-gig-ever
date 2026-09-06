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
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';

import { QuitSVG } from '../../assets/SVG/QuitSVG';
import { PRODUCT_TITLE } from '../config/product.ts';
import { THEME } from './theme.ts';
import {
  BRIEFING,
  BUTTON,
  OVERLAY_PADDING,
  STAGE_CARD,
  SUMMARY,
} from './overlayLayout.ts';
import type { Catalogue } from '../i18n/catalogue.ts';
import { format } from '../i18n/format.ts';
import { hasLocaleChoice, LOCALE_ENDONYMS } from '../i18n/locales.ts';
import { DevAuditionRow, type AuditionControls } from './DevAudition.tsx';
import { useLocale, useStrings } from '../i18n/LocaleContext.tsx';
import { MUG_DRINK_ART, TARGET_ART } from './artAssets.ts';

/**
 * Briefing pictures, resolved here rather than in `stages.ts` — a stage
 * definition names what the player is taught, not which PNG says it.
 *
 * Both are art the game already ships, so the explanation shows the player the
 * exact objects they are about to see rather than a diagram of them.
 */
const BRIEFING_FIGURE_ART: Record<BriefingFigureId, number> = {
  smash: TARGET_ART.beerMug,
  drink: MUG_DRINK_ART[1],
};
import { StoryIntro } from './StoryIntro.tsx';
import type { GameState } from '../state/gameState.ts';
import type { AppFlowState } from '../state/appFlow.ts';
import { isStageCleared } from '../state/appFlow.ts';
import type { StoryState } from '../state/storyState.ts';
import {
  STAGES,
  hasNextStage,
  type BriefingFigureId,
  type StageDefinition,
} from '../levels/stages.ts';
import {
  judgedBeats,
  meanAbsTimingErrorMs,
  type RhythmState,
} from '../state/rhythmState.ts';
import { resultsArmed, type RoundState } from '../state/roundState.ts';
import { recordFor, type Records } from '../state/records.ts';

interface OverlayProps {
  flow: AppFlowState;
  /** Development-only music audition tooling; `null` in a release build. */
  audition: AuditionControls | null;
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
  onToggleClick(): void;
  onCycleLocale(): void;
  /** Bests per stage, loaded from disk and updated as rounds finish (M22). */
  records: Records;
  /** True when the round just finished set a new best on either dimension. */
  beatRecord: boolean;
  onShare(): void;
}

function Button({
  label,
  onPress,
  tone = 'primary',
  icon = false,
  compact = false,
  disabled = false,
}: {
  label: string;
  onPress(): void;
  tone?: 'primary' | 'secondary';
  icon?: boolean;
  compact?: boolean;
  /** Drawn, readable, and deaf. Used while the results screen is settling. */
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        compact && styles.buttonCompact,
        pressed && !disabled && styles.buttonPressed,
        disabled && styles.buttonDisabled,
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
 * The beat-click switch (M16).
 *
 * The owner asked for the click across the whole game with a way to turn it
 * off, so this is the whole of that: one control, in the two places a player
 * is already stopped — the title and a paused round. Not a settings screen,
 * which the milestone explicitly does not add.
 *
 * It states what is *true*, not what pressing it would do. "Click: on" reads
 * correctly whether or not you are about to press it; "Turn click off" is a
 * sentence about the future that is wrong the moment you have read it.
 */
function ClickToggle({ enabled, onPress }: { enabled: boolean; onPress(): void }) {
  const strings = useStrings();
  return (
    <Button
      label={enabled ? strings.title.clickOn : strings.title.clickOff}
      onPress={onPress}
      tone="secondary"
      compact
    />
  );
}

/**
 * The language control (M19).
 *
 * In the two rows a player is already stopped in — the title and a paused
 * round — and nowhere else. The V2 plan rules out a HUD flourish for it
 * explicitly, and M19 does not add a settings screen.
 *
 * Its label is the endonym of the current language, so the control is the one
 * thing on screen that never needs translating: `English`, then
 * `Português (BR)`. A player who cannot read the current language can still
 * recognise the name of their own.
 *
 * It draws nothing while there is one language, which is M19's own state — the
 * game must look identical when the catalogue lands. `SUPPORTED_LOCALES`
 * gaining `pt-BR` is the whole of what makes it appear.
 */
function LanguageToggle({ onPress }: { onPress(): void }) {
  const locale = useLocale();
  if (!hasLocaleChoice()) return null;
  return <Button label={LOCALE_ENDONYMS[locale]} onPress={onPress} tone="secondary" compact />;
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
  const strings = useStrings();
  const stageStrings = strings.stages[stage.id];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.stageCard, pressed && styles.buttonPressed]}
    >
      <Text style={styles.stageNumber}>
        {format(strings.common.stageNumber, { number: stage.number })}
        {cleared ? '  ✓' : ''}
      </Text>
      <Text style={styles.stageName}>{stageStrings.name}</Text>
      <Text style={styles.stageSubtitle}>{stageStrings.subtitle}</Text>
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
  record,
}: {
  round: RoundState;
  rhythm: RhythmState;
  grooveEnabled: boolean;
  /** This stage's bests, or null before it has ever been finished (M22). */
  record: { defenseScore: number; grooveScore: number | null } | null;
}) {
  const strings = useStrings();
  const summary = strings.summary;
  const meanError = meanAbsTimingErrorMs(rhythm);

  return (
    <View style={styles.summary}>
      {grooveEnabled && (
        <View style={styles.summaryColumn}>
          <Text style={[styles.summaryHeading, { color: THEME.cymbal }]}>{summary.groove}</Text>
          <SummaryRow label={summary.grooveScore} value={String(rhythm.score)} />
          <SummaryRow
            label={summary.beatsHit}
            value={format(summary.beatsHitValue, {
              hits: rhythm.hits,
              judged: judgedBeats(rhythm),
            })}
          />
          <SummaryRow label={summary.perfect} value={String(rhythm.perfects)} />
          <SummaryRow label={summary.good} value={String(rhythm.goods)} />
          <SummaryRow label={summary.beatsMissed} value={String(rhythm.misses)} />
          <SummaryRow label={summary.bestBeatStreak} value={String(rhythm.bestStreak)} />
          {record?.grooveScore !== null && record !== null && (
            <SummaryRow label={summary.best} value={String(record.grooveScore)} />
          )}
          <Text style={styles.summaryDetail}>
            {meanError === null
              ? summary.noBeatsLanded
              : format(summary.averageTiming, { ms: Math.round(meanError) })}
          </Text>
        </View>
      )}

      <View style={styles.summaryColumn}>
        <Text style={[styles.summaryHeading, { color: THEME.accent }]}>{summary.defense}</Text>
        <SummaryRow label={summary.defenseScore} value={String(round.score)} />
        <SummaryRow label={summary.objectsDestroyed} value={String(round.targetsDestroyed)} />
        <SummaryRow label={summary.objectsMissed} value={String(round.misses)} />
        <SummaryRow label={summary.bestHitCombo} value={String(round.bestCombo)} />
        {record !== null && (
          <SummaryRow label={summary.best} value={String(record.defenseScore)} />
        )}
        <Text style={styles.summaryDetail}>
          {format(summary.integrityLeft, {
            left: round.integrity,
            total: round.level.startingIntegrity,
          })}
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

/**
 * The briefing card: what this stage asks for, immediately before it starts.
 *
 * Per stage rather than one rulebook at the title, because the stages ask for
 * different things and a later one only needs to name what is new. Reachable
 * from the title too, for a player who wants to re-read it without starting a
 * round.
 *
 * ## Why this is its own component (M20)
 *
 * It is the only overlay that has to know whether its own content fits. The
 * card takes the height the screen has and scrolls when the text is longer
 * than that, which is what makes it survive a translation — but a scroll
 * nobody can see is the silent clipping this milestone exists to remove, so it
 * measures itself and says when there is more.
 */
function BriefingCard({
  stage,
  onBeginRound,
  onBackToTitle,
}: {
  stage: StageDefinition;
  onBeginRound(): void;
  onBackToTitle(): void;
}) {
  const strings = useStrings();
  const stageStrings = strings.stages[stage.id];

  /*
   * Measured rather than predicted. A budget test can say whether the words
   * *should* fit at a modelled font metric; only the renderer knows whether
   * they did, on this screen, in this language.
   */
  const [cardHeight, setCardHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const hasMore = cardHeight > 0 && contentHeight > cardHeight + 1;

  return (
    <View style={styles.scrim}>
      <Text style={styles.briefingKicker}>
        {format(strings.common.stageNumber, { number: stage.number })}
      </Text>
      <Text style={styles.briefingTitle}>{stageStrings.name}</Text>
      {/**
       * Takes the height the screen has, rather than a fixed 200 (M20).
       *
       * The old constant left about 90 dp of empty screen below the buttons on
       * the shortest viewport this ships to, with the mug rule under the fold —
       * and it was a number reached by raising 150 until stage 1 looked better,
       * which is not a rule any translation can rely on.
       *
       * `persistentScrollbar` keeps Android's indicator drawn instead of
       * fading it seconds after a scroll. It is necessary and it is not
       * sufficient: on this scrim it is dark grey on near-black and a player
       * will not see it, which is why the cue below exists.
       */}
      <ScrollView
        style={styles.briefingScroll}
        contentContainerStyle={styles.briefingList}
        showsVerticalScrollIndicator
        persistentScrollbar
        onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}
        onContentSizeChange={(_width, height) => setContentHeight(height)}
      >
        {stage.briefingFigures !== undefined && (
          <View style={styles.figureRow}>
            {stage.briefingFigures.map((figureId) => (
              <View key={figureId} style={styles.figure}>
                <Image
                  source={BRIEFING_FIGURE_ART[figureId]}
                  style={styles.figureArt}
                  resizeMode="contain"
                  fadeDuration={0}
                />
                <Text style={styles.figureCaption}>{strings.briefingFigures[figureId]}</Text>
              </View>
            ))}
          </View>
        )}
        {stageStrings.briefing.map((line) => (
          <View key={line} style={styles.briefingItem}>
            <Text style={styles.briefingBullet}>▸</Text>
            <Text style={styles.briefingText}>{line}</Text>
          </View>
        ))}
      </ScrollView>
      {/*
       * The row is always drawn and the mark inside it is not, so the card does
       * not jump when the measurement arrives — the same reason the HUD's combo
       * row has a fixed height (M12).
       */}
      <View style={styles.moreCueRow}>{hasMore && <Text style={styles.moreCue}>▾</Text>}</View>
      <View style={styles.buttonRowLayout}>
        <Button label={strings.briefing.start} onPress={onBeginRound} />
        <Button label={strings.common.back} onPress={onBackToTitle} tone="secondary" compact />
      </View>
    </View>
  );
}

export function Overlays(props: OverlayProps) {
  const { flow, stage, state, round, rhythm, story, audioAvailable } = props;
  const strings = useStrings();

  if (flow.screen === 'STORY') {
    return (
      <StoryIntro story={story} onAdvance={props.onStoryAdvance} onSkip={props.onStorySkip} />
    );
  }

  if (flow.screen === 'TITLE') {
    return (
      <View style={styles.scrim}>
        {/* Not a catalogue string: docs/release/product-identity.md forbids
            translating the title, so it is a constant that cannot be. */}
        <Text style={styles.title}>{PRODUCT_TITLE}</Text>
        <Text style={styles.tagline}>{strings.title.tagline}</Text>
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
          <Button
            label={strings.title.howToPlay}
            onPress={props.onShowBriefing}
            tone="secondary"
            compact
          />
          <Button
            label={strings.title.story}
            onPress={props.onReplayStory}
            tone="secondary"
            compact
          />
          <ClickToggle enabled={flow.clickEnabled} onPress={props.onToggleClick} />
          <LanguageToggle onPress={props.onCycleLocale} />
        </View>
        {!audioAvailable && (
          <Text style={styles.warning}>{strings.title.audioUnavailable}</Text>
        )}
        {props.audition !== null && <DevAuditionRow audition={props.audition} />}
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
      <BriefingCard
        stage={stage}
        onBeginRound={props.onBeginRound}
        onBackToTitle={props.onBackToTitle}
      />
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
        <Text style={styles.title}>{strings.pause.title}</Text>
        <Summary
          round={round}
          rhythm={rhythm}
          grooveEnabled={stage.groove}
          record={props.records[stage.id] ?? null}
        />
        <View style={styles.buttonRowLayout}>
          <Button label={strings.pause.resume} onPress={props.onResume} />
          <ClickToggle enabled={flow.clickEnabled} onPress={props.onToggleClick} />
          <LanguageToggle onPress={props.onCycleLocale} />
          <Button label={strings.common.quitToTitle} onPress={props.onQuit} tone="secondary" icon />
        </View>
      </View>
    );
  }

  const complete = state === 'SHOW_COMPLETE';
  const nextStageWaiting = complete && hasNextStage(flow.stageIndex);
  const armed = resultsArmed(round);

  return (
    <View style={styles.scrim}>
      <Text style={[styles.title, { color: complete ? THEME.integrityFull : THEME.accent }]}>
        {nextStageWaiting
          ? format(strings.results.stageCleared, { number: stage.number })
          : complete
            ? strings.results.showComplete
            : strings.results.showRuined}
      </Text>
      <Text style={styles.body}>
        {outcomeLine(strings.results, stage, complete, nextStageWaiting)}
      </Text>
      {/* Only when this round actually beat something (M22). */}
      {props.beatRecord && <Text style={styles.newBest}>{strings.results.newBest}</Text>}
      <Summary
        round={round}
        rhythm={rhythm}
        grooveEnabled={stage.groove}
        record={recordFor(props.records, stage.id)}
      />
      {/**
       * The buttons are drawn immediately and deaf for a moment (M18.1).
       *
       * A stage ends abruptly, and this row lands in the lower centre — over
       * the groove pad the player's finger is already tapping. The next tap of
       * a beat that no longer exists was landing on "Next stage" and skipping
       * a stage nobody chose to leave. The score is readable the whole time;
       * only the presses wait.
       */}
      <View style={styles.buttonRowLayout}>
        {nextStageWaiting ? (
          <Button label={strings.results.nextStage} onPress={props.onNextStage} disabled={!armed} />
        ) : (
          <Button
            label={complete ? strings.results.playAgain : strings.results.retryStage}
            onPress={props.onRestart}
            disabled={!armed}
          />
        )}
        <Button
          label={strings.results.share}
          onPress={props.onShare}
          tone="secondary"
          compact
          disabled={!armed}
        />
        <Button
          label={strings.common.quitToTitle}
          onPress={props.onQuit}
          tone="secondary"
          icon
          disabled={!armed}
        />
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
function outcomeLine(
  results: Catalogue['results'],
  stage: StageDefinition,
  complete: boolean,
  nextStageWaiting: boolean,
): string {
  if (nextStageWaiting) return results.outcomeStageCleared;
  if (complete) return results.outcomeShowComplete;
  if (!stage.groove) return results.outcomeDefenseRuined;
  return results.outcomeGrooveRuined;
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
    paddingHorizontal: OVERLAY_PADDING.horizontal,
    paddingVertical: OVERLAY_PADDING.vertical,
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
  /* One line, in the colour the game uses for something good happening. */
  newBest: {
    color: THEME.integrityFull,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
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
    minWidth: STAGE_CARD.minWidth,
    maxWidth: STAGE_CARD.maxWidth,
    marginHorizontal: STAGE_CARD.marginHorizontal,
    marginVertical: 4,
    paddingVertical: STAGE_CARD.paddingVertical,
    paddingHorizontal: STAGE_CARD.paddingHorizontal,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: THEME.accent,
    backgroundColor: 'rgba(255, 80, 100, 0.12)',
  },
  stageNumber: {
    color: THEME.accent,
    fontSize: STAGE_CARD.number.fontSize,
    fontWeight: '900',
    letterSpacing: 3,
  },
  stageName: {
    color: THEME.hudText,
    fontSize: STAGE_CARD.name.fontSize,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stageSubtitle: {
    color: THEME.hudDim,
    fontSize: STAGE_CARD.subtitle.fontSize,
    marginTop: 1,
  },

  /** Briefing card. */
  briefingKicker: {
    color: THEME.accent,
    fontSize: BRIEFING.kicker.fontSize,
    fontWeight: '900',
    letterSpacing: 4,
  },
  briefingTitle: {
    color: THEME.hudText,
    fontSize: BRIEFING.title.fontSize,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: BRIEFING.title.marginBottom,
  },
  /*
   * Scrolls rather than grows, so a longer briefing can never clip a button —
   * and since M20 it grows to whatever the screen has left before it scrolls.
   *
   * `flexShrink: 1` with no maximum is the whole mechanism: the kicker, the
   * title and the button row are fixed, so the card takes the remainder and
   * gives it back on a smaller screen. `briefingCardHeight()` in
   * `overlayLayout.ts` is the same arithmetic, which is how the budget test
   * knows what this is worth without rendering it.
   *
   * The 200 it replaces was set at M18.1 by raising 150 until stage 1 looked
   * right. It measured 75 dp short on the 411 dp viewport and clipped the mug
   * rule in English — see the M19 emulator run.
   */
  briefingScroll: { flexShrink: 1, alignSelf: 'stretch' },
  /*
   * Inside the scroll, so pictures cost the bullets nothing on the 411 dp
   * viewport the whole results stack is measured against — the list scrolls
   * rather than the card growing.
   */
  figureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingBottom: BRIEFING.figure.rowPaddingBottom,
  },
  figure: { alignItems: 'center', width: BRIEFING.figure.width },
  figureArt: { width: 72, height: BRIEFING.figure.artHeight },
  /*
   * 12, not 10. These two captions are the tightest statement of the mug rule
   * anywhere in the game — "still far away: it smashes" against "within arm's
   * reach: he drinks it" — and they were the smallest text on the card.
   */
  figureCaption: {
    color: THEME.hudText,
    fontSize: BRIEFING.figure.caption.fontSize,
    lineHeight: BRIEFING.figure.caption.lineHeight,
    textAlign: 'center',
    paddingTop: BRIEFING.figure.caption.paddingTop,
  },
  briefingList: { alignItems: 'center', paddingBottom: BRIEFING.list.paddingBottom },
  /*
   * "There is more below", in the one place a player is already looking (M20).
   *
   * Android's scrollbar is drawn persistently on this card and is dark grey on
   * a near-black scrim, which is an affordance only someone who knows it is
   * there can find. This is the same information in the card's own accent.
   */
  moreCueRow: { height: BRIEFING.moreCue.height, justifyContent: 'center' },
  moreCue: {
    color: THEME.accent,
    fontSize: BRIEFING.moreCue.fontSize,
    lineHeight: BRIEFING.moreCue.height,
    textAlign: 'center',
  },
  briefingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: BRIEFING.bullet.maxWidth,
    marginBottom: BRIEFING.bullet.gap,
  },
  briefingBullet: {
    color: THEME.accent,
    fontSize: 14,
    lineHeight: BRIEFING.bullet.lineHeight,
    marginRight: 8,
  },
  briefingText: {
    color: THEME.hudText,
    fontSize: BRIEFING.bullet.fontSize,
    lineHeight: BRIEFING.bullet.lineHeight,
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
    minWidth: SUMMARY.columnMinWidth,
    maxWidth: SUMMARY.columnMaxWidth,
    marginHorizontal: SUMMARY.marginHorizontal,
  },
  summaryHeading: {
    fontSize: SUMMARY.heading.fontSize,
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
  /*
   * The label shrinks and the number does not (M20).
   *
   * `space-between` with neither child shrinking let the label win: "Beats
   * missed" is short, *Batidas perdidas* is not, and "Best beat streak" becomes
   * *Melhor sequência de batidas*. Without this the label pushes the value it
   * exists to caption out of the column, and a summary that has lost its
   * numbers is not a summary.
   */
  summaryLabel: { color: THEME.hudDim, fontSize: SUMMARY.label.fontSize, flexShrink: 1 },
  summaryValue: {
    color: THEME.hudText,
    fontSize: SUMMARY.value.fontSize,
    fontWeight: '700',
    flexShrink: 0,
    marginLeft: 8,
  },
  summaryDetail: {
    color: THEME.hudDim,
    fontSize: SUMMARY.detail.fontSize,
    marginTop: 4,
    lineHeight: SUMMARY.detail.lineHeight,
  },
  buttonRowLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  button: {
    backgroundColor: THEME.accent,
    paddingVertical: BUTTON.paddingVertical,
    paddingHorizontal: BUTTON.paddingHorizontal,
    borderRadius: 24,
    marginTop: BUTTON.marginTop,
    marginHorizontal: BUTTON.marginHorizontal,
    minWidth: BUTTON.minWidth,
    /* A label the size of the screen is not a button: long labels wrap inside
       this width instead of pushing their neighbours off the row (M20). */
    maxWidth: BUTTON.maxWidth,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: THEME.hudDim,
  },
  buttonCompact: {
    minWidth: BUTTON.compactMinWidth,
    paddingHorizontal: BUTTON.compactPaddingHorizontal,
    paddingVertical: BUTTON.compactPaddingVertical,
  },
  buttonPressed: { opacity: 0.75 },
  /* Visibly not-yet-pressable, rather than invisible or absent: the player
     should see the button arrive and understand it is settling. */
  buttonDisabled: { opacity: 0.4 },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonTextWithIcon: { marginLeft: 10 },
  buttonText: {
    color: THEME.hudText,
    fontSize: BUTTON.fontSize,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonTextCompact: { fontSize: BUTTON.compactFontSize },
  buttonTextSecondary: { color: THEME.hudDim },
});
