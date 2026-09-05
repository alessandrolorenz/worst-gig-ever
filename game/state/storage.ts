/**
 * The disk (M22).
 *
 * Source of truth: docs/specs/M22-local-memory-and-sharing.md
 *
 * **The only file in the repository that imports `expo-file-system`**, in the
 * same way `deviceLocale.ts` is the only one that imports `expo-localization`
 * (M19). Everything that decides anything lives in `persistence.ts` and is
 * tested in Node; this module goes and gets the bytes.
 *
 * One JSON file, written on discrete events — a stage finished, a preference
 * changed — and read once at startup. That is the whole access pattern, and it
 * is why `@react-native-async-storage/async-storage` is not a dependency of
 * this project: it is a native module for a job `expo-file-system` already
 * does (AGENTS.md rule 18).
 *
 * ## Nothing here throws
 *
 * A read that fails is a fresh save. A write that fails is a lost high score.
 * Neither is worth an error dialog, and neither may stop a round: *session
 * progress must never gate a cold start* (M15, restated in the V2 plan), and
 * the most literal way to break that is to let a disk error reach the caller.
 */
import * as FileSystem from 'expo-file-system';

import {
  SAVE_FILE_NAME,
  emptySave,
  parseSave,
  serializeSave,
  type ParsedSave,
  type SavedState,
  type UnknownFields,
} from './persistence.ts';

function savePath(): string | null {
  const directory = FileSystem.documentDirectory;
  return directory === null ? null : `${directory}${SAVE_FILE_NAME}`;
}

/**
 * Reads the save, or reports a fresh one.
 *
 * `getInfoAsync` first rather than catching the read: a missing file is the
 * normal state of a fresh install, and treating "absent" the same as "corrupt"
 * would mark every first launch as unreadable and stop it ever being written.
 */
export async function loadSave(): Promise<ParsedSave> {
  const path = savePath();
  if (path === null) return { state: emptySave(), unknown: {}, unreadable: false };

  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return { state: emptySave(), unknown: {}, unreadable: false };
    return parseSave(await FileSystem.readAsStringAsync(path));
  } catch {
    // The file is there and unreadable — a permission problem, or a partial
    // write from a process that died. Treated as unreadable rather than
    // absent, so the caller knows not to overwrite the evidence.
    return { state: emptySave(), unknown: {}, unreadable: true };
  }
}

/** Writes the save. Returns whether it landed; the caller may ignore that. */
export async function writeSave(
  state: SavedState,
  unknown: UnknownFields = {},
): Promise<boolean> {
  const path = savePath();
  if (path === null) return false;

  try {
    await FileSystem.writeAsStringAsync(path, serializeSave(state, unknown));
    return true;
  } catch {
    return false;
  }
}

/** Deletes the save. For a development reset; nothing in the game calls it. */
export async function clearSave(): Promise<void> {
  const path = savePath();
  if (path === null) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    /* Nothing to do and nothing worth telling the player. */
  }
}
