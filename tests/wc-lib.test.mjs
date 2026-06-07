import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDataBlock, writeDataBlock } from '../wc-lib.mjs';

const HTML = `<html><body>
<script type="application/json" id="wc-data">{"teams":[],"matches":[]}</script>
</body></html>`;

test('readDataBlock parses embedded JSON', () => {
  const data = readDataBlock(HTML);
  assert.deepEqual(data, { teams: [], matches: [] });
});

test('writeDataBlock replaces only the JSON, preserving surrounding HTML', () => {
  const out = writeDataBlock(HTML, { teams: ['x'], matches: [] });
  assert.match(out, /<html><body>/);
  assert.match(out, /id="wc-data">\{[\s\S]*"teams"[\s\S]*\}<\/script>/);
  assert.deepEqual(readDataBlock(out), { teams: ['x'], matches: [] });
});

test('writeDataBlock throws if the block is missing', () => {
  assert.throws(() => writeDataBlock('<html></html>', {}), /wc-data block not found/);
});

import { mapStatus, mapStage, normalizeMatch } from '../wc-lib.mjs';

test('mapStatus maps football-data statuses', () => {
  assert.equal(mapStatus('TIMED'), 'scheduled');
  assert.equal(mapStatus('SCHEDULED'), 'scheduled');
  assert.equal(mapStatus('IN_PLAY'), 'live');
  assert.equal(mapStatus('PAUSED'), 'live');
  assert.equal(mapStatus('FINISHED'), 'finished');
  assert.equal(mapStatus('SUSPENDED'), 'scheduled');
});

test('mapStage maps football-data stages', () => {
  assert.equal(mapStage('GROUP_STAGE'), 'group');
  assert.equal(mapStage('LAST_32'), 'r32');
  assert.equal(mapStage('LAST_16'), 'r16');
  assert.equal(mapStage('QUARTER_FINALS'), 'qf');
  assert.equal(mapStage('SEMI_FINALS'), 'sf');
  assert.equal(mapStage('THIRD_PLACE'), 'third');
  assert.equal(mapStage('FINAL'), 'final');
});

test('normalizeMatch builds a schema match from an API match', () => {
  const api = {
    id: 12345, utcDate: '2026-06-11T20:00:00Z', status: 'TIMED',
    stage: 'GROUP_STAGE', group: 'GROUP_A',
    homeTeam: { tla: 'MEX', name: 'Mexico' },
    awayTeam: { tla: 'CAN', name: 'Canada' },
    score: { fullTime: { home: null, away: null } },
    venue: 'Estadio Azteca'
  };
  const m = normalizeMatch(api);
  assert.equal(m.id, 'fd-12345');
  assert.equal(m.stage, 'group');
  assert.equal(m.group, 'A');
  assert.equal(m.home, 'MEX');
  assert.equal(m.awayName, 'Canada');
  assert.equal(m.status, 'scheduled');
  assert.equal(m.homeScore, null);
  assert.equal(m.venue, 'Estadio Azteca');
});

test('normalizeMatch handles unresolved knockout teams as TBD', () => {
  const api = {
    id: 9, utcDate: '2026-07-04T20:00:00Z', status: 'SCHEDULED',
    stage: 'LAST_16', group: null,
    homeTeam: { tla: null, name: null },
    awayTeam: { tla: null, name: null },
    score: { fullTime: { home: null, away: null } }, venue: null
  };
  const m = normalizeMatch(api);
  assert.equal(m.home, 'TBD');
  assert.equal(m.group, null);
  assert.equal(m.homeName, 'TBD');
  assert.equal(m.venue, '');
});

import { applyScores } from '../wc-lib.mjs';

test('applyScores updates score/status by id and counts changes', () => {
  const data = { teams: [], matches: [
    { id: 'fd-1', status: 'scheduled', homeScore: null, awayScore: null, home: 'A', away: 'B', homeName: 'A', awayName: 'B' },
    { id: 'fd-2', status: 'scheduled', homeScore: null, awayScore: null, home: 'TBD', away: 'TBD', homeName: 'TBD', awayName: 'TBD' },
  ]};
  const apiMatches = [
    { id: 1, status: 'FINISHED', score: { fullTime: { home: 2, away: 0 } },
      homeTeam: { tla: 'A', name: 'A' }, awayTeam: { tla: 'B', name: 'B' },
      utcDate: '2026-06-11T20:00:00Z', stage: 'GROUP_STAGE', group: 'GROUP_A', venue: '' },
    { id: 2, status: 'SCHEDULED', score: { fullTime: { home: null, away: null } },
      homeTeam: { tla: 'C', name: 'Chile' }, awayTeam: { tla: 'D', name: 'Denmark' },
      utcDate: '2026-07-04T20:00:00Z', stage: 'LAST_16', group: null, venue: 'X' },
  ];
  const { data: out, changed } = applyScores(data, apiMatches);
  assert.equal(changed, 2);
  assert.equal(out.matches[0].homeScore, 2);
  assert.equal(out.matches[0].status, 'finished');
  assert.equal(out.matches[1].home, 'C');
  assert.equal(out.matches[1].awayName, 'Denmark');
});

test('applyScores ignores api matches with no local id match', () => {
  const data = { teams: [], matches: [{ id: 'fd-1', status: 'scheduled', homeScore: null, awayScore: null, home:'A', away:'B', homeName:'A', awayName:'B' }] };
  const { changed } = applyScores(data, [{ id: 999, status: 'FINISHED', score: { fullTime: { home: 1, away: 1 } }, homeTeam:{tla:'A',name:'A'}, awayTeam:{tla:'B',name:'B'}, utcDate:'', stage:'GROUP_STAGE', group:'GROUP_A', venue:'' }]);
  assert.equal(changed, 0);
});

import { flagFor } from '../wc-lib.mjs';

test('flagFor maps known TLAs to flag emoji and unknowns to empty', () => {
  assert.equal(flagFor('USA'), '🇺🇸');
  assert.equal(flagFor('BRA'), '🇧🇷');
  assert.equal(flagFor('ENG'), '🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}');
  assert.equal(flagFor('ZZZ'), '');
});

import { confederationFor } from '../wc-lib.mjs';

test('confederationFor maps known TLAs and unknowns to empty', () => {
  assert.equal(confederationFor('BRA'), 'CONMEBOL');
  assert.equal(confederationFor('ENG'), 'UEFA');
  assert.equal(confederationFor('USA'), 'CONCACAF');
  assert.equal(confederationFor('JPN'), 'AFC');
  assert.equal(confederationFor('NZL'), 'OFC');
  assert.equal(confederationFor('RSA'), 'CAF');
  assert.equal(confederationFor('ZZZ'), '');
});

import { ofInstant, normTeam, venueLabel, attachVenues } from '../wc-lib.mjs';

test('ofInstant converts local UTC-offset time to epoch ms', () => {
  assert.equal(ofInstant('2026-06-11','13:00 UTC-6'), Date.parse('2026-06-11T19:00:00Z'));
  assert.equal(ofInstant('2026-06-11','20:00 UTC-4'), Date.parse('2026-06-12T00:00:00Z')); // rolls to next day
  assert.equal(ofInstant('2026-06-11','bad'), null);
});

test('normTeam canonicalizes cross-source aliases', () => {
  assert.equal(normTeam('Czechia'), normTeam('Czech Republic'));
  assert.equal(normTeam('Cape Verde Islands'), normTeam('Cape Verde'));
  assert.equal(normTeam('Congo DR'), normTeam('DR Congo'));
  assert.equal(normTeam('United States'), normTeam('USA'));
  assert.equal(normTeam('Bosnia-Herzegovina'), normTeam('Bosnia & Herzegovina'));
});

test('venueLabel maps known grounds, empty for unknown', () => {
  assert.equal(venueLabel('Mexico City'), 'Estadio Azteca, Mexico City, Mexico');
  assert.equal(venueLabel('New York/New Jersey (East Rutherford)'), 'MetLife Stadium, East Rutherford, NJ');
  assert.equal(venueLabel('Nowhere'), '');
});

test('attachVenues joins by instant and disambiguates simultaneous by team', () => {
  const matches = [
    { id:'a', kickoffUtc:'2026-06-11T19:00:00Z', homeName:'Mexico', awayName:'South Africa', venue:'' },
    // simultaneous pair (same instant), disambiguated by team:
    { id:'b', kickoffUtc:'2026-06-27T19:00:00Z', homeName:'Czechia', awayName:'Haiti', venue:'' },
    { id:'c', kickoffUtc:'2026-06-27T19:00:00Z', homeName:'Brazil', awayName:'Norway', venue:'' },
  ];
  const of = [
    { date:'2026-06-11', time:'13:00 UTC-6', team1:'Mexico', team2:'South Africa', ground:'Mexico City' },
    { date:'2026-06-27', time:'15:00 UTC-4', team1:'Czech Republic', team2:'Haiti', ground:'Toronto' },
    { date:'2026-06-27', time:'15:00 UTC-4', team1:'Brazil', team2:'Norway', ground:'Seattle' },
  ];
  const r = attachVenues(matches, of);
  assert.equal(r.matched, 3);
  assert.equal(matches[0].venue, 'Estadio Azteca, Mexico City, Mexico');
  assert.equal(matches[1].venue, 'BMO Field, Toronto, ON');
  assert.equal(matches[2].venue, 'Lumen Field, Seattle, WA');
});
