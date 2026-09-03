/** Resize an RGBA PNG to an exact runtime frame with bilinear sampling. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const values = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  values.set(process.argv[i].slice(2), process.argv[i + 1]);
}
for (const key of ['input', 'output', 'width', 'height']) {
  if (!values.has(key)) throw new Error(`Missing --${key}`);
}

const inputPath = resolve(values.get('input'));
const outputPath = resolve(values.get('output'));
const width = Number(values.get('width'));
const height = Number(values.get('height'));
const opaque = values.get('opaque') === 'true';
if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
  throw new Error('Width and height must be positive integers');
}

const source = PNG.sync.read(readFileSync(inputPath));
const output = new PNG({ width, height });
const sample = (x, y, channel) => {
  x = Math.max(0, Math.min(source.width - 1, x));
  y = Math.max(0, Math.min(source.height - 1, y));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(source.width - 1, x0 + 1);
  const y1 = Math.min(source.height - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const at = (sx, sy) => source.data[(sy * source.width + sx) * 4 + channel];
  return (
    at(x0, y0) * (1 - tx) * (1 - ty) +
    at(x1, y0) * tx * (1 - ty) +
    at(x0, y1) * (1 - tx) * ty +
    at(x1, y1) * tx * ty
  );
};

for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const sourceX = ((x + 0.5) * source.width) / width - 0.5;
    const sourceY = ((y + 0.5) * source.height) / height - 0.5;
    const offset = (y * width + x) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      output.data[offset + channel] = Math.round(sample(sourceX, sourceY, channel));
    }
  }
}

if (opaque) {
  for (let offset = 3; offset < output.data.length; offset += 4) {
    if (output.data[offset] !== 255) {
      throw new Error('Cannot write opaque PNG: input contains transparency');
    }
  }
}
writeFileSync(outputPath, PNG.sync.write(output, opaque ? { colorType: 2 } : undefined));
console.log(
  `${outputPath} | ${source.width}x${source.height} -> ${width}x${height} ` +
    `${opaque ? 'RGB' : 'RGBA'}`,
);
