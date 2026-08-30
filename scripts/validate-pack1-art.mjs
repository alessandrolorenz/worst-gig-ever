import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'assets/manifest/asset-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const requireReady = process.argv.includes('--require-ready');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function inspectPng(relativePath) {
  const bytes = readFileSync(join(repoRoot, relativePath));
  if (bytes.length < 29 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { error: 'not a valid PNG signature' };
  }
  if (bytes.toString('ascii', 12, 16) !== 'IHDR') {
    return { error: 'PNG does not start with IHDR' };
  }

  const colorType = bytes[25];
  const hasAlphaChannel = colorType === 4 || colorType === 6;
  const hasTransparencyChunk = bytes.includes(Buffer.from('tRNS'));
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    alphaCapable: hasAlphaChannel || hasTransparencyChunk,
  };
}

const productionEntries = Object.entries(manifest.assets).filter(([, entry]) => entry.path);
const required = productionEntries.filter(([, entry]) => entry.requiredForM6B);
const optional = productionEntries.filter(([, entry]) => !entry.requiredForM6B);
const missing = [];
const invalid = [];
const present = [];

for (const [key, entry] of productionEntries) {
  const absolutePath = join(repoRoot, entry.path);
  if (!existsSync(absolutePath)) {
    if (entry.requiredForM6B) missing.push([key, entry]);
    continue;
  }

  const png = inspectPng(entry.path);
  if (png.error) {
    invalid.push([key, entry, png.error]);
    continue;
  }
  if (png.width !== entry.width || png.height !== entry.height) {
    invalid.push([
      key,
      entry,
      `expected ${entry.width}x${entry.height}, got ${png.width}x${png.height}`,
    ]);
    continue;
  }
  if (entry.transparency === 'transparent' && !png.alphaCapable) {
    invalid.push([key, entry, 'expected an alpha-capable PNG']);
    continue;
  }
  if (entry.transparency === 'opaque' && png.alphaCapable) {
    invalid.push([key, entry, 'expected an opaque PNG without alpha/tRNS']);
    continue;
  }
  present.push([key, entry]);
}

if (missing.length > 0) {
  console.log('ART_ASSETS_MISSING');
  for (const [, entry] of missing) {
    console.log(
      `MISSING ${entry.path} | ${entry.width}x${entry.height} | ${entry.transparency} | ${entry.prompt}`,
    );
  }
}

if (invalid.length > 0) {
  console.log('ART_ASSETS_INVALID');
  for (const [, entry, reason] of invalid) console.log(`INVALID ${entry.path} | ${reason}`);
}

const optionalMissing = optional.filter(([, entry]) => !existsSync(join(repoRoot, entry.path)));
for (const [, entry] of optionalMissing) {
  console.log(
    `OPTIONAL_MISSING ${entry.path} | ${entry.width}x${entry.height} | ${entry.transparency} | ${entry.prompt}`,
  );
}

console.log(
  `SUMMARY required=${required.length} present=${present.filter(([, entry]) => entry.requiredForM6B).length} missing=${missing.length} invalid=${invalid.length} optionalMissing=${optionalMissing.length}`,
);

if (missing.length === 0 && invalid.length === 0) {
  console.log('PASS_ART_READY');
} else if (requireReady) {
  process.exitCode = 1;
} else {
  console.log('PASS_CONTRACT_ART_MISSING');
}
