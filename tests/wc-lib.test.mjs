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
