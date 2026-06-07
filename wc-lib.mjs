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
