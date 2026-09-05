/**
 * The opening story screen (M15).
 *
 * Five stills with one line of caption each, in the order the show fell apart:
 * the poster, the arrival, the load-in, the gig actually working, and the beer
 * that ended it. It plays once per launch and can be skipped at any point.
 *
 * ## What this component does and does not own
 *
 * It owns **appearance only**. Which panel is showing and when it advances are
 * decided by `game/state/storyState.ts` and ticked by `flowSystem` from the
 * engine's elapsed-time delta, so the pacing is assertable without a renderer
 * and does not run on a clock of its own.
 *
 * The crossfade is the one thing that is genuinely presentational, and it is
 * driven by `Animated` with `useNativeDriver`, keyed off the panel index. That
 * combination is deliberate: the fade runs on the native side, so a story
 * panel costs no JavaScript per frame. Deriving the opacity from the story
 * clock instead would have re-rendered this screen sixty times a second to
 * fade a static image, which is the cost M14.1 was spent removing from the
 * round.
 *
 * ## Fit
 *
 * `contain`, not `cover`. The stills are 16:9 and a modern phone in landscape
 * is nearer 19.5:9, so `cover` would crop about a fifth of the height off
 * compositions that use it — the poster fills its frame top to bottom, and the
 * performance still keeps the drummer near the upper edge. Letterboxing them
 * matches what `fitCanvas` already does to the play surface for the same
 * reason.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { THEME } from './theme.ts';
import { useStrings } from '../i18n/LocaleContext.tsx';
import { storyImageFor } from './storyAssets.ts';
import { currentPanel, STORY_PANELS, type StoryState } from '../state/storyState.ts';

/** Long enough to read as a dissolve, short enough not to delay a tapped skip. */
const FADE_MS = 320;

export function StoryIntro({
  story,
  onAdvance,
  onSkip,
}: {
  story: StoryState;
  onAdvance(): void;
  onSkip(): void;
}) {
  const strings = useStrings();
  const panel = currentPanel(story);
  const opacity = useRef(new Animated.Value(0)).current;

  // Restart the fade whenever the panel changes. Keyed on the index rather
  // than the panel object so a re-render with the same panel does not blink.
  useEffect(() => {
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, story.index]);

  if (panel === null) return null;
  const source = storyImageFor(panel.id);

  return (
    <Pressable style={styles.root} onPress={onAdvance} accessibilityRole="button">
      <Animated.View style={[styles.fill, { opacity }]}>
        {source !== null && (
          <Image source={source} style={styles.fill} resizeMode="contain" fadeDuration={0} />
        )}
        {/* Keeps the caption legible over a bright frame without dimming the art. */}
        <View style={styles.captionBar}>
          <Text style={styles.caption}>{strings.story[panel.id]}</Text>
        </View>
      </Animated.View>

      {/**
       * The dots and the Skip button sit outside the fading layer, so the
       * player's way out never fades with the picture.
       */}
      <View style={styles.dots} pointerEvents="none">
        {STORY_PANELS.map((entry, index) => (
          <View
            key={entry.id}
            style={[styles.dot, index === story.index && styles.dotActive]}
          />
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.skip, pressed && styles.skipPressed]}
        onPress={onSkip}
        accessibilityRole="button"
      >
        <Text style={styles.skipText}>{strings.common.skip}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    // Opaque: the story replaces the stage rather than sitting over it.
    backgroundColor: THEME.letterbox,
  },
  fill: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  captionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 20,
    backgroundColor: 'rgba(8, 7, 12, 0.72)',
  },
  caption: {
    color: THEME.hudText,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: 'rgba(244, 236, 216, 0.28)',
  },
  dotActive: { backgroundColor: THEME.accent },
  skip: {
    position: 'absolute',
    top: 14,
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: THEME.hudDim,
    backgroundColor: 'rgba(8, 7, 12, 0.55)',
  },
  skipPressed: { opacity: 0.7 },
  skipText: {
    color: THEME.hudText,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
