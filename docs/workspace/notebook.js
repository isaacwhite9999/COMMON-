(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CommonNotebook=api;})(globalThis,function(){'use strict';
const VERSION='common-notebook-v1';
const kinds={note:'Research note',python:'Python code',profile:'Dataset profile',returns:'Return distribution',drawdown:'Drawdown analysis',backtest:'Strategy backtest'};
const CELL_TEXT_LIMIT=10000;
const needsDataset=kind=>kind!=='note'&&kind!=='python';
const list=p=>Array.isArray(p.notebook)?p.notebook:[];
function clean(d){const kind=String(d.kind),title=String(d.title??'').trim(),source=String(d.text??''),text=kind==='python'?source:source.trim(),dataset=String(d.dataset??'');if(!Object.hasOwn(kinds,kind)||!title||title.length>120||text.length>CELL_TEXT_LIMIT)throw Error('Invalid cell title, type or content.');if(kind==='python'&&!text.trim())throw Error('Provide Python source.');if(needsDataset(kind)&&!/^[a-f0-9]{64}$/.test(dataset))throw Error('Select a saved dataset.');const config={};if(kind==='backtest'){for(const k of ['fast','slow','fee','holdout']){const n=Number(d[k]);if(d[k]===''||d[k]==null||!Number.isFinite(n))throw Error('Invalid backtest parameter.');config[k]=n;}if(!Number.isInteger(config.fast)||!Number.isInteger(config.slow)||config.fast<2||config.slow<=config.fast||config.slow>500||config.fee<0||config.fee>1000||config.holdout<15||config.holdout>50)throw Error('Use valid SMA windows, costs and holdout.');}return {kind,title,text,dataset:needsDataset(kind)?dataset:'',config};}
function write(p,d,id){const cells=list(p),existing=id?cells.find(x=>x.id===id):null;if(id&&!existing)throw Error('Cell not found.');if(!id&&cells.length>=20)throw Error('Maximum 20 cells per notebook.');const v=clean(d),old=existing?{kind:existing.kind,title:existing.title,text:existing.text,dataset:existing.dataset,config:existing.config}:null,changed=JSON.stringify(old)!==JSON.stringify(v);const cell={...v,id:id||crypto.randomUUID(),updated:new Date().toISOString(),output:changed?null:existing.output};return {...p,notebook:id?cells.map(x=>x.id===id?cell:x):[...cells,cell]};}
function move(p,id,delta){const cells=list(p).slice(),i=cells.findIndex(x=>x.id===id),j=i+delta;if(i<0||![-1,1].includes(delta)||j<0||j>=cells.length)return p;[cells[i],cells[j]]=[cells[j],cells[i]];return {...p,notebook:cells};}
function remove(p,id){return {...p,notebook:list(p).filter(x=>x.id!==id)};}
function recordPython(project,snapshot,request,result){
  const current=list(project).find(cell=>cell.id===snapshot.id);
  if(current?.kind!=='python'||current.updated!==snapshot.updated||current.text!==request.code)
    throw Error('The cell changed during execution. No output was saved.');
  const output={
    ok:result.ok,
    output:result.output,
    truncated:result.truncated,
    version:result.version,
    at:result.at,
    libs:request.libs,
    ...(result.environment?{environment:result.environment}:{}),
  };
  return {...project,notebook:list(project).map(cell=>cell.id===current.id?{...cell,output}:cell)};
}
const quantile=(a,q)=>{const i=(a.length-1)*q,j=Math.floor(i);return a[j]+(a[Math.min(j+1,a.length-1)]-a[j])*(i-j);};
function analyze(cell,parsed,engine){if(!needsDataset(cell.kind))throw Error('A dataset analysis cell is required.');const bars=parsed.bars;if(!Array.isArray(bars)||bars.length<30||bars.length>20000)throw Error('Notebook cells support 30–20,000 daily observations.');const start=bars[0],end=bars.at(-1),returns=bars.slice(1).map((b,i)=>b.close/bars[i].close-1);if(returns.some(x=>!Number.isFinite(x)))throw Error('Invalid return series.');const n=returns.length,mean=returns.reduce((s,x)=>s+x,0)/n,sd=Math.sqrt(returns.reduce((s,x)=>s+(x-mean)**2,0)/(n-1));const sorted=returns.slice().sort((a,b)=>a-b),pairs=[];
let out={};switch(cell.kind){
case 'profile':out={metrics:[['Observations',bars.length,'count'],['First date',start.date,'text'],['Last date',end.date,'text'],['First close',start.close,'number'],['Last close',end.close,'number'],['Missing calendar gaps > 7 days',parsed.diagnostics.totalLargeGaps,'count'],['Adjusted close declared',parsed.diagnostics.hasAdjustedClose?'Yes':'No','text']],warning:'Source quality and corporate actions are not independently verified.'};break;
case 'returns':{const bins=Array.from({length:16},(_,i)=>({lo:sorted[0]+i*(sorted.at(-1)-sorted[0])/16,hi:sorted[0]+(i+1)*(sorted.at(-1)-sorted[0])/16,count:0}));for(const v of returns){const index=sorted.at(-1)===sorted[0]?0:Math.min(15,Math.floor(16*(v-sorted[0])/(sorted.at(-1)-sorted[0])));bins[index].count++;}out={metrics:[['Mean daily return',mean,'pct'],['Annualized volatility',sd*Math.sqrt(252),'pct'],['Daily 5th percentile',quantile(sorted,.05),'pct'],['Median daily return',quantile(sorted,.5),'pct'],['Daily 95th percentile',quantile(sorted,.95),'pct'],['Positive intervals',returns.filter(r=>r>0).length/n,'pct']],histogram:bins,warning:'Historical simple returns; annualization assumes 252 observations per year. Missing intervals and corporate actions may distort estimates.'};break;}
case 'drawdown':{let peak=start.close,peakDate=start.date,worst=0,episodePeak=start.date,trough=start.date,recovery=null;for(const b of bars){if(b.close>peak){peak=b.close;peakDate=b.date;}const d=b.close/peak-1;pairs.push(d);if(d<worst){worst=d;episodePeak=peakDate;trough=b.date;recovery=null;}else if(!recovery&&b.date>trough&&d===0)recovery=b.date;}out={metrics:[['Maximum drawdown',worst,'pct'],['Peak date',worst<0?episodePeak:'None','text'],['Trough date',worst<0?trough:'None','text'],['Recovery date',worst<0?(recovery||'Not recovered within sample'):'None','text']],series:pairs,warning:'Drawdown uses observed closing prices, not intraday prices or investment returns after fees.'};break;}
case 'backtest':{const r=engine.backtest(bars,{strategy:'sma_crossover',fast:cell.config.fast,slow:cell.config.slow,costBps:cell.config.fee,holdout:cell.config.holdout/100});out={metrics:[['Holdout strategy return',r.test.totalReturn,'pct'],['Holdout benchmark return',r.baseline.totalReturn,'pct'],['Holdout Sharpe',r.test.sharpe,'number'],['Holdout drawdown',r.test.maxDrawdown,'pct'],['Holdout begins',r.testFrom,'text']],curves:{strategy:r.test.curve,benchmark:r.baseline.curve},warning:r.warning};break;}
default:throw Error('Unsupported dataset analysis cell.');}
return {...out,version:VERSION,at:new Date().toISOString(),dataset:cell.dataset,observations:n};}
return {VERSION,CELL_TEXT_LIMIT,kinds,needsDataset,list,clean,write,move,remove,recordPython,analyze};});
