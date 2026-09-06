/**
 * Brazilian Portuguese.
 *
 * Source of truth: docs/specs/M21-pt-br.md
 *
 * ## This is a draft that needs reading, not a translation that is finished
 *
 * The V2 plan is explicit — *"Do not machine-translate and ship"* — and open
 * question 3 recommends the owner writes these lines, because the jokes are the
 * product. What follows is written rather than machine-translated, and several
 * lines are **re-invented rather than translated**, which is exactly the kind
 * of choice that needs a native speaker who knows the game to accept or reject.
 * Every one of those is marked `REVIEW:` below.
 *
 * ## The rules it was written under
 *
 * - The product name is never translated. It is not in this file, and a test
 *   fails if it appears (M19, `docs/release/product-identity.md`).
 * - `{name}` placeholders are the same set as English, in whatever order the
 *   sentence wants them. A dropped one fails a test rather than rendering a
 *   number-shaped hole.
 * - Everything is measured against the same layout budgets as English (M20,
 *   `tests/layoutBudget.test.ts`). Where a phrase is shorter than its English
 *   original it is because it had to be, and the spec records which.
 * - **`Groove` and `pad` stay English.** They are the on-screen names of two
 *   mechanisms, they are what a Brazilian drummer actually says, and
 *   translating either would make the briefing describe something the HUD does
 *   not label.
 */
import type { Catalogue } from '../catalogue.ts';

export const ptBR: Catalogue = {
  common: {
    back: 'Voltar',
    skip: 'Pular',
    quitToTitle: 'Sair para o início',
    stageNumber: 'FASE {number}',
  },

  title: {
    /*
     * REVIEW: "Segure o ritmo" carries both senses the English has — keep time,
     * and hold on. "Mantenha o ritmo" would only carry the first.
     */
    tagline: 'Segure o ritmo. Sobreviva ao show.',
    howToPlay: 'Como jogar',
    story: 'História',
    clickOn: 'Clique: ligado',
    clickOff: 'Clique: desligado',
    audioUnavailable:
      'Áudio indisponível nesta build — recompile o cliente de desenvolvimento para ouvir o show.',
  },

  briefing: {
    start: 'Começar o show',
  },

  hud: {
    defense: 'DEFESA',
    groove: 'GROOVE',
    showIntegrity: 'INTEGRIDADE DO SHOW',
    combo: 'COMBO DE {count}',
    comboMultiplied: 'COMBO DE {count} x{multiplier}',
    /*
     * "SEQUÊNCIA: {count}" rather than "{count} BATIDAS SEGUIDAS", and this is
     * a bug rather than a preference: the streak is drawn from 1 upward, and
     * "1 BATIDAS SEGUIDAS" is wrong in a way "1 BEAT STREAK" is not. There is
     * no plural machinery in this catalogue on purpose (M19), so a counted
     * noun has to be written to read correctly at one and at many — a colon
     * does that and a plural noun does not.
     */
    beatStreak: 'SEQUÊNCIA: {count}',
    getReady: 'PREPARE-SE',
    perfect: 'PERFEITO',
    good: 'BOM',
    secondsLeft: '{seconds}s',
  },

  countdown: {
    /* REVIEW: "VAI!" rather than "JÁ!" — it is what a Brazilian counts a band
       in with, and it is the same length as the numerals it follows. */
    go: 'VAI!',
  },

  scene: {
    tapTheSinger: 'ACERTE O VOCALISTA',
  },

  pause: {
    title: 'Pausado',
    resume: 'Continuar',
  },

  results: {
    stageCleared: 'FASE {number} CONCLUÍDA',
    showComplete: 'SHOW COMPLETO',
    showRuined: 'SHOW ARRUINADO',
    /*
     * REVIEW: the four outcome lines are the ones most worth arguing with.
     *
     * "You can hold the line. Now do it while you drum." became "Você aguenta o
     * tranco. Agora aguente tocando." — "aguentar o tranco" is the idiom for
     * taking a beating and staying up, which is what the stage proved.
     */
    outcomeStageCleared: 'Você aguenta o tranco. Agora aguente tocando.',
    /*
     * REVIEW: "Somehow" is the whole joke. "Sabe-se lá como" is the deadpan
     * Brazilian equivalent — literally "who knows how" — and lands closer than
     * "de alguma forma", which is correct and flat.
     */
    outcomeShowComplete: 'Você manteve o groove vivo. Sabe-se lá como.',
    outcomeDefenseRuined: 'A bateria levou três. Olhe para a plateia, não para o chão.',
    /*
     * REVIEW: "desandou" is what a Brazilian says when something that was
     * working came apart — of a recipe, a party, a plan. "Desmoronou" would be
     * more literal and more dramatic than the line wants.
     */
    outcomeGrooveRuined: 'O show desandou. Tente segurar o ritmo enquanto defende a bateria.',
    nextStage: 'Próxima fase',
    playAgain: 'Jogar de novo',
    retryStage: 'Tentar de novo',
    /* REVIEW: "Recorde novo." rather than "Um novo recorde." — shorter, and it
       is how a placar reads in Portuguese. */
    newBest: 'Recorde novo.',
    share: 'Compartilhar',
  },

  share: {
    withGroove: '{title} — {stage}: {defense} na defesa, {groove} no groove.',
    defenseOnly: '{title} — {stage}: {defense} na defesa.',
  },

  summary: {
    groove: 'GROOVE',
    defense: 'DEFESA',
    grooveScore: 'Pontos de groove',
    beatsHit: 'Batidas acertadas',
    beatsHitValue: '{hits} / {judged}',
    perfect: 'Perfeitas',
    good: 'Boas',
    beatsMissed: 'Batidas perdidas',
    bestBeatStreak: 'Melhor sequência',
    noBeatsLanded: 'Nenhuma batida acertada nesta rodada.',
    averageTiming: 'Média de {ms} ms fora da batida.',
    defenseScore: 'Pontos de defesa',
    objectsDestroyed: 'Objetos destruídos',
    objectsMissed: 'Objetos perdidos',
    bestHitCombo: 'Melhor combo',
    best: 'Recorde',
    integrityLeft: 'Integridade do show: {left} de {total}.',
  },

  /*
   * The owner's own words, from the M18.1 playtest correction: *"só toma a
   * cerveja se acertar quando o copo estiver perto dele, ao alcance da mão"*.
   * "Ao alcance da mão" is his phrase and it is the tightest statement of the
   * rule in either language, so it is used verbatim.
   */
  briefingFigures: {
    smash: 'Ainda longe:\nele quebra',
    drink: 'Ao alcance da mão:\nele bebe',
  },

  stages: {
    'stage-1-defense': {
      /* REVIEW: "Segure as pontas" is the idiom for holding something together
         while it tries to fall apart. Literally "hold the ends". */
      name: 'Segure as pontas',
      subtitle: 'Só defesa',
      briefing: [
        'A plateia está jogando o que estava bebendo.',
        'Toque nas garrafas e nos copos para quebrar antes que cheguem na sua bateria.',
        'Copos são a exceção, e a distância é a regra inteira: acerte um de longe e ele quebra como qualquer outro, mas deixe chegar ao alcance da mão e o baterista pega e bebe, o que vale mais.',
        'Três coisas passam e o show acabou.',
        'Ainda não tem ritmo para segurar. Isso é a próxima fase. Só defenda.',
      ],
    },
    'stage-2-beat': {
      name: 'Ache o ritmo',
      subtitle: 'Groove primeiro',
      briefing: [
        'Você é o baterista. Antes que joguem qualquer coisa, ache o ritmo.',
        'Duas marcas deslizam uma na direção da outra no pad. Toque no pad quando elas se encontrarem.',
        'Conte: um, dois, três, quatro.',
        'As garrafas começam na metade — quebre todas, ou o show acaba.',
      ],
    },
    'stage-3-groove': {
      name: 'Segure o ritmo',
      subtitle: 'Groove + defesa',
      briefing: [
        'Agora as duas tarefas ao mesmo tempo, e a plateia esquentou.',
        'Segure o ritmo no pad enquanto quebra o que vem na bateria.',
        'Os copos voltaram: deixe um chegar até você e você bebe em vez de quebrar.',
        'Uma batida perdida custa a sequência. Uma garrafa perdida custa o show.',
        'Alguém pode entrar na sua frente. Resolva.',
      ],
    },
    'stage-4-encore': {
      /* "Bis" is what the audience actually shouts in Brazil. */
      name: 'Bis',
      /* REVIEW: "Só piora" — "it only gets worse" — is funnier than a literal
         "não para de escalar" and fits the card better. */
      subtitle: 'Só piora',
      briefing: [
        'A plateia quer mais uma. E trouxe mais garrafas.',
        'Começa fácil e não continua assim: mais rápido, e mais junto.',
        'Vêm de três em três agora — no mesmo ponto, ou de um lado para o outro. Quebre todas.',
        'Segure o ritmo no pad. Três passam pela bateria e o show acabou.',
      ],
    },
  },

  /*
   * REVIEW: the five story captions are the game's voice and the hardest thing
   * in this file. Each one is a re-invention rather than a translation.
   */
  story: {
    /* "Ninguém pediu" keeps the shrug. A literal "ninguém pediu por isso" adds
       a word and loses it. */
    poster: 'Uma noite só. Ninguém pediu.',
    arrival: 'Vocês foram mesmo assim.',
    /* Three imperatives, like the English. "Reza" — pray — is doing the work
       "Hope" does, and is what a Brazilian would actually say. */
    setup: 'Descarrega. Parafusa. Reza.',
    performance: 'Por umas quatro músicas, funcionou.',
    /* "Achou" keeps the beer as the one doing the finding, which is the joke. */
    soundDesk: 'Aí uma cerveja achou a mesa de som.',
  },

  /**
   * O setlist personalizado (M24C).
   *
   * REVIEW: "setlist" fica em inglês, pela mesma razão que `Groove` e `pad`
   * ficam — é a palavra que um músico brasileiro usa. "Repertório" é correto e
   * é o que se diz de uma orquestra, não de uma banda de rock num porão.
   */
  setlist: {
    open: 'Setlist próprio',
    title: 'MONTE O PIOR SETLIST',
    /*
     * REVIEW: a frase inteira é a piada, e é a linha mais difícil daqui.
     * "Você sobreviveu ao nosso. Agora faça pior." mantém as duas metades e o
     * deboche; "Agora crie um pior" seria correto e sem graça.
     */
    tagline: 'Você sobreviveu ao nosso. Agora faça pior.',
    unlocked: 'SETLIST PRÓPRIO LIBERADO',
    slot: '{number}',
    empty: '— Toque para escolher —',
    library: 'SUAS MÚSICAS',
    chosen: 'Já está no setlist',
    /* O mesmo verbo do briefing ("Começar o show"), em caixa alta. */
    start: 'COMEÇAR O SHOW',
    tonight: 'O SETLIST DE HOJE',
  },

  /**
   * Títulos das músicas (M24B) — **deliberadamente não traduzidos.**
   *
   * São nomes próprios das músicas de uma banda fictícia, e a política é a
   * mesma que já vale para `Worst Gig Ever`: nome de banda e nome de música não
   * se traduzem. "CHEAP BEER RIOT" numa setlist brasileira lê-se como o nome de
   * uma música, que é exatamente o efeito pretendido; traduzido, vira uma
   * descrição e perde a piada.
   *
   * Ficam idênticos ao inglês de propósito. O `tsc` continua exigindo que a
   * chave exista — o que se garante aqui é a completude, não a tradução.
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
