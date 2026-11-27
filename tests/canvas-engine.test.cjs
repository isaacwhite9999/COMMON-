const assert = require('node:assert/strict');
const test = require('node:test');
const canvas = require('../docs/workspace/canvas/engine.js');

test('CSV fields support CRLF, quoted delimiters, escaped quotes and multiline values', () => {
  const data = canvas.csv('\ufeffDate,Label,Close\r\n2025-01-01,"one, two",4\r\n2025-01-02,"a\n""b""",5\r\n');
  assert.deepEqual(data.rows[1], ['2025-01-02', 'a\n"b"', '5']);
  const spec = canvas.draft('line close by Date', data.columns);
  assert.deepEqual(canvas.compile(spec, data).trace.y, [4, 5]);
  assert.throws(() => canvas.csv('X,X\n1,2'), /distinct/);
  assert.throws(() => canvas.csv('X,Y\n1'), /header width/);
  assert.throws(() => canvas.csv('X,Y\n"1"x,2'), /quoted/);
});

test('declarative specifications reject additional properties and invalid financial observations', () => {
  const data = canvas.csv('Open,High,Low,Close,Date\n3,4,2,5,2026-01-01');
  const spec = { version: 1, chart: 'candlestick', title: 'OHLC', x: 'Date',
    open: 'Open', high: 'High', low: 'Low', close: 'Close' };
  assert.throws(() => canvas.compile(spec, data), /Candlestick/);
  assert.throws(() => canvas.compile({ ...spec, href: 'https://example.test' }, data), /unsupported/);
  const row = canvas.csv('X,Y\n<script>,0x12');
  const draft = { version: 1, chart: 'scatter', title: '<script>', x: 'X', y: 'Y' };
  assert.throws(() => canvas.compile(draft, row), /finite numeric/);
  const safe = canvas.compile(draft, canvas.csv('X,Y\n<script>,0'));
  assert.deepEqual(safe.trace.x, ['&lt;script&gt;']);
  assert.equal(safe.labels.title, '&lt;script&gt;');
});

test('grids sort numeric axes, preserve holes and reject duplicate cells', () => {
  const spec = { version: 1, chart: 'heatmap', title: 'Grid', x: 'X', y: 'Y', z: 'Z' };
  const data = canvas.csv('X,Y,Z\n2,2,10\n1,2,11\n2,1,12');
  assert.deepEqual(canvas.compile(spec, data).trace.z, [[null,12],[11,10]]);
  assert.throws(() => canvas.compile({...spec, chart:'surface'}, data), /complete grid/);
  assert.throws(() => canvas.compile(spec, canvas.csv('X,Y,Z\n2,2,10\n1,2,11\n2,1,12\n2,2,13')), /unique/);
});

test('render limits never silently truncate observations', () => {
  const data = canvas.csv('X,Y\n' + '1,2\n'.repeat(canvas.MAX_POINTS + 1));
  assert.throws(() => canvas.compile(canvas.draft('line Y by X', data.columns), data), /4,000/);
  assert.equal(canvas.compile(canvas.draft('histogram Y', data.columns), data).trace.x.length, canvas.MAX_POINTS + 1);
});

test('as-of cutoff includes the exact boundary and ignores later value revisions', () => {
  const fields = 'Date,Close,Published\n2025-01-01,4,2025-01-01T15:00:00Z\n2025-01-01,8,2025-01-02T15:00:00Z';
  const data = canvas.csv(fields);
  const spec = { ...canvas.draft('line Close by Date', data.columns),
    availability: { field: 'Published', asOf: '2025-01-01T15:00:00.000Z' } };
  const baseline = canvas.compile(spec, data);
  assert.deepEqual(baseline.trace.y, [4]);
  assert.equal(baseline.excluded, 1);
  assert.deepEqual(canvas.compile(spec, canvas.csv(fields.replace(',8,', ',999,'))), baseline);
  assert.throws(() => canvas.compile(spec, canvas.csv(fields.replace('01-02T', '02-30T'))), /valid UTC/);
});

test('Treasury adapter validates and orders observations without inventing availability metadata', async () => {
  const { treasuryBills, loadTreasuryBills } = require('../docs/workspace/canvas/sources.js');
  const row = (date, rate) => ({ record_date: date, security_desc: 'Treasury Bills', avg_interest_rate_amt: rate });
  const input = { data: [row('2025-02-28', '4.001'), row('2025-01-31', '4.002')] };
  const result = treasuryBills(input);
  assert.deepEqual(canvas.csv(result.source).rows, [['2025-01-31', '4.002'], ['2025-02-28', '4.001']]);
  assert.equal(result.provenance.first, '2025-01-31');
  assert.equal(result.provenance.last, '2025-02-28');
  assert.throws(() => treasuryBills({ data: [input.data[0], input.data[0]] }), /duplicate/);
  await assert.rejects(loadTreasuryBills(async () => ({ ok: false })), /unavailable/);
});
