/**
 * Audio lifecycle for a round (AGENTS.md rule 11).
 *
 * Wraps expo-audio behind a small interface so gameplay systems emit
 * intentions ("a bottle broke") rather than touching players directly.
 *
 * Every call is failure-tolerant. `expo-audio` ships native code, so in Expo Go
 * or a development client built before it was added the module is simply
 * absent — the show must still run silently rather than crash on launch
 * (ADR 0002).
 */
import { MIX, MUSIC_SOURCE, SFX_POOL_SIZE, SFX_SOURCES, type SfxKey } from './audioAssets.ts';

interface PlayerLike {
  play(): void;
  pause(): void;
  remove(): void;
  seekTo(seconds: number): Promise<void>;
  loop: boolean;
  volume: number;
  playing: boolean;
}

export interface AudioService {
  readonly available: boolean;
  readonly failureReason: string | null;
  playMusic(): void;
  pauseMusic(): void;
  resumeMusic(): void;
  stopMusic(): void;
  restartMusic(): void;
  playSfx(key: SfxKey): void;
  dispose(): void;
}

/** Used when audio cannot be initialised. Every method is a no-op. */
function createSilentService(reason: string): AudioService {
  return {
    available: false,
    failureReason: reason,
    playMusic() {},
    pauseMusic() {},
    resumeMusic() {},
    stopMusic() {},
    restartMusic() {},
    playSfx() {},
    dispose() {},
  };
}

export function createAudioService(): AudioService {
  let expoAudio: typeof import('expo-audio');
  try {
    // Required lazily so a missing native module degrades to silence.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expoAudio = require('expo-audio');
  } catch (error) {
    return createSilentService(`expo-audio module unavailable: ${String(error)}`);
  }

  let music: PlayerLike | null = null;
  const pools = new Map<SfxKey, { players: PlayerLike[]; next: number }>();
  let disposed = false;

  try {
    expoAudio
      .setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false })
      .catch(() => {
        /* Non-fatal: playback still works with the default session. */
      });

    music = expoAudio.createAudioPlayer(MUSIC_SOURCE) as unknown as PlayerLike;
    music.loop = true;
    music.volume = MIX.music;

    for (const key of Object.keys(SFX_SOURCES) as SfxKey[]) {
      const players: PlayerLike[] = [];
      for (let i = 0; i < SFX_POOL_SIZE[key]; i += 1) {
        const player = expoAudio.createAudioPlayer(SFX_SOURCES[key]) as unknown as PlayerLike;
        player.volume = MIX[key];
        players.push(player);
      }
      pools.set(key, { players, next: 0 });
    }
  } catch (error) {
    return createSilentService(`audio preload failed: ${String(error)}`);
  }

  const safely = (action: () => void): void => {
    if (disposed) return;
    try {
      action();
    } catch {
      /* A single dropped cue must never take the round down. */
    }
  };

  return {
    available: true,
    failureReason: null,

    playMusic() {
      safely(() => {
        if (!music) return;
        void music.seekTo(0).catch(() => {});
        music.play();
      });
    },

    pauseMusic() {
      safely(() => music?.pause());
    },

    resumeMusic() {
      safely(() => music?.play());
    },

    stopMusic() {
      safely(() => {
        if (!music) return;
        music.pause();
        void music.seekTo(0).catch(() => {});
      });
    },

    restartMusic() {
      this.playMusic();
    },

    playSfx(key: SfxKey) {
      safely(() => {
        const pool = pools.get(key);
        if (!pool || pool.players.length === 0) return;
        const player = pool.players[pool.next];
        pool.next = (pool.next + 1) % pool.players.length;
        void player.seekTo(0).catch(() => {});
        player.play();
      });
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      try {
        music?.pause();
        music?.remove();
      } catch {
        /* Already released. */
      }
      for (const pool of pools.values()) {
        for (const player of pool.players) {
          try {
            player.pause();
            player.remove();
          } catch {
            /* Already released. */
          }
        }
      }
      pools.clear();
      music = null;
    },
  };
}
