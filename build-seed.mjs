// Usage: FOOTBALL_DATA_TOKEN=xxxx node build-seed.mjs
// Fetches the full WC fixture list, writes teams[] + matches[] into worldcup.html.
import { readFile, writeFile } from 'node:fs/promises';
import { fetchMatches, normalizeMatch, teamsFromMatches, writeDataBlock } from './wc-lib.mjs';

const token = process.env.FOOTBALL_DATA_TOKEN;
if (!token) { console.error('Set FOOTBALL_DATA_TOKEN'); process.exit(1); }

const apiMatches = await fetchMatches(token);
if (apiMatches.length === 0) {
  console.error('No matches returned. The free tier may not cover WC 2026 yet.');
  console.error('Fallback: seed from openfootball (see README) or hand-author the data block.');
  process.exit(2);
}

const data = {
  meta: {
    competition: 'FIFA World Cup 2026',
    generatedAt: new Date().toISOString(),
    source: 'football-data.org',
  },
  teams: teamsFromMatches(apiMatches),
  matches: apiMatches.map(normalizeMatch).sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc)),
};

const html = await readFile('worldcup.html', 'utf8');
await writeFile('worldcup.html', writeDataBlock(html, data));
console.log(`Seeded ${data.teams.length} teams and ${data.matches.length} matches.`);
