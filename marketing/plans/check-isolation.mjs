import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const baselinePath = path.join(root, 'marketing/plans/production-baseline.json');
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root }).toString().split('\0').filter(p => p && !p.startsWith('marketing/')).sort();
const hashes = Object.fromEntries(files.map(p => [p, createHash('sha256').update(readFileSync(path.join(root, p))).digest('hex')]));
if (process.argv.includes('--record')) {
  if (existsSync(baselinePath)) throw new Error('Baseline already exists; refusing to replace it.');
  writeFileSync(baselinePath, JSON.stringify({ date: '2026-09-09', hashes }, null, 2) + '\n');
  console.log(`Recorded ${files.length} existing files, including pre-existing changes.`);
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8')).hashes;
  const changed = [...new Set([...Object.keys(baseline), ...files])].filter(p => baseline[p] !== hashes[p]);
  const imported = files.filter(p => /\.(tsx?|jsx?|mjs|cjs)$/.test(p) && (p.startsWith('game/') || p === 'App.tsx')).filter(p => /(?:from\s*|import\s*\(|require\s*\()\s*['"][^'"]*marketing\//.test(readFileSync(path.join(root, p), 'utf8')));
  if (changed.length || imported.length) throw new Error(JSON.stringify({ changed, imported }, null, 2));
  console.log(`PASS: ${files.length} non-marketing files unchanged; no runtime marketing imports.`);
}
