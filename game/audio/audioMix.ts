/**
 * Audio *data*: which cues exist, how loud they sit, and which beds are
 * tempo-locked.
 *
 * Split out of `audioAssets.ts` in M16 for a concrete reason. That module is
 * the one place a concrete filename is named, and it names them through
 * Metro's `require`, which does not exist outside a bundler — so nothing in a
 * `node --test` run can import it, and until now nothing about the audio mix
 * was assertable at all.
 *
 * Everything here is plain data with no `require` in sight, so
 * `tests/audioContract.test.ts` can hold the rules that matter: the click is
 * mixed above the music it cues, and a stage that scores beats does not play a
 * bed that drifts away from them.
 */

export type SfxKey =
  | 'glassBreak'
  | 'stickWhoosh'
  | 'impactThwack'
  | 'crowdApplause'
  | 'beatClick';

/**
 * Which bed a stage plays (M16).
 *
 * Music became per-stage when the stages stopped wanting the same thing. A
 * stage that scores beats needs a bed that agrees with the beat clock; a stage
 * that scores none can play anything.
 */
export type MusicKey = 'showTheme' | 'grooveBed';

/**
 * Whether a bed's loop is a whole number of `RHYTHM.bpm` beats.
 *
 * A stage that scores beats while playing a bed that is *not* tempo-locked is
 * telling the player two different things about when "now" is. Declared as
 * data rather than left implicit, so the contract test can hold the line: the
 * only scored stage still allowed untempo-locked music is the show, and it is
 * named in that test rather than merely tolerated.
 */
export const MUSIC_TEMPO_LOCKED: Record<MusicKey, boolean> = {
  /** 21.75 s, which at 90 BPM is 32.625 beats — it slips ~417 ms per loop. */
  showTheme: false,
  /** Generated at exactly 16 beats by `scripts/make-groove-bed.mjs`. */
  grooveBed: true,
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
  /*
   * Two, for a 90 ms sound on a 667 ms beat. One would be enough in theory and
   * would cut itself off the first time a frame ran long enough to owe two
   * beats at once.
   */
  beatClick: 2,
};

export const MIX = {
  /*
   * Lowered from 0.5 in M16. The click is the beat now, and the music is
   * background it plays over — the track is not, and has never been, the
   * rhythm clock (rhythm-pivot architecture, "Audio non-goal"). A bed mixed as
   * loudly as the cue competes with it for exactly the attention the cue
   * exists to catch.
   */
  music: 0.38,
  glassBreak: 0.9,
  stickWhoosh: 0.5,
  impactThwack: 0.8,
  crowdApplause: 0.7,
  /** Above the music, deliberately. It is the thing being taught. */
  beatClick: 0.85,
} as const;
