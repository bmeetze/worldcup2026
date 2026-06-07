// Matches the inner text of <script type="application/json" id="wc-data">...</script>
const BLOCK_RE =
  /(<script[^>]*id="wc-data"[^>]*>)([\s\S]*?)(<\/script>)/;

export function readDataBlock(html) {
  const m = html.match(BLOCK_RE);
  if (!m) throw new Error('wc-data block not found');
  return JSON.parse(m[2]);
}

export function writeDataBlock(html, data) {
  if (!BLOCK_RE.test(html)) throw new Error('wc-data block not found');
  const json = JSON.stringify(data, null, 2);
  return html.replace(BLOCK_RE, (_all, open, _inner, close) => open + json + close);
}

export function mapStatus(s) {
  if (s === 'IN_PLAY' || s === 'PAUSED') return 'live';
  if (s === 'FINISHED') return 'finished';
  return 'scheduled';
}

const STAGE_MAP = {
  GROUP_STAGE: 'group', LAST_32: 'r32', LAST_16: 'r16',
  QUARTER_FINALS: 'qf', SEMI_FINALS: 'sf', THIRD_PLACE: 'third', FINAL: 'final',
};
export function mapStage(s) {
  return STAGE_MAP[s] || 'group';
}

export function normalizeMatch(api) {
  const stage = mapStage(api.stage);
  const group = stage === 'group' && api.group ? api.group.replace('GROUP_', '') : null;
  const home = api.homeTeam?.tla || 'TBD';
  const away = api.awayTeam?.tla || 'TBD';
  return {
    id: 'fd-' + api.id,
    kickoffUtc: api.utcDate,
    stage,
    group,
    home,
    away,
    homeName: api.homeTeam?.name || 'TBD',
    awayName: api.awayTeam?.name || 'TBD',
    venue: api.venue || '',
    status: mapStatus(api.status),
    homeScore: api.score?.fullTime?.home ?? null,
    awayScore: api.score?.fullTime?.away ?? null,
  };
}
