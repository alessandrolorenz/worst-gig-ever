import type { ImageSourcePropType } from 'react-native';

/* Metro resolves bundled art through static `require` calls. */
/* eslint-disable @typescript-eslint/no-var-requires */

/** Static requires keep every Crowd Mode production asset visible to Metro. */
export const CROWD_ART = {
  stagePlate: require('../../assets/art/crowd_mode/crowd_stage_plate.jpg') as ImageSourcePropType,
  amplifier: {
    intact: require('../../assets/art/crowd_mode/amplifier_intact.png') as ImageSourcePropType,
    damaged: require('../../assets/art/crowd_mode/amplifier_damaged.png') as ImageSourcePropType,
  },
  cymbal: require('../../assets/art/crowd_mode/cymbal.png') as ImageSourcePropType,
  props: {
    microphone: require('../../assets/art/crowd_mode/microphone_prop.png') as ImageSourcePropType,
    guitar: require('../../assets/art/crowd_mode/guitar_prop.png') as ImageSourcePropType,
    bass: require('../../assets/art/crowd_mode/bass_prop.png') as ImageSourcePropType,
  },
  waiter: require('../../assets/art/crowd_mode/waiter.png') as ImageSourcePropType,
  throwHand: require('../../assets/art/crowd_mode/throw_hand.png') as ImageSourcePropType,
  performers: {
    bassist: {
      performing: require('../../assets/art/crowd_mode/bassist_performing.png') as ImageSourcePropType,
      disarmed: require('../../assets/art/crowd_mode/bassist_disarmed.png') as ImageSourcePropType,
    },
    vocalist: {
      performing: require('../../assets/art/crowd_mode/vocalist_performing.png') as ImageSourcePropType,
      disarmed: require('../../assets/art/crowd_mode/vocalist_disarmed.png') as ImageSourcePropType,
    },
    guitarist: {
      performing: require('../../assets/art/crowd_mode/guitarist_performing.png') as ImageSourcePropType,
      disarmed: require('../../assets/art/crowd_mode/guitarist_disarmed.png') as ImageSourcePropType,
    },
  },
} as const;
