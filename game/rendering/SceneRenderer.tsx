/**
 * Graybox scene renderer.
 *
 * Draws a snapshot of the round. It owns no gameplay state: score, combo,
 * integrity, the clock, and every target position are read from the domain
 * (M2, rendering boundary). Swapping these blocks for M3 art in M6 must not
 * require touching a single rule.
 *
 * Everything inside the canvas is authored in 1920x1080 reference pixels and
 * scaled once at the root, so no child needs to know the device size.
 *
 * Ambient motion (M5A, Priority 4) is read from `stageMotion` and never
 * computed here: this file picks a transform per pose, and the pose itself is
 * decided by a tested pure function. That keeps the choreography assertable
 * without a renderer and keeps this file replaceable by art.
 */
import React, { useCallback, useRef } from 'react';
import { View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';

import {
  PERFORMER_ANCHORS,
  REFERENCE_CANVAS,
  STAGE,
  STAGE_MOTION,
  VOCALIST_BLOCKING_RECT,
  VOCALIST_IDLE_RECT,
} from '../config/stage.ts';
import { fitCanvas, type Viewport } from './layout.ts';
import { THEME } from './theme.ts';
import { effectProgress, type EffectsState, type TimedEffect } from '../systems/effects.ts';
import { shardOpacity, type ShardsState } from '../systems/shards.ts';
import {
  beatPulse,
  loopFrameAt,
  loopMs,
  performerPose,
  type PerformerPose,
  type StageMotionState,
} from '../systems/stageMotion.ts';
import { targetViews, type RoundState, type TargetView } from '../state/roundState.ts';
import { Hud } from './Hud.tsx';

export interface SceneRendererProps {
  round: RoundState;
  effects: EffectsState;
  shards: ShardsState;
  stageMotion: StageMotionState;
  viewport: Viewport;
}

/** Where the drumstick strike appears to swing from. */
const STICK_ORIGIN = { x: REFERENCE_CANVAS.width / 2, y: REFERENCE_CANVAS.height + 60 };

const CROWD_HEADS = Array.from({ length: 26 }, (_, i) => ({
  x: 40 + i * 74,
  y: 470 + ((i * 37) % 26),
  r: 26 + ((i * 13) % 10),
  /**
   * A fixed per-head offset. The crowd has to look like many people moving,
   * not one object; without an offset the whole row bobs as a single bar.
   */
  phaseMs: (i * 137) % 900,
}));

/**
 * Graybox vocabulary for the five reaction poses. Deliberately crude: M5A is
 * judged on whether a reaction is *readable*, not on whether it is animated.
 * Two-frame loops and a hard pose swap are the intended fidelity.
 */
const POSE_TRANSFORMS: Record<PerformerPose, { lift: number; tilt: number; lean: number }> = {
  idle: { lift: 0, tilt: 0, lean: 0 },
  loopA: { lift: 0, tilt: -2, lean: 0 },
  loopB: { lift: -16, tilt: 2, lean: 0 },
  hitReaction: { lift: -34, tilt: -16, lean: 0 },
  dodge: { lift: 22, tilt: 12, lean: -46 },
};

function Backdrop({ stageMotion }: { stageMotion: StageMotionState }) {
  const pulse = beatPulse(stageMotion.elapsedMs);
  const period = loopMs();

  return (
    <>
      <View style={[styles.fill, { backgroundColor: THEME.venueWall }]} />
      {/* Stage lights breathe on the beat, so the room has a pulse of its own. */}
      <View style={[styles.venueGlow, { opacity: 0.45 + pulse * 0.4 }]} />
      <View style={styles.stageFloor} />
      {/*
        Head positions are canvas coordinates, so the container must not add an
        offset of its own — it did until M5A, which pushed the whole crowd down
        behind the opaque drum kit where none of it was ever visible.
      */}
      <View style={styles.crowdBand} pointerEvents="none">
        {CROWD_HEADS.map((head) => {
          const raised =
            loopFrameAt(stageMotion.elapsedMs + head.phaseMs, period, STAGE_MOTION.loopFrames) > 0;
          return (
            <View
              key={head.x}
              style={{
                position: 'absolute',
                left: head.x - head.r,
                top: head.y - head.r - (raised ? 14 : 0),
                width: head.r * 2,
                height: head.r * 2,
                borderRadius: head.r,
                backgroundColor: THEME.crowd,
                borderWidth: 2,
                borderColor: THEME.crowdHighlight,
              }}
            />
          );
        })}
      </View>
    </>
  );
}

function BandMember({ x, label, pose }: { x: number; label: string; pose: PerformerPose }) {
  const { lift, tilt, lean } = POSE_TRANSFORMS[pose];

  return (
    <View
      style={[
        styles.bandMember,
        {
          left: x,
          transform: [{ translateX: lean }, { translateY: lift }, { rotate: `${tilt}deg` }],
        },
      ]}
    >
      <View style={styles.bandHead} />
      <View style={styles.bandBody} />
      <Text style={styles.placeholderLabel}>{label}</Text>
    </View>
  );
}

/**
 * The vocalist is the one performer whose pose is gameplay truth rather than
 * presentation: `blocking` and `hit` come from the round domain and win over
 * anything ambient. The reaction system only supplies the idle loop, which is
 * why the two never contradict each other.
 */
function Vocalist({ round, pose }: { round: RoundState; pose: PerformerPose }) {
  const status = round.vocalist.status;
  const rect = status === 'idle' ? VOCALIST_IDLE_RECT : VOCALIST_BLOCKING_RECT;
  const isHit = status === 'hit';
  const ambient = status === 'idle' ? POSE_TRANSFORMS[pose] : POSE_TRANSFORMS.idle;

  return (
    <View
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        alignItems: 'center',
        transform: [
          { rotate: isHit ? '-14deg' : `${ambient.tilt}deg` },
          { translateY: isHit ? -40 : ambient.lift },
        ],
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
    <View style={styles.drumkit}>
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
        // The tumble the object picked up when it was thrown (M5A).
        transform: [{ rotate: `${view.rotation}rad` }],
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

/**
 * Faint ring on the actual tap radius.
 *
 * A graybox affordance, not decoration: M5A widened the hitbox, and the
 * playtest cannot judge whether the widening is enough unless the observer can
 * see what they were aiming at. It draws the same number hit resolution uses.
 */
function HitHalo({ view }: { view: TargetView }) {
  const size = view.hitRadius * 2;
  return (
    <View
      style={{
        position: 'absolute',
        left: view.x - view.hitRadius,
        top: view.y - view.hitRadius,
        width: size,
        height: size,
        borderRadius: view.hitRadius,
        borderWidth: 2,
        borderColor: THEME.dangerLineSoft,
      }}
    />
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

export function SceneRenderer({ round, effects, shards, stageMotion, viewport }: SceneRendererProps) {
  const rootRef = useRef<View>(null);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      viewport.width = width;
      viewport.height = height;
      // Input arrives in window coordinates on both platforms (M5A), so the
      // play surface's own window position is part of the mapping.
      rootRef.current?.measureInWindow?.((pageX, pageY) => {
        viewport.pageX = pageX;
        viewport.pageY = pageY;
      });
    },
    [viewport],
  );

  const fit = fitCanvas(viewport.width, viewport.height);
  const views = targetViews(round);
  const showHalos = round.state === 'PLAYING' || round.state === 'VOCALIST_EVENT';

  return (
    <View ref={rootRef} style={styles.root} onLayout={onLayout}>
      {/*
        Nothing inside the canvas is interactive: the engine listens on its own
        container, and letting a nested view become the touch target is what
        made native taps resolve at the wrong coordinates (M5A, Priority 1).
      */}
      <View
        pointerEvents="none"
        style={[
          styles.canvas,
          {
            left: fit.offsetX,
            top: fit.offsetY,
            transform: [{ scale: fit.scale }],
          },
        ]}
      >
        <Backdrop stageMotion={stageMotion} />
        <BandMember
          x={PERFORMER_ANCHORS.bassist.x - 120}
          label="BASSIST"
          pose={performerPose(stageMotion, 'bassist')}
        />
        <BandMember
          x={PERFORMER_ANCHORS.guitarist.x - 120}
          label="GUITARIST"
          pose={performerPose(stageMotion, 'guitarist')}
        />
        <Vocalist round={round} pose={performerPose(stageMotion, 'vocalist')} />
        <DangerLine />

        {views.map((view) =>
          view.status === 'hit' ? null : (
            <React.Fragment key={view.id}>
              {showHalos && view.status === 'active' && <HitHalo view={view} />}
              <TargetShape view={view} />
            </React.Fragment>
          ),
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
    ...StyleSheet.absoluteFillObject,
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
