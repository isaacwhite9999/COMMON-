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

// Orthogonal signs in every four matched intervals give zero covariance.
// Daily means 0.1% and 0.3%, daily sample variances .01^2*32/31 and .02^2*32/31.
const count=32;
const fixtures=[
 {id:'low',label:'Low variance',weight:.5},
 {id:'high',label:'High variance',weight:.5},
].map((asset,k)=>{
 let price=100;
 return {...asset,bars:Array.from({length:count+1},(_,i)=>{
  if(i){
   const sign=(k===0?[1,1,-1,-1]:[1,-1,1,-1])[(i-1)%4];
   price*=1+(k===0?.001:.003)+(k===0?.01:.02)*sign;
  }
  return {date:new Date(Date.UTC(2024,0,i+1)).toISOString().slice(0,10),close:price};
 })};
});
const allocation=K.optimize(fixtures);
const varA=.01**2*32/31*252,varB=.02**2*32/31*252,ridge=(varA+varB)/2*1e-6;
const weightA=(varB+ridge)/(varA+varB+2*ridge);
near(allocation.covariance[0][0],varA+ridge);
near(allocation.covariance[0][1],0);
near(allocation.optimized.weights[0],weightA);
near(allocation.optimized.annualVolatility,Math.sqrt(weightA**2*(varA+ridge)+(1-weightA)**2*(varB+ridge)));
near(allocation.current.annualReturn,.504);
assert.equal(allocation.first,'2024-01-01');
assert.equal(allocation.last,'2024-02-02');
assert.equal(allocation.observations,32);
assert.equal(allocation.frontier.length,7);
near(allocation.frontier.at(-1).weights[1],1);
assert.ok(allocation.frontier.every((point,i)=>i===0||point.annualVolatility>allocation.frontier[i-1].annualVolatility));

const bounded=K.optimize(fixtures,{minimum:.2,maximum:.6,covarianceModel:'shrinkage'});
near(bounded.optimized.weights[0],.6);
near(bounded.frontier.at(-1).weights[1],.6);
const floored=K.optimize(fixtures,{minimum:.3});
near(floored.optimized.weights[1],.3);
near(K.optimize(fixtures,{objective:'target-return',target:.504}).optimized.weights[0],.5);
assert.deepEqual(K.optimize(fixtures,{objective:'target-return',target:0}).optimized,allocation.optimized);
assert.throws(()=>K.optimize(fixtures,{objective:'target-return',target:.9}), /feasible sample maximum/);
assert.throws(()=>K.optimize(fixtures,{minimum:.6}), /must allow/);
assert.throws(()=>K.optimize(fixtures,{maximum:.4}), /must allow/);
assert.throws(()=>K.optimize([{...fixtures[0],weight:.8},fixtures[1]]), /Current weights/);
assert.throws(()=>K.optimize(flatAssets), /nonzero historical variance/);
const identical=K.optimize([fixtures[0],{...fixtures[1],bars:fixtures[0].bars}]);
assert.ok(Math.abs(identical.optimized.weights[0]-.5)<1e-10);
assert.equal(identical.frontier.length,1);
const correlated=K.optimize(twoAssets,{covarianceModel:'shrinkage'});
near(correlated.covariance[0][1],.8*K.optimize(twoAssets).covariance[0][1]);
console.log('Known-answer frontier, bounded allocations, shrinkage and malformed scenarios passed');
