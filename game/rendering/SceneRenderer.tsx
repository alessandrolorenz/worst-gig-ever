/**
 * Graybox scene renderer.
 *
 * Draws a snapshot of the round. It owns no gameplay state: score, combo,
 * integrity, the clock, and every target position are read from the domain
 * (M2, rendering boundary). Swapping these blocks for M3 art in slice 7 must
 * not require touching a single rule.
 *
 * Everything inside the canvas is authored in 1920x1080 reference pixels and
 * scaled once at the root, so no child needs to know the device size.
 */
import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';

import { REFERENCE_CANVAS, STAGE, VOCALIST_BLOCKING_RECT, VOCALIST_IDLE_RECT } from '../config/stage.ts';
import { fitCanvas, type Viewport } from './layout.ts';
import { THEME } from './theme.ts';
import { effectProgress, type EffectsState, type TimedEffect } from '../systems/effects.ts';
import { shardOpacity, type ShardsState } from '../systems/shards.ts';
import { targetViews, type RoundState, type TargetView } from '../state/roundState.ts';
import { Hud } from './Hud.tsx';

export interface SceneRendererProps {
  round: RoundState;
  effects: EffectsState;
  shards: ShardsState;
  viewport: Viewport;
}

/** Where the drumstick strike appears to swing from. */
const STICK_ORIGIN = { x: REFERENCE_CANVAS.width / 2, y: REFERENCE_CANVAS.height + 60 };

const CROWD_HEADS = Array.from({ length: 26 }, (_, i) => ({
  x: 40 + i * 74,
  y: 470 + ((i * 37) % 26),
  r: 26 + ((i * 13) % 10),
}));

function Backdrop() {
  return (
    <>
      <View style={[styles.fill, { backgroundColor: THEME.venueWall }]} />
      <View style={styles.venueGlow} />
      <View style={styles.stageFloor} />
      <View style={styles.crowdBand}>
        {CROWD_HEADS.map((head) => (
          <View
            key={head.x}
            style={{
              position: 'absolute',
              left: head.x - head.r,
              top: head.y - head.r,
              width: head.r * 2,
              height: head.r * 2,
              borderRadius: head.r,
              backgroundColor: THEME.crowd,
              borderWidth: 2,
              borderColor: THEME.crowdHighlight,
            }}
          />
        ))}
      </View>
    </>
  );
}

function BandMember({ x, label }: { x: number; label: string }) {
  return (
    <View style={[styles.bandMember, { left: x }]}>
      <View style={styles.bandHead} />
      <View style={styles.bandBody} />
      <Text style={styles.placeholderLabel}>{label}</Text>
    </View>
  );
}

function Vocalist({ round }: { round: RoundState }) {
  const status = round.vocalist.status;
  const rect = status === 'idle' ? VOCALIST_IDLE_RECT : VOCALIST_BLOCKING_RECT;
  const isHit = status === 'hit';

  return (
    <View
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        alignItems: 'center',
        transform: [{ rotate: isHit ? '-14deg' : '0deg' }, { translateY: isHit ? -40 : 0 }],
      }}
    >
      <View
        style={[
          styles.vocalistHead,
          { backgroundColor: isHit ? THEME.vocalistHit : THEME.vocalistHead },
        ]}
      />
      <View
        style={[
          styles.vocalistBody,
          {
            backgroundColor: isHit ? THEME.vocalistHit : THEME.vocalistBody,
            width: rect.width * 0.72,
          },
        ]}
      />
      {status === 'blocking' && (
        <Text style={styles.vocalistCue}>TAP THE SINGER</Text>
      )}
      <Text style={styles.placeholderLabel}>{isHit ? 'VOCALIST (HIT)' : 'VOCALIST'}</Text>
    </View>
  );
}

function DangerLine() {
  return (
    <>
      <View style={styles.dangerGlow} />
      <View style={styles.dangerLine} />
    </>
  );
}

function DrumKit() {
  return (
    <View style={styles.drumkit} pointerEvents="none">
      <View style={[styles.cymbal, { left: 150 }]} />
      <View style={[styles.cymbal, { left: 1560 }]} />
      <View style={[styles.tom, { left: 520 }]} />
      <View style={[styles.tom, { left: 1160 }]} />
      <View style={styles.snare} />
      <Text style={styles.drumkitLabel}>DRUM KIT (GRAYBOX FOREGROUND)</Text>
    </View>
  );
}

function TargetShape({ view }: { view: TargetView }) {
  const isBottle = view.kind === 'beerBottle';
  const width = (isBottle ? 92 : 132) * view.scale;
  const height = (isBottle ? 186 : 128) * view.scale;
  const missed = view.status === 'missed';

  return (
    <View
      style={{
        position: 'absolute',
        left: view.x - width / 2,
        top: view.y - height / 2,
        width,
        height,
        alignItems: 'center',
        justifyContent: 'flex-end',
        opacity: missed ? 0.45 : 1,
      }}
    >
      {isBottle ? (
        <>
          <View
            style={{
              width: width * 0.34,
              height: height * 0.36,
              backgroundColor: missed ? THEME.accent : THEME.beerBottleNeck,
              borderRadius: 6 * view.scale,
            }}
          />
          <View
            style={{
              width,
              height: height * 0.64,
              backgroundColor: missed ? THEME.accent : THEME.beerBottle,
              borderRadius: 12 * view.scale,
            }}
          />
        </>
      ) : (
        <>
          <View
            style={{
              width: width * 0.86,
              height: height * 0.22,
              backgroundColor: missed ? THEME.accent : THEME.beerMugFoam,
              borderRadius: 10 * view.scale,
            }}
          />
          <View
            style={{
              width: width * 0.86,
              height: height * 0.78,
              backgroundColor: missed ? THEME.accent : THEME.beerMug,
              borderRadius: 10 * view.scale,
            }}
          />
        </>
      )}
    </View>
  );
}

function Strike({ effect }: { effect: TimedEffect }) {
  const progress = effectProgress(effect);
  const dx = effect.x - STICK_ORIGIN.x;
  const dy = effect.y - STICK_ORIGIN.y;
  const length = Math.hypot(dx, dy);
  const angle = Math.atan2(dy, dx);
  // The stick snaps out and pulls straight back.
  const extend = progress < 0.45 ? progress / 0.45 : 1 - (progress - 0.45) / 0.55;

  return (
    <View
      style={{
        position: 'absolute',
        left: STICK_ORIGIN.x,
        top: STICK_ORIGIN.y,
        width: length * Math.max(0, extend),
        height: 16,
        marginTop: -8,
        backgroundColor: THEME.strike,
        borderRadius: 8,
        opacity: 0.9 * (1 - progress * 0.4),
        transform: [{ rotate: `${angle}rad` }],
        transformOrigin: 'left center',
      }}
    />
  );
}

function Burst({ effect }: { effect: TimedEffect }) {
  const progress = effectProgress(effect);
  const size = 90 + progress * 190;

  return (
    <View
      style={{
        position: 'absolute',
        left: effect.x - size / 2,
        top: effect.y - size / 2,
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 10 * (1 - progress),
        borderColor: THEME.burst,
        opacity: 1 - progress,
      }}
    />
  );
}

function Debris({ shards }: { shards: ShardsState }) {
  return (
    <>
      {shards.shards.map((shard) => (
        <View
          key={shard.id}
          style={{
            position: 'absolute',
            left: shard.body.position.x - shard.size / 2,
            top: shard.body.position.y - shard.size / 2,
            width: shard.size,
            height: shard.size,
            backgroundColor: THEME.shard,
            opacity: shardOpacity(shard),
            transform: [{ rotate: `${shard.body.angle}rad` }],
          }}
        />
      ))}
    </>
  );
}

export function SceneRenderer({ round, effects, shards, viewport }: SceneRendererProps) {
  const rootRef = useRef<View>(null);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      viewport.width = width;
      viewport.height = height;
      // Browser input arrives in window coordinates; native touches do not.
      rootRef.current?.measureInWindow?.((pageX, pageY) => {
        viewport.pageX = pageX;
        viewport.pageY = pageY;
      });
    },
    [viewport],
  );

  const fit = fitCanvas(viewport.width, viewport.height);
  const views = targetViews(round);

  return (
    <View ref={rootRef} style={styles.root} onLayout={onLayout}>
      <View
        style={[
          styles.canvas,
          {
            left: fit.offsetX,
            top: fit.offsetY,
            transform: [{ scale: fit.scale }],
          },
        ]}
      >
        <Backdrop />
        <BandMember x={200} label="BASSIST" />
        <BandMember x={1520} label="GUITARIST" />
        <Vocalist round={round} />
        <DangerLine />

        {views.map((view) =>
          view.status === 'hit' ? null : <TargetShape key={view.id} view={view} />,
        )}

        <Debris shards={shards} />
        {effects.bursts.map((effect) => (
          <Burst key={effect.id} effect={effect} />
        ))}
        <DrumKit />
        {effects.strikes.map((effect) => (
          <Strike key={effect.id} effect={effect} />
        ))}

        <Hud round={round} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.letterbox,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    width: REFERENCE_CANVAS.width,
    height: REFERENCE_CANVAS.height,
    transformOrigin: 'top left',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  venueGlow: {
    position: 'absolute',
    left: 460,
    top: -220,
    width: 1000,
    height: 700,
    borderRadius: 500,
    backgroundColor: THEME.venueGlow,
    opacity: 0.7,
  },
  stageFloor: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 640,
    bottom: 0,
    backgroundColor: THEME.stageFloor,
  },
  crowdBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 380,
    height: 240,
  },
  bandMember: {
    position: 'absolute',
    top: 330,
    width: 240,
    alignItems: 'center',
  },
  bandHead: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: THEME.bandHead,
  },
  bandBody: {
    width: 150,
    height: 240,
    borderRadius: 24,
    backgroundColor: THEME.bandBody,
    marginTop: 8,
  },
  vocalistHead: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  vocalistBody: {
    height: 300,
    borderRadius: 28,
    marginTop: 10,
  },
  vocalistCue: {
    marginTop: 12,
    color: THEME.hudText,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 2,
  },
  placeholderLabel: {
    marginTop: 8,
    color: THEME.hudDim,
    fontSize: 20,
    letterSpacing: 1,
  },
  dangerGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STAGE.dangerLineY - 60,
    height: 60,
    backgroundColor: THEME.dangerLineSoft,
  },
  dangerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STAGE.dangerLineY,
    height: 5,
    backgroundColor: THEME.dangerLine,
  },
  drumkit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STAGE.drumkitTopY,
    bottom: 0,
    backgroundColor: THEME.drumkit,
    borderTopWidth: 4,
    borderTopColor: THEME.drumShell,
    alignItems: 'center',
  },
  snare: {
    position: 'absolute',
    left: 760,
    top: 60,
    width: 400,
    height: 190,
    borderRadius: 26,
    backgroundColor: THEME.drumHead,
    borderWidth: 12,
    borderColor: THEME.drumShell,
  },
  tom: {
    position: 'absolute',
    top: 30,
    width: 240,
    height: 150,
    borderRadius: 20,
    backgroundColor: THEME.drumHead,
    borderWidth: 10,
    borderColor: THEME.drumShell,
    opacity: 0.9,
  },
  cymbal: {
    position: 'absolute',
    top: -10,
    width: 300,
    height: 46,
    borderRadius: 23,
    backgroundColor: THEME.cymbal,
    opacity: 0.85,
  },
  drumkitLabel: {
    position: 'absolute',
    bottom: 10,
    color: THEME.hudDim,
    fontSize: 20,
    letterSpacing: 2,
  },
});
