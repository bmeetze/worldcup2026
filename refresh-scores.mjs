// Usage: node refresh-scores.mjs [--commit]
// Fetches latest scores/statuses from ESPN's public scoreboard and updates worldcup.html.
import { readFile, writeFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { fetchEspnEvents, readDataBlock, syncEspnData, writeDataBlock } from './wc-lib.mjs';

const html = await readFile('worldcup.html', 'utf8');
const data = readDataBlock(html);
const events = await fetchEspnEvents();
const { data: updated, changed } = syncEspnData(data, events);
await writeFile('worldcup.html', writeDataBlock(html, updated));
console.log(`Updated ${changed} match(es).`);

if (changed > 0 && process.argv.includes('--commit')){
  execSync('git add worldcup.html', {stdio:'inherit'});
  execSync(`git commit -m "data: refresh scores (${changed} updated)"`, {stdio:'inherit'});
  execSync('git push', {stdio:'inherit'});
  console.log('Pushed; GitHub Pages will redeploy shortly.');
} else {
  console.log(changed > 0 ? 'Run again with --commit to commit and push.' : 'No changes; nothing to push.');
}
