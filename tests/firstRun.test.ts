/**
 * M25 — the first launch: choose a language, then read the story in it.
 *
 * Source of truth: the M25 brief, §5-§13.
 *
 * Two player-facing changes meet here, and both are about a player who has just
 * installed the game knowing something they could not know before:
 *
 *   1. **The language comes before the story.** The opening five panels are the
 *      game's first impression and they are writing, so they must already be in
 *      the language the player reads. That means the choice happens before them,
 *      once, and never again.
 *   2. **The locked custom setlist is visible.** Nothing told a new player that
 *      finishing the show was worth anything. The title now says so, without
 *      opening anything.
 *
 * The interesting cases are the ones where the save is involved, because the
 * save arrives asynchronously and the first screen depends on it. `BOOT` exists
 * for exactly that window, and most of what follows is about who is allowed to
 * leave it and when.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APP_SCREENS,
  chooseLocale,
  createAppFlow,
  cycleLocale,
  finishIntro,
  isCustomSetlistUnlocked,
  openSetlist,
  recordStageCleared,
  resolveBoot,
  startStage,
} from '../game/state/appFlow.ts';
import { STAGES } from '../game/levels/stages.ts';
import {
  DEV_LOCALES,
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  availableLocales,
} from '../game/i18n/locales.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import { emptySave, parseSave, serializeSave } from '../game/state/persistence.ts';
import { BUTTON } from '../game/rendering/overlayLayout.ts';
import { MIN_VIEWPORT, wrappedLines } from '../game/rendering/textMetrics.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const overlaysSource = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');
const engineSource = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');

// ---------------------------------------------------------------------------
// The first screen
// ---------------------------------------------------------------------------

test('M25: the game opens on nothing until the save says what to open', () => {
  const flow = createAppFlow();
  assert.equal(flow.screen, 'BOOT');
  assert.ok(APP_SCREENS.includes('BOOT'), 'BOOT is not a screen the flow knows about');
  assert.ok(APP_SCREENS.includes('LANGUAGE'));

  /* BOOT comes before everything, and LANGUAGE before the story. */
  assert.ok(
    APP_SCREENS.indexOf('BOOT') < APP_SCREENS.indexOf('LANGUAGE'),
    'the boot screen is not the first one',
  );
  assert.ok(
    APP_SCREENS.indexOf('LANGUAGE') < APP_SCREENS.indexOf('STORY'),
    'the language screen does not come before the story',
  );
});

test('M25: a fresh install is asked for a language before the story', () => {
  const flow = createAppFlow();
  resolveBoot(flow, false);
  assert.equal(flow.screen, 'LANGUAGE', 'a first launch went straight into the story');
});

test('M25: a returning player is never asked again', () => {
  const flow = createAppFlow();
  resolveBoot(flow, true);
  assert.equal(flow.screen, 'STORY', 'a saved choice still produced the chooser');
});

test('M25: choosing a language starts the story in it, in one step', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const flow = createAppFlow();
    resolveBoot(flow, false);
    assert.equal(flow.screen, 'LANGUAGE');

    chooseLocale(flow, locale);
    assert.equal(flow.locale, locale, `choosing ${locale} did not set the language`);
    assert.equal(flow.screen, 'STORY', `choosing ${locale} did not open the story`);
  }
});

test('M25: nothing but the boot screen can be resolved away', () => {
  /*
   * `resolveBoot` is called twice on every launch — once when the save lands
   * and once from the timeout that stops a hung read holding the game — so it
   * has to be safe to lose that race. A player already reading the story must
   * not be dragged back to the chooser by a late timer.
   */
  const reading = createAppFlow();
  resolveBoot(reading, true);
  assert.equal(reading.screen, 'STORY');
  resolveBoot(reading, false);
  assert.equal(reading.screen, 'STORY', 'a late boot resolution moved a player who had left');

  const choosing = createAppFlow();
  resolveBoot(choosing, false);
  chooseLocale(choosing, 'pt-BR');
  resolveBoot(choosing, true);
  assert.equal(choosing.screen, 'STORY');
  assert.equal(choosing.locale, 'pt-BR', 'a late boot resolution overrode a player’s choice');
});

test('M25: the boot screen cannot be the last word', () => {
  /*
   * M15's rule, restated in the V2 plan: session progress must never gate a cold
   * start. M25 makes the first screen wait for a disk read, so the wait must
   * have an end — asserted here because it is the one line standing between a
   * hung native promise and a game that never opens.
   */
  assert.ok(
    /BOOT_TIMEOUT_MS/.test(engineSource),
    'nothing bounds how long the game may sit on the boot screen',
  );
  assert.ok(
    /setTimeout\([\s\S]{0,200}resolveBoot/.test(engineSource),
    'the boot timeout does not resolve the boot screen',
  );
  const match = engineSource.match(/BOOT_TIMEOUT_MS\s*=\s*(\d+)/);
  assert.ok(match, 'the timeout is not a readable constant');
  assert.ok(Number(match[1]) <= 5000, `waiting ${match[1]} ms for a save is a hang, not a boot`);
});

// ---------------------------------------------------------------------------
// What the chooser offers
// ---------------------------------------------------------------------------

test('M25: the chooser offers the shipping languages and no others', () => {
  /*
   * The pseudo-locale must never be offered to a player, and this is a player's
   * first screen. The cycling control on the title may still reach it in a
   * development build; a chooser that decides what the story is read in may not.
   */
  assert.ok(
    /SUPPORTED_LOCALES\.map/.test(overlaysSource),
    'the chooser does not build its list from the shipping locales',
  );

  const chooser = overlaysSource.slice(
    overlaysSource.indexOf('function LanguageChooser'),
    overlaysSource.indexOf('One stage on the title screen'),
  );
  assert.ok(chooser.length > 0, 'the language chooser has gone');
  assert.equal(
    /availableLocales|DEV_LOCALES|pseudo/.test(chooser),
    false,
    'the first-run chooser can reach a development locale',
  );

  for (const dev of DEV_LOCALES) {
    assert.equal(
      (SUPPORTED_LOCALES as readonly string[]).includes(dev),
      false,
      `${dev} is shippable, so the chooser would offer it`,
    );
  }
});

test('M25: every offered language names itself, so the list needs no translation', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const endonym = LOCALE_ENDONYMS[locale];
    assert.ok(endonym && endonym.trim().length > 0, `${locale} has no name of its own`);

    const inner = BUTTON.maxWidth - BUTTON.paddingHorizontal * 2;
    const lines = wrappedLines(endonym, BUTTON.fontSize, inner);
    assert.ok(lines <= 2, `${locale}: "${endonym}" takes ${lines} lines on its button`);
  }

  // Distinct, or the two buttons would read the same.
  const names = SUPPORTED_LOCALES.map((locale) => LOCALE_ENDONYMS[locale]);
  assert.equal(new Set(names).size, names.length, 'two languages share a name');
});

test('M25: the chooser has a heading in every locale, and it fits', () => {
  for (const [locale, strings] of allCatalogues()) {
    const heading = strings.language.heading;
    assert.ok(heading.trim().length > 0, `${locale}: the chooser has no heading`);
    const lines = wrappedLines(heading, 22, MIN_VIEWPORT.width - 56);
    assert.ok(lines <= 2, `${locale}: the heading "${heading}" takes ${lines} lines`);
  }
});

test('M25: the language control is still reachable after the first run', () => {
  /*
   * §10: the chooser is a first-run screen, not a replacement for the setting.
   * A player who picks the wrong one must be able to change it from the title
   * and from a paused round, exactly as M19 left it.
   */
  const toggles = overlaysSource.match(/<LanguageToggle/g) ?? [];
  assert.ok(toggles.length >= 2, `the language control is drawn ${toggles.length} times, not two`);

  const flow = createAppFlow();
  resolveBoot(flow, false);
  chooseLocale(flow, 'en');
  finishIntro(flow);
  cycleLocale(flow);
  assert.notEqual(flow.locale, 'en', 'the control no longer changes the language');
});

// ---------------------------------------------------------------------------
// The choice survives a relaunch
// ---------------------------------------------------------------------------

test('M25: a chosen language is written, and read back as a choice', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const saved = { ...emptySave(), locale };
    const parsed = parseSave(serializeSave(saved));
    assert.equal(parsed.state.locale, locale, `${locale} did not survive a save and a load`);

    /* And that is exactly what sends the next launch past the chooser. */
    const flow = createAppFlow();
    resolveBoot(flow, parsed.state.locale !== null);
    assert.equal(flow.screen, 'STORY');
  }
});

test('M25: a device preference is not a choice, and does not skip the chooser', () => {
  /*
   * §11: the phone's language is a good default and this screen is where it is
   * confirmed. A save that never recorded a choice holds `null`, whatever the
   * device happens to be set to — see `GameEngine`, which only persists
   * `flow.locale` once `localeChosenRef` is true.
   */
  const fresh = parseSave(serializeSave(emptySave()));
  assert.equal(fresh.state.locale, null, 'a fresh save claims a language was chosen');

  const flow = createAppFlow('pt-BR');
  assert.equal(flow.locale, 'pt-BR', 'the device preference did not seed the flow');
  resolveBoot(flow, fresh.state.locale !== null);
  assert.equal(flow.screen, 'LANGUAGE', 'a device preference was mistaken for a choice');
});

test('M25: the choice is written before the story is read', () => {
  const handler = engineSource.slice(
    engineSource.indexOf('const handleChooseLocale'),
    engineSource.indexOf('const handleChooseLocale') + 700,
  );
  assert.ok(handler.length > 0, 'the chooser has no handler');
  assert.ok(/chooseLocale\(/.test(handler), 'the handler does not set the language');
  assert.ok(/localeChosenRef\.current = true/.test(handler), 'the choice is not marked as one');
  assert.ok(/persist\(/.test(handler), 'the choice is never written to disk');
});

// ---------------------------------------------------------------------------
// The locked custom setlist (§5-§7)
// ---------------------------------------------------------------------------

/** A flow that has survived the whole show, as `recordStageCleared` leaves it. */
function survived() {
  const flow = createAppFlow();
  startStage(flow, 0);
  for (let index = 0; index < STAGES.length; index += 1) {
    flow.stageIndex = index;
    recordStageCleared(flow, 0);
  }
  return flow;
}

test('M25: a new player is told the custom setlist exists, and what earns it', () => {
  for (const [locale, strings] of allCatalogues()) {
    assert.ok(strings.setlist.locked.trim().length > 0, `${locale}: the teaser has no name`);
    assert.ok(strings.setlist.lockedHint.trim().length > 0, `${locale}: the teaser says nothing`);

    const title = wrappedLines(strings.setlist.locked, 13, MIN_VIEWPORT.width - 56);
    const hint = wrappedLines(strings.setlist.lockedHint, 11, 460);
    assert.ok(title <= 1, `${locale}: the teaser's name takes ${title} lines`);
    assert.ok(hint <= 2, `${locale}: the teaser's hint takes ${hint} lines`);
  }
});

test('M25: the teaser and the way in are never both drawn', () => {
  /*
   * One condition, negated, rather than two that could disagree — so there is
   * no state in which the player is offered the builder and told it is locked.
   */
  assert.ok(
    /\{!isCustomSetlistUnlocked\(flow\) && \(/.test(overlaysSource),
    'the locked teaser is not gated on the unlock',
  );
  assert.ok(
    /\{isCustomSetlistUnlocked\(flow\) && \(/.test(overlaysSource),
    'the way into the builder is not gated on the unlock',
  );
  assert.equal(
    /setlist\.locked/.test(overlaysSource) && /setlist\.lockedHint/.test(overlaysSource),
    true,
    'the teaser does not read its words from the catalogue',
  );
});

test('M25: the teaser does not open anything', () => {
  /*
   * The point of §6, and the reason the teaser is text rather than a disabled
   * button: the unlock is a property of the transition, and it refuses whatever
   * the title screen happens to draw.
   */
  const flow = createAppFlow();
  assert.equal(isCustomSetlistUnlocked(flow), false);
  assert.equal(openSetlist(flow), false, 'the builder opened while it was still locked');
  assert.notEqual(flow.screen, 'SETLIST');

  /* Every partial completion is still locked. */
  for (let index = 0; index < STAGES.length - 1; index += 1) {
    const partial = createAppFlow();
    startStage(partial, 0);
    partial.stageIndex = index;
    recordStageCleared(partial, 0);
    assert.equal(
      isCustomSetlistUnlocked(partial),
      false,
      `clearing stage ${String(index + 1)} unlocked the builder early`,
    );
  }
});

test('M25: surviving the show replaces the teaser with the real thing', () => {
  const flow = survived();
  assert.equal(isCustomSetlistUnlocked(flow), true, 'the whole show did not unlock the builder');
  assert.equal(openSetlist(flow), true);
  assert.equal(flow.screen, 'SETLIST');
});

test('M25: the reward for surviving is still a reward, and still happens once', () => {
  /*
   * §7: the teaser is motivation and the banner is payoff. Adding the first must
   * not have cost the second, so the crossing is asserted here as well as in the
   * M24C tests that own it.
   */
  const flow = createAppFlow();
  startStage(flow, 0);
  let crossings = 0;
  for (let index = 0; index < STAGES.length; index += 1) {
    flow.stageIndex = index;
    if (recordStageCleared(flow, 0).unlockedCustomSetlist) crossings += 1;
  }
  assert.equal(crossings, 1, `the unlock was announced ${String(crossings)} times`);

  /* And never again, however many times the show is finished after that. */
  for (let again = 0; again < 3; again += 1) {
    assert.equal(recordStageCleared(flow, 0).unlockedCustomSetlist, false);
  }

  for (const [locale, strings] of allCatalogues()) {
    assert.ok(strings.setlist.unlocked.trim().length > 0, `${locale}: the banner is empty`);
    assert.ok(strings.setlist.tagline.trim().length > 0, `${locale}: the payoff line is empty`);
    assert.notEqual(
      strings.setlist.unlocked,
      strings.setlist.locked,
      `${locale}: the reward and the teaser say the same thing`,
    );
  }
});

test('M25: the boot and language screens draw no word of their own', () => {
  /*
   * The boot screen has to be language-neutral — it is shown before a language
   * exists — and the chooser's only words are its heading, from the catalogue,
   * and the endonyms, which are the same in every language.
   */
  assert.ok(
    /if \(flow\.screen === 'BOOT'\) return null;/.test(overlaysSource),
    'the boot screen draws something',
  );
  assert.ok(
    /strings\.language\.heading/.test(overlaysSource),
    'the chooser’s heading does not come from the catalogue',
  );
  assert.ok(
    /label=\{LOCALE_ENDONYMS\[locale\]\}/.test(overlaysSource),
    'the chooser’s buttons are not endonyms',
  );
  assert.ok(
    availableLocales(false).every((locale) => (SUPPORTED_LOCALES as readonly string[]).includes(locale)),
    'a release build can reach a locale the chooser would not offer',
  );
});
