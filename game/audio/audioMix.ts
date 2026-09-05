/**
 * Audio *data*: which cues exist and how loud they sit.
 *
 * Split out of `audioAssets.ts` in M16 for a concrete reason. That module names
 * files through Metro's `require`, which does not exist outside a bundler — so
 * nothing in a `node --test` run can import it, and until then nothing about
 * the audio mix was assertable at all.
 *
 * Everything here is plain data with no `require` in sight, so
 * `tests/audioContract.test.ts` can hold the rule that matters: the click is
 * mixed above the music it cues.
 *
 * ## What left, at M24A
 *
 * `MusicKey`, `MUSIC_TEMPO_LOCKED` and `MUSIC_GENERATOR` used to live here.
 * They are now `MusicTrackId` and `TempoEvidence` in `musicCatalogue.ts`,
 * because the boolean could express only two of the three things that are true
 * about a track's tempo and had no room at all for the one M24 is built around
 * — an external file whose pulse has been *measured* rather than generated. A
 * boolean beside a `MUSIC_GENERATOR` lookup was already two halves of one fact
 * kept in two places; the catalogue is that fact in one place.
 *
 * What is left here is the mixing desk, which is a genuinely different subject
 * from a catalogue of tracks.
 */

export type SfxKey =
  | 'glassBreak'
  | 'stickWhoosh'
  | 'impactThwack'
  | 'crowdApplause'
  | 'beatClick'
  | 'mugDrink';

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
  /*
   * One. The drink has a single animation slot by design (M18) — a second mug
   * mid-drink cuts the running one forward rather than starting another — so a
   * second player could only ever double a sound the picture never doubles.
   */
  mugDrink: 1,
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
  /*
   * Under the glass it replaces. Drinking is the *quiet* outcome of a mug —
   * that contrast is half the gag — and it plays while the burst and the
   * whoosh are still sounding.
   */
  mugDrink: 0.62,
} as const;
