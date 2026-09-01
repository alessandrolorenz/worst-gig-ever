/**
 * Pack 1 scene renderer.
 *
 * Draws a snapshot of the round without owning gameplay state. Everything is
 * authored on the 1920x1080 reference canvas and scaled once at the root. Art
 * bounds never become hitboxes; positions and radii come from the domain.
 */
import React, { useCallback, useRef } from 'react';
import { Image, View, Text, StyleSheet, type LayoutChangeEvent } from 'react-native';

import { REFERENCE_CANVAS, STAGE, STAGE_MOTION, VOCALIST_BLOCKING_RECT } from '../config/stage.ts';
import {
  DRUMSTICK_ART,
  GLASS_SHARD_ART,
  HIT_BURST_ART,
  PERFORMER_ART,
  STAGE_ART,
  TARGET_ART,
  VOCALIST_BLOCKING_ART,
} from './artAssets.ts';
import {
  CROWD_BACK_RECT,
  CROWD_FRONT_RECT,
  DRUM_KIT_RECT,
  TARGET_DRAW_SIZE,
  absolute,
  partitionByDepth,
  performerRect,
} from './composition.ts';
import { Countdown } from './Countdown.tsx';
import { GroovePad } from './GroovePad.tsx';
import { fitCanvas, type Viewport } from './layout.ts';
import { THEME } from './theme.ts';
import { effectProgress, type EffectsState, type TimedEffect } from '../systems/effects.ts';
import { shardOpacity, type Shard, type ShardsState } from '../systems/shards.ts';
import {
  ONE_SHOT_POSES,
  PERFORMER_POSES,
  beatPulse,
  loopFrameAt,
  loopMs,
  performerPose,
  type PerformerId,
  type PerformerPose,
  type StageMotionState,
} from '../systems/stageMotion.ts';
import { isPadPulsing, type RhythmState } from '../state/rhythmState.ts';
import { targetViews, type RoundState, type TargetView } from '../state/roundState.ts';
import { Hud } from './Hud.tsx';

export interface SceneRendererProps {
  round: RoundState;
  rhythm: RhythmState;
  effects: EffectsState;
  shards: ShardsState;
  stageMotion: StageMotionState;
  viewport: Viewport;
}

/**
 * M5A observation aids — the tap-radius ring and the danger line — kept for
 * tuning and deliberately off in normal play, now that the art says where the
 * kit is and how big a target reads.
 */
export const SHOW_GRAYBOX_DEBUG = false;

/**
 * Whether the Pack 1 ambient frames actually form a loop.
 *
 * They do not. `idle`, `loopA`, and `loopB` are three separate drawings of
 * each performer rather than three poses of one: proportions, line weight,
 * palette, and foot anchor all move, and 60-87% of the drawn subject changes
 * between frames — the crowd is the worst at 85%. M6 froze the opposite
 * ("the same fictional person... and approximate foot anchor", "differences
 * are subtle"), so cutting between them at tempo reads as flickering rather
 * than as animation. No renderer trick makes three unrelated drawings a loop.
 *
 * Until the frames are regenerated as variations of one drawing, the scene
 * holds the first ambient frame. The choreography itself keeps running and
 * stays tested — only the bitmap choice is pinned — so this becomes `true`
 * again with no other change. Reactions are unaffected: `hitReaction` and
 * `dodge` are one-shots answering an event, and a hard change there reads as
 * a reaction rather than as a flicker. See ADR 0009.
 */
export const AMBIENT_LOOP_ART_READY = false;

/** The ambient loop frame to draw, honouring the hold above. */
function ambientFrame(frame: number): number {
  return AMBIENT_LOOP_ART_READY ? frame : 0;
}

/** The pose to draw. One-shot reactions always play; the loop may be pinned. */
function ambientPoseArt(pose: PerformerPose): PerformerPose {
  if (AMBIENT_LOOP_ART_READY || ONE_SHOT_POSES.includes(pose)) return pose;
  return 'idle';
}

const STICK_ORIGIN = { x: REFERENCE_CANVAS.width / 2, y: REFERENCE_CANVAS.height + 60 };

/** Drawn height of the drumstick band, padding included. See `Strike`. */
const STICK_THICKNESS = 72;

/**
 * How far the stage lights breathe either side of their resting brightness.
 *
 * Small on purpose. The overlay covers the whole canvas, so a wide swing does
 * not read as lighting — it reads as the screen flashing, which is what the
 * first device build of this scene actually did.
 */
const LIGHT_BASE_OPACITY = 0.58;
const LIGHT_PULSE_OPACITY = 0.14;

/**
 * Every frame of a low-frame loop, mounted at once with only one visible.
 *
 * Swapping an `Image`'s `source` makes the platform fetch and repaint a
 * different bitmap. At three poses a bar, across three performers and the
 * crowd, that reads as flickering rather than as animation — the swap is a
 * blank frame, not a pose change. Mounting every frame keeps all of them
 * decoded and resident, so changing pose is an opacity change and nothing
 * loads. The frame list is fixed for the life of the component, so `index`
 * is a stable key.
 */
function FrameStack({
  sources,
  current,
  resizeMode = 'contain',
}: {
  sources: readonly number[];
  current: number;
  resizeMode?: 'contain' | 'stretch';
}) {
  return (
    <>
      {sources.map((source, index) => (
        <Image
          key={index}
          source={source}
          style={[styles.fill, index === current ? styles.frameShown : styles.frameHidden]}
          resizeMode={resizeMode}
        />
      ))}
    </>
  );
}

function Backdrop({ stageMotion }: { stageMotion: StageMotionState }) {
  const pulse = beatPulse(stageMotion.elapsedMs);
  const crowdFrame = loopFrameAt(stageMotion.elapsedMs, loopMs(), STAGE_MOTION.loopFrames);

  return (
    <>
      <Image source={STAGE_ART.background} style={styles.fill} resizeMode="stretch" />
      <Image
        source={STAGE_ART.lights}
        style={[styles.fill, { opacity: LIGHT_BASE_OPACITY + pulse * LIGHT_PULSE_OPACITY }]}
        resizeMode="stretch"
      />
      <Image source={STAGE_ART.crowdBack} style={absolute(CROWD_BACK_RECT)} resizeMode="stretch" />
      <View style={absolute(CROWD_FRONT_RECT)}>
        <FrameStack
          sources={STAGE_ART.crowdFrames}
          current={ambientFrame(crowdFrame)}
          resizeMode="stretch"
        />
      </View>
    </>
  );
}

function BandMember({ id, pose }: { id: Exclude<PerformerId, 'vocalist'>; pose: PerformerPose }) {
  return (
    <View style={absolute(performerRect(id))}>
      <FrameStack
        sources={POSE_FRAMES[id]}
        current={PERFORMER_POSES.indexOf(ambientPoseArt(pose))}
      />
    </View>
  );
}

/**
 * Pose bitmaps in one fixed order per performer, so a `FrameStack` index means
 * the same thing on every frame.
 */
const POSE_FRAMES: Record<PerformerId, readonly number[]> = {
  bassist: PERFORMER_POSES.map((pose) => PERFORMER_ART.bassist[pose]),
  guitarist: PERFORMER_POSES.map((pose) => PERFORMER_ART.guitarist[pose]),
  vocalist: PERFORMER_POSES.map((pose) => PERFORMER_ART.vocalist[pose]),
};

/** The vocalist carries one extra frame the ambient loop never reaches. */
const VOCALIST_FRAMES: readonly number[] = [...POSE_FRAMES.vocalist, VOCALIST_BLOCKING_ART];
const VOCALIST_BLOCKING_FRAME = VOCALIST_FRAMES.length - 1;

/**
 * Round vocalist status outranks presentation-only ambient poses.
 *
 * While idle the vocalist shares the band's frame and floor line, so all three
 * stand on the same stage. `blocking` is the one pose that leaves it: the
 * singer steps into the drummer's face, and the art fills the tap region the
 * domain already owns so the player swings at what they can see.
 */
function Vocalist({ round, pose }: { round: RoundState; pose: PerformerPose }) {
  const status = round.vocalist.status;
  const rect = status === 'idle' ? performerRect('vocalist') : VOCALIST_BLOCKING_RECT;
  const frame =
    status === 'blocking'
      ? VOCALIST_BLOCKING_FRAME
      : PERFORMER_POSES.indexOf(status === 'hit' ? 'hitReaction' : ambientPoseArt(pose));

  return (
    <View style={[styles.vocalistFrame, absolute(rect)]}>
      <FrameStack sources={VOCALIST_FRAMES} current={frame} />
      {status === 'blocking' && <Text style={styles.vocalistCue}>TAP THE SINGER</Text>}
    </View>
  );
}

/** Debug-only: the art now marks the arrival line with the kit itself. */
function DangerLine() {
  return (
    <>
      <View style={styles.dangerGlow} />
      <View style={styles.dangerLine} />
    </>
  );
}

function DrumKit() {
  return <Image source={STAGE_ART.drumKit} style={absolute(DRUM_KIT_RECT)} resizeMode="stretch" />;
}

function TargetShape({ view }: { view: TargetView }) {
  // Drawn size is composition data, checked against the tap radius by test.
  const size = TARGET_DRAW_SIZE[view.kind];
  const width = size.width * view.scale;
  const height = size.height * view.scale;

  return (
    <Image
      source={TARGET_ART[view.kind]}
      style={{
        position: 'absolute',
        left: view.x - width / 2,
        top: view.y - height / 2,
        width,
        height,
        opacity: view.status === 'missed' ? 0.45 : 1,
        transform: [{ rotate: `${view.rotation}rad` }],
      }}
      resizeMode="contain"
    />
  );
}

/** Debug-only ring that draws the exact configured tap radius. */
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
  const extend = progress < 0.45 ? progress / 0.45 : 1 - (progress - 0.45) / 0.55;

  return (
    <Image
      source={DRUMSTICK_ART}
      style={{
        position: 'absolute',
        left: STICK_ORIGIN.x,
        top: STICK_ORIGIN.y,
        width: length * Math.max(0, extend),
        // The stick art is mostly transparent padding: only 40 of its 96
        // source rows are wood, so a 28 px band drew a 12 px sliver nobody
        // could see land.
        height: STICK_THICKNESS,
        marginTop: -STICK_THICKNESS / 2,
        opacity: 1 - progress * 0.35,
        transform: [{ rotate: `${angle}rad` }],
        transformOrigin: 'left center',
      }}
      resizeMode="stretch"
    />
  );
}

function Burst({ effect }: { effect: TimedEffect }) {
  const progress = effectProgress(effect);
  const size = 100 + progress * 190;

  return (
    <Image
      source={HIT_BURST_ART}
      style={{
        position: 'absolute',
        left: effect.x - size / 2,
        top: effect.y - size / 2,
        width: size,
        height: size,
        opacity: 1 - progress,
        transform: [{ rotate: `${progress * 0.45}rad` }],
      }}
      resizeMode="contain"
    />
  );
}

function Debris({ shards }: { shards: readonly Shard[] }) {
  return (
    <>
      {shards.map((shard) => (
        <Image
          key={shard.id}
          source={GLASS_SHARD_ART[(shard.id - 1) % GLASS_SHARD_ART.length]}
          style={{
            position: 'absolute',
            left: shard.body.position.x - shard.size / 2,
            top: shard.body.position.y - shard.size / 2,
            width: shard.size,
            height: shard.size,
            opacity: shardOpacity(shard),
            transform: [{ rotate: `${shard.body.angle}rad` }],
          }}
          resizeMode="contain"
        />
      ))}
    </>
  );
}

export function SceneRenderer({
  round,
  rhythm,
  effects,
  shards,
  stageMotion,
  viewport,
}: SceneRendererProps) {
  const rootRef = useRef<View>(null);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      viewport.width = width;
      viewport.height = height;
      // Preserve M5A window/page-coordinate mapping exactly.
      rootRef.current?.measureInWindow?.((pageX, pageY) => {
        viewport.pageX = pageX;
        viewport.pageY = pageY;
      });
    },
    [viewport],
  );

  const fit = fitCanvas(viewport.width, viewport.height);
  const showHalos =
    SHOW_GRAYBOX_DEBUG && (round.state === 'PLAYING' || round.state === 'VOCALIST_EVENT');

  // Everything in the impact zone passes between the drummer and their kit.
  const targets = partitionByDepth(
    targetViews(round).filter((view) => view.status !== 'hit'),
    (view) => view.y,
  );
  const bursts = partitionByDepth(effects.bursts, (effect) => effect.y);
  const debris = partitionByDepth(shards.shards, (shard) => shard.body.position.y);

  const renderTarget = (view: TargetView) => (
    <React.Fragment key={view.id}>
      {showHalos && view.status === 'active' && <HitHalo view={view} />}
      <TargetShape view={view} />
    </React.Fragment>
  );

  return (
    <View ref={rootRef} style={styles.root} onLayout={onLayout}>
      {/** All visual descendants stay non-interactive; the engine owns input. */}
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
        {SHOW_GRAYBOX_DEBUG && <DangerLine />}
        <BandMember id="bassist" pose={performerPose(stageMotion, 'bassist')} />
        <BandMember id="guitarist" pose={performerPose(stageMotion, 'guitarist')} />
        <Vocalist round={round} pose={performerPose(stageMotion, 'vocalist')} />

        {targets.far.map(renderTarget)}
        <Debris shards={debris.far} />
        {bursts.far.map((effect) => (
          <Burst key={effect.id} effect={effect} />
        ))}

        <DrumKit />

        {/**
         * Drawn over the kit, because the pad marks a cymbal in that very
         * bitmap and would otherwise be hidden by it. It stays *under* the
         * near-field projectiles and the strike, so a bottle arriving at the
         * player's face is never obscured by a UI ring — the Defense read
         * still wins the foreground.
         */}
        <GroovePad round={round} rhythm={rhythm} />

        {/**
         * Drawn with the pad, not with the HUD, so the numerals and the swell
         * they are counting read as one instruction. It sits above the pad and
         * renders nothing at all once `GO!` has aged out (M13.1).
         */}
        <Countdown round={round} />

        {targets.near.map(renderTarget)}
        <Debris shards={debris.near} />
        {bursts.near.map((effect) => (
          <Burst key={effect.id} effect={effect} />
        ))}
        {effects.strikes.map((effect) => (
          <Strike key={effect.id} effect={effect} />
        ))}
        {/**
         * Only from the pre-roll to the final whistle. An overlay is always on
         * screen otherwise, and its scrim is not opaque — leaving the HUD up
         * put a dimmed second copy of both scores behind the results summary,
         * which is noise at best and contradicts the summary at a glance.
         *
         * The countdown is included so the readouts are already in place when
         * the round starts rather than appearing on the `GO` beat, which is the
         * one moment the player's attention is committed elsewhere.
         */}
        {isPadPulsing(round.state) && <Hud round={round} rhythm={rhythm} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    /**
     * Filled explicitly rather than with `flex: 1`. The engine's web container
     * is a plain block element, not a flex parent, so `flex: 1` resolved to
     * zero height — and `overflow: hidden` then clipped the whole scene away,
     * leaving nothing but the letterbox colour. It also fed a height of 0 into
     * `fitCanvas`, which fell back to the reference height and offset the
     * canvas by half a screen. Filling the parent means the same thing on both
     * platforms and does not depend on the host being a flex container.
     */
    ...StyleSheet.absoluteFillObject,
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
  frameShown: {
    opacity: 1,
  },
  frameHidden: {
    opacity: 0,
  },
  vocalistFrame: {
    alignItems: 'center',
  },
  vocalistCue: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    textAlign: 'center',
    color: THEME.hudText,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 2,
    textShadowColor: THEME.letterbox,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  dangerGlow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STAGE.dangerLineY - 32,
    height: 32,
    backgroundColor: THEME.dangerLineSoft,
    opacity: 0.35,
  },
  dangerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: STAGE.dangerLineY,
    height: 3,
    backgroundColor: THEME.dangerLine,
    opacity: 0.6,
  },
});
