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
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';

import { QuitSVG } from '../../assets/SVG/QuitSVG';
import { PRODUCT_TITLE } from '../config/product.ts';
import { THEME } from './theme.ts';
import type { Catalogue } from '../i18n/catalogue.ts';
import { format } from '../i18n/format.ts';
import { hasLocaleChoice, LOCALE_ENDONYMS } from '../i18n/locales.ts';
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
  onToggleClick(): void;
  onCycleLocale(): void;
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
}: {
  round: RoundState;
  rhythm: RhythmState;
  grooveEnabled: boolean;
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

export function Overlays(props: OverlayProps) {
  const { flow, stage, state, round, rhythm, story, audioAvailable } = props;
  const strings = useStrings();
  const stageStrings = strings.stages[stage.id];

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
        <Text style={styles.briefingKicker}>
          {format(strings.common.stageNumber, { number: stage.number })}
        </Text>
        <Text style={styles.briefingTitle}>{stageStrings.name}</Text>
        {/**
         * The indicator is on, deliberately. A briefing that silently hides its
         * second half teaches nothing — and at the MVP playtest this card was
         * doing exactly that with the one rule it exists to explain.
         */}
        <ScrollView
          style={styles.briefingScroll}
          contentContainerStyle={styles.briefingList}
          showsVerticalScrollIndicator
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
        <View style={styles.buttonRowLayout}>
          <Button label={strings.briefing.start} onPress={props.onBeginRound} />
          <Button
            label={strings.common.back}
            onPress={props.onBackToTitle}
            tone="secondary"
            compact
          />
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
        <Text style={styles.title}>{strings.pause.title}</Text>
        <Summary round={round} rhythm={rhythm} grooveEnabled={stage.groove} />
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
      <Summary round={round} rhythm={rhythm} grooveEnabled={stage.groove} />
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
  /*
   * Scrolls rather than grows, so a longer briefing can never clip a button.
   *
   * Raised from 150 after the MVP playtest. At 150 a stage that carries figures
   * *and* the mug rule measured about 300 px of content, so half the card sat
   * below a fold with `showsVerticalScrollIndicator` off — the rule was on the
   * screen and unreadable, which is indistinguishable from absent. 200 fits
   * stage 1 whole and still leaves the 411 dp viewport its heading, its button
   * row and room to spare.
   */
  briefingScroll: { maxHeight: 200, alignSelf: 'stretch' },
  /*
   * Inside the scroll, so pictures cost the bullets nothing on the 411 dp
   * viewport the whole results stack is measured against — the list scrolls
   * rather than the card growing.
   */
  figureRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingBottom: 8 },
  figure: { alignItems: 'center', width: 128 },
  figureArt: { width: 72, height: 62 },
  /*
   * 12, not 10. These two captions are the tightest statement of the mug rule
   * anywhere in the game — "still far away: it smashes" against "within arm's
   * reach: he drinks it" — and they were the smallest text on the card.
   */
  figureCaption: {
    color: THEME.hudText,
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
    paddingTop: 4,
  },
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
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonTextCompact: { fontSize: 14 },
  buttonTextSecondary: { color: THEME.hudDim },
});
