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
  SETLIST,
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
import {
  completedDraft,
  isCustomRun,
  isCustomSetlistUnlocked,
  isStageCleared,
} from '../state/appFlow.ts';
import {
  MUSIC_TRACKS,
  type MusicTitleKey,
  type MusicTrackId,
} from '../audio/musicCatalogue.ts';
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
  /** The songs this build lets a player choose between (M24C). */
  selectableTracks: readonly MusicTrackId[];
  onOpenSetlist(): void;
  onSelectSlot(slot: number): void;
  onChooseTrack(track: MusicTrackId): void;
  /** The song sounding on the builder, or null. One at a time (M24C). */
  previewTrack: MusicTrackId | null;
  onPreviewTrack(track: MusicTrackId): void;
  onStartCustomGig(): void;
  /**
   * True only on the results screen that **just** crossed the unlock (M24C §37).
   *
   * A transition, not a state: `isCustomSetlistUnlocked(flow)` is true forever
   * afterwards and would put a "CUSTOM SETLIST UNLOCKED" banner on every future
   * completion. `recordStageCleared` reports the crossing and `GameEngine`
   * holds it until the next round starts.
   */
  justUnlockedSetlist: boolean;
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

/**
 * A slot number as the player reads it: `01`, not `1`.
 *
 * Padded here rather than in the catalogue because it is arithmetic, not
 * language — every locale numbers a setlist the same way, and `{number}` in
 * `strings.setlist.slot` is what lets one put the digits somewhere else.
 */
function slotLabel(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * The setlist builder (M24C).
 *
 * Two columns: the four slots on the left, the songs on the right. The whole
 * interaction is two taps repeated — a slot to aim at, a song to put in it —
 * and the fastest path is four taps in the right-hand column, because choosing
 * a song advances the cursor to the next empty slot.
 *
 * ## What decides what
 *
 * Nothing here. Every judgement — which slot is active, whether a song may be
 * chosen, whether the setlist is playable — comes off `flow` through
 * `game/state/appFlow.ts`, which is where it can be tested without a renderer.
 * This component draws that state and reports taps. `completedDraft` is the
 * single reason START THE GIG is deaf or not, so the button cannot look
 * pressable while the gig would refuse to start.
 *
 * ## Why the right column scrolls and the left one does not
 *
 * Eleven rows do not fit in 411 dp of phone and four do. So the library is a
 * `ScrollView` that measures itself and draws the `▾` the briefing card already
 * uses when there is more below — M20's rule that a scrollable surface may
 * overflow but must say so — and the slots are a fixed box whose budget
 * `tests/layoutBudget.test.ts` checks in every locale.
 */
function SetlistBuilder({
  flow,
  tracks,
  previewTrack,
  onSelectSlot,
  onChooseTrack,
  onPreviewTrack,
  onStart,
  onBack,
}: {
  flow: AppFlowState;
  tracks: readonly MusicTrackId[];
  previewTrack: MusicTrackId | null;
  onSelectSlot(slot: number): void;
  onChooseTrack(track: MusicTrackId): void;
  onPreviewTrack(track: MusicTrackId): void;
  onStart(): void;
  onBack(): void;
}) {
  const strings = useStrings();
  const setlist = strings.setlist;

  /*
   * Measured rather than predicted, exactly as the briefing card is: a budget
   * test can say whether eleven rows *should* fit at a modelled font metric;
   * only the renderer knows whether they did, on this screen, in this language.
   */
  const [columnHeight, setColumnHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const hasMore = columnHeight > 0 && contentHeight > columnHeight + 1;

  const chosen = new Set(flow.draftSetlist.filter((entry): entry is MusicTrackId => entry !== null));
  const ready = completedDraft(flow, tracks) !== null;

  return (
    <View style={styles.scrim}>
      <Text style={styles.setlistTitle}>{setlist.title}</Text>
      <Text style={styles.setlistTagline}>{setlist.tagline}</Text>

      <View style={styles.setlistColumns}>
        <View style={styles.setlistSlots}>
          {flow.draftSetlist.map((track, index) => (
            <Pressable
              key={slotLabel(index)}
              onPress={() => onSelectSlot(index)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.setlistSlot,
                index === flow.activeSlot && styles.setlistSlotActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.setlistSlotNumber}>
                {format(setlist.slot, { number: slotLabel(index) })}
              </Text>
              <Text
                style={[
                  styles.setlistSlotTitle,
                  track === null && styles.setlistSlotEmpty,
                ]}
              >
                {track === null ? setlist.empty : strings.music[trackTitleKey(track)]}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.setlistLibrary}>
          <Text style={styles.setlistLibraryHeading}>{setlist.library}</Text>
          <ScrollView
            style={styles.setlistLibraryScroll}
            showsVerticalScrollIndicator
            persistentScrollbar
            onLayout={(event) => setColumnHeight(event.nativeEvent.layout.height)}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
          >
            {tracks.map((track) => {
              const used = chosen.has(track);
              const sounding = previewTrack === track;
              const title = strings.music[trackTitleKey(track)];
              return (
                <View key={track} style={[styles.setlistTrack, used && styles.setlistTrackUsed]}>
                  {/*
                    * Choosing. Deaf once the song is in the setlist — the
                    * no-duplicates rule, drawn.
                    */}
                  <Pressable
                    onPress={used ? undefined : () => onChooseTrack(track)}
                    disabled={used}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: used }}
                    accessibilityHint={used ? setlist.chosen : undefined}
                    style={({ pressed }) => [
                      styles.setlistTrackChoose,
                      pressed && !used && styles.buttonPressed,
                    ]}
                  >
                    <Text style={[styles.setlistTrackTitle, used && styles.setlistTrackTitleUsed]}>
                      {title}
                    </Text>
                  </Pressable>
                  {/*
                    * Listening. **Never deaf, including for a song already in
                    * the setlist** — "what did I put in slot 3?" is exactly as
                    * real a question as "what is this one?", and a control that
                    * goes dead the moment you use the row is a control that
                    * looks broken.
                    *
                    * `hitSlop` rather than a bigger box: the row is 24 dp tall
                    * so that eleven songs are one scroll rather than three, and
                    * the thing that has to be thumb-sized is the target, not
                    * the glyph.
                    */}
                  <Pressable
                    onPress={() => onPreviewTrack(track)}
                    accessibilityRole="button"
                    accessibilityLabel={format(
                      sounding ? setlist.stopPreview : setlist.preview,
                      { title },
                    )}
                    hitSlop={SETLIST.track.previewHitSlop}
                    style={({ pressed }) => [
                      styles.setlistPreview,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.setlistPreviewGlyph,
                        sounding && styles.setlistPreviewGlyphOn,
                      ]}
                    >
                      {sounding ? '■' : '▶'}
                    </Text>
                  </Pressable>
                  {/* A tick, not a colour: the used state has to survive being
                      read by somebody who cannot tell the two greys apart. */}
                  <Text style={styles.setlistTrackMark}>{used ? '✓' : ''}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Always drawn, so the columns do not jump when the measurement lands. */}
      <View style={styles.moreCueRow}>{hasMore && <Text style={styles.moreCue}>▾</Text>}</View>

      <View style={styles.buttonRowLayout}>
        <Button label={setlist.start} onPress={onStart} disabled={!ready} />
        <Button label={strings.common.back} onPress={onBack} tone="secondary" compact />
      </View>
    </View>
  );
}

/**
 * A track's title key, or its id if it somehow has no library entry.
 *
 * The fallback cannot happen — only library tracks are selectable — but the
 * alternative to having one is a non-null assertion in a renderer, and a blank
 * row on a phone is a worse way to find out than a track id is.
 */
function trackTitleKey(track: MusicTrackId): MusicTitleKey {
  return MUSIC_TRACKS[track].library?.titleKey ?? (track as MusicTitleKey);
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
          {/**
            * The custom setlist, drawn only once the show has been survived
            * (M24C §10).
            *
            * **Absent rather than disabled.** A locked control on a first-run
            * title screen is a promise the player cannot act on and a row of
            * buttons they have to read past; the stage cards are what a new
            * player is meant to look at. `openSetlist` refuses independently,
            * so this is presentation and not the gate.
            */}
          {isCustomSetlistUnlocked(flow) && (
            <Button
              label={strings.setlist.open}
              onPress={props.onOpenSetlist}
              tone="secondary"
              compact
            />
          )}
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

  if (flow.screen === 'SETLIST') {
    return (
      <SetlistBuilder
        flow={flow}
        tracks={props.selectableTracks}
        previewTrack={props.previewTrack}
        onSelectSlot={props.onSelectSlot}
        onChooseTrack={props.onChooseTrack}
        onPreviewTrack={props.onPreviewTrack}
        onStart={props.onStartCustomGig}
        onBack={props.onBackToTitle}
      />
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
      {/**
        * The reward for surviving the whole show, once (M24C §37).
        *
        * `justUnlockedSetlist` is the *crossing*, not the state, so this
        * appears on the results screen that earned it and on no other. The
        * tagline comes with it because the banner alone names a feature
        * without saying what it is for.
        */}
      {props.justUnlockedSetlist && (
        <>
          <Text style={styles.unlockBanner}>{strings.setlist.unlocked}</Text>
          <Text style={styles.body}>{strings.setlist.tagline}</Text>
        </>
      )}
      {/**
        * The songs this run played, after a custom show (M24C §22).
        *
        * One heading and one line rather than the four-row card the brief
        * sketches: the results screen has 411 dp and the two score columns
        * below already claim most of it. It answers the same question — which
        * four, in what order — and it is the shape a share card would reuse.
        */}
      {complete && isCustomRun(flow) && (
        <>
          <Text style={styles.tonightHeading}>{strings.setlist.tonight}</Text>
          <Text style={styles.tonightSongs}>{runSetlistLine(flow, strings)}</Text>
        </>
      )}
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
        {/**
          * Straight back into the builder from the end of a show (M24C §37).
          *
          * Drawn whenever the feature is unlocked and the show is over, so the
          * first completion offers it under the unlock banner and every later
          * one offers it as an ordinary result action. Not drawn between
          * stages: "Next stage" is the only thing to do there.
          */}
        {complete && !nextStageWaiting && isCustomSetlistUnlocked(flow) && (
          <Button
            label={strings.setlist.open}
            onPress={props.onOpenSetlist}
            tone="secondary"
            compact
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
 * The run's songs, in play order, as one line.
 *
 * Built here rather than in the catalogue because it is a *list*, and a
 * catalogue string with four placeholders would be a sentence a translator
 * could not reorder and could not shorten. The separator carries no language.
 */
function runSetlistLine(flow: AppFlowState, strings: Catalogue): string {
  return flow.setlist
    .map((track) => strings.music[trackTitleKey(track)])
    .join('  ·  ');
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

  /* ---- the setlist builder (M24C) ---- */

  /**
   * The builder's heading and its one line of copy.
   *
   * Smaller than the results title's 30, because this screen has two columns
   * under it and 411 dp to put them in. The heading is the cheapest thing here
   * to make smaller and the columns are the thing that must not be.
   */
  setlistTitle: {
    color: THEME.hudText,
    fontSize: SETLIST.title.fontSize,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: SETLIST.title.marginBottom,
  },
  setlistTagline: {
    color: THEME.accent,
    fontSize: SETLIST.tagline.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SETLIST.tagline.marginBottom,
  },
  setlistColumns: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  /** The four slots. A fixed box: it does not scroll and must not need to. */
  setlistSlots: {
    width: SETLIST.slot.width,
    marginRight: SETLIST.columnGap,
  },
  setlistSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    width: SETLIST.slot.width,
    paddingHorizontal: SETLIST.slot.paddingHorizontal,
    paddingVertical: SETLIST.slot.paddingVertical,
    marginBottom: SETLIST.slot.marginBottom,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.hudDim,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  /**
   * The slot the next chosen song lands in.
   *
   * A border and a fill rather than only a colour: which slot is armed is the
   * one thing on this screen a player has to be able to see at a glance, and
   * two greys are not a signal on a phone in a dark room.
   */
  setlistSlotActive: {
    borderColor: THEME.accent,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  setlistSlotNumber: {
    color: THEME.hudDim,
    fontSize: SETLIST.slot.number.fontSize,
    fontWeight: '800',
    letterSpacing: 1,
    width: SETLIST.slot.numberGutter,
  },
  setlistSlotTitle: {
    color: THEME.hudText,
    fontSize: SETLIST.slot.title.fontSize,
    fontWeight: '700',
    flexShrink: 1,
  },
  /** An empty slot says what to do, in the colour of something not yet done. */
  setlistSlotEmpty: {
    color: THEME.hudDim,
    fontWeight: '400',
  },
  setlistLibrary: {
    width: SETLIST.track.width,
    flexShrink: 1,
  },
  setlistLibraryHeading: {
    color: THEME.hudDim,
    fontSize: SETLIST.libraryHeading.fontSize,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SETLIST.libraryHeading.marginBottom,
  },
  setlistLibraryScroll: { flexShrink: 1, alignSelf: 'stretch' },
  setlistTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SETLIST.track.paddingHorizontal,
    paddingVertical: SETLIST.track.paddingVertical,
    marginBottom: SETLIST.track.marginBottom,
    borderRadius: 8,
  },
  setlistTrackUsed: { opacity: 0.55 },
  /** The tappable title. Takes the row's width, so the whole name is a target. */
  setlistTrackChoose: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    borderRadius: 6,
  },
  setlistPreview: {
    width: SETLIST.track.previewGutter,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    borderRadius: 6,
  },
  setlistPreviewGlyph: {
    color: THEME.hudDim,
    fontSize: SETLIST.track.title.fontSize,
  },
  /**
   * The song that is sounding.
   *
   * The accent colour and a different glyph — ■ rather than ▶ — because one
   * row out of eleven being a slightly different grey is not a state anybody
   * reads on a phone in a dark room.
   */
  setlistPreviewGlyphOn: { color: THEME.accent },
  setlistTrackTitle: {
    color: THEME.hudText,
    fontSize: SETLIST.track.title.fontSize,
    fontWeight: '700',
    flexShrink: 1,
  },
  setlistTrackTitleUsed: { color: THEME.hudDim },
  setlistTrackMark: {
    color: THEME.integrityFull,
    fontSize: SETLIST.track.title.fontSize,
    width: SETLIST.track.chosenGutter,
    textAlign: 'right',
  },

  /**
   * The unlock banner, drawn once — on the results screen that crossed it.
   *
   * The colour the game already uses for something good happening, the same as
   * the new-best line it sits beside.
   */
  unlockBanner: {
    color: THEME.integrityFull,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 2,
  },
  /** The run's songs after a custom show. One line, because height is scarce. */
  tonightHeading: {
    color: THEME.hudDim,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 4,
  },
  tonightSongs: {
    color: THEME.hudText,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    maxWidth: 760,
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
