/**
 * Audio asset registry.
 *
 * The only place in the codebase that names a concrete audio file. Gameplay
 * refers to logical keys, so a file can be replaced, trimmed, or re-encoded
 * without touching a system (M2, audio architecture).
 *
 * Paths and provenance are contracted by `assets/manifest/asset-manifest.json`
 * and `docs/assets/AUDIO-SOURCES.md`. The source MIDI is deliberately absent:
 * it is provenance only and there is no MIDI runtime (AGENTS.md rule 10).
 */

/*
 * Metro resolves bundled media through `require`; an ESM import of a .wav is
 * not equivalent, so this file is the one deliberate exception to the rule.
 */
/* eslint-disable @typescript-eslint/no-var-requires */

export type SfxKey = 'glassBreak' | 'stickWhoosh' | 'impactThwack' | 'crowdApplause';

export const MUSIC_SOURCE = require('../../assets/audio/music/runtime/rock_theme_song_loop.wav');

export const SFX_SOURCES: Record<SfxKey, number> = {
  glassBreak: require('../../assets/audio/sfx/glass_breaking.wav'),
  stickWhoosh: require('../../assets/audio/sfx/stick_whoosh.wav'),
  impactThwack: require('../../assets/audio/sfx/impact_thwack.wav'),
  crowdApplause: require('../../assets/audio/sfx/crowd_applause.wav'),
};

/**
 * How many players to keep per effect. Glass breaks and stick swings overlap
 * constantly at peak spawn pressure; a single player would cut itself off.
 */
export const SFX_POOL_SIZE: Record<SfxKey, number> = {
  glassBreak: 3,
  stickWhoosh: 3,
  impactThwack: 2,
  crowdApplause: 1,
};

export const MIX = {
  music: 0.5,
  glassBreak: 0.9,
  stickWhoosh: 0.5,
  impactThwack: 0.8,
  crowdApplause: 0.7,
} as const;
