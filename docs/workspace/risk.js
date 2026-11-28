(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CommonRisk=api;})(globalThis,function(){'use strict';
const VERSION='common-risk-v1.2',mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const NORMAL_95_QUANTILE=1.6448536269514722;

function gaussianVaR95(returns){
 const dailyMean=mean(returns);
 const dailyVolatility=Math.sqrt(returns.reduce((sum,value)=>sum+(value-dailyMean)**2,0)/(returns.length-1));
 const lossFraction=Math.max(0,NORMAL_95_QUANTILE*dailyVolatility-dailyMean);
 if(!Number.isFinite(lossFraction))throw Error('Gaussian VaR is outside the supported numeric range.');
 return {distribution:'gaussian',dailyMean,dailyVolatility,lossFraction,confidence:.95,horizonIntervals:1};
}
function alignedMoments(assets){
if(!Array.isArray(assets)||assets.length<2||assets.length>8)throw Error('Choose two to eight distinct datasets.');if(new Set(assets.map(a=>a.id)).size!==assets.length)throw Error('Datasets must be distinct.');
const maps=assets.map(a=>{if(!Array.isArray(a.bars)||a.bars.length<30||a.bars.length>20000)throw Error('Each dataset needs 30–20,000 observations.');const m=new Map();let prev='';for(let i=0;i<a.bars.length;i++){const b=a.bars[i];if(!Number.isFinite(b.close)||b.close<=0||typeof b.date!=='string'||b.date<=prev)throw Error('Invalid or unsorted prices.');prev=b.date;if(i>0){const r=b.close/a.bars[i-1].close-1;if(!Number.isFinite(r))throw Error('Return is outside the supported numeric range.');m.set(b.date,{previous:a.bars[i-1].date,r});}}return m;});
// Only compare returns with identical start AND end dates; no forward filling.
const dates=[...maps[0].keys()].filter(d=>maps.every(m=>m.has(d)&&m.get(d).previous===maps[0].get(d).previous));if(dates.length<30)throw Error('Fewer than 30 matching daily return intervals. Check date coverage and trading calendars.');
const rows=maps.map(m=>dates.map(d=>m.get(d).r));const averages=rows.map(mean);const cov=rows.map((a,i)=>rows.map((b,j)=>a.reduce((s,v,k)=>s+(v-averages[i])*(b[k]-averages[j]),0)/(dates.length-1)));
if(cov.some(row=>row.some(v=>!Number.isFinite(v))))throw Error('Covariance is outside the supported numeric range.');
return {dates,rows,averages,cov,first:maps[0].get(dates[0]).previous};
}
function analyze(assets,opts={}){
const {dates,rows,cov}=alignedMoments(assets);
const weights=assets.map(a=>Number(a.weight));if(weights.some(w=>!Number.isFinite(w)||w<0||w>1)||Math.abs(weights.reduce((a,b)=>a+b,0)-1)>1e-8)throw Error('Long-only target weights must sum to 100%.');
const fee=Number(opts.fee??10),capital=Number(opts.capital??100000),rf=Number(opts.rf??0);if(!Number.isFinite(fee)||fee<0||fee>1000||!Number.isFinite(capital)||capital<=0||capital>1e12||!Number.isFinite(rf)||rf<0||rf>.5)throw Error('Invalid cost, capital or risk-free assumptions.');
const corr=cov.map((row,i)=>row.map((v,j)=>cov[i][i]>0&&cov[j][j]>0?Math.max(-1,Math.min(1,v/(Math.sqrt(cov[i][i])*Math.sqrt(cov[j][j])))):null));
const p=dates.map((_,i)=>rows.reduce((s,r,j)=>s+weights[j]*r[i],0));const variance=Math.max(0,weights.reduce((s,w,i)=>s+w*cov[i].reduce((t,v,j)=>t+v*weights[j],0),0));const vol=Math.sqrt(variance)*Math.sqrt(252);
const contributions=weights.map((w,i)=>variance>0?w*cov[i].reduce((s,v,j)=>s+v*weights[j],0)/variance:null);
const sorted=p.slice().sort((a,b)=>a-b),tail=sorted.slice(0,Math.max(1,Math.ceil(.05*sorted.length)));const var95=Math.max(0,-tail[tail.length-1]),es95=Math.max(0,-mean(tail));
let equity=1-fee/10000,peak=1,drawdown=Math.min(0,equity-1),curve=[1],turnover=0;for(let t=0;t<dates.length;t++){const r=p[t];if(r<=-1)throw Error('Portfolio exhausted.');const drift=weights.map((w,i)=>w*(1+rows[i][t])/(1+r));const traded=drift.reduce((s,w,i)=>s+Math.abs(w-weights[i]),0);turnover+=traded;equity*=((1+r)*(1-traded*fee/10000));if(!Number.isFinite(equity))throw Error('Compounded equity is outside the supported numeric range.');peak=Math.max(peak,equity);drawdown=Math.min(drawdown,equity/peak-1);curve.push(equity);}
return {version:VERSION,assets:assets.map((a,i)=>({id:a.id,label:a.label,weight:weights[i],annualVol:Math.sqrt(cov[i][i]*252),riskContribution:contributions[i]})),observations:dates.length,dates,correlation:corr,covariance:cov,annualVolatility:vol,grossAnnualMean:mean(p)*252,sharpe:vol>0?(mean(p)-((1+rf)**(1/252)-1))*252/vol:null,var95,es95,parametricVaR:gaussianVaR95(p),capital,fee,rf,turnover,netReturn:equity-1,maxDrawdown:drawdown,curve,warning:'Historical daily arithmetic risk estimates, not forecasts. Only identical dated return intervals are aligned; missing intervals are excluded, so compounded results omit them. Annualization assumes 252 observations per year. Historical VaR/ES use gross daily returns and a 5% empirical lower tail; losses can exceed both. Long-only target weights are reset after each included interval; proportional fees include initial allocation and subsequent gross traded notional. No liquidity, tax, market impact or verified corporate actions.'};}
const OPTIMIZER_VERSION='common-allocation-v1';
const COVARIANCE_MODELS={sample:0,shrinkage:.2};
const WEIGHT_TOLERANCE=1e-8;
const dot=(a,b)=>a.reduce((sum,value,i)=>sum+value*b[i],0);
const quadratic=(matrix,weights)=>dot(weights,matrix.map(row=>dot(row,weights)));

function solveSystem(matrix,right){
 const rows=matrix.map((row,i)=>[...row,right[i]]),n=rows.length;
 for(let col=0;col<n;col++){
  let pivot=col;
  for(let i=col+1;i<n;i++)if(Math.abs(rows[i][col])>Math.abs(rows[pivot][col]))pivot=i;
  if(Math.abs(rows[pivot][col])<1e-12)return null;
  [rows[col],rows[pivot]]=[rows[pivot],rows[col]];
  const scale=rows[col][col];
  for(let j=col;j<=n;j++)rows[col][j]/=scale;
  for(let i=0;i<n;i++){
   if(i===col)continue;
   const factor=rows[i][col];
   for(let j=col;j<=n;j++)rows[i][j]-=factor*rows[col][j];
  }
 }
 return rows.map(row=>row[n]);
}

// With at most eight assets, enumerate each free/lower/upper allocation face.
// On each feasible face, solve the equality-constrained stationary point.
function minimumVariance(matrix,lower,upper,returns,target){
 const n=returns.length,free=[],fixed=[],weights=new Array(n).fill(0);
 let best=null,bestVariance=Infinity;
 function evaluate(remaining,remainingReturn){
  const count=free.length;
  if(remaining<count*lower-WEIGHT_TOLERANCE||remaining>count*upper+WEIGHT_TOLERANCE)return;
  if(count){
   const first=returns[free[0]],constant=free.every(i=>Math.abs(returns[i]-first)<1e-12);
   if(target!==null&&constant&&Math.abs(remainingReturn-remaining*first)>WEIGHT_TOLERANCE)return;
   const constraints=[free.map(()=>1)],limits=[remaining];
   if(target!==null&&!constant){constraints.push(free.map(i=>returns[i]));limits.push(remainingReturn);}
   const coefficients=free.map((i,k)=>[...free.map(j=>matrix[i][j]),...constraints.map(row=>row[k])]);
   coefficients.push(...constraints.map(row=>[...row,...constraints.map(()=>0)]));
   const right=free.map(i=>-fixed.reduce((sum,j)=>sum+matrix[i][j]*weights[j],0)).concat(limits);
   const solved=solveSystem(coefficients,right);
   if(!solved)return;
   for(let k=0;k<count;k++){
    const w=solved[k];
    if(!Number.isFinite(w)||w<lower-WEIGHT_TOLERANCE||w>upper+WEIGHT_TOLERANCE)return;
    weights[free[k]]=Math.max(lower,Math.min(upper,w));
   }
  }
  if(target!==null&&Math.abs(dot(returns,weights)-target)>WEIGHT_TOLERANCE)return;
  if(Math.abs(weights.reduce((a,b)=>a+b,0)-1)>WEIGHT_TOLERANCE)return;
  const variance=quadratic(matrix,weights);
  if(variance<bestVariance){bestVariance=variance;best=weights.slice();}
 }
 function enumerate(i,remaining,remainingReturn){
  if(i===n){evaluate(remaining,remainingReturn);return;}
  free.push(i);enumerate(i+1,remaining,remainingReturn);free.pop();
  fixed.push(i);
  for(const boundary of lower===upper?[lower]:[lower,upper]){
   weights[i]=boundary;
   enumerate(i+1,remaining-boundary,remainingReturn-boundary*returns[i]);
  }
  fixed.pop();
 }
 enumerate(0,1,target);
 if(!best)throw Error('No stable allocation found for these constraints.');
 return best;
}

function optimize(assets,options={}){
 const {objective='minimum-variance',covarianceModel='sample',minimum=0,maximum=1,target=null}=options;
 if(!['minimum-variance','target-return'].includes(objective)||!Object.hasOwn(COVARIANCE_MODELS,covarianceModel))throw Error('Choose a supported objective and covariance model.');
 const {dates,averages,cov,first}=alignedMoments(assets),n=assets.length;
 if(!Number.isFinite(minimum)||!Number.isFinite(maximum)||minimum<0||maximum>1||minimum>maximum||
    minimum*n>1+WEIGHT_TOLERANCE||maximum*n<1-WEIGHT_TOLERANCE)throw Error('Weight bounds must allow the selected assets to sum to 100%.');
 const current=assets.map(asset=>asset.weight);
 if(current.some(w=>!Number.isFinite(w)||w<0||w>1)||Math.abs(current.reduce((a,b)=>a+b,0)-1)>WEIGHT_TOLERANCE)throw Error('Current weights must sum to 100%.');
 if(objective==='target-return'&&!Number.isFinite(target))throw Error('Enter an annual return target.');
 const annualReturns=averages.map(x=>252*x);
 const annualSample=cov.map(row=>row.map(x=>252*x)),scale=mean(annualSample.map((row,i)=>row[i]));
 if(!Number.isFinite(scale)||scale<=0||annualReturns.some(x=>!Number.isFinite(x)))throw Error('Portfolio optimization requires a finite, nonzero historical variance.');
 const shrinkage=COVARIANCE_MODELS[covarianceModel],ridge=1e-6;
 const normalized=annualSample.map((row,i)=>row.map((x,j)=>i===j?x/scale+ridge:(1-shrinkage)*x/scale));
 const covariance=normalized.map(row=>row.map(x=>x*scale));
 const high=Math.max(...annualReturns),low=Math.min(...annualReturns),span=high-low;
 if(!Number.isFinite(span))throw Error('Annual returns are outside the supported numeric range.');
 const returns=annualReturns.map(x=>span>1e-12?(x-low)/span:0);
 const minWeights=minimumVariance(normalized,minimum,maximum,returns,null);
 const ordered=returns.map((_,i)=>i).sort((a,b)=>returns[b]-returns[a]);
 let remaining=1-n*minimum;
 const maxWeights=new Array(n).fill(minimum);
 for(const i of ordered){
  const increase=Math.max(0,Math.min(remaining,maximum-minimum));
  maxWeights[i]+=increase;
  remaining-=increase;
 }
 const minReturn=dot(returns,minWeights),maxReturn=Math.max(minReturn,dot(returns,maxWeights));
 function point(weights){
  const annualVolatility=Math.sqrt(Math.max(0,quadratic(normalized,weights)))*Math.sqrt(scale);
  return {weights,annualVolatility,annualReturn:dot(annualReturns,weights)};
 }
 const frontier=[point(minWeights)];
 if(maxReturn-minReturn>WEIGHT_TOLERANCE){
  for(let i=1;i<=6;i++){
   const required=minReturn+(maxReturn-minReturn)*i/6;
   frontier.push(point(minimumVariance(normalized,minimum,maximum,returns,required)));
  }
 }
 let optimized=frontier[0];
 if(objective==='target-return'){
  const required=span>1e-12?(target-low)/span:0;
  const highest=dot(annualReturns,maxWeights);
  if(target>highest+1e-10*Math.max(1,Math.abs(highest)))throw Error('The annual return target exceeds the feasible sample maximum.');
  if(required>minReturn+WEIGHT_TOLERANCE)optimized=point(minimumVariance(normalized,minimum,maximum,returns,Math.min(required,maxReturn)));
 }
 return {
  version:OPTIMIZER_VERSION,objective,covarianceModel,shrinkage,ridge,minimum,maximum,
  target:objective==='target-return'?target:null,
  observations:dates.length,first,last:dates.at(-1),annualization:252,
  assets:assets.map(({id,label,bars,adjustedClose},i)=>({
   id,label,priceBasis:adjustedClose===true?'adjusted-close':adjustedClose===false?'close':'unspecified',
   availableIntervals:bars.length-1,annualReturn:annualReturns[i],
  })),
  covariance,current:point(current),optimized,frontier,
 };
}
return {analyze,optimize,VERSION,OPTIMIZER_VERSION};});
