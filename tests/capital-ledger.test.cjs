const assert=require('node:assert/strict'),L=require('../docs/capital-ledger.js');const lines=[{account:'cash',side:'debit',cents:L.amount('1200.05')},{account:'capital',side:'credit',cents:120005}];assert.equal(L.validate(lines),120005);assert.equal(L.money('120005'),'$1,200.05');assert.equal(L.balances([{lines}]).cash,'120005');assert.equal(L.balances([{lines},{lines:L.reverse(lines)}]).cash,'0');assert.throws(()=>L.validate([lines[0],{...lines[1],cents:1}]));assert.throws(()=>L.amount('0.001'));assert.throws(()=>L.validate([lines[0],{...lines[0],side:'credit'}]));assert.throws(()=>L.validate([{account:'constructor',side:'debit',cents:1},{account:'cash',side:'credit',cents:1}]));console.log('Balanced external journal, reversal and exact-cent tests passed');
const context = {circleId:'test-private-circle', startDate:'2026-06-01', endDate:'2026-06-30'};
const creditNormal = ['capital','payables','income','realized_gain'];
const report = {
  ...context, schema:'common.external-journal-statement.v1', currency:'USD',
  generatedAt:'2026-07-01T00:00:00+00:00', evidenceSha256:'b'.repeat(64),
  evidenceCount:2, periodEntryCount:1, debitsCents:'335', creditsCents:'335',
  accounts:Object.keys(L.accounts).map(account=>({
    account, normalSide:creditNormal.includes(account)?'credit':'debit',
    openingCents:['cash','capital'].includes(account)?'10001':'0',
    debitsCents:account==='cash'?'335':'0', creditsCents:account==='income'?'335':'0',
    closingCents:({cash:'10336',capital:'10001',income:'335'})[account]||'0'
  }))
};
assert.deepEqual(L.statementTotals(report,context),report);
assert.deepEqual(L.reconcileCash(report,'+103.36'),{
  method:'manual_closing_cash_comparison',recordedCents:'10336',observedCents:'10336',
  differenceCents:'0',matches:true
});
assert.equal(L.reconcileCash(report,'103.37').differenceCents,'-1');
assert.equal(L.reconcileCash(report,'-3.37').differenceCents,'10673');
assert.equal(L.reconcileCash(report,'9007199254740991.01').observedCents,'900719925474099101');
for(const bad of ['1e2','0.001','1,000.00','', '1000000000000000000']){
  assert.throws(()=>L.reconcileCash(report,bad),/signed USD/);
}
assert.throws(()=>L.statementTotals(report,{...context,circleId:'other-circle'}),/Invalid external/);
assert.throws(()=>L.statementTotals({...report,debitsCents:'334'},context),/Invalid external/);
const badClosing=structuredClone(report);
badClosing.accounts[0].closingCents='10337';
assert.throws(()=>L.statementTotals(badClosing,context),/Invalid external/);
console.log('External journal statement validation and exact comparison passed');
