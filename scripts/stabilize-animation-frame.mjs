/**
 * Keeps an image-generator pose edit local to its intended animation region.
 * Outside the soft rectangle, pixels come exactly from the canonical base.
 * This is a continuity-conditioning step, not a new drawing operation.
 *
 * Usage:
 *   node scripts/stabilize-animation-frame.mjs \
 *     --base idle.png --variant loop_a.png --output loop_a.png \
 *     --left 0.20 --top 0.03 --right 0.86 --bottom 0.48 --feather 0.06
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

function args(argv) {
  const values = new Map();
  for (let i = 0; i < argv.length; i += 2) values.set(argv[i].slice(2), argv[i + 1]);
  for (const key of ['base', 'variant', 'output', 'left', 'top', 'right', 'bottom', 'feather']) {
    if (!values.has(key)) throw new Error(`Missing --${key}`);
  }
  return {
    base: resolve(values.get('base')),
    variant: resolve(values.get('variant')),
    output: resolve(values.get('output')),
    left: Number(values.get('left')),
    top: Number(values.get('top')),
    right: Number(values.get('right')),
    bottom: Number(values.get('bottom')),
    feather: Number(values.get('feather')),
  };
}

function smoothstep(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

const options = args(process.argv.slice(2));
const base = PNG.sync.read(readFileSync(options.base));
const variant = PNG.sync.read(readFileSync(options.variant));
if (base.width !== variant.width || base.height !== variant.height) {
  throw new Error('Base and variant dimensions differ');
}

const output = new PNG({ width: base.width, height: base.height });
for (let y = 0; y < base.height; y += 1) {
  for (let x = 0; x < base.width; x += 1) {
    const nx = x / Math.max(1, base.width - 1);
    const ny = y / Math.max(1, base.height - 1);
    const edgeDistance = Math.min(
      nx - options.left,
      options.right - nx,
      ny - options.top,
      options.bottom - ny,
    );
    const weight = smoothstep(edgeDistance / options.feather);
    const offset = (y * base.width + x) * 4;
    const baseAlpha = base.data[offset + 3] / 255;
    const variantAlpha = variant.data[offset + 3] / 255;
    const alpha = baseAlpha * (1 - weight) + variantAlpha * weight;
    output.data[offset + 3] = Math.round(alpha * 255);
    for (let channel = 0; channel < 3; channel += 1) {
      const basePremultiplied = base.data[offset + channel] * baseAlpha;
      const variantPremultiplied = variant.data[offset + channel] * variantAlpha;
      const value = basePremultiplied * (1 - weight) + variantPremultiplied * weight;
      output.data[offset + channel] = alpha > 0 ? Math.round(value / alpha) : 0;
    }
  }
}

writeFileSync(options.output, PNG.sync.write(output));
console.log(
  `${options.output} | retained variant only inside ` +
    `${options.left},${options.top}..${options.right},${options.bottom}`,
);
