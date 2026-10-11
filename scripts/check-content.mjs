// Checks the content files and content/resources.json. Run: npm run check
// Errors (exit code 1): unknown group, missing simple explanation, a stray ' | ' separator,
//   non-English (Turkish) characters, resources pointing at unknown fields/topics,
//   malformed resource entries.
// Warnings: first-level topics without a level, branches without a short description.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../src/data/model.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = JSON.parse(readFileSync(join(root, 'content/index.json'), 'utf8'));
const errors = [], warnings = [];
const TR_CHARS = /[\u00e7\u011f\u0131\u00f6\u015f\u00fc\u00c7\u011e\u0130\u00d6\u015e\u00dc]/;
const KINDS = new Set(['course', 'video', 'book', 'docs', 'article', 'interactive', 'practice']);

const texts = files.map((f) => {
  const txt = readFileSync(join(root, 'content', f), 'utf8');
  txt.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    const at = `${f}:${i + 1}`;
    if (!/^(## |( {2})*[->?] )/.test(line)) errors.push(`${at} unrecognized line format: ${line.slice(0, 60)}`);
    if (line.match(/^ */)[0].length % 2) errors.push(`${at} indentation must be a multiple of 2`);
    if (/^ *[->?] /.test(line) && line.includes(' | ')) errors.push(`${at} ' | ' is only allowed in branch headers`);
    if (TR_CHARS.test(line)) errors.push(`${at} contains Turkish characters; content is English-only`);
  });
  return txt;
});

let model;
try { model = buildModel(texts.join('\n')); } catch (e) { console.error('ERROR:', e.message); process.exit(1); }

model.branches.forEach((b) => {
  if (!b.s) errors.push(`branch "${b.id}" is missing its simple explanation (?)`);
  if (!b.d) warnings.push(`branch "${b.id}" has no short description (>)`);
});
model.nodes.forEach((n) => {
  if (!n.s) errors.push(`${n.id}: simple explanation (?) is missing`);
  if (!n.level && n.parent.kind === 'branch') warnings.push(`${n.id}: no level [1-3]`);
});

// resources.json
let res;
try { res = JSON.parse(readFileSync(join(root, 'content/resources.json'), 'utf8')); } catch (e) { errors.push('content/resources.json: ' + e.message); res = {}; }
const checkList = (where, list) => {
  if (!Array.isArray(list)) { errors.push(`${where}: expected a list of resources`); return; }
  list.forEach((r, i) => {
    if (!r || typeof r.t !== 'string' || !r.t) errors.push(`${where}[${i}]: missing title "t"`);
    if (!r || !/^https?:\/\//.test(r.u || '')) errors.push(`${where}[${i}]: "u" must be an http(s) URL`);
    if (!r || !KINDS.has(r.k)) errors.push(`${where}[${i}]: "k" must be one of ${[...KINDS].join(', ')}`);
  });
};
for (const id in res.areas || {}) {
  if (!model.byId[id] || model.byId[id].kind !== 'branch') errors.push(`resources.json areas: unknown field "${id}"`);
  checkList(`areas.${id}.resources`, res.areas[id].resources || []);
  if (res.areas[id].practice && !res.areas[id].practice.includes('{topic}')) warnings.push(`areas.${id}.practice has no {topic} placeholder`);
}
model.branches.forEach((b) => { if (!(res.areas || {})[b.id]) warnings.push(`resources.json: field "${b.id}" has no resources`); });
for (const id in res.topics || {}) {
  if (!model.byId[id] || model.byId[id].kind !== 'node') errors.push(`resources.json topics: unknown topic "${id}" (renamed?)`);
  checkList(`topics.${id}`, res.topics[id]);
}

console.log(`${model.branches.length} fields, ${model.total} topics, ${Object.keys(res.topics || {}).length} topics with their own resources`);
warnings.forEach((w) => console.log('warning:', w));
errors.forEach((e) => console.log('ERROR:', e));
console.log(errors.length ? `\n${errors.length} errors` : '\nContent is valid.');
process.exit(errors.length ? 1 : 0);
