/** Fits RGBA content near a requested box; remeasure the antialiased bounds afterward. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';

const values = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  values.set(process.argv[i].slice(2), process.argv[i + 1]);
}
for (const key of ['input', 'output', 'max-width', 'max-height']) {
  if (!values.has(key)) throw new Error(`Missing --${key}`);
}
const inputPath = resolve(values.get('input'));
const outputPath = resolve(values.get('output'));
const maxWidth = Number(values.get('max-width'));
const maxHeight = Number(values.get('max-height'));
if (!Number.isInteger(maxWidth) || maxWidth <= 0 || !Number.isInteger(maxHeight) || maxHeight <= 0) {
  throw new Error('Maximum width and height must be positive integers');
}
const source = PNG.sync.read(readFileSync(inputPath));

let minX = source.width;
let minY = source.height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < source.height; y += 1) {
  for (let x = 0; x < source.width; x += 1) {
    if (source.data[(y * source.width + x) * 4 + 3] <= 8) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}
if (maxX < 0) throw new Error('Input has no visible content');
const contentWidth = maxX - minX + 1;
const contentHeight = maxY - minY + 1;
const scale = Math.min(1, maxWidth / contentWidth, maxHeight / contentHeight);
const drawWidth = contentWidth * scale;
const drawHeight = contentHeight * scale;
const left = (source.width - drawWidth) / 2;
const top = (source.height - drawHeight) / 2;
const output = new PNG({ width: source.width, height: source.height });

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

for (let y = Math.floor(top); y < Math.ceil(top + drawHeight); y += 1) {
  for (let x = Math.floor(left); x < Math.ceil(left + drawWidth); x += 1) {
    if (x < 0 || x >= output.width || y < 0 || y >= output.height) continue;
    const sourceX = minX + ((x + 0.5 - left) / drawWidth) * contentWidth - 0.5;
    const sourceY = minY + ((y + 0.5 - top) / drawHeight) * contentHeight - 0.5;
    const offset = (y * output.width + x) * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      output.data[offset + channel] = Math.round(sample(sourceX, sourceY, channel));
    }
  }
}

writeFileSync(outputPath, PNG.sync.write(output));
console.log(
  `${outputPath} | content ${contentWidth}x${contentHeight} -> ` +
    `${Math.round(drawWidth)}x${Math.round(drawHeight)} | centered`,
);
