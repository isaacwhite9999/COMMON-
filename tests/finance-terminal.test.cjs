'use strict';
const assert=require('node:assert/strict');
const f=require('../docs/terminal/analytics.js');
const close=(actual,expected,eps=1e-6)=>assert.ok(Math.abs(actual-expected)<=eps,'Expected '+expected+', got '+actual);
close(f.cdf(0),.5,1e-6);
close(f.cdf(1),.8413447,1e-6);
close(f.cdf(-1),.1586553,1e-6);
const options=f.blackScholes({spot:100,strike:100,days:365,ivPct:20,ratePct:5,divPct:0});
close(options.call.price,10.45058,5e-4);
close(options.put.price,5.57353,5e-4);
close(options.parityError,0,1e-6);
assert.ok(options.call.delta>0&&options.call.delta<1);
assert.ok(options.put.delta<0&&options.put.delta>-1);
assert.ok(options.call.gamma>0&&options.call.vega>0);
assert.ok(options.call.theta<0);
assert.ok(f.blackScholes({spot:120,strike:100,days:365,ivPct:20,ratePct:5,divPct:0}).call.price>options.call.price);
assert.throws(()=>f.blackScholes({spot:100,strike:0,days:365,ivPct:20,ratePct:5}),/Strike/);
const d=f.dcf({fcf:5,growthPct:6,waccPct:9,terminalPct:2.5,netDebt:8,shares:2});
assert.equal(d.projections.length,5);
assert.ok(d.enterpriseValue>0&&d.intrinsicPerShare>0);
assert.ok(d.terminalWeight>0&&d.terminalWeight<1);
assert.equal(d.matrix.length,9);
const higherWacc=f.dcf({fcf:5,growthPct:6,waccPct:11,terminalPct:2.5,netDebt:8,shares:2});
assert.ok(higherWacc.intrinsicPerShare<d.intrinsicPerShare);
assert.throws(()=>f.dcf({fcf:5,growthPct:6,waccPct:2,terminalPct:3,netDebt:8,shares:2}),/WACC must exceed/);
const cap=f.capTable({pre:20000000,invested:5000000,holdingPct:80});
assert.equal(cap.postMoney,25000000);
close(cap.newInvestorOwnership,.2);
close(cap.existingHoldersOwnership,.8);
close(cap.existingShareholderAfter,.64);
const bond=f.bondRisk({face:1000,couponPct:5,yieldPct:5,years:10,frequency:2});
close(bond.price,1000,1e-8);
assert.ok(bond.modifiedDuration>0&&bond.modifiedDuration<10);
assert.ok(bond.dv01>0&&bond.convexity>0);
const higherYtm=f.bondRisk({face:1000,couponPct:5,yieldPct:7,years:10,frequency:2});
assert.ok(higherYtm.price<bond.price);
assert.throws(()=>f.bondRisk({face:1000,couponPct:5,yieldPct:5,years:10,frequency:3}),/Frequency/);
console.log('PASS: options parity and Greeks, DCF valuations and WACC sensitivity, equity dilution, coupon bond pricing, duration and DV01');

const dated = (date, amount) => ({ record_date: date, amount });
const normalise = entries => f.fiscalRows(entries, 'amount', 120);
const earlierFiscalWindow = normalise([
  dated('2024-01-03', '34000000000000.09'),
  dated('2024-01-01', '33999999999999.99'),
  dated('2024-01-02', '000.2000'),
]);
const laterFiscalWindow = normalise([
  dated('2024-01-03', '34000000000000.10'),
  dated('2024-01-02', '0.2'),
  dated('2024-01-04', '34000000000001.00'),
]);
assert.deepEqual(f.compareFiscalRows(earlierFiscalWindow, laterFiscalWindow), {
  changed: [{ date: '2024-01-03', amount: '34000000000000.1', before: '34000000000000.09', delta: '+0.01' }],
  entering: 1,
  leaving: 1,
  overlap: 2,
});
assert.deepEqual(f.compareFiscalRows(
  normalise([dated('2024-02-29','-0.01')]),
  normalise([dated('2024-02-29','-0.02')]),
).changed[0].delta, '-0.01');
assert.equal(f.compareFiscalRows(earlierFiscalWindow, laterFiscalWindow.slice(-1)).overlap, 0);
for (const invalid of [
  [], [dated('2023-02-29','1')], [dated('2024-01-01',null)],
  [dated('2024-01-01','1e6')], [dated('2024-01-01','1'),dated('2024-01-01','2')],
]) {
  assert.throws(() => normalise(invalid), /Treasury returned/);
}
assert.throws(() => f.fiscalRows([dated('2024-01-01','-1')], 'amount', 120, {nonnegative:true}), /invalid observation/);
console.log('PASS: exact Treasury source comparisons, date validation and rolling windows');
