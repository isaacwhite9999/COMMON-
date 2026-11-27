const assert=require('node:assert/strict'),K=require('../docs/workspace/risk.js');const bars=Array.from({length:90},(_,i)=>({date:new Date(Date.UTC(2023,0,i+1)).toISOString().slice(0,10),close:100+i+Math.sin(i/3)*4}));const a={id:'a',label:'A',weight:.5,bars},b={id:'b',label:'B',weight:.5,bars:bars.map(x=>({...x,close:x.close*2}))};const r=K.analyze([a,b],{fee:0});assert.equal(r.observations,89);assert.ok(Math.abs(r.correlation[0][1]-1)<1e-10);assert.ok(Math.abs(r.assets.reduce((s,x)=>s+x.riskContribution,0)-1)<1e-10);assert.ok(Math.abs(r.netReturn-(bars.at(-1).close/bars[0].close-1))<1e-10);assert.ok(r.es95>=r.var95);const missing=K.analyze([a,{...b,bars:b.bars.filter((_,i)=>i!==40)}]);assert.equal(missing.observations,87);assert.throws(()=>K.analyze([a,{...b,weight:.8}]));assert.throws(()=>K.analyze([a,a]));console.log('Multi-asset risk and calendar alignment checks passed');
// QUANT-166: 15 intervals at +1% and 15 at -3%, with identical dates and weights.
// Independently known sample mean -1% and sample standard deviation 2% × sqrt(30/29).
let close=100;
const alternating=Array.from({length:31},(_,i)=>{
 if(i>0)close*=i%2?1.01:.97;
 return {date:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),close};
});
const twoAssets=[{...a,bars:alternating},{...b,bars:alternating}];
const result=K.analyze(twoAssets,{fee:20});
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-12,`${actual} != ${expected}`);
near(result.var95,.03);
near(result.es95,.03);
near(result.parametricVaR.dailyMean,-.01);
near(result.parametricVaR.dailyVolatility,.02*Math.sqrt(30/29));
near(result.parametricVaR.lossFraction,.04345945639702337);
assert.equal(result.parametricVaR.confidence,.95);
assert.equal(result.parametricVaR.horizonIntervals,1);
assert.deepEqual(result.parametricVaR,K.analyze(twoAssets,{fee:0}).parametricVaR,'Gaussian VaR is a gross risk measure');

const flatAssets=twoAssets.map(asset=>({...asset,bars:asset.bars.map(bar=>({...bar,close:100}))}));
assert.deepEqual(K.analyze(flatAssets).parametricVaR,
 {distribution:'gaussian',dailyMean:0,dailyVolatility:0,lossFraction:0,confidence:.95,horizonIntervals:1});
const risingAssets=twoAssets.map(asset=>({...asset,bars:asset.bars.map((bar,i)=>({...bar,close:100*1.01**i}))}));
assert.equal(K.analyze(risingAssets).parametricVaR.lossFraction,0,'A positive lower return quantile implies zero estimated loss');
