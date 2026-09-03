/**
 * Drives the opening story from the engine clock (M15).
 *
 * A separate system from `roundSystem` on purpose. `roundSystem` is the bridge
 * to the *round* — it collects taps, advances gameplay, and turns domain events
 * into audio and effects. None of that is true of a story panel, and folding
 * the two together would mean the round bridge ran, and had to opt out of
 * running, on every screen in the app.
 *
 * The story is advanced by the same elapsed-time delta the round uses
 * (AGENTS.md rule 5) rather than by a timer of its own, so there is one clock
 * in the app and it stops when the engine stops.
 *
 * Input is deliberately **not** read here. A tap on the story is a tap on a
 * `Pressable` in the overlay layer, which sits above the play surface and
 * therefore never reaches the engine's touch handler at all — the same
 * arrangement that already keeps a tap on the pause button from breaking a
 * bottle behind it.
 */
import type { GameEntities } from '../entities/sceneEntities.ts';
import { finishIntro } from '../state/appFlow.ts';
import { tickStory } from '../state/storyState.ts';

export interface FlowSystemArgs {
  time: { delta: number };
}

export function flowSystem(entities: GameEntities, args: FlowSystemArgs): GameEntities {
  const scene = entities.scene;
  if (scene.flow.screen !== 'STORY') return entities;

  const events = tickStory(scene.story, args.time?.delta ?? 0);
  if (events.length === 0) return entities;

  // The story running out is the only thing that leaves this screen on its
  // own; Skip and the final tap go through the overlay instead.
  if (events.some((event) => event.type === 'STORY_FINISHED')) finishIntro(scene.flow);

  scene.onFlowChange?.();
  return entities;
}
