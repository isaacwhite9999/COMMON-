/* COMMON Research Engine v1. Independent, deterministic, no live market-data claims.
 * Browser/Node-compatible UMD module. Never executes uploaded user code.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.COMMON_RESEARCH_ENGINE = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'common-lab-v1';
  const DAYS = 252;
  const finite = x => Number.isFinite(x) ? x : null;
  const mean = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : 0;
  function std(a) {
    if (a.length < 2) return 0;
    const m=mean(a);
    return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));
  }
  function parseCsv(content) {
    if (typeof content !== 'string' || content.length > 16_000_000) throw Error('CSV must be a text file smaller than 16 MB.');
    let rows=[], row=[], cell='', quoted=false;
    const s=content.replace(/^\uFEFF/,'');
    for(let i=0;i<s.length;i++){
      const ch=s[i];
      if(ch==='"'){
        if(quoted && s[i+1]==='"'){cell+='"';i++;}
        else if(!quoted && cell===''){quoted=true;}
        else if(quoted){quoted=false;}
        else throw Error('Invalid CSV quoting.');
      } else if(ch===','&&!quoted){row.push(cell);cell='';}
      else if((ch==='\n'||ch==='\r')&&!quoted){
        if(ch==='\r'&&s[i+1]==='\n')i++;
        row.push(cell);cell='';
        if(row.some(x=>x.trim()!==''))rows.push(row);
        row=[];
        if(rows.length>100001)throw Error('CSV exceeds 100,000 data rows.');
      } else cell+=ch;
    }
    if(quoted)throw Error('CSV contains an unclosed quoted value.');
    if(cell!==''||row.length){row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);}
    if(rows.length<31)throw Error('At least 30 daily observations with a header are required.');
    const headers=rows.shift().map(x=>x.trim().toLowerCase().replace(/[\s_-]+/g,''));
    const dateIndex=headers.findIndex(x=>['date','timestamp','datetime','time'].includes(x));
    const priceIndex=headers.findIndex(x=>['close','closingprice','adjustedclose','adjclose'].includes(x));
    if(dateIndex<0||priceIndex<0)throw Error('CSV needs Date and Close columns (adjusted close is accepted).');
    if(dateIndex===priceIndex)throw Error('Date and Close must be separate columns.');
    const oIndex=headers.indexOf('open'),hIndex=headers.indexOf('high'),lIndex=headers.indexOf('low'),vIndex=headers.indexOf('volume');
    const data=[], seen=new Set();let wasSorted=true,last='';
    for(let j=0;j<rows.length;j++){
      const r=rows[j], date=(r[dateIndex]||'').trim().slice(0,10), priceStr=(r[priceIndex]||'').trim();
      if(!/^\d{4}-\d\d-\d\d$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||
        new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Invalid ISO date in row '+(j+2)+'. Use YYYY-MM-DD.');
      if(seen.has(date))throw Error('Duplicate trading date '+date+'. Remove duplicates rather than silently averaging.');
      if(last&&date<last)wasSorted=false;last=date;seen.add(date);
      if(!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(priceStr))throw Error('Invalid numeric Close in row '+(j+2)+'.');
      const close=Number(priceStr);
      if(!Number.isFinite(close)||close<=0||close>1e12)throw Error('Close must be a positive finite number in row '+(j+2)+'.');
      const bar={date,close};
      for(const [field,k] of [['open',oIndex],['high',hIndex],['low',lIndex],['volume',vIndex]]){
        if(k>=0 && (r[k]||'').trim()!==''){
          const n=Number((r[k]||'').trim());
          if(!Number.isFinite(n)||n<0)throw Error('Invalid '+field+' in row '+(j+2)+'.');
          bar[field]=n;
        }
      }
      data.push(bar);
    }
    data.sort((a,b)=>a.date.localeCompare(b.date));
    if(data.length<30)throw Error('Need at least 30 valid dated observations.');
    if(data.length>100000)throw Error('Too many observations (100,000 maximum).');
    const gaps=[];
    for(let i=1;i<data.length;i++){
      const delta=(Date.parse(data[i].date+'T00:00:00Z')-Date.parse(data[i-1].date+'T00:00:00Z'))/86400000;
      if(delta>7)gaps.push({from:data[i-1].date,to:data[i].date,days:delta});
    }
    const future=data[data.length-1].date>new Date().toISOString().slice(0,10);
    if(future)throw Error('Dataset contains future dates; cannot backtest unseen observations.');
    return {bars:data,diagnostics:{
      rows:data.length,first:data[0].date,last:data[data.length-1].date,
      sortedInput:wasSorted,largeGaps:gaps.slice(0,15),totalLargeGaps:gaps.length,
      hasAdjustedClose:['adjustedclose','adjclose'].includes(headers[priceIndex]),
      warning:'Daily adjusted close is preferred for stocks; raw close omits splits/dividends. Corporate actions and survivorship bias may distort results.'
    }};
  }
  function sma(bars,index,length){
    if(index<length-1)return null;
    let sum=0;
    for(let j=index-length+1;j<=index;j++)sum+=bars[j].close;
    return sum/length;
  }
  function stats(daily,riskFreeAnnual=0){
    if(!daily.length)return {totalReturn:null,annualReturn:null,annualVolatility:null,sharpe:null,maxDrawdown:null,finalEquity:1,observations:0};
    let equity=1,peak=1,minDrawdown=0;const curve=[1];
    for(const r of daily){equity*=Math.max(0,1+r);peak=Math.max(peak,equity);minDrawdown=Math.min(minDrawdown,peak>0?equity/peak-1:0);curve.push(equity);}
    const vol=std(daily)*Math.sqrt(DAYS);
    const excess=mean(daily)-(Math.pow(1+riskFreeAnnual,1/DAYS)-1);
    return {totalReturn:finite(equity-1),annualReturn:finite(equity>0?Math.pow(equity,DAYS/daily.length)-1:-1),
      annualVolatility:finite(vol),sharpe:finite(std(daily)>0?excess/std(daily)*Math.sqrt(DAYS):NaN),
      maxDrawdown:finite(minDrawdown),finalEquity:finite(equity),observations:daily.length,curve};
  }
  function validateSettings(settings,n){
    const strategy=settings.strategy||'sma_crossover';
    const fast=Number(settings.fast??10),slow=Number(settings.slow??30),
      costBps=Number(settings.costBps??10),holdout=Number(settings.holdout??0.3),
      riskFree=Number(settings.riskFree??0);
    if(!['sma_crossover','buy_hold'].includes(strategy))throw Error('Choose a supported strategy.');
    if(!Number.isInteger(fast)||!Number.isInteger(slow)||fast<2||slow<3||fast>=slow||slow>n-15)
      throw Error('Fast SMA must be at least 2, slower than the slow SMA, and allow at least 15 test bars.');
    if(!Number.isFinite(costBps)||costBps<0||costBps>1000)throw Error('Trading costs must be between 0 and 1,000 basis points.');
    if(!Number.isFinite(holdout)||holdout<0.15||holdout>0.5)throw Error('Holdout fraction must be 15–50%.');
    if(!Number.isFinite(riskFree)||riskFree<0||riskFree>0.5)throw Error('Risk-free rate must be between 0% and 50% annually.');
    return {strategy,fast,slow,costBps,holdout,riskFree};
  }
  function backtest(bars,settings={}){
    if(!Array.isArray(bars)||bars.length<30)throw Error('At least 30 observations required.');
    const p=validateSettings(settings,bars.length);
    const cut=Math.floor(bars.length*(1-p.holdout));
    if(cut<=p.slow+2)throw Error('Training window is too short for the slow average; supply more historical data.');
    const returns=[],benchmark=[],dates=[],positions=[],costs=[];
    let prior=0,priorBench=0;
    // Position for close(t-1)->close(t) comes from information at close(t-2).
    // Signals are lagged a full bar to avoid trading with an unavailable close price.
    for(let i=2;i<bars.length;i++){
      const fast=sma(bars,i-2,p.fast),slow=sma(bars,i-2,p.slow);
      const target=p.strategy==='buy_hold'?1:fast!==null&&slow!==null&&fast>slow?1:0;
      const day=bars[i].close/bars[i-1].close-1;
      const cost=Math.abs(target-prior)*p.costBps/10000;
      const benchCost=Math.abs(1-priorBench)*p.costBps/10000;
      returns.push(target*day-cost);
      benchmark.push(day-benchCost);
      dates.push(bars[i].date);positions.push(target);costs.push(cost);
      prior=target;priorBench=1;
    }
    const split=Math.max(0,cut-2);
    const train=stats(returns.slice(0,split),p.riskFree);
    const test=stats(returns.slice(split),p.riskFree);
    const baseline=stats(benchmark.slice(split),p.riskFree);
    const whole=stats(returns,p.riskFree);
    const trades=positions.reduce((n,x,i)=>n+(i===0?x:Math.abs(x-positions[i-1])),0);
    return {params:p,dates,returns,benchmark,positions,costs,train,test,baseline,whole,
      trainThrough:bars[cut-1].date,testFrom:bars[cut].date,
      turnover:trades,totalCostFraction:costs.reduce((s,x)=>s+x,0),
      warning:'Not a prediction. Uploaded data may be survivorship-biased, misadjusted or unsuitable. Daily close-to-close positions use two-close information lag, and costs model a flat basis-point charge.'};
  }
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
  function bootstrap(returns,{paths=300,seed=42,block=5}={}){
    if(!Array.isArray(returns)||returns.length<15)throw Error('Need at least 15 holdout returns for bootstrap analysis.');
    if(!Number.isInteger(paths)||paths<50||paths>1000)throw Error('Use 50–1000 simulations.');
    const rng=mulberry32(seed>>>0),out=[];
    for(let p=0;p<paths;p++){
      const sample=[];while(sample.length<returns.length){
        const idx=Math.floor(rng()*returns.length);
        for(let k=0;k<block&&sample.length<returns.length;k++)sample.push(returns[(idx+k)%returns.length]);
      }
      out.push(stats(sample).totalReturn);
    }
    out.sort((a,b)=>a-b);
    const percentile=q=>out[Math.floor((out.length-1)*q)];
    return {method:'seeded circular block bootstrap',seed,paths,block,percentiles:{
      p05:percentile(.05),p50:percentile(.5),p95:percentile(.95)},
      probabilityOfLoss:out.filter(x=>x<0).length/out.length,
      caution:'Resampling historical returns is an illustrative distribution, not a forecast. It does not model unknown regime shifts, liquidity crises, fat tails or market impact.'};
  }
  return {VERSION,parseCsv,validateSettings,backtest,bootstrap,stats};
}));
