/**
 * Composes the app icon, adaptive-icon foreground, and web favicon from Pack 1
 * art.
 *
 * The icon is built rather than generated so it cannot drift from the game: it
 * reuses `assets/art/props/beer_bottle.png` and `assets/art/props/drumstick.png`
 * unchanged, over the venue purple the stage already uses. Rerun it after
 * either prop changes.
 *
 *   node scripts/make-app-icon.mjs
 *
 * Deliberately dependency-free (AGENTS.md rule 18): it carries just enough PNG
 * to read the two props and write the results.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync, inflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------- PNG I/O */

function decodePng(path) {
  const buf = readFileSync(path);
  let offset = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let color = 0;
  const idat = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      color = data[9];
      if (data[12] !== 0) throw new Error(`${path}: interlaced PNG unsupported`);
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += 12 + length;
  }
  if (depth !== 8) throw new Error(`${path}: bit depth ${depth} unsupported`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[color];
  if (!channels) throw new Error(`${path}: colour type ${color} unsupported`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const lines = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = lines.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? lines.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    for (let x = 0; x < stride; x += 1) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev[x];
      const c = x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, n = width * height; i < n; i += 1) {
    const s = i * channels;
    const d = i * 4;
    if (color === 6) {
      rgba[d] = lines[s];
      rgba[d + 1] = lines[s + 1];
      rgba[d + 2] = lines[s + 2];
      rgba[d + 3] = lines[s + 3];
    } else if (color === 2) {
      rgba[d] = lines[s];
      rgba[d + 1] = lines[s + 1];
      rgba[d + 2] = lines[s + 2];
      rgba[d + 3] = 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = lines[s];
      rgba[d + 3] = color === 4 ? lines[s + 1] : 255;
    }
  }
  return { width, height, data: rgba };
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) | 0;
}

function writePng(path, image) {
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    image.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const chunk = (type, data) => {
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    out.write(type, 4, 'ascii');
    data.copy(out, 8);
    out.writeInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
    return out;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  );
}

/* ------------------------------------------------------------- compositing */

function surface(size, fill) {
  const data = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { width: size, height: size, data };
}

function blend(dst, index, r, g, b, alpha) {
  if (alpha <= 0) return;
  const inv = 1 - alpha;
  dst.data[index] = Math.round(r * alpha + dst.data[index] * inv);
  dst.data[index + 1] = Math.round(g * alpha + dst.data[index + 1] * inv);
  dst.data[index + 2] = Math.round(b * alpha + dst.data[index + 2] * inv);
  dst.data[index + 3] = Math.round(255 * alpha + dst.data[index + 3] * inv);
}

/** Bilinear sample, so a prop scaled down keeps its edges clean. */
function sample(img, u, v) {
  const x = Math.max(0, Math.min(img.width - 1, u));
  const y = Math.max(0, Math.min(img.height - 1, v));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(img.width - 1, x0 + 1);
  const y1 = Math.min(img.height - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c += 1) {
    const a = img.data[(y0 * img.width + x0) * 4 + c];
    const b = img.data[(y0 * img.width + x1) * 4 + c];
    const d = img.data[(y1 * img.width + x0) * 4 + c];
    const e = img.data[(y1 * img.width + x1) * 4 + c];
    out[c] = a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + d * (1 - fx) * fy + e * fx * fy;
  }
  return out;
}

/**
 * Draws `img` centred at (cx, cy), rotated by `radians`.
 *
 * `scale` is given rather than derived from one axis: the props have very
 * different aspects — the stick is 640x96 — so fitting both by height turns
 * the stick into a plank running off both edges.
 */
function drawProp(dst, img, { cx, cy, scale, radians }) {
  const w = img.width * scale;
  const h = img.height * scale;
  const reach = Math.ceil(Math.hypot(w, h) / 2) + 2;
  const cos = Math.cos(-radians);
  const sin = Math.sin(-radians);
  for (let py = Math.max(0, cy - reach); py <= Math.min(dst.height - 1, cy + reach); py += 1) {
    for (let px = Math.max(0, cx - reach); px <= Math.min(dst.width - 1, cx + reach); px += 1) {
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      const sx = dx * cos - dy * sin + w / 2;
      const sy = dx * sin + dy * cos + h / 2;
      if (sx < 0 || sx >= w || sy < 0 || sy >= h) continue;
      const [r, g, b, a] = sample(img, sx / scale, sy / scale);
      blend(dst, (py * dst.width + px) * 4, r, g, b, a / 255);
    }
  }
}

/* ------------------------------------------------------------------- icon */

// The venue purple the stage background already uses, lit from the centre the
// way the stage lights are.
const CORE = [92, 45, 130];
const EDGE = [18, 15, 32];
const GLOW = [214, 58, 148];

function paintBackground(dst) {
  const size = dst.width;
  const centre = size / 2;
  const maxDistance = Math.hypot(centre, centre);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const t = Math.min(1, Math.hypot(x + 0.5 - centre, y + 0.5 - centre) / maxDistance);
      const eased = t * t;
      const i = (y * size + x) * 4;
      dst.data[i] = Math.round(CORE[0] * (1 - eased) + EDGE[0] * eased);
      dst.data[i + 1] = Math.round(CORE[1] * (1 - eased) + EDGE[1] * eased);
      dst.data[i + 2] = Math.round(CORE[2] * (1 - eased) + EDGE[2] * eased);
      dst.data[i + 3] = 255;
    }
  }
  // A magenta bloom behind the props, so the silhouettes separate from the base.
  const radius = size * 0.34;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x + 0.5 - centre, y + 0.5 - centre);
      if (d > radius) continue;
      const strength = (1 - d / radius) ** 2 * 0.5;
      blend(dst, (y * size + x) * 4, GLOW[0], GLOW[1], GLOW[2], strength);
    }
  }
}

function compose(size, { transparent, coverage }) {
  const canvas = transparent
    ? surface(size, [0, 0, 0, 0])
    : (() => {
        const s = surface(size, [0, 0, 0, 255]);
        paintBackground(s);
        return s;
      })();

  const bottle = decodePng(join(repoRoot, 'assets/art/props/beer_bottle.png'));
  const stick = decodePng(join(repoRoot, 'assets/art/props/drumstick.png'));
  const centre = size / 2;

  // Stick behind, bottle in front: crossed, the way the game reads. The stick
  // is sized along its length and the bottle along its height.
  drawProp(canvas, stick, {
    cx: centre,
    cy: centre,
    scale: (size * coverage * 1.05) / stick.width,
    radians: -0.7,
  });
  drawProp(canvas, bottle, {
    cx: centre,
    cy: centre,
    scale: (size * coverage) / bottle.height,
    radians: 0.42,
  });
  return canvas;
}

const targets = [
  // Full-bleed square for iOS and the store listing. The subject fills most of
  // the frame: an icon is read at 48px, where a small motif in a large field
  // of colour is just a coloured square.
  { path: 'assets/icon.png', size: 1024, transparent: false, coverage: 0.86 },
  // Android masks the foreground and keeps roughly the middle two thirds, so
  // the props are drawn smaller and the platform supplies the background.
  { path: 'assets/adaptive-icon.png', size: 1024, transparent: true, coverage: 0.58 },
  { path: 'assets/favicon.png', size: 96, transparent: false, coverage: 0.86 },
  // The splash is drawn transparent and `resizeMode: "contain"` letterboxes it,
  // so `splash.backgroundColor` in app.json fills the screen and there is no
  // visible edge where the image stops.
  { path: 'assets/splash.png', size: 1024, transparent: true, coverage: 0.42 },
];

for (const target of targets) {
  const image = compose(target.size, target);
  writePng(join(repoRoot, target.path), image);
  console.log(`wrote ${target.path} (${target.size}x${target.size})`);
}
