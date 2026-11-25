/**
 * Crowd Mode visual components.
 *
 * Names remain stable from the M28–M30 placeholder contract. Every required
 * M31 slot now draws final art; only target brackets and the optional hit
 * flash remain code-drawn.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { THEME } from '../rendering/theme.ts';
import { CROWD_ART } from './crowdArt.ts';
import { CROWD_ART_SLOTS } from './crowdArtSlots.ts';
import { CROWD_CANVAS, type CrowdPerformerTargetId } from './crowdConfig.ts';

const fill = StyleSheet.absoluteFillObject;

/** Slot `stagePlate`. */
export function CrowdStagePlatePlaceholder() {
  return (
    <Image source={CROWD_ART.stagePlate} style={styles.plate} resizeMode="stretch" fadeDuration={0} />
  );
}

/** Corner brackets around a pending objective. Stays code-drawn; not a slot. */
export function CrowdTargetMarker() {
  return (
    <View style={fill}>
      <View style={[styles.bracket, styles.bracketTopLeft]} />
      <View style={[styles.bracket, styles.bracketTopRight]} />
      <View style={[styles.bracket, styles.bracketBottomLeft]} />
      <View style={[styles.bracket, styles.bracketBottomRight]} />
    </View>
  );
}

/** Slot `cymbal`, drawn for both the crash and ride. */
export function CrowdCymbalPlaceholder() {
  return <Sprite source={CROWD_ART.cymbal} />;
}

/** Slot `microphoneProp`: the handheld microphone after it leaves the hand. */
export function CrowdMicrophonePlaceholder() {
  return <Sprite source={CROWD_ART.props.microphone} />;
}

/** Slots `guitarProp` and `bassProp`. */
export function CrowdInstrumentPlaceholder({ kind }: { kind: 'guitar' | 'bass' }) {
  return <Sprite source={CROWD_ART.props[kind]} />;
}

/** Slots `amplifierIntact` and `amplifierDamaged`. */
export function CrowdAmplifierPlaceholder({ damaged }: { damaged: boolean }) {
  return <Sprite source={damaged ? CROWD_ART.amplifier.damaged : CROWD_ART.amplifier.intact} />;
}

/** Six required performer frames, with the optional hit flash kept code-drawn. */
export function CrowdPerformerPlaceholder({
  performer,
  base,
  reacting,
}: {
  performer: CrowdPerformerTargetId;
  base: 'performing' | 'disarmed';
  reacting: boolean;
}) {
  return (
    <View style={fill}>
      <Sprite source={CROWD_ART.performers[performer][base]} />
      {reacting && <View style={styles.performerHit} />}
    </View>
  );
}

/**
 * Slot `waiter`. The parent owns crossing and bob motion.
 *
 * `hit` lays a red wash over the same sprite for the penalty moment (M32):
 * the art's own silhouette tinted, so it needs no second frame.
 */
export function CrowdWaiterPlaceholder({ hit = false }: { hit?: boolean }) {
  return (
    <View style={fill}>
      <Sprite source={CROWD_ART.waiter} />
      {hit && <Sprite source={CROWD_ART.waiter} style={styles.waiterHit} />}
    </View>
  );
}

/** The floor under the waiter's feet. Code-drawn; it does not bob with him. */
export function CrowdWaiterShadow() {
  return <View style={[fill, styles.waiterShadow]} />;
}

/**
 * The "not a target" mark over the waiter's head (M32). The opposite of
 * `CrowdTargetMarker`: brackets say hit this, a struck-out red disc says don't.
 */
export function CrowdAvoidMarker() {
  return (
    <View style={[fill, styles.avoidDisc]}>
      <View style={[styles.avoidBar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[styles.avoidBar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

/** Slot `throwHand`: absolute because the bottle-ready pose is not a target rect. */
export function CrowdThrowHandPlaceholder() {
  const box = CROWD_ART_SLOTS.throwHand.box;
  return (
    <Image
      source={CROWD_ART.throwHand}
      style={{ position: 'absolute', left: box.x, top: box.y, width: box.width, height: box.height }}
      resizeMode="stretch"
      fadeDuration={0}
    />
  );
}

/**
 * Sized explicitly rather than by `absoluteFill` (M32). On web an asset image
 * defaults to its file's own pixel size, which insets alone do not override —
 * invisible while every box matched its file, and wrong the moment the waiter
 * was drawn larger than his.
 */
function Sprite({
  source,
  style,
}: {
  source: React.ComponentProps<typeof Image>['source'];
  style?: React.ComponentProps<typeof Image>['style'];
}) {
  return (
    <Image source={source} style={[styles.sprite, style]} resizeMode="stretch" fadeDuration={0} />
  );
}

const styles = StyleSheet.create({
  plate: { position: 'absolute', left: 0, top: 0, ...CROWD_CANVAS },
  bracket: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: THEME.hudText,
    opacity: 0.85,
  },
  bracketTopLeft: { left: 0, top: 0, borderLeftWidth: 5, borderTopWidth: 5 },
  bracketTopRight: { right: 0, top: 0, borderRightWidth: 5, borderTopWidth: 5 },
  bracketBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 5, borderBottomWidth: 5 },
  bracketBottomRight: { right: 0, bottom: 0, borderRightWidth: 5, borderBottomWidth: 5 },
  sprite: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  waiterHit: { tintColor: THEME.accent, opacity: 0.6 },
  waiterShadow: { borderRadius: 999, backgroundColor: 'rgba(0, 0, 0, 0.42)' },
  avoidDisc: {
    borderRadius: 999,
    backgroundColor: THEME.accent,
    borderWidth: 4,
    borderColor: THEME.hudText,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avoidBar: {
    position: 'absolute',
    width: '62%',
    height: 8,
    borderRadius: 4,
    backgroundColor: THEME.hudText,
  },
  performerHit: {
    ...fill,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 80, 100, 0.28)',
    borderWidth: 7,
    borderColor: 'rgba(255, 235, 205, 0.82)',
  },
});
