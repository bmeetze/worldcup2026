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

// Merge API match data into existing data, keyed by id. Resolves knockout
// teams when the API now knows them. Returns { data, changed }.
export function applyScores(data, apiMatches) {
  const byId = new Map(data.matches.map((m) => [m.id, m]));
  let changed = 0;
  for (const api of apiMatches) {
    const local = byId.get('fd-' + api.id);
    if (!local) continue;
    const next = normalizeMatch(api);
    const before = JSON.stringify(local);
    local.status = next.status;
    local.homeScore = next.homeScore;
    local.awayScore = next.awayScore;
    local.home = next.home;
    local.away = next.away;
    local.homeName = next.homeName;
    local.awayName = next.awayName;
    if (next.venue) local.venue = next.venue;
    if (JSON.stringify(local) !== before) changed++;
  }
  return { data, changed };
}

const API_BASE = 'https://api.football-data.org/v4';

// Fetch all WC matches. Requires an API token. Returns the raw API match array.
export async function fetchMatches(token, fetchImpl = fetch) {
  const res = await fetchImpl(`${API_BASE}/competitions/WC/matches`, {
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) throw new Error(`football-data.org returned ${res.status}`);
  const body = await res.json();
  return body.matches || [];
}

// FIFA 3-letter (TLA) -> flag emoji. football-data.org does not return flags,
// so we map them here. England/Scotland use subdivision flag emojis.
const FLAG_BY_TLA = {
  ALG:'🇩🇿', ARG:'🇦🇷', AUS:'🇦🇺', AUT:'🇦🇹', BEL:'🇧🇪', BIH:'🇧🇦', BRA:'🇧🇷',
  CAN:'🇨🇦', CIV:'🇨🇮', COD:'🇨🇩', COL:'🇨🇴', CPV:'🇨🇻', CRO:'🇭🇷', CUW:'🇨🇼',
  CZE:'🇨🇿', ECU:'🇪🇨', EGY:'🇪🇬', ENG:'🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}',
  ESP:'🇪🇸', FRA:'🇫🇷', GER:'🇩🇪', GHA:'🇬🇭', HAI:'🇭🇹', IRN:'🇮🇷', IRQ:'🇮🇶',
  JOR:'🇯🇴', JPN:'🇯🇵', KOR:'🇰🇷', KSA:'🇸🇦', MAR:'🇲🇦', MEX:'🇲🇽', NED:'🇳🇱',
  NOR:'🇳🇴', NZL:'🇳🇿', PAN:'🇵🇦', PAR:'🇵🇾', POR:'🇵🇹', QAT:'🇶🇦', RSA:'🇿🇦',
  SCO:'🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
  SEN:'🇸🇳', SUI:'🇨🇭', SWE:'🇸🇪', TUN:'🇹🇳', TUR:'🇹🇷', URY:'🇺🇾', USA:'🇺🇸',
  UZB:'🇺🇿',
};
export function flagFor(tla){ return FLAG_BY_TLA[tla] || ''; }

// Build the teams[] array from the API match list (deduped by tla).
export function teamsFromMatches(apiMatches) {
  const map = new Map();
  for (const api of apiMatches) {
    if (api.stage !== 'GROUP_STAGE' || !api.group) continue;
    const group = api.group.replace('GROUP_', '');
    for (const side of [api.homeTeam, api.awayTeam]) {
      if (side?.tla && !map.has(side.tla)) {
        map.set(side.tla, { code: side.tla, name: side.name, flag: flagFor(side.tla), group });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}
