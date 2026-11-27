'use strict';
const assert = require('node:assert/strict');
const engine = require('../docs/lab/research-engine.js');
const risk = require('../docs/workspace/risk.js');
const quant = require('../docs/workspace/quant.js');
const finance = require('../docs/terminal/analytics.js');
const ledger = require('../docs/capital-ledger.js');

const near = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`
);
const dates = Array.from({ length: 41 }, (_, i) => new Date(Date.UTC(2023, 0, i + 1)).toISOString().slice(0, 10));
const csv = 'Date,Close,Adj Close\n' + dates.map((date, i) => `${date},${i < 20 ? 200 : 100},100`).join('\n');
const parsed = engine.parseCsv(csv);
assert.equal(parsed.diagnostics.hasAdjustedClose, true);
assert.ok(parsed.bars.every(bar => bar.close === 100));
assert.equal(engine.backtest(parsed.bars, { strategy: 'buy_hold', fast: 2, slow: 3 }).test.totalReturn, 0);
const chronology = engine.backtest(dates.map((date, i) => ({ date, close: 2 ** i })),
  { strategy: 'sma_crossover', fast: 2, slow: 3, costBps: 10, holdout: .5 });
assert.deepEqual(chronology.positions.slice(0, 3), [0, 0, 1]);
near(chronology.returns[2], 1 - .001);
assert.equal(chronology.trainThrough, dates[19]);
assert.equal(chronology.testFrom, dates[20]);

const returns = Array(20).fill(-.01);
const expected = .99 ** 20 - 1;
const bootstrap = engine.bootstrap(returns, { block: 4, paths: 50, seed: 123 });
for (const result of Object.values(bootstrap.percentiles)) near(result, expected);
assert.equal(bootstrap.probabilityOfLoss, 1);
assert.throws(() => engine.bootstrap(returns, { block: 0 }), /block size/);
assert.throws(() => engine.bootstrap(returns, { block: 1.5 }), /block size/);
assert.throws(() => engine.bootstrap(returns, { seed: -1 }), /seed/);
assert.throws(() => engine.bootstrap(Array(20001).fill(0), { paths: 1000 }), /fewer observations/);
assert.throws(() => engine.stats([Number.MAX_VALUE, Number.MAX_VALUE]), /numeric range/);

function asset(id, initial, moves) {
  let close = initial;
  return { id, weight: .5, bars: dates.map((date, i) => {
    if (i) close *= 1 + moves[(i - 1) % moves.length];
    return { date, close };
  }) };
}
const a = asset('a', 100, [-.10, .10]);
const b = asset('b', 100, [-.02, .02]);
const modeled = risk.analyze([a, b], { fee: 0 });
near(modeled.covariance[0][1], 40 * .10 * .02 / 39);
near(modeled.annualVolatility, .06 * Math.sqrt(40 * 252 / 39));
near(modeled.var95, .06);
near(modeled.es95, .06);
near(modeled.assets[0].riskContribution, 5 / 6);
near(modeled.netReturn, (1 - .06 ** 2) ** 20 - 1);
const extreme = { ...b, bars: b.bars.map((bar, i) => ({ ...bar, close: i % 2 ? 1 : Number.MIN_VALUE })) };
assert.throws(() => risk.analyze([a, extreme]), /numeric range/);
const walkInput = Array.from({ length: 100 }, (_, i) => ({
  date:new Date(Date.UTC(2023, 0, i + 1)).toISOString().slice(0, 10),
  close: i % 2 ? 1 : Number.MIN_VALUE
}));
assert.throws(() => quant.walkForward(walkInput, { fast: '2', slow: '3', train: 60, test: 20, fee: 0 }), /numeric range/);

const perpetuity = finance.dcf({ fcf: 10, growthPct: 0, waccPct: 10, terminalPct: 0, netDebt: 20, shares: 2 });
near(perpetuity.enterpriseValue, 100);
near(perpetuity.intrinsicPerShare, 40);
assert.equal(finance.dcf({ fcf: 0, growthPct: 0, waccPct: 10, terminalPct: 0, netDebt: 0, shares: 1 }).terminalWeight, null);
const zero = finance.bondRisk({ face: 1000, couponPct: 0, yieldPct: 10, years: 2, frequency: 1 });
near(zero.price, 1000 / 1.21);
near(zero.modifiedDuration, 2 / 1.1);
near(zero.convexity, 6 / 1.21);
const tail = finance.blackScholes({ spot: 1e6, strike: 1, days: 1, ivPct: .01, ratePct: -20, divPct: 10 });
assert.ok(tail.put.price >= 0 && tail.call.price >= 0);
near(tail.parityError, 0);
assert.equal(ledger.amount('0.01'), 1);
const accounting = [{ account: 'cash', side: 'debit', cents: 999999999 }, { account: 'capital', side: 'credit', cents: 999999999 }];
assert.equal(ledger.validate(accounting), 999999999);
assert.equal(ledger.balances([{ lines: accounting }, { lines: ledger.reverse(accounting) }]).capital, '0');
console.log('PASS adjusted-close split fixture, chronological costs, bootstrap bounds, independent covariance and tails, valuation and exact-cent checks');
