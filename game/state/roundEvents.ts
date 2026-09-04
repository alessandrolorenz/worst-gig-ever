/**
 * Events emitted by the round domain.
 *
 * The domain never plays a sound or touches a component. It reports what
 * happened, and the React/audio layers decide how to react
 * (docs/architecture/game-architecture.md).
 */
import type { TargetKind } from './gameState.ts';

export type RoundEvent =
  | { type: 'TARGET_SPAWNED'; targetId: number; kind: TargetKind }
  | {
      type: 'TARGET_HIT';
      targetId: number;
      kind: TargetKind;
      x: number;
      y: number;
      points: number;
      multiplier: number;
      /** A mug caught near enough to drink (M18). Bottles are never drunk. */
      drunk: boolean;
    }
  | { type: 'TARGET_MISSED'; targetId: number; kind: TargetKind }
  | { type: 'COMBO_CHANGED'; combo: number }
  | { type: 'INTEGRITY_CHANGED'; integrity: number }
  | { type: 'VOCALIST_EVENT_STARTED' }
  | { type: 'VOCALIST_HIT'; points: number }
  | { type: 'VOCALIST_EVENT_ENDED'; wasHit: boolean }
  | { type: 'SHOW_COMPLETED' }
  | { type: 'SHOW_RUINED' };
