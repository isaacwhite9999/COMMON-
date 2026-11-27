'use strict';

const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const engine = require('../docs/workspace/canvas/engine.js');
const fixture = 'Sequence,Value\n' + Array.from({ length: engine.MAX_ROWS }, (_, i) =>
  i + ',' + ((i % 200) / 4)).join('\n');
const spec = { version: 1, chart: 'histogram', title: 'Synthetic benchmark', y: 'Value' };
const times = [];

function trial() {
  const start = performance.now();
  const parsed = engine.csv(fixture);
  const plot = engine.compile(spec, parsed);
  assert.equal(plot.count, engine.MAX_ROWS);
  assert.equal(plot.trace.x.at(-1), 49.75);
  return performance.now() - start;
}

for (let i = 0; i < 5; i++) trial();
for (let i = 0; i < 25; i++) times.push(trial());
times.sort((a, b) => a - b);
const percentile = p => Number(times[Math.ceil(p * times.length) - 1].toFixed(2));
console.log(JSON.stringify({
  node: process.version, rows: engine.MAX_ROWS, bytes: Buffer.byteLength(fixture),
  trials: times.length, p50Ms: percentile(.5), p95Ms: percentile(.95)
}));
