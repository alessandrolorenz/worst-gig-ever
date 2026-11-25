import React from 'react';
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { absolute } from '../rendering/composition.ts';
import { TARGET_ART } from '../rendering/artAssets.ts';
import { spriteTransform } from '../rendering/spriteTransform.ts';
import { CROWD_ART } from './crowdArt.ts';
import { CROWD_ART_SLOTS, crowdWaiterDrawRect } from './crowdArtSlots.ts';
import {
  CROWD_STAGE_TARGETS,
  CROWD_TARGETS,
  CROWD_WAITER,
  crowdTarget,
  type CrowdRect,
  type CrowdStageTargetId,
} from './crowdConfig.ts';

type PerformerState = 'performing' | 'disarmed';

/**
 * Development-only M31 composition harness. It deliberately uses the same
 * 1920x1080 boxes as CrowdScene without adding a route or gameplay state.
 */
export function CrowdCompositionPreview() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const requestedState = params?.get('artState');
  const showForeground = params?.get('foreground') === '1';
  const performerState: PerformerState = requestedState === 'disarmed' ? 'disarmed' : 'performing';
  const amplifierDamaged = performerState === 'disarmed';

  return (
    <View style={styles.root}>
      <Image source={CROWD_ART.stagePlate} style={styles.plate} resizeMode="stretch" fadeDuration={0} />

      <Image
        source={amplifierDamaged ? CROWD_ART.amplifier.damaged : CROWD_ART.amplifier.intact}
        style={absolute(CROWD_ART_SLOTS.amplifierIntact.box)}
        resizeMode="contain"
        fadeDuration={0}
      />

      {CROWD_STAGE_TARGETS.filter(
        (target) => target.id === 'crashCymbal' || target.id === 'rideCymbal',
      ).map((target) => (
        <Image
          key={target.id}
          source={CROWD_ART.cymbal}
          style={absolute(target.rect)}
          resizeMode="stretch"
          fadeDuration={0}
        />
      ))}

      {(['bassist', 'guitarist', 'vocalist'] as const).map((performer) => (
        <Image
          key={performer}
          source={CROWD_ART.performers[performer][performerState]}
          style={absolute(CROWD_ART_SLOTS[`${performer}${performerState === 'performing' ? 'Performing' : 'Disarmed'}`].box)}
          resizeMode="stretch"
          fadeDuration={0}
        />
      ))}

      {performerState === 'disarmed' && (
        <>
          <DownProp
            id="microphone"
            source={CROWD_ART.props.microphone}
            box={CROWD_ART_SLOTS.microphoneProp.box}
          />
          <DownProp
            id="guitar"
            source={CROWD_ART.props.guitar}
            box={CROWD_ART_SLOTS.guitarProp.box}
          />
          <DownProp id="bass" source={CROWD_ART.props.bass} box={CROWD_ART_SLOTS.bassProp.box} />
        </>
      )}

      {showForeground && (
        <Image
          source={CROWD_ART.waiter}
          style={absolute(
            crowdWaiterDrawRect({
              x: 845,
              y: CROWD_WAITER.y,
              width: CROWD_WAITER.width,
              height: CROWD_WAITER.height,
            }),
          )}
          resizeMode="stretch"
          fadeDuration={0}
        />
      )}

      {CROWD_TARGETS.map((target) => (
        <View key={target.id} pointerEvents="none" style={[absolute(target.rect), styles.hitbox]}>
          <Text style={styles.hitboxLabel}>{target.id}</Text>
        </View>
      ))}

      {showForeground && (
        <>
          <Image
            source={CROWD_ART.throwHand}
            style={absolute(CROWD_ART_SLOTS.throwHand.box)}
            resizeMode="stretch"
            fadeDuration={0}
          />
          <Image
            source={TARGET_ART.beerBottle}
            style={spriteTransform(960, 910, 118, 236, 1, 0.04)}
            resizeMode="contain"
            fadeDuration={0}
          />
        </>
      )}

    </View>
  );
}

function DownProp({
  id,
  source,
  box,
}: {
  id: Extract<CrowdStageTargetId, 'microphone' | 'guitar' | 'bass'>;
  source: ImageSourcePropType;
  box: CrowdRect;
}) {
  const fall = crowdTarget(id).fall;
  if (!fall) return null;
  return (
    <Image
      source={source}
      style={[
        absolute(box),
        {
          transform: [
            { translateX: fall.dx },
            { translateY: fall.dy },
            { rotate: `${fall.rotateDeg}deg` },
          ],
        },
      ]}
      resizeMode="stretch"
      fadeDuration={0}
    />
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#08070c' },
  plate: { ...StyleSheet.absoluteFillObject, width: 1920, height: 1080 },
  hitbox: {
    borderWidth: 4,
    borderColor: 'rgba(70, 255, 137, 0.92)',
    backgroundColor: 'rgba(70, 255, 137, 0.08)',
  },
  hitboxLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: 'rgba(5, 18, 10, 0.88)',
    color: '#a7ffc4',
    fontSize: 18,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
});
