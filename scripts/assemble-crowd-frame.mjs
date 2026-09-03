/**
 * Joins two conditioned crowd halves into the canonical wide crowd frame.
 * The 120 px gap is intentional gameplay whitespace for the projectile lane.
 *
 * Usage:
 *   node scripts/assemble-crowd-frame.mjs \
 *     --left left.png --right right.png --output crowd_front_01.png
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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
  for (const key of ['left', 'right', 'output']) {
    if (!values.has(key)) throw new Error(`Missing --${key}`);
  }
  return {
    left: resolve(values.get('left')),
    right: resolve(values.get('right')),
    output: resolve(values.get('output')),
    outputWidth: Number(values.get('output-width') ?? 1920),
    outputHeight: Number(values.get('output-height') ?? 420),
    rightOffset: Number(values.get('right-offset') ?? 1020),
  };
}

function composite(target, source, offsetX) {
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const targetX = x + offsetX;
      if (targetX < 0 || targetX >= target.width || y >= target.height) continue;
      const sourceOffset = (y * source.width + x) * 4;
      const targetOffset = (y * target.width + targetX) * 4;
      const sourceAlpha = source.data[sourceOffset + 3] / 255;
      const targetAlpha = target.data[targetOffset + 3] / 255;
      const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
      for (let channel = 0; channel < 3; channel += 1) {
        const premultiplied =
          source.data[sourceOffset + channel] * sourceAlpha +
          target.data[targetOffset + channel] * targetAlpha * (1 - sourceAlpha);
        target.data[targetOffset + channel] = outputAlpha > 0
          ? Math.round(premultiplied / outputAlpha)
          : 0;
      }
      target.data[targetOffset + 3] = Math.round(outputAlpha * 255);
    }
  }
}

const options = parseArgs(process.argv.slice(2));
const left = PNG.sync.read(readFileSync(options.left));
const right = PNG.sync.read(readFileSync(options.right));
if (
  left.height !== options.outputHeight ||
  right.height !== options.outputHeight ||
  left.width > options.outputWidth ||
  options.rightOffset < 0 ||
  options.rightOffset + right.width > options.outputWidth
) {
  throw new Error('Crowd halves do not fit the requested output geometry');
}

const output = new PNG({ width: options.outputWidth, height: options.outputHeight });
composite(output, left, 0);
composite(output, right, options.rightOffset);
mkdirSync(dirname(options.output), { recursive: true });
writeFileSync(options.output, PNG.sync.write(output));
console.log(
  `${options.output} | ${options.outputWidth}x${options.outputHeight} RGBA | ` +
    `right offset ${options.rightOffset}px`,
);
