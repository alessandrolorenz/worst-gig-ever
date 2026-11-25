/**
 * M33 — the Crowd checklist stands in the audience, clear of the band.
 *
 * Source of truth: docs/specs/M33-crowd-checklist-and-optional-beat.md
 *
 * The panels are screen-space overlay text over a canvas that scales, so
 * "does it cover the bassist" depends on the screen. These tests place the
 * panels the way the overlay's styles do, map them onto the 1920x1080 canvas
 * with the same `fitCanvas` the renderer uses, and check them against every
 * performer's art box, every target, the throwing hand and the landing area,
 * for every stage, in every locale, on each screen the game is played on.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allCatalogues } from '../game/i18n/catalogue.ts';
import {
  CROWD_CHECKLIST,
  CROWD_CHECKLIST_TEXT_WIDTH,
  crowdChecklistPanelHeight,
  splitCrowdChecklist,
} from '../game/crowd/crowdHudLayout.ts';
import { CROWD_STAGE_IDS, CROWD_STAGES } from '../game/crowd/crowdStages.ts';
import { CROWD_ART_SLOTS } from '../game/crowd/crowdArtSlots.ts';
import {
  CROWD_TARGETS,
  CROWD_THROW,
  scaleRect,
  type CrowdRect,
} from '../game/crowd/crowdConfig.ts';
import { fitCanvas } from '../game/rendering/layout.ts';
import { MIN_VIEWPORT, charWidth, wrappedLines } from '../game/rendering/textMetrics.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const overlaysSource = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');

/**
 * The screens the checklist must clear the band on, in dp, inside the safe area.
 *
 * The owner's Galaxy S23 FE is the one the bassist complaint came from. Its
 * playtest screenshot (2340x1080 px) puts the HUD buttons' 96 dp minimum at
 * 269 px, so it runs at 2.81 px/dp: 832x384 dp, and 784 dp wide with the
 * three-button bar on the side. It is shorter than `MIN_VIEWPORT`, and the
 * shorter screen is the harder one, because the canvas shrinks and the text
 * does not.
 */
const VIEWPORTS = [
  { name: 'MIN_VIEWPORT (Pixel 9 class)', ...MIN_VIEWPORT },
  { name: 'Galaxy S23 FE, three-button nav', width: 784, height: 384 },
  { name: 'Galaxy S23 FE, gesture nav', width: 832, height: 384 },
  { name: 'tablet', width: 1280, height: 800 },
] as const;

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

function intersects(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

/** A screen rect, in canvas units: what part of the stage it covers. */
function toCanvas(rect: Box, viewport: { width: number; height: number }): Box {
  const fit = fitCanvas(viewport.width, viewport.height);
  return {
    x: (rect.x - fit.offsetX) / fit.scale,
    y: (rect.y - fit.offsetY) / fit.scale,
    width: rect.width / fit.scale,
    height: rect.height / fit.scale,
  };
}

/** What must stay visible, on the canvas, for a stage. */
function keepClear(stageId: (typeof CROWD_STAGE_IDS)[number]): Array<[string, CrowdRect]> {
  const stage = CROWD_STAGES[stageId];
  const slots = CROWD_ART_SLOTS;
  return [
    ['bassist art', slots.bassistPerforming.box],
    ['vocalist art', slots.vocalistPerforming.box],
    ['guitarist art', slots.guitaristPerforming.box],
    ['throwing hand', slots.throwHand.box],
    ['amplifier art', slots.amplifierIntact.box],
    ...CROWD_TARGETS.map(
      (target): [string, CrowdRect] => [
        `${target.id} target`,
        target.type === 'performer' ? target.rect : scaleRect(target.rect, stage.targetScale),
      ],
    ),
    // Everywhere a bottle can land: the whole canvas above the impact floor.
    ['landing area', { x: 0, y: 0, width: 1920, height: CROWD_THROW.impactBounds.bottom }],
  ];
}

test('M33: the checklist splits evenly, in order, with nothing lost', () => {
  for (const stageId of CROWD_STAGE_IDS) {
    const objectives = CROWD_STAGES[stageId].objectives;
    const { left, right } = splitCrowdChecklist(objectives);
    assert.deepEqual([...left, ...right], [...objectives], `${stageId}: order or content changed`);
    // The right corner also carries "Spare the waiter".
    const rightRows = right.length + 1;
    assert.ok(Math.abs(left.length - rightRows) <= 1, `${stageId}: ${left.length} | ${rightRows}`);
    assert.ok(left.length >= right.length, `${stageId}: the heading's side should take the odd one`);
  }
});

test('M33: every checklist line fits its panel on one line, in every locale', () => {
  const { heading } = CROWD_CHECKLIST;
  const headingWidth = CROWD_CHECKLIST.panelWidth - CROWD_CHECKLIST.paddingHorizontal * 2;
  for (const [locale, strings] of allCatalogues()) {
    const labels = [...Object.values(strings.crowd.objectives), strings.crowd.spareWaiter];
    for (const label of labels) {
      assert.equal(
        wrappedLines(label, CROWD_CHECKLIST.row.fontSize, CROWD_CHECKLIST_TEXT_WIDTH),
        1,
        `${locale}: "${label}" wraps in a ${CROWD_CHECKLIST_TEXT_WIDTH} dp checklist row`,
      );
    }
    const title = strings.crowd.objectivesHeading;
    const titleWidth = title.length * (charWidth(heading.fontSize) + heading.letterSpacing);
    assert.ok(titleWidth <= headingWidth, `${locale}: "${title}" is ${Math.round(titleWidth)} dp`);
  }
});

test('M33: both panels clear the band, the hand and every target, on every screen', () => {
  const { panelWidth, edgeInset, bottomInset, row } = CROWD_CHECKLIST;
  for (const viewport of VIEWPORTS) {
    for (const [locale, strings] of allCatalogues()) {
      for (const stageId of CROWD_STAGE_IDS) {
        const { left, right } = splitCrowdChecklist(CROWD_STAGES[stageId].objectives);
        const lines = (label: string) =>
          wrappedLines(label, row.fontSize, CROWD_CHECKLIST_TEXT_WIDTH);
        const leftHeight = crowdChecklistPanelHeight(
          left.map((id) => lines(strings.crowd.objectives[id])),
          true,
        );
        const rightHeight = crowdChecklistPanelHeight(
          [...right.map((id) => lines(strings.crowd.objectives[id])), lines(strings.crowd.spareWaiter)],
          false,
        );
        const panels: Array<[string, Box]> = [
          [
            'left',
            {
              x: edgeInset,
              y: viewport.height - bottomInset - leftHeight,
              width: panelWidth,
              height: leftHeight,
            },
          ],
          [
            'right',
            {
              x: viewport.width - edgeInset - panelWidth,
              y: viewport.height - bottomInset - rightHeight,
              width: panelWidth,
              height: rightHeight,
            },
          ],
        ];
        for (const [side, panel] of panels) {
          const covered = toCanvas(panel, viewport);
          for (const [what, rect] of keepClear(stageId)) {
            assert.equal(
              intersects(covered, rect),
              false,
              `${viewport.name}, ${locale}, ${stageId}: the ${side} checklist covers the ${what} ` +
                `(panel canvas y ${Math.round(covered.y)}, x ${Math.round(covered.x)}–` +
                `${Math.round(covered.x + covered.width)})`,
            );
          }
        }
      }
    }
  }
});

test('M33: the overlay draws the checklist from these numbers, in the corners, untouchable', () => {
  const objectives = overlaysSource.slice(overlaysSource.indexOf('function CrowdObjectives('));
  const body = objectives.slice(0, 2000);
  assert.match(body, /splitCrowdChecklist\(state\.objectives\)/, 'the overlay splits the list itself');
  assert.match(body, /pointerEvents="none"/, 'a checklist that can take a touch can eat a throw');
  assert.match(body, /styles\.crowdObjectivesLeft/);
  assert.match(body, /styles\.crowdObjectivesRight/);
  assert.match(body, /strings\.crowd\.spareWaiter/, 'the waiter line left the checklist');

  for (const [style, needle] of [
    ['crowdObjectives', /bottom: CROWD_CHECKLIST\.bottomInset/],
    ['crowdObjectives', /width: CROWD_CHECKLIST\.panelWidth/],
    ['crowdObjectives', /rowGap: CROWD_CHECKLIST\.row\.gap/],
    ['crowdObjectivesLeft', /left: CROWD_CHECKLIST\.edgeInset/],
    ['crowdObjectivesRight', /right: CROWD_CHECKLIST\.edgeInset/],
    ['crowdObjectiveText', /lineHeight: CROWD_CHECKLIST\.row\.lineHeight/],
    ['crowdObjectivesHeading', /lineHeight: CROWD_CHECKLIST\.heading\.lineHeight/],
  ] as const) {
    const start = overlaysSource.indexOf(`  ${style}: {`);
    assert.ok(start >= 0, `style ${style} is gone`);
    const block = overlaysSource.slice(start, overlaysSource.indexOf('},', start));
    assert.match(block, needle, `${style} no longer reads its size from crowdHudLayout`);
  }

  // The top-left column keeps the stage name and nothing else.
  const hud = overlaysSource.slice(overlaysSource.indexOf('function CrowdHud('));
  const column = hud.slice(hud.indexOf('<View style={styles.crowdColumn}'));
  assert.equal(
    column.slice(0, column.indexOf('</View>')).includes('CrowdObjectives'),
    false,
    'the checklist is back over the bassist',
  );
});
