/**
 * English — the source catalogue, and the shape every other locale is checked
 * against.
 *
 * Source of truth: docs/specs/M19-locale-foundation.md
 *
 * ## Read this before adding a string
 *
 * Every user-visible word in the game is here and nowhere else. The one
 * deliberate exception is the product's own name, which is a constant in
 * `game/config/product.ts` because `docs/release/product-identity.md` forbids
 * translating it.
 *
 * `Catalogue` is `typeof en`, so this file is not merely the English text — it
 * is the *type*. A locale missing a key, carrying an extra one, or turning a
 * list into a string fails in `tsc` rather than in that locale at runtime.
 *
 * Interpolation is `{name}` placeholders resolved by `format()`. Keep them
 * named and keep them out of the middle of a word: a translator has to be able
 * to move one to the other end of the sentence.
 *
 * M19 changed no copy. Every string below is the string that was on screen the
 * day before it was extracted.
 */
import type { BriefingFigureId, StageId } from '../../levels/stages.ts';
import type { StoryPanelId } from '../../state/storyState.ts';

/** What a stage is called and what its briefing card says. */
interface StageStrings {
  /** Short name on the title screen's stage button and the briefing heading. */
  readonly name: string;
  /** One line under the name: what this stage is for. */
  readonly subtitle: string;
  /** The briefing card, one whole sentence per entry, in reading order. */
  readonly briefing: readonly string[];
}

export const en = {
  common: {
    back: 'Back',
    skip: 'Skip',
    quitToTitle: 'Quit to title',
    /** Shared by the title's stage cards and the briefing's kicker. */
    stageNumber: 'STAGE {number}',
  },

  title: {
    tagline: 'Keep the beat. Survive the gig.',
    howToPlay: 'How to play',
    story: 'Story',
    /*
     * States what is true, not what pressing it would do (M16). "Click: on"
     * reads correctly whether or not you are about to press it; "Turn click
     * off" is a sentence about the future that is wrong the moment you have
     * read it.
     */
    clickOn: 'Click: on',
    clickOff: 'Click: off',
    audioUnavailable:
      'Audio unavailable in this build — rebuild the development client to hear the show.',
  },

  briefing: {
    start: 'Start the show',
  },

  /** The in-round HUD (M12). Short, upper-case, and read at a glance. */
  hud: {
    defense: 'DEFENSE',
    groove: 'GROOVE',
    showIntegrity: 'SHOW INTEGRITY',
    combo: '{count} HIT COMBO',
    comboMultiplied: '{count} HIT COMBO x{multiplier}',
    beatStreak: '{count} BEAT STREAK',
    getReady: 'GET READY',
    /* Words, never colour alone (M12 accessibility). */
    perfect: 'PERFECT',
    good: 'GOOD',
    secondsLeft: '{seconds}s',
  },

  countdown: {
    /** The fourth beat of the pre-roll. The numerals are numbers, not text. */
    go: 'GO!',
  },

  scene: {
    tapTheSinger: 'TAP THE SINGER',
  },

  pause: {
    title: 'Paused',
    resume: 'Resume',
  },

  results: {
    stageCleared: 'STAGE {number} CLEARED',
    showComplete: 'SHOW COMPLETE',
    showRuined: 'SHOW RUINED',
    /*
     * The one line under the outcome title, and it is stage-aware: the
     * encouragement after a defense-only stage must not tell the player they
     * failed to keep a beat they were never asked for.
     */
    outcomeStageCleared: 'You can hold the line. Now do it while you drum.',
    outcomeShowComplete: 'You kept the groove alive. Somehow.',
    outcomeDefenseRuined: 'The kit took three hits. Watch the crowd, not the floor.',
    outcomeGrooveRuined: 'The gig fell apart. Try to keep the beat while you defend the kit.',
    nextStage: 'Next stage',
    playAgain: 'Play again',
    retryStage: 'Retry stage',
    /* Only drawn when this round actually beat something (M22). */
    newBest: 'A new best.',
    share: 'Share',
  },

  /**
   * The line the share sheet sends (M22).
   *
   * `{title}` is filled with the product name, which is a constant rather than
   * a catalogue string — see `game/config/product.ts`. A translator moves the
   * placeholder around the sentence; they never translate what goes into it.
   */
  share: {
    withGroove: '{title} — {stage}: {defense} on defense, {groove} on the groove.',
    defenseOnly: '{title} — {stage}: {defense} on defense.',
  },

  /** The two performances, side by side and never added together (M12). */
  summary: {
    groove: 'GROOVE',
    defense: 'DEFENSE',
    grooveScore: 'Groove score',
    beatsHit: 'Beats hit',
    beatsHitValue: '{hits} / {judged}',
    perfect: 'Perfect',
    good: 'Good',
    beatsMissed: 'Beats missed',
    bestBeatStreak: 'Best beat streak',
    noBeatsLanded: 'No beats landed this round.',
    averageTiming: 'Average timing {ms} ms off the beat.',
    defenseScore: 'Defense score',
    objectsDestroyed: 'Objects destroyed',
    objectsMissed: 'Objects missed',
    bestHitCombo: 'Best hit combo',
    /* The record, drawn only once the stage has been finished at least once. */
    best: 'Best',
    integrityLeft: 'Show Integrity left: {left} of {total}.',
  },

  /**
   * The briefing pictures (M18.1).
   *
   * The tightest statement of the mug rule anywhere in the game. `\n` is a
   * deliberate line break under a 128 px figure, not formatting: keep the
   * break roughly in the middle of whatever the translation turns out to be.
   */
  briefingFigures: {
    smash: 'Still far away:\nit smashes',
    drink: 'Within arm’s reach:\nhe drinks it',
  } satisfies Record<BriefingFigureId, string>,

  /**
   * The stages, keyed by the id in `levels/stages.ts`.
   *
   * `satisfies` rather than a plain object: a stage added without strings is a
   * type error here rather than a blank card in a playtest.
   */
  stages: {
    'stage-1-defense': {
      name: 'Hold the line',
      subtitle: 'Defense only',
      briefing: [
        'The crowd is throwing what it was drinking.',
        'Tap a bottle or a mug to smash it before it reaches your kit.',
        'Mugs are the exception, and the distance is the whole rule: hit one far away and it smashes like anything else, but let it come within arm’s reach and the drummer catches it and drinks it, which is worth more.',
        'Three things get through and the show is over.',
        'No beat to keep yet. That is the next stage. Just defend.',
      ],
    },
    'stage-2-beat': {
      name: 'Find the beat',
      subtitle: 'Groove first',
      briefing: [
        'You are the drummer. Before anything gets thrown, find the beat.',
        'Two marks slide together on the pad. Tap the pad when they touch.',
        'Count it: one, two, three, four.',
        'Bottles start halfway through — smash them, or the show is over.',
      ],
    },
    'stage-3-groove': {
      name: 'Keep the beat',
      subtitle: 'Groove + defense',
      briefing: [
        'Now both jobs at once, and the crowd has warmed up.',
        'Keep the beat on the pad while you clear what comes at the kit.',
        'Mugs are back: let one reach you and you drink it instead of smashing it.',
        'A missed beat costs you the streak. A missed bottle costs the show.',
        'Someone may get in your way. Deal with them.',
      ],
    },
    'stage-4-encore': {
      name: 'Encore',
      subtitle: 'It keeps escalating',
      briefing: [
        'The crowd wants one more song. They brought more bottles.',
        'It starts easy and it does not stay that way: faster, and closer together.',
        'They come in threes now — same spot, or side to side. Smash all of them.',
        'Keep the beat on the pad. Three through the kit and the show is over.',
      ],
    },
  } satisfies Record<StageId, StageStrings>,

  /**
   * The opening story's captions, keyed by panel id (M15).
   *
   * The voice here is the product. A literal translation of these five lines
   * produces a game that is correct and not funny, which is worse than English
   * — see the V2 plan, "What I would not do".
   */
  story: {
    poster: 'One night only. Nobody asked for it.',
    arrival: 'You went anyway.',
    setup: 'Load in. Bolt it down. Hope.',
    performance: 'For about four songs, it worked.',
    soundDesk: 'Then a beer found the mixing desk.',
  } satisfies Record<StoryPanelId, string>,

  /**
   * The custom setlist: its unlock, its builder, and the run it starts (M24C).
   *
   * Everything the player reads on the way from "you survived the show" to
   * "you chose the songs". The song titles themselves are the block below and
   * are deliberately not translated; every word *around* them is.
   */
  setlist: {
    /**
     * The title screen's way in, drawn only once the show has been survived.
     *
     * Sentence case rather than the screen's shouted heading, because it sits
     * in the same compact row as "How to play" and "Story" and has to read as
     * one of them.
     */
    open: 'Custom setlist',
    /** The builder's heading, and the name of the whole feature. */
    title: 'BUILD THE WORST SETLIST',
    /** The line the feature is really about. */
    tagline: 'You survived ours. Now make it worse.',
    /** The banner on the results screen, the first time the show is finished. */
    unlocked: 'CUSTOM SETLIST UNLOCKED',
    /**
     * A slot's number. `{number}` arrives pre-padded — `01`, not `1` — so a
     * locale may put it anywhere in the label without doing arithmetic.
     */
    slot: '{number}',
    /** An empty slot, and the whole of the instruction the screen needs. */
    empty: '— Tap to choose —',
    /** The heading over the songs, so the two columns say what they are. */
    library: 'YOUR SONGS',
    /** Reads out an already-chosen row, which is drawn with a ✓ and is deaf. */
    chosen: 'Already in the setlist',
    /** Starts the custom show. Deaf until all four slots are filled. */
    start: 'START THE GIG',
    /**
     * The run's songs, on the results screen after a custom show (M24C §22).
     *
     * One line rather than a column: the results screen has 411 dp of height
     * and the two score columns already claim most of it.
     */
    tonight: 'TONIGHT’S SETLIST',
  },

  /**
   * Player-facing song titles (M24B).
   *
   * **Fictional, and deliberately so.** These are the names of a bad band's
   * songs — the joke — and they are not the works' real titles. The real title,
   * author, licence and source page of every track live in
   * `docs/assets/AUDIO-SOURCES.md` and in
   * `assets/audio/music/library/SOURCES.json`, where renaming a third-party
   * work would be a provenance failure (AGENTS.md rule 13). Here it is
   * presentation, and nothing else reads it.
   *
   * Every key is a `MusicTrackId` whose track has a `library` entry, and
   * `MusicTitleKey` is `keyof Catalogue['music']` — so a track added without a
   * title, or a title left behind by a deleted track, is a `tsc` error.
   *
   * All eleven are production tracks since M24C: the owner auditioned every one
   * and kept every one. These are the names on the setlist builder.
   */
  music: {
    noRefunds: 'NO REFUNDS',
    brokenAmp: 'BROKEN AMP',
    lastCall: 'LAST CALL',
    stageDive: 'STAGE DIVE DISASTER',
    cheapBeerRiot: 'CHEAP BEER RIOT',
    wrongChord: 'WRONG CHORD',
    badSoundcheck: 'BAD SOUNDCHECK',
    loadOut: 'LOAD-OUT',
    fireExit: 'FIRE EXIT',
    noEncore: 'NO ENCORE',
    wrongVenue: 'WRONG VENUE',
  },
};
