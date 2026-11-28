(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CommonLedger=api;})(globalThis,function(){'use strict';
const accounts=Object.freeze({cash:'External cash',investments:'Investments at recorded cost',receivables:'Receivables',payables:'Payables',capital:'Member capital (aggregate)',income:'Investment income',realized_gain:'Realized gain',realized_loss:'Realized loss',expenses:'Expenses'});
const debitNormal=new Set(['cash','investments','receivables','realized_loss','expenses']);
function amount(x){const v=String(x??'').trim();if(!/^\d{1,8}(\.\d{1,2})?$/.test(v))throw Error('Enter a positive USD amount with up to two decimals.');const [a,b='']=v.split('.'),n=Number(a)*100+Number(b.padEnd(2,'0'));if(n<1||n>1000000000)throw Error('Entry must be between $0.01 and $10 million.');return n;}
function validate(lines){if(!Array.isArray(lines)||lines.length<2||lines.length>12)throw Error('Provide 2–12 journal lines.');let d=0,c=0;const keys=new Set();for(const l of lines){if(!Object.hasOwn(accounts,l.account)||!['debit','credit'].includes(l.side)||!Number.isSafeInteger(l.cents)||l.cents<1||l.cents>1000000000)throw Error('Invalid journal line.');const key=l.account+'|'+l.side;if(keys.has(key))throw Error('Combine duplicate account/side lines.');keys.add(key);if(l.side==='debit')d+=l.cents;else c+=l.cents;}if(d!==c||d>1000000000)throw Error('Debit and credit totals must match, and total must not exceed $10 million.');if(new Set(lines.map(l=>l.account)).size<2)throw Error('Use at least two different accounts.');return d;}
function reverse(lines){validate(lines);return lines.map(l=>({account:l.account,side:l.side==='debit'?'credit':'debit',cents:l.cents}));}
function balances(rows){const totals=Object.fromEntries(Object.keys(accounts).map(k=>[k,0n]));for(const row of rows){validate(row.lines);for(const l of row.lines){const plus=l.side==='debit'===debitNormal.has(l.account);totals[l.account]+=BigInt(l.cents)*(plus?1n:-1n);}}return Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,v.toString()]));}
function money(c){let n=BigInt(c),neg=n<0n;if(neg)n=-n;const s=n.toString().padStart(3,'0');return (neg?'-':'')+'$'+s.slice(0,-2).replace(/\B(?=(\d{3})+(?!\d))/g,',')+'.'+s.slice(-2);}
function statementTotals(statement,{circleId,startDate,endDate}){
 const invalid=()=>new Error('Invalid external journal statement.');
 const cents=(value,signed=false)=>{
  if(typeof value!=='string'||!(/^-?\d{1,20}$/.test(value))||(!signed&&value.startsWith('-')))throw invalid();
  return BigInt(value);
 };
 if(statement?.schema!=='common.external-journal-statement.v1'||statement.currency!=='USD'||
  statement.circleId!==circleId||statement.startDate!==startDate||statement.endDate!==endDate||
  !Number.isFinite(Date.parse(statement.generatedAt))||typeof statement.evidenceSha256!=='string'||
  !/^[a-f0-9]{64}$/.test(statement.evidenceSha256)||!Number.isInteger(statement.evidenceCount)||
  statement.evidenceCount<0||statement.evidenceCount>10000||!Number.isInteger(statement.periodEntryCount)||
  statement.periodEntryCount<0||statement.periodEntryCount>statement.evidenceCount||
  !Array.isArray(statement.accounts)||statement.accounts.length!==Object.keys(accounts).length)throw invalid();
 const seen=new Set();
 let debits=0n,credits=0n,openingNet=0n;
 for(const row of statement.accounts){
  if(!row||!Object.hasOwn(accounts,row.account)||seen.has(row.account))throw invalid();
  seen.add(row.account);
  const debit=debitNormal.has(row.account),opening=cents(row.openingCents,true),dr=cents(row.debitsCents),cr=cents(row.creditsCents);
  if(row.normalSide!==(debit?'debit':'credit')||
     cents(row.closingCents,true)!==opening+(debit?dr-cr:cr-dr))throw invalid();
  debits+=dr;credits+=cr;openingNet+=debit?opening:-opening;
 }
 if(openingNet!==0n||debits!==credits||debits!==cents(statement.debitsCents)||credits!==cents(statement.creditsCents))throw invalid();
 return statement;
}
function reconcileCash(statement,observed){
 const value=observed.trim();
 if(!/^[+-]?\d{1,18}(\.\d{1,2})?$/.test(value))throw Error('Enter a signed USD amount with up to two decimals.');
 const [whole,fraction='']=value.replace(/^[+-]/,'').split('.');
 const observedCents=BigInt(whole+fraction.padEnd(2,'0'))*(value.startsWith('-')?-1n:1n);
 const recordedCents=BigInt(statement.accounts.find(row=>row.account==='cash').closingCents);
 const difference=recordedCents-observedCents;
 return {method:'manual_closing_cash_comparison',recordedCents:recordedCents.toString(),
  observedCents:observedCents.toString(),differenceCents:difference.toString(),matches:difference===0n};
}
return {accounts,amount,validate,reverse,balances,money,statementTotals,reconcileCash};});
