/**
 * Core round-state contract.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Game states)
 *                  docs/specs/M2-technical-foundation.md (Core domain types)
 *
 * This module declares the vocabulary only. Transition behavior, the round
 * clock, and hit resolution are implemented in M4.
 */

export const GAME_STATES = [
  'READY',
  'PLAYING',
  'PAUSED',
  'VOCALIST_EVENT',
  'SHOW_COMPLETE',
  'SHOW_RUINED',
] as const;

export type GameState = (typeof GAME_STATES)[number];

export const TARGET_KINDS = ['beerBottle', 'beerMug'] as const;

export type TargetKind = (typeof TARGET_KINDS)[number];

export const TARGET_STATUSES = ['active', 'hit', 'missed'] as const;

export type TargetStatus = (typeof TARGET_STATUSES)[number];

/** Terminal states of a round. A round in one of these states cannot score. */
export const TERMINAL_GAME_STATES = ['SHOW_COMPLETE', 'SHOW_RUINED'] as const;

export type TerminalGameState = (typeof TERMINAL_GAME_STATES)[number];
