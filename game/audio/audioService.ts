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
import {
  MIX,
  MUSIC_SOURCES,
  SFX_POOL_SIZE,
  SFX_SOURCES,
  type MusicTrackId,
  type SfxKey,
} from './audioAssets.ts';

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
  /**
   * Creates players for exactly these tracks and releases every other (M24A).
   *
   * The seam the music library needs. Until M24A every registered track got a
   * player at construction, which was right for three of them and would be
   * wrong for a dozen: a catalogue of twelve would hold twelve decoders open
   * for a session that never plays more than four.
   *
   * Called with a **setlist**, so the ceiling is `SETLIST_SLOTS` rather than
   * the catalogue's size — and called early, at the title or the setlist
   * screen, so the reason the eager preload existed still holds. Swapping a
   * source is asynchronous on both platforms; a player created at the briefing
   * would still be loading when the round started and the first bars would be
   * silent.
   *
   * Idempotent: a track already loaded is kept, not recreated.
   */
  preloadSetlist(ids: readonly MusicTrackId[]): void;
  /**
   * Starts a track from the top, stopping whatever was playing (M16).
   *
   * The id is required rather than defaulted: every caller knows what it is
   * starting, and a default is how the teaching stage would silently come up on
   * the wrong bed the day someone adds a fifth slot.
   *
   * Loads the track if `preloadSetlist` did not — correctness over the race,
   * since a late player is better than no music at all.
   */
  playMusic(id: MusicTrackId): void;
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
    preloadSetlist() {},
    playMusic() {},
    pauseMusic() {},
    resumeMusic() {},
    stopMusic() {},
    restartMusic() {},
    playSfx() {},
    dispose() {},
  };
}

/**
 * `preload` is a parameter rather than a read of `OFFICIAL_SETLIST` inside, so
 * this module stays ignorant of stages and levels — the same boundary M19 drew
 * around `expo-localization`. `GameEngine` passes the run's setlist.
 */
export function createAudioService(preload: readonly MusicTrackId[] = []): AudioService {
  let expoAudio: typeof import('expo-audio');
  try {
    // Required lazily so a missing native module degrades to silence.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expoAudio = require('expo-audio');
  } catch (error) {
    return createSilentService(`expo-audio module unavailable: ${String(error)}`);
  }

  /**
   * A player per *loaded* track, and a reference to whichever is playing.
   *
   * A player each rather than one player re-pointed at a new source: swapping a
   * source is asynchronous on both platforms, so a stage transition would start
   * the round before its bed had loaded and the first bars would be silent.
   * Holding them costs a few hundred kilobytes of decoder state each and
   * removes the race entirely.
   *
   * Which tracks are in here is `preloadSetlist`'s business since M24A. Before
   * that it was every track in the registry, which stops being reasonable the
   * moment the registry is a library rather than three beds.
   */
  const tracks = new Map<MusicTrackId, PlayerLike>();
  let music: PlayerLike | null = null;
  const pools = new Map<SfxKey, { players: PlayerLike[]; next: number }>();
  let disposed = false;

  /** Creates a looping player for one track, or returns the one that exists. */
  const load = (id: MusicTrackId): PlayerLike | null => {
    const existing = tracks.get(id);
    if (existing) return existing;
    const source = MUSIC_SOURCES[id];
    if (source === undefined) return null;
    const player = expoAudio.createAudioPlayer(source) as unknown as PlayerLike;
    player.loop = true;
    player.volume = MIX.music;
    tracks.set(id, player);
    return player;
  };

  const release = (id: MusicTrackId): void => {
    const player = tracks.get(id);
    if (!player) return;
    tracks.delete(id);
    try {
      player.pause();
      player.remove();
    } catch {
      /* Already released. */
    }
  };

  try {
    expoAudio
      .setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false })
      .catch(() => {
        /* Non-fatal: playback still works with the default session. */
      });

    for (const id of preload) load(id);

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

    preloadSetlist(ids: readonly MusicTrackId[]) {
      safely(() => {
        const wanted = new Set(ids);
        for (const id of [...tracks.keys()]) {
          if (wanted.has(id)) continue;
          const player = tracks.get(id);
          /*
           * Never release what is **sounding**: a setlist change while music
           * plays would cut it off mid-bar, and the next `playMusic` swaps it
           * anyway.
           *
           * Narrowed at M24C from "is the current player" to "is the current
           * player *and is actually playing*". The builder previews a song by
           * loading it and playing it; when the player then starts the gig,
           * that preview has been stopped but `music` still points at it — so
           * under the old test it survived every later preload and the resident
           * count went to `SETLIST_SLOTS + 1`.
           *
           * `playing === false` rather than `!playing`, deliberately. If the
           * platform shim does not report the field at all the answer is
           * `undefined`, and the safe reading of "I cannot tell" is the old,
           * conservative one: keep it.
           */
          const isCurrent = player === music;
          if (isCurrent && music?.playing !== false) continue;
          release(id);
          // The reference would otherwise dangle at a removed player.
          if (isCurrent) music = null;
        }
        for (const id of wanted) load(id);
      });
    },

    playMusic(id: MusicTrackId) {
      safely(() => {
        const next = load(id);
        if (!next) return;
        // Silence the outgoing stage's bed before the incoming one starts, or
        // "Next stage" plays two loops at once.
        if (music && music !== next) {
          music.pause();
          void music.seekTo(0).catch(() => {});
        }
        music = next;
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
      safely(() => {
        if (!music) return;
        void music.seekTo(0).catch(() => {});
        music.play();
      });
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
      for (const id of [...tracks.keys()]) release(id);
      tracks.clear();
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
