// Usage: FOOTBALL_DATA_TOKEN=xxxx node refresh-scores.mjs
// Fetches latest scores/statuses, updates worldcup.html, commits + pushes.
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fetchMatches, applyScores, readDataBlock, writeDataBlock } from './wc-lib.mjs';

const token = process.env.FOOTBALL_DATA_TOKEN;
if (!token) { console.error('Set FOOTBALL_DATA_TOKEN'); process.exit(1); }

const html = await readFile('worldcup.html', 'utf8');
const data = readDataBlock(html);
const apiMatches = await fetchMatches(token);
const { data: updated, changed } = applyScores(data, apiMatches);
updated.meta = { ...updated.meta, generatedAt: new Date().toISOString() };
await writeFile('worldcup.html', writeDataBlock(html, updated));
console.log(`Updated ${changed} match(es).`);

if (changed > 0){
  execSync('git add worldcup.html', {stdio:'inherit'});
  execSync(`git commit -m "data: refresh scores (${changed} updated)"`, {stdio:'inherit'});
  execSync('git push', {stdio:'inherit'});
  console.log('Pushed; GitHub Pages will redeploy shortly.');
} else {
  console.log('No changes; nothing to push.');
}
