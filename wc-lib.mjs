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

// FIFA 3-letter (TLA) -> confederation code.
const CONFED_BY_TLA = {
  // UEFA (Europe)
  CZE:'UEFA', BIH:'UEFA', SUI:'UEFA', SCO:'UEFA', TUR:'UEFA', GER:'UEFA', NED:'UEFA',
  SWE:'UEFA', BEL:'UEFA', ESP:'UEFA', FRA:'UEFA', NOR:'UEFA', AUT:'UEFA', POR:'UEFA',
  CRO:'UEFA', ENG:'UEFA',
  // CONMEBOL (South America)
  BRA:'CONMEBOL', PAR:'CONMEBOL', ECU:'CONMEBOL', URY:'CONMEBOL', ARG:'CONMEBOL', COL:'CONMEBOL',
  // CONCACAF (North/Central America & Caribbean)
  MEX:'CONCACAF', CAN:'CONCACAF', USA:'CONCACAF', HAI:'CONCACAF', CUW:'CONCACAF', PAN:'CONCACAF',
  // CAF (Africa)
  RSA:'CAF', MAR:'CAF', CIV:'CAF', TUN:'CAF', EGY:'CAF', CPV:'CAF', SEN:'CAF', ALG:'CAF',
  GHA:'CAF', COD:'CAF',
  // AFC (Asia & Australia)
  KOR:'AFC', QAT:'AFC', AUS:'AFC', JPN:'AFC', IRN:'AFC', KSA:'AFC', IRQ:'AFC', JOR:'AFC', UZB:'AFC',
  // OFC (Oceania)
  NZL:'OFC',
};
export function confederationFor(tla){ return CONFED_BY_TLA[tla] || ''; }

// ---- venue enrichment (football-data has no venues; join openfootball by kickoff instant) ----

// openfootball host "ground" string -> { stadium, city, state }.
const VENUE_BY_GROUND = {
  'Atlanta': { stadium:'Mercedes-Benz Stadium', city:'Atlanta', state:'GA' },
  'Boston (Foxborough)': { stadium:'Gillette Stadium', city:'Foxborough', state:'MA' },
  'Dallas (Arlington)': { stadium:'AT&T Stadium', city:'Arlington', state:'TX' },
  'Guadalajara (Zapopan)': { stadium:'Estadio Akron', city:'Guadalajara', state:'Jalisco' },
  'Houston': { stadium:'NRG Stadium', city:'Houston', state:'TX' },
  'Kansas City': { stadium:'Arrowhead Stadium', city:'Kansas City', state:'MO' },
  'Los Angeles (Inglewood)': { stadium:'SoFi Stadium', city:'Inglewood', state:'CA' },
  'Mexico City': { stadium:'Estadio Azteca', city:'Mexico City', state:'Mexico' },
  'Miami (Miami Gardens)': { stadium:'Hard Rock Stadium', city:'Miami Gardens', state:'FL' },
  'Monterrey (Guadalupe)': { stadium:'Estadio BBVA', city:'Monterrey', state:'Nuevo León' },
  'New York/New Jersey (East Rutherford)': { stadium:'MetLife Stadium', city:'East Rutherford', state:'NJ' },
  'Philadelphia': { stadium:'Lincoln Financial Field', city:'Philadelphia', state:'PA' },
  'San Francisco Bay Area (Santa Clara)': { stadium:"Levi's Stadium", city:'Santa Clara', state:'CA' },
  'Seattle': { stadium:'Lumen Field', city:'Seattle', state:'WA' },
  'Toronto': { stadium:'BMO Field', city:'Toronto', state:'ON' },
  'Vancouver': { stadium:'BC Place', city:'Vancouver', state:'BC' },
};
export function venueLabel(ground){
  const v = VENUE_BY_GROUND[ground];
  return v ? `${v.stadium}, ${v.city}, ${v.state}` : '';
}

// Convert an openfootball "HH:MM UTC-X" local time on a date to a UTC epoch (ms).
export function ofInstant(date, time){
  const m = String(time).match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if (!m) return null;
  const base = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(base)) return null;
  return base + (+m[1])*3600e3 + (+m[2])*60e3 - (+m[3])*3600e3;
}

// Normalize a team name to a canonical token for cross-source comparison.
const TEAM_ALIAS = {
  capeverdeislands:'capeverde', drcongo:'congo', congodr:'congo',
  czechrepublic:'czech', czechia:'czech', unitedstates:'usa',
};
export function normTeam(name){
  const k = String(name||'').toLowerCase().replace(/[^a-z]/g,'');
  return TEAM_ALIAS[k] || k;
}

// Set match.venue (in place) by joining to openfootball matches on kickoff instant,
// disambiguating simultaneous matches by team. Returns { matched, total, misses }.
export function attachVenues(matches, ofMatches){
  const byInstant = new Map();
  for (const o of ofMatches){
    const t = ofInstant(o.date, o.time);
    if (t == null) continue;
    if (!byInstant.has(t)) byInstant.set(t, []);
    byInstant.get(t).push(o);
  }
  let matched = 0; const misses = [];
  for (const m of matches){
    const t = Date.parse(m.kickoffUtc);
    const cands = byInstant.get(t) || [];
    let pick = null;
    if (cands.length === 1) pick = cands[0];
    else if (cands.length > 1){
      const set = new Set([normTeam(m.homeName), normTeam(m.awayName)]);
      pick = cands.find(o => set.has(normTeam(o.team1)) || set.has(normTeam(o.team2))) || null;
    }
    const label = pick ? venueLabel(pick.ground) : '';
    if (label){ m.venue = label; matched++; }
    else misses.push(m.id);
  }
  return { matched, total: matches.length, misses };
}

// Build the teams[] array from the API match list (deduped by tla).
export function teamsFromMatches(apiMatches) {
  const map = new Map();
  for (const api of apiMatches) {
    if (api.stage !== 'GROUP_STAGE' || !api.group) continue;
    const group = api.group.replace('GROUP_', '');
    for (const side of [api.homeTeam, api.awayTeam]) {
      if (side?.tla && !map.has(side.tla)) {
        map.set(side.tla, { code: side.tla, name: side.name, flag: flagFor(side.tla), group, confederation: confederationFor(side.tla) });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}
