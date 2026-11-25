/**
 * Crowd Mode composition (M28–M30): where each layer sits and how domain
 * state moves it. Gameplay geometry stays in crowdConfig; every temporary
 * drawing stays in CrowdPlaceholders. This file is the part that survives the
 * final art pass — it positions, falls, wobbles and bobs whatever it is given.
 */
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { HIT_BURST_ART, TARGET_ART } from '../rendering/artAssets.ts';
import { absolute } from '../rendering/composition.ts';
import { spriteTransform } from '../rendering/spriteTransform.ts';
import { THEME } from '../rendering/theme.ts';
import { CROWD_ART_SLOTS, crowdWaiterDrawRect } from './crowdArtSlots.ts';
import { CrowdCompositionPreview } from './CrowdCompositionPreview.tsx';
import {
  CROWD_PERFORMER_TARGETS,
  CROWD_REACTIONS,
  CROWD_STAGE_TARGETS,
  CROWD_TARGETS,
  CROWD_THROW,
  type CrowdPerformerTargetId,
  type CrowdRect,
  type CrowdStageTargetId,
  type CrowdTargetDefinition,
} from './crowdConfig.ts';
import {
  CrowdAmplifierPlaceholder,
  CrowdAvoidMarker,
  CrowdCymbalPlaceholder,
  CrowdInstrumentPlaceholder,
  CrowdMicrophonePlaceholder,
  CrowdPerformerPlaceholder,
  CrowdStagePlatePlaceholder,
  CrowdTargetMarker,
  CrowdThrowHandPlaceholder,
  CrowdWaiterPlaceholder,
  CrowdWaiterShadow,
} from './CrowdPlaceholders.tsx';
import { crowdStage, type CrowdStageConfig } from './crowdStages.ts';
import {
  crowdAimGuidePoints,
  crowdBlockerPose,
  crowdPerformerPose,
  crowdProjectilePose,
  crowdPropFallProgress,
  crowdTargetRect,
  type CrowdPropState,
  type CrowdState,
} from './crowdState.ts';

export const SHOW_CROWD_DEBUG = false;

/** Opt-in only: never appears in production and adds no navigation surface. */
export function showCrowdCompositionPreview(): boolean {
  return process.env.EXPO_PUBLIC_CROWD_ART_PREVIEW === '1';
}

const BOTTLE_SIZE = { width: 118, height: 236 } as const;
const WAITER_STEP_PX = 6;
const WAITER_SHADOW_HEIGHT = 44;
const WAITER_AVOID_SIZE = 68;

/** Instruments are drawn in their own art-slot box; everything else in its target rect. */
const PROP_BOX: Partial<Record<CrowdStageTargetId, CrowdRect>> = {
  guitar: CROWD_ART_SLOTS.guitarProp.box,
  bass: CROWD_ART_SLOTS.bassProp.box,
};

function AimPreview({ state, stage }: { state: CrowdState; stage: CrowdStageConfig }) {
  if (state.phase !== 'aiming' || !state.gestureStart || !state.gestureCurrent) return null;
  const upward = state.gestureStart.y - state.gestureCurrent.y;
  if (upward <= 0) return null;
  const points = crowdAimGuidePoints(
    state.gestureStart,
    state.gestureCurrent,
    stage.aimGuideProgress,
  );
  return (
    <>
      {points.map((point, index) => {
        const size = Math.max(8, 18 - index * 2);
        return (
          <View
            key={index}
            style={[
              styles.aimDot,
              { left: point.x - size / 2, top: point.y - size / 2, width: size, height: size },
            ]}
          />
        );
      })}
    </>
  );
}

function propArt(target: CrowdTargetDefinition, prop: CrowdPropState) {
  if (target.id === 'amplifier') {
    return <CrowdAmplifierPlaceholder damaged={prop.status === 'damaged'} />;
  }
  // Held instruments live in the performing frames until they are knocked loose.
  if (
    prop.status === 'intact' &&
    (target.id === 'microphone' || target.id === 'guitar' || target.id === 'bass')
  ) {
    return null;
  }
  if (target.id === 'microphone') return <CrowdMicrophonePlaceholder />;
  if (target.id === 'guitar' || target.id === 'bass') {
    return <CrowdInstrumentPlaceholder kind={target.id} />;
  }
  return <CrowdCymbalPlaceholder />;
}

/** All prop motion is here, in code, so no sprite needs a second frame for it. */
function propTransform(target: CrowdTargetDefinition, prop: CrowdPropState) {
  if (prop.status === 'wobbling') {
    const progress = prop.reactionElapsedMs / CROWD_REACTIONS.cymbalWobbleMs;
    return [{ rotate: `${Math.sin(progress * Math.PI * 8) * 12}deg` }];
  }
  if (prop.status === 'damaged') {
    const progress = prop.reactionElapsedMs / CROWD_REACTIONS.amplifierShakeMs;
    return [{ translateX: Math.sin(progress * Math.PI * 6) * 9 * (1 - progress) }];
  }
  const fall = target.fall;
  const progress = crowdPropFallProgress(prop);
  if (!fall || progress === 0) return [];
  return [
    { translateX: fall.dx * progress },
    // Accelerating drop: slow off the mark, fast into the floor.
    { translateY: fall.dy * progress * progress },
    { rotate: `${fall.rotateDeg * progress}deg` },
  ];
}

function StageProp({ target, prop }: { target: CrowdTargetDefinition; prop: CrowdPropState }) {
  const box = PROP_BOX[target.id as CrowdStageTargetId] ?? target.rect;
  return (
    <View style={[absolute(box), { transform: propTransform(target, prop) }]}>
      {propArt(target, prop)}
    </View>
  );
}

function Performer({ target, state }: { target: CrowdTargetDefinition; state: CrowdState }) {
  const performer = target.id as CrowdPerformerTargetId;
  const pose = crowdPerformerPose(state.performers[performer]);
  const slot =
    CROWD_ART_SLOTS[
      `${performer}${pose.base === 'performing' ? 'Performing' : 'Disarmed'}` as const
    ];
  // A recoil and return, peaking mid-reaction.
  const recoil = Math.sin(pose.hitProgress * Math.PI);
  return (
    <View
      style={[
        absolute(slot.box),
        { transform: [{ translateY: -14 * recoil }, { rotate: `${4 * recoil}deg` }] },
      ]}
    >
      <CrowdPerformerPlaceholder performer={performer} base={pose.base} reacting={pose.reacting} />
    </View>
  );
}

function Waiter({ state, stage }: { state: CrowdState; stage: CrowdStageConfig }) {
  const pose = crowdBlockerPose(state.elapsedMs, stage.waiter);
  if (!pose.visible) return null;
  const box = crowdWaiterDrawRect(pose.rect);
  // A step, not a hover: he only ever lifts off the floor line, never sinks.
  const bob = -Math.abs(Math.sin(pose.progress * Math.PI * 12)) * WAITER_STEP_PX;
  const hit = state.phase === 'result' && state.feedback?.type === 'wrong-target';
  return (
    <>
      <View
        style={absolute({
          x: box.x + box.width * 0.14,
          y: box.y + box.height - WAITER_SHADOW_HEIGHT * 0.6,
          width: box.width * 0.72,
          height: WAITER_SHADOW_HEIGHT,
        })}
      >
        <CrowdWaiterShadow />
      </View>
      <View style={[absolute(box), { transform: [{ translateY: bob }] }]}>
        <CrowdWaiterPlaceholder hit={hit} />
        <View
          style={absolute({
            x: (box.width - WAITER_AVOID_SIZE) / 2,
            y: -WAITER_AVOID_SIZE * 0.7,
            width: WAITER_AVOID_SIZE,
            height: WAITER_AVOID_SIZE,
          })}
        >
          <CrowdAvoidMarker />
        </View>
      </View>
      {SHOW_CROWD_DEBUG && <View style={[absolute(pose.rect), styles.debugBlocker]} />}
    </>
  );
}

/** Brackets on what is still left to destroy, at the size it can be hit. */
function ObjectiveMarkers({ state, stage }: { state: CrowdState; stage: CrowdStageConfig }) {
  return (
    <>
      {state.objectives
        .filter((objective) => !objective.completed)
        .map((objective) => {
          const target = CROWD_TARGETS.find((candidate) => candidate.id === objective.targetId);
          if (!target || target.type === 'performer') return null;
          return (
            <View key={objective.objectiveId} style={absolute(crowdTargetRect(target, stage))}>
              <CrowdTargetMarker />
            </View>
          );
        })}
    </>
  );
}

export function CrowdScene({ state }: { state: CrowdState }) {
  if (showCrowdCompositionPreview()) return <CrowdCompositionPreview />;

  const stage = crowdStage(state.stageId);
  const pose = state.projectile ? crowdProjectilePose(state.projectile) : null;
  const bottleWaiting = state.phase === 'ready' || state.phase === 'aiming';

  return (
    <View style={styles.root}>
      <CrowdStagePlatePlaceholder />
      <View style={styles.stageTint} />

      {CROWD_STAGE_TARGETS.filter((target) => target.type === 'stage-prop').map((target) => (
        <StageProp
          key={target.id}
          target={target}
          prop={state.stageProps[target.id as CrowdStageTargetId]}
        />
      ))}
      {CROWD_PERFORMER_TARGETS.map((target) => (
        <Performer key={target.id} target={target} state={state} />
      ))}
      {CROWD_STAGE_TARGETS.filter((target) => target.type === 'instrument').map((target) => (
        <StageProp
          key={target.id}
          target={target}
          prop={state.stageProps[target.id as CrowdStageTargetId]}
        />
      ))}
      <ObjectiveMarkers state={state} stage={stage} />
      <Waiter state={state} stage={stage} />

      {SHOW_CROWD_DEBUG &&
        CROWD_TARGETS.map((target) => (
          <View key={target.id} style={[absolute(crowdTargetRect(target, stage)), styles.debugTarget]} />
        ))}

      <AimPreview state={state} stage={stage} />

      {bottleWaiting && (
        <>
          <CrowdThrowHandPlaceholder />
          <Image
            source={TARGET_ART.beerBottle}
            style={spriteTransform(
              CROWD_THROW.bottleReady.x,
              CROWD_THROW.bottleReady.y,
              BOTTLE_SIZE.width,
              BOTTLE_SIZE.height,
              1,
              state.phase === 'aiming' ? -0.08 : 0.04,
            )}
            resizeMode="contain"
            fadeDuration={0}
          />
        </>
      )}

      {pose && state.phase === 'flying' && (
        <Image
          source={TARGET_ART.beerBottle}
          style={spriteTransform(
            pose.x,
            pose.y,
            BOTTLE_SIZE.width,
            BOTTLE_SIZE.height,
            pose.scale,
            pose.rotation,
          )}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}

      {pose && state.phase === 'result' && (
        <Image
          source={HIT_BURST_ART}
          style={spriteTransform(pose.x, pose.y, 220, 220, 1, 0)}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  stageTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 7, 12, 0.06)',
  },
  aimDot: {
    position: 'absolute',
    borderRadius: 20,
    backgroundColor: THEME.hudText,
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  debugTarget: {
    borderColor: '#46ff89',
    borderWidth: 4,
    backgroundColor: 'rgba(70, 255, 137, 0.12)',
  },
  debugBlocker: {
    borderColor: '#ffea46',
    borderWidth: 5,
    backgroundColor: 'rgba(255, 234, 70, 0.12)',
  },
});
