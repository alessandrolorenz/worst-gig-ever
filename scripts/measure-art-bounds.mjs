/**
 * Measures what the art actually contains, which the contract validator cannot.
 *
 * `validate-pack1-art.mjs` reads PNG headers: signature, dimensions, whether an
 * alpha channel exists. That is why it passed Pack 1 art that is not a usable
 * animation loop — the headers were all correct and the drawings were three
 * different people. This script decodes the pixels and answers the two
 * questions a V2 replacement actually has to survive:
 *
 * 1. Does a new target's *visible* artwork still fit inside the circle the
 *    player can tap? The runtime discounts transparent padding, so the opaque
 *    bounding box is what matters, and `TARGET_ART_CONTENT` in
 *    `game/rendering/composition.ts` hardcodes the measured Pack 1 numbers.
 *    Replacing a prop means re-measuring them.
 * 2. Is an ambient triplet one drawing in three poses, or three drawings?
 *    Measured by how much of the drawn subject changes between consecutive
 *    frames, and by how far the feet anchor drifts.
 *
 * Reporting only by default. `--require-continuity` makes a failing triplet
 * exit non-zero, mirroring `validate-pack1-art.mjs --require-ready`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

import { TARGET_DRAW_SIZE } from '../game/rendering/composition.ts';
import { effectiveHitRadius } from '../game/state/roundState.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
);
const requireContinuity = process.argv.includes('--require-continuity');
const overlayIndex = process.argv.indexOf('--overlay-root');
if (overlayIndex >= 0 && (!process.argv[overlayIndex + 1] || process.argv[overlayIndex + 1].startsWith('--'))) {
  throw new Error('--overlay-root requires a directory');
}
const overlayRoot = overlayIndex >= 0 ? resolve(process.argv[overlayIndex + 1]) : null;

/** A pixel counts as drawn above this alpha. Below it the compositor shows nothing. */
const ALPHA_FLOOR = 8;
/** Squared RGB distance above which two drawn pixels read as different paint. */
const COLOR_DELTA_SQ = 40 * 40 * 3;

/** Provisional gates. Tune them from measurements, not from taste. */
const MAX_ANCHOR_DRIFT_PX = 8;
const MAX_FRAME_CHANGE = 0.25;

function decode(absolutePath) {
  return PNG.sync.read(readFileSync(absolutePath));
}

/** The opaque bounding box, in source pixels. `null` when nothing is drawn. */
function opaqueBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(png.width * y + x) * 4 + 3] <= ALPHA_FLOOR) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * How much of the drawn subject changes between two frames, as a fraction of
 * the pixels either frame draws. Pack 1's ambient frames score 0.60–0.87 here;
 * one drawing in two poses scores far lower.
 */
function frameChange(a, b) {
  if (a.width !== b.width || a.height !== b.height) return 1;
  let union = 0;
  let changed = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const drawnA = a.data[i + 3] > ALPHA_FLOOR;
    const drawnB = b.data[i + 3] > ALPHA_FLOOR;
    if (!drawnA && !drawnB) continue;
    union += 1;
    if (drawnA !== drawnB) {
      changed += 1;
      continue;
    }
    const dr = a.data[i] - b.data[i];
    const dg = a.data[i + 1] - b.data[i + 1];
    const db = a.data[i + 2] - b.data[i + 2];
    if (dr * dr + dg * dg + db * db > COLOR_DELTA_SQ) changed += 1;
  }
  return union === 0 ? 0 : changed / union;
}

function pathFor(key) {
  const entry = manifest.assets[key];
  if (!entry?.path) return null;
  if (overlayRoot && entry.path.startsWith('assets/art/')) {
    const candidate = join(overlayRoot, entry.path.slice('assets/art/'.length));
    if (existsSync(candidate)) return candidate;
  }
  const production = join(repoRoot, entry.path);
  return existsSync(production) ? production : null;
}

function displayPath(absolutePath) {
  return relative(repoRoot, absolutePath);
}

// ---------------------------------------------------------------- targets

console.log('## Target visible bounds');

for (const kind of ['beerBottle', 'beerMug']) {
  const relativePath = pathFor(kind);
  if (!relativePath) {
    console.log(`TARGET ${kind} | file missing`);
    continue;
  }
  const png = decode(relativePath);
  const bounds = opaqueBounds(png);
  if (!bounds) {
    console.log(`TARGET ${kind} | fully transparent`);
    continue;
  }

  const box = TARGET_DRAW_SIZE[kind];
  const fit = Math.min(box.width / png.width, box.height / png.height);

  let worst = null;
  for (let scale = 0.2; scale <= 1.001; scale += 0.05) {
    const reach = Math.hypot((bounds.width * fit * scale) / 2, (bounds.height * fit * scale) / 2);
    const radius = effectiveHitRadius(kind, scale);
    const slack = radius - reach;
    if (!worst || slack < worst.slack) worst = { scale, reach, radius, slack };
  }

  console.log(
    `TARGET ${kind} | ${displayPath(relativePath)} | frame ${png.width}x${png.height} | ` +
      `content ${bounds.width}x${bounds.height} | ` +
      `tightest scale ${worst.scale.toFixed(2)}: reach ${worst.reach.toFixed(1)}px vs ` +
      `radius ${worst.radius.toFixed(1)}px | slack ${worst.slack.toFixed(1)}px | ` +
      (worst.slack >= 0 ? 'FITS' : 'OVERFLOWS'),
  );
  console.log(
    `  TARGET_ART_CONTENT ${kind}: { width: ${bounds.width}, height: ${bounds.height} }`,
  );
}

// ------------------------------------------------------------- continuity

const TRIPLETS = [
  ['vocalist', ['vocalistIdle', 'vocalistLoopA', 'vocalistLoopB']],
  ['bassist', ['bassistIdle', 'bassistLoopA', 'bassistLoopB']],
  ['guitarist', ['guitaristIdle', 'guitaristLoopA', 'guitaristLoopB']],
  ['crowdFront', ['crowdFront01', 'crowdFront02', 'crowdFront03']],
];

console.log('\n## Ambient triplet continuity');

let continuityFailures = 0;

for (const [name, keys] of TRIPLETS) {
  const paths = keys.map(pathFor);
  if (paths.some((p) => p === null)) {
    continuityFailures += 1;
    console.log(`CONTINUITY ${name} | FAIL — one or more frames missing`);
    continue;
  }

  const frames = paths.map(decode);
  const bounds = frames.map(opaqueBounds);
  if (bounds.some((b) => b === null)) {
    continuityFailures += 1;
    console.log(`CONTINUITY ${name} | FAIL — a frame is fully transparent`);
    continue;
  }

  const anchors = bounds.map((b) => b.maxY);
  const drift = Math.max(...anchors) - Math.min(...anchors);
  const changes = [
    frameChange(frames[0], frames[1]),
    frameChange(frames[1], frames[2]),
    frameChange(frames[2], frames[0]),
  ];
  const worstChange = Math.max(...changes);

  const anchorOk = drift <= MAX_ANCHOR_DRIFT_PX;
  const changeOk = worstChange <= MAX_FRAME_CHANGE;
  if (!anchorOk || !changeOk) continuityFailures += 1;

  console.log(
    `CONTINUITY ${name} | anchor rows ${anchors.join(',')} | drift ${drift}px ` +
      `(<=${MAX_ANCHOR_DRIFT_PX}) ${anchorOk ? 'OK' : 'FAIL'} | ` +
      `change ${changes.map((c) => `${(c * 100).toFixed(0)}%`).join(', ')} ` +
      `(<=${(MAX_FRAME_CHANGE * 100).toFixed(0)}%) ${changeOk ? 'OK' : 'FAIL'}`,
  );
}

console.log(
  `\nSUMMARY triplets=${TRIPLETS.length} continuityFailures=${continuityFailures} ` +
    `alphaFloor=${ALPHA_FLOOR} maxDrift=${MAX_ANCHOR_DRIFT_PX} maxChange=${MAX_FRAME_CHANGE}`,
);

if (continuityFailures === 0) {
  console.log('PASS_AMBIENT_LOOP_READY');
} else {
  console.log('AMBIENT_LOOP_NOT_READY');
  if (requireContinuity) process.exitCode = 1;
}
