/**
 * The development music audition row (M24B).
 *
 * ## Why this is its own file
 *
 * Three reasons, and the first is the one that matters:
 *
 *   - **It is the only screen in the game whose words are not translated.**
 *     `tests/localization.test.ts` holds every component to "every word on
 *     screen comes out of `game/i18n/catalogues/`", and that rule is right for
 *     everything a player can reach. A debug control is not one of those, and
 *     putting `DEV MUSIC AUDITION` into `pt-BR.ts` would mean shipping a
 *     translator a string that can never appear in a shipped build. So this
 *     file is the localization guard's single, named exception, and
 *     `tests/localization.test.ts` re-earns that exception by proving the file
 *     is unreachable in production rather than simply skipping it.
 *   - It has a known expiry. M24C replaces it with the real setlist builder,
 *     and deleting a file is a cleaner end than unpicking a component from the
 *     middle of `Overlays.tsx`.
 *   - It keeps `Overlays.tsx` about the game.
 *
 * ## How it cannot reach a player
 *
 * It renders nothing unless it is given `AuditionControls`, and `GameEngine`
 * builds those only behind `isDevelopmentBuild()` — the same gate
 * `availableTracks` uses. A release build passes `null`, and `Overlays` draws
 * no row at all. The pool is empty in production anyway, so even a mistake
 * upstream produces an empty control rather than a shippable one.
 *
 * Deliberately ugly. This is owner tooling for one decision — which of eleven
 * candidates are worth keeping — not a screen.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

import { THEME } from './theme.ts';
import { BUTTON } from './overlayLayout.ts';
import { MUSIC_TRACKS, type MusicTrackId } from '../audio/musicCatalogue.ts';
import { trackAtCursor, type AuditionMode } from '../audio/audition.ts';
import { useStrings } from '../i18n/LocaleContext.tsx';
import { STAGES } from '../levels/stages.ts';

/**
 * The development audition controls, or `null` in a release build (M24B).
 *
 * One nullable prop rather than a dozen optional ones, so "this build has no
 * audition tooling" is a single state the renderer checks once. `GameEngine`
 * builds it only behind `isDevelopmentBuild()`.
 */
export interface AuditionControls {
  /** The candidate pool, in catalogue order. */
  tracks: readonly MusicTrackId[];
  cursor: number;
  /** Whether the preview player is sounding, so one button can be both. */
  playing: boolean;
  mode: AuditionMode;
  onStep(delta: number): void;
  onPlay(): void;
  onStop(): void;
  onToggleMode(): void;
  /** Starts a real round on this stage with the audition setlist. */
  onStartGig(stageIndex: number): void;
}

/**
 * A compact button, local to this file.
 *
 * Not imported from `Overlays.tsx` — that one is module-private, and exporting
 * it so a debug row could borrow it would widen a production module's surface
 * for the sake of tooling that is deleted at M24C. Twenty lines is the cheaper
 * trade.
 */
function DevButton({ label, onPress }: { label: string; onPress(): void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

/**
 * The development music audition row (M24B).
 *
 * Owner tooling, and deliberately ugly. It is a scaffold for one decision — which
 * of eleven candidates are worth shipping — and it is deleted at M24C when the
 * real setlist builder arrives, so effort spent making it pretty is effort spent
 * on something with a known expiry date.
 *
 * **It cannot appear in a release build.** `props.audition` is `null` there,
 * because `GameEngine` only constructs the controls behind `isDevelopmentBuild()`
 * — the same gate `availableTracks` uses, and the same shape as the language
 * control's `hasLocaleChoice()` above. Returning `null` on a falsy prop rather
 * than reading `__DEV__` here keeps this component a pure function of its props
 * and lets a test assert both answers.
 *
 * Not localised, on purpose. Every other string on this screen comes from the
 * catalogue; these four do not, because a translator should never be asked to
 * translate a debug control and `pt-BR.ts` should not carry strings that cannot
 * ship. The candidate's own title *is* a catalogue string — it is the one thing
 * here the owner is actually judging.
 */
export function DevAuditionRow({ audition }: { audition: AuditionControls }) {
  const strings = useStrings();
  const track = trackAtCursor(audition.tracks, audition.cursor);
  if (track === null) return null;
  const library = MUSIC_TRACKS[track].library;
  const titleKey = library?.titleKey;
  const title = titleKey === undefined ? track : strings.music[titleKey];

  return (
    <View style={styles.root}>
      <Text style={styles.label}>
        DEV MUSIC AUDITION · {String(audition.cursor + 1)}/{String(audition.tracks.length)}
        {library === null ? '' : ` · ${library.genre}`}
      </Text>
      {/*
       * One row, because the title screen does not scroll and a three-row
       * control pushed the gig buttons under the fold on a 1080p phone — which
       * is the emulator the owner auditions on. Found by looking at it.
       */}
      <View style={styles.row}>
        <DevButton label="◀" onPress={() => audition.onStep(-1)} />
        <Text style={styles.title}>{title}</Text>
        <DevButton label="▶" onPress={() => audition.onStep(1)} />
        <DevButton
          label={audition.playing ? 'STOP' : 'PLAY'}
          onPress={audition.playing ? audition.onStop : audition.onPlay}
        />
        <DevButton
          label={audition.mode === 'solo' ? 'ALL 4' : 'ROTATE'}
          onPress={audition.onToggleMode}
        />
      </View>
      {/*
       * The gameplay audition, and the answer to "is this fun while bottles are
       * coming?". One button per stage, because the stage is the variable: the
       * owner needs Stage 2 specifically to test whether a real song can replace
       * the teaching bed on a replay, and Stage 3 because it is the only stage
       * long enough to hear the loop come round.
       */}
      <View style={styles.row}>
        <Text style={styles.label}>PLAY A ROUND ON IT:</Text>
        {STAGES.map((entry, index) => (
          <DevButton
            key={entry.id}
            label={`S${String(index + 1)}`}
            onPress={() => audition.onStartGig(index)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * The development audition row (M24B). Boxed and dimmed so it reads as
   * tooling bolted onto the screen rather than part of the game.
   */
  root: {
    marginTop: 8,
    paddingTop: 4,
    paddingHorizontal: 10,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: THEME.burst,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 460,
  },
  label: {
    color: THEME.burst,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
    marginRight: 6,
  },
  title: {
    color: THEME.hudText,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    alignSelf: 'center',
    minWidth: 175,
    marginHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: THEME.hudDim,
    borderRadius: 14,
    paddingVertical: 3,
    paddingHorizontal: 9,
    marginTop: 4,
    marginHorizontal: BUTTON.marginHorizontal,
  },
  buttonPressed: {
    backgroundColor: THEME.hudDim,
  },
  buttonText: {
    color: THEME.hudText,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
