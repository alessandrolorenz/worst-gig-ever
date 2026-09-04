/**
 * Converts flat-card image-generator output into canonical transparent art.
 *
 * The generator is intentionally asked for a uniform warm-gray card instead
 * of fake transparency. This script models that card from border-connected
 * pixels, removes it, applies a small antialias feather, and maps every image
 * in a family through one shared crop so scale and feet anchors do not drift.
 *
 * Usage:
 *   node scripts/condition-art.mjs \
 *     --input-dir design-reference/m14-v2-raw/band \
 *     --output-dir design-reference/m14-v2-staging/band \
 *     --prefix vocalist_ --width 640 --height 900
 *
 * `--card-chroma` is how saturated a pixel may be and still be treated as
 * card. It defaults to 30, which is what every V2 family before M18 was
 * conditioned at. A generator that returns a warm beige card rather than a
 * neutral gray one sits just over that line and the flood finds nothing, which
 * surfaces as "Too few card pixels to condition image" rather than as a bad
 * cut. Raise it only as far as the gap to the subject allows, and record the
 * value used — the M18 drink frames needed 40 against a card measured at 27–35
 * and foam at 47.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { PNG } from 'pngjs';

function parseArgs(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error(`Invalid argument near ${key ?? '<end>'}`);
    }
    values.set(key.slice(2), value);
  }
  const required = ['input-dir', 'output-dir', 'prefix', 'width', 'height'];
  for (const key of required) {
    if (!values.has(key)) throw new Error(`Missing --${key}`);
  }
  const width = Number(values.get('width'));
  const height = Number(values.get('height'));
  const bgDistance = Number(values.get('bg-distance') ?? 14);
  if (!Number.isFinite(bgDistance) || bgDistance < 0) {
    throw new Error('Background distance must be a non-negative finite number');
  }
  const cardChroma = Number(values.get('card-chroma') ?? 30);
  if (!Number.isFinite(cardChroma) || cardChroma < 0 || cardChroma > 255) {
    throw new Error('Card chroma must be between 0 and 255');
  }
  if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
    throw new Error('Width and height must be positive integers');
  }
  return {
    inputDir: resolve(values.get('input-dir')),
    outputDir: resolve(values.get('output-dir')),
    prefix: values.get('prefix'),
    width,
    height,
    bgDistance,
    cardChroma,
    preserveCanvas: values.get('preserve-canvas') === 'true',
  };
}

function colorDistanceSq(data, a, b) {
  const dr = data[a] - data[b];
  const dg = data[a + 1] - data[b + 1];
  const db = data[a + 2] - data[b + 2];
  return dr * dr + dg * dg + db * db;
}

function cardLike(data, offset, maxChroma) {
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const mean = (r + g + b) / 3;
  return chroma <= maxChroma && mean >= 55 && mean <= 246;
}

/** Finds the slowly varying card connected to the image border. */
function floodCard(png, maxChroma) {
  const { width, height, data } = png;
  const seen = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const push = (index) => {
    if (seen[index]) return;
    seen[index] = 1;
    queue[tail++] = index;
  };
  const pushIfCard = (index) => {
    if (cardLike(data, index * 4, maxChroma)) push(index);
  };
  for (let x = 0; x < width; x += 1) {
    pushIfCard(x);
    pushIfCard((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    pushIfCard(y * width);
    pushIfCard(y * width + width - 1);
  }

  const maxStepSq = 18 * 18 * 3;
  while (head < tail) {
    const current = queue[head++];
    const x = current % width;
    const y = Math.floor(current / width);
    const neighbors = [];
    if (x > 0) neighbors.push(current - 1);
    if (x + 1 < width) neighbors.push(current + 1);
    if (y > 0) neighbors.push(current - width);
    if (y + 1 < height) neighbors.push(current + width);
    for (const next of neighbors) {
      if (seen[next]) continue;
      const offset = next * 4;
      if (!cardLike(data, offset, maxChroma)) continue;
      if (colorDistanceSq(data, current * 4, offset) > maxStepSq) continue;
      push(next);
    }
  }
  return seen;
}

function solveLinear(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    if (Math.abs(divisor) < 1e-9) throw new Error('Could not model the background card');
    for (let k = col; k <= n; k += 1) a[col][k] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let k = col; k <= n; k += 1) a[row][k] -= factor * a[col][k];
    }
  }
  return a.map((row) => row[n]);
}

function features(x, y, width, height) {
  const nx = (2 * x) / Math.max(1, width - 1) - 1;
  const ny = (2 * y) / Math.max(1, height - 1) - 1;
  return [1, nx, ny, nx * nx, ny * ny, nx * ny];
}

/** Fits a gentle 2D quadratic to the warm-gray card, including its vignette. */
function fitCard(png, cardMask) {
  const size = 6;
  const normal = Array.from({ length: size }, () => Array(size).fill(0));
  const rhs = Array.from({ length: 3 }, () => Array(size).fill(0));
  let samples = 0;
  const borderBand = Math.max(32, Math.floor(Math.min(png.width, png.height) * 0.06));
  for (let y = 0; y < png.height; y += 8) {
    for (let x = 0; x < png.width; x += 8) {
      const index = y * png.width + x;
      if (!cardMask[index]) continue;
      if (
        x >= borderBand &&
        x < png.width - borderBand &&
        y >= borderBand &&
        y < png.height - borderBand
      ) continue;
      const f = features(x, y, png.width, png.height);
      const offset = index * 4;
      for (let i = 0; i < size; i += 1) {
        for (let j = 0; j < size; j += 1) normal[i][j] += f[i] * f[j];
        for (let channel = 0; channel < 3; channel += 1) {
          rhs[channel][i] += f[i] * png.data[offset + channel];
        }
      }
      samples += 1;
    }
  }
  if (samples < 100) throw new Error('Too few card pixels to condition image');
  return rhs.map((channel) => solveLinear(normal, channel));
}

function modeledColor(model, x, y, width, height) {
  const f = features(x, y, width, height);
  return model.map((channel) => channel.reduce((sum, coefficient, i) => sum + coefficient * f[i], 0));
}

function removeCard(png, bgDistance, maxChroma) {
  const cardMask = floodCard(png, maxChroma);
  const model = fitCard(png, cardMask);
  const output = new PNG({ width: png.width, height: png.height });
  const pixelCount = png.width * png.height;
  const distances = new Float32Array(pixelCount);
  const modeled = new Float32Array(pixelCount * 3);
  const backgroundCandidate = new Uint8Array(pixelCount);

  // The microphone cable can close a loop with the body and trap a large area
  // of card that the border flood cannot reach. Detect only large connected
  // regions that closely match the fitted card; small near-gray regions inside
  // white boots and black clothing must remain foreground.
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = y * png.width + x;
      const offset = index * 4;
      const bg = modeledColor(model, x, y, png.width, png.height);
      modeled[index * 3] = bg[0];
      modeled[index * 3 + 1] = bg[1];
      modeled[index * 3 + 2] = bg[2];
      const dr = png.data[offset] - bg[0];
      const dg = png.data[offset + 1] - bg[1];
      const db = png.data[offset + 2] - bg[2];
      distances[index] = Math.sqrt(dr * dr + dg * dg + db * db);
      if (distances[index] <= bgDistance && cardLike(png.data, offset, maxChroma)) {
        backgroundCandidate[index] = 1;
      }
    }
  }

  // The border flood is the strongest evidence: it removes a connected card
  // even when generator texture makes the fitted color model imperfect.
  const background = new Uint8Array(cardMask);
  const visited = new Uint8Array(pixelCount);
  const componentQueue = new Int32Array(pixelCount);
  const minimumEnclosedArea = Math.max(4000, Math.floor(pixelCount * 0.004));
  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (!backgroundCandidate[seed] || visited[seed]) continue;
    let head = 0;
    let tail = 0;
    let touchesBorder = false;
    visited[seed] = 1;
    componentQueue[tail++] = seed;
    while (head < tail) {
      const current = componentQueue[head++];
      const x = current % png.width;
      const y = Math.floor(current / png.width);
      if (x === 0 || x === png.width - 1 || y === 0 || y === png.height - 1) {
        touchesBorder = true;
      }
      const neighbors = [];
      if (x > 0) neighbors.push(current - 1);
      if (x + 1 < png.width) neighbors.push(current + 1);
      if (y > 0) neighbors.push(current - png.width);
      if (y + 1 < png.height) neighbors.push(current + png.width);
      for (const next of neighbors) {
        if (!backgroundCandidate[next] || visited[next]) continue;
        visited[next] = 1;
        componentQueue[tail++] = next;
      }
    }
    if (touchesBorder || tail >= minimumEnclosedArea) {
      for (let i = 0; i < tail; i += 1) background[componentQueue[i]] = 1;
    }
  }
  const edge = new Uint8Array(pixelCount);
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = y * png.width + x;
      if (background[index]) continue;
      if (
        (x > 0 && background[index - 1]) ||
        (x + 1 < png.width && background[index + 1]) ||
        (y > 0 && background[index - png.width]) ||
        (y + 1 < png.height && background[index + png.width])
      ) {
        edge[index] = 1;
      }
    }
  }

  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      const index = y * png.width + x;
      const offset = index * 4;
      const bg = [modeled[index * 3], modeled[index * 3 + 1], modeled[index * 3 + 2]];
      let alpha = background[index] ? 0 : 255;
      if (edge[index]) {
        alpha = Math.max(96, Math.min(224, Math.round(distances[index] * 7)));
      }

      if (alpha <= 2) {
        output.data[offset] = 0;
        output.data[offset + 1] = 0;
        output.data[offset + 2] = 0;
        output.data[offset + 3] = 0;
        continue;
      }

      const a = alpha / 255;
      for (let channel = 0; channel < 3; channel += 1) {
        const foreground = alpha < 255
          ? (png.data[offset + channel] - (1 - a) * bg[channel]) / a
          : png.data[offset + channel];
        output.data[offset + channel] = Math.max(0, Math.min(255, Math.round(foreground)));
      }
      output.data[offset + 3] = alpha;
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) throw new Error('Conditioning removed the entire image');
  return { png: output, bounds: { minX, minY, maxX, maxY } };
}

function sampleBilinear(png, x, y, channel) {
  const x0 = Math.max(0, Math.min(png.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(png.height - 1, Math.floor(y)));
  const x1 = Math.min(png.width - 1, x0 + 1);
  const y1 = Math.min(png.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const at = (sx, sy) => png.data[(sy * png.width + sx) * 4 + channel];
  return (
    at(x0, y0) * (1 - tx) * (1 - ty) +
    at(x1, y0) * tx * (1 - ty) +
    at(x0, y1) * (1 - tx) * ty +
    at(x1, y1) * tx * ty
  );
}

function mapToCanonical(source, crop, width, height, padding = 14) {
  const output = new PNG({ width, height });
  const nominalWidth = crop.widthNorm * source.width;
  const nominalHeight = crop.heightNorm * source.height;
  const scale = Math.min((width - padding * 2) / nominalWidth, (height - padding * 2) / nominalHeight);
  const drawWidth = nominalWidth * scale;
  const drawHeight = nominalHeight * scale;
  const left = (width - drawWidth) / 2;
  const top = height - padding - drawHeight;

  for (let y = Math.max(0, Math.floor(top)); y < Math.min(height, Math.ceil(top + drawHeight)); y += 1) {
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(width, Math.ceil(left + drawWidth)); x += 1) {
      const u = (x + 0.5 - left) / drawWidth;
      const v = (y + 0.5 - top) / drawHeight;
      if (u < 0 || u > 1 || v < 0 || v > 1) continue;
      const sx = (crop.leftNorm + u * crop.widthNorm) * (source.width - 1);
      const sy = (crop.topNorm + v * crop.heightNorm) * (source.height - 1);
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        output.data[offset + channel] = Math.round(sampleBilinear(source, sx, sy, channel));
      }
    }
  }
  return output;
}

function opaqueBounds(png) {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y += 1) {
    for (let x = 0; x < png.width; x += 1) {
      if (png.data[(y * png.width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function shiftVertical(png, amount) {
  if (amount === 0) return png;
  const shifted = new PNG({ width: png.width, height: png.height });
  for (let y = 0; y < png.height; y += 1) {
    const sourceY = y - amount;
    if (sourceY < 0 || sourceY >= png.height) continue;
    const sourceStart = sourceY * png.width * 4;
    const targetStart = y * png.width * 4;
    png.data.copy(shifted.data, targetStart, sourceStart, sourceStart + png.width * 4);
  }
  return shifted;
}

const options = parseArgs(process.argv.slice(2));
const files = readdirSync(options.inputDir)
  .filter((name) => name.startsWith(options.prefix) && name.endsWith('.png'))
  .sort();
if (files.length === 0) throw new Error(`No ${options.prefix}*.png files in ${options.inputDir}`);

const conditioned = files.map((name) => {
  const source = PNG.sync.read(readFileSync(join(options.inputDir, name)));
  const result = removeCard(source, options.bgDistance, options.cardChroma);
  return { name, source, ...result };
});

let leftNorm = 1;
let topNorm = 1;
let rightNorm = 0;
let bottomNorm = 0;
for (const item of conditioned) {
  leftNorm = Math.min(leftNorm, item.bounds.minX / item.source.width);
  topNorm = Math.min(topNorm, item.bounds.minY / item.source.height);
  rightNorm = Math.max(rightNorm, (item.bounds.maxX + 1) / item.source.width);
  bottomNorm = Math.max(bottomNorm, (item.bounds.maxY + 1) / item.source.height);
}
const margin = 0.012;
leftNorm = Math.max(0, leftNorm - margin);
topNorm = Math.max(0, topNorm - margin);
rightNorm = Math.min(1, rightNorm + margin);
bottomNorm = Math.min(1, bottomNorm + margin);
const crop = {
  leftNorm,
  topNorm,
  widthNorm: rightNorm - leftNorm,
  heightNorm: bottomNorm - topNorm,
};

mkdirSync(options.outputDir, { recursive: true });
for (const item of conditioned) {
  let output;
  if (options.preserveCanvas) {
    output = mapToCanonical(
      item.png,
      { leftNorm: 0, topNorm: 0, widthNorm: 1, heightNorm: 1 },
      options.width,
      options.height,
      0,
    );
  } else {
    output = mapToCanonical(item.png, crop, options.width, options.height);
    const mappedBounds = opaqueBounds(output);
    const targetBaseline = options.height - 14;
    output = shiftVertical(output, targetBaseline - mappedBounds.maxY);
  }
  const path = join(options.outputDir, item.name);
  writeFileSync(path, PNG.sync.write(output));
  const b = item.bounds;
  console.log(
    `${basename(path)} | raw ${item.source.width}x${item.source.height} | ` +
      `subject ${b.maxX - b.minX + 1}x${b.maxY - b.minY + 1} | ` +
      `output ${options.width}x${options.height} RGBA`,
  );
}
console.log(
  `SHARED_CROP left=${leftNorm.toFixed(4)} top=${topNorm.toFixed(4)} ` +
    `right=${rightNorm.toFixed(4)} bottom=${bottomNorm.toFixed(4)}`,
);
