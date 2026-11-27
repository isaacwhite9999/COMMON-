(()=>{'use strict';
const M=CommonModel,E=COMMON_RESEARCH_ENGINE,R=CommonReport,F=CommonFiles,D=CommonData,K=CommonRisk,N=CommonNotebook,P=CommonPython,key='common-workspace-v1',app=document.querySelector('#app'),dialog=document.querySelector('#dialog'),notice=document.querySelector('#notice');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(x),pct=x=>Number.isFinite(x)?(100*x).toFixed(2)+'%':'—',day=x=>new Date(x).toLocaleDateString();
let s,blocked=false;try{s=M.load(localStorage.getItem(key));}catch(e){s=M.initial();blocked=true;}
const groups=[['RESEARCH',[['home','Overview'],['markets','Market intelligence'],['datasets','Dataset library'],['research','Research projects'],['portfolio','Portfolio laboratory'],['risk','Multi-asset risk']]],['OWNERSHIP',[['ownership','Shareholder intelligence'],['collectives','Investment collectives'],['social','Member network'],['venture','Private capital']]],['PREFERENCES',[['settings','Settings']]]],routes=groups.flatMap(g=>g[1]);
const a=(r,t,c='')=>'<a class="'+c+'" href="#'+esc(r)+'">'+esc(t)+'</a>',b=(id,t,c='')=>'<button type="button" data-act="'+esc(id)+'" class="'+c+'">'+esc(t)+'</button>',external=(url,t)=>'<a href="'+url+'">'+esc(t)+' ↗</a>';
const section=(t,c)=>'<section class="panel"><h2>'+esc(t)+'</h2>'+c+'</section>',head=(t,d)=>'<div class="head"><span class="eyebrow">COMMON / Ownership workspace</span><h1>'+esc(t)+'</h1><p>'+esc(d)+'</p></div>';
const tabs=(base,items,cur)=>'<nav class="tabs" aria-label="Section navigation">'+items.map(([k,t])=>a(base+'/'+k,t,cur===k?'active':'')).join('')+'</nav>';
const table=(heads,rows)=>'<div class="tablewrap"><table><thead><tr>'+heads.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
const empty=t=>'<p class="muted">'+esc(t)+'</p>';
const note='<div class="note">Browser-local research and simulation. No real capital, orders, verified holdings or proxy submissions. Shared member activity uses the existing authenticated community.</div>';
const field=(n,t,v='',type='text')=>'<label>'+esc(t)+'<input name="'+n+'" type="'+type+'" value="'+esc(v)+'" required></label>';
const area=(n,t,v='')=>'<label>'+esc(t)+'<textarea name="'+n+'" maxlength="10000">'+esc(v)+'</textarea></label>';
const select=(n,t,opts,v)=>'<label>'+esc(t)+'<select name="'+n+'">'+opts.map(([k,x])=>'<option value="'+esc(k)+'" '+(k===v?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></label>';
const form=(id,body,submit='Save')=>'<form data-form="'+esc(id)+'">'+body+'<button class="primary">'+esc(submit)+'</button></form>';
function toast(t){notice.textContent=t;notice.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>notice.style.display='none',4500);}
function save(v){if(blocked)throw Error('Stored data could not be read. Export or reset it first.');localStorage.setItem(key,JSON.stringify(v));s=v;render();}
function render(){const p=location.hash.slice(1).split('/');const page=routes.find(r=>r[0]===p[0])||routes[0];document.body.dataset.theme=s.settings.theme;document.body.dataset.density=s.settings.density;app.innerHTML='<div class="shell"><aside class="side" id="side"><a class="brand" href="#home"><span class="mark">C.</span>COMMON</a>'+groups.map(([t,rs])=>'<nav aria-label="'+t+'"><span class="eyebrow">'+t+'</span>'+rs.map(([k,v])=>a(k,v,'nav '+(page[0]===k?'active':''))).join('')+'</nav>').join('')+'<div class="foot">Institutional intelligence.<br>Collective ownership.<br>'+external('../live/','Member sign-in')+'</div></aside><div><header class="top"><button class="mobile" data-act="menu" aria-label="Navigation">☰</button><span class="crumb muted">Workspace / '+esc(page[1])+'</span>'+b('search','Search workspace · Ctrl K','search')+'<span class="mode">RESEARCH / SIMULATION</span></header><main id="main" class="main" tabindex="-1">'+(blocked?'<p class="note">Stored data invalid. Export or reset in Settings / Data.</p>':'')+view(page[0],p[1],p[2],p[3],p[4])+'</main></div></div>';CommonEditor.enhance(app);syncPythonControls();}
let projectSearch='',projectStatus='active';
function projectRows(){
 const query=projectSearch.trim().toLocaleLowerCase();
 const projects=s.projects.filter(project=>(projectStatus==='all'||(projectStatus==='archived')===Boolean(project.archived))&&
  (project.name.toLocaleLowerCase().includes(query)||String(project.notes||'').toLocaleLowerCase().includes(query)));
 return projects.length?table(['Project','Runs','Status','Updated'],projects.map(project=>[
  a('research/'+project.id+'/notes',project.name),project.runs.length,project.archived?'Archived':'Active',day(project.updated)
 ])):empty('No projects match the current filters.');
}
function view(page,sub,id,detail,reportTab){switch(page){
case 'home':return head('The market belongs to everyone.','Research the business. Understand the risk. Participate as an informed owner.')+note+'<div class="grid">'+section('Research pipeline','<span class="metric">'+s.projects.length+'</span>'+a('research','Open project library →'))+section('Simulation cash','<span class="metric">'+money(s.cash)+'</span>'+a('portfolio','Inspect hypothetical portfolio →'))+section('Market intelligence',external('../terminal/','Open existing financial terminal')+empty('Macro, equities, derivatives, quantitative tools.'))+section('Ownership network',external('../live/','Open authenticated community')+empty('Research groups, discussions and nonbinding polls.'))+'</div>';
case 'markets':{let t=sub==='sources'?'sources':sub==='terminal'?'terminal':'watch';return head('Market intelligence','Follow evidence, not the narrative.')+tabs('markets',[['watch','Watchlist'],['sources','Primary sources'],['terminal','Financial terminal']],t)+(t==='watch'?section('Tracked symbols',form('watch',field('symbol','Ticker'),'Add symbol')+(s.watch.length?table(['Ticker','Filings','Actions'],s.watch.map(x=>[esc(x),'<a href="https://www.sec.gov/edgar/search/#/q='+encodeURIComponent(x)+'" target="_blank" rel="noopener noreferrer">EDGAR ↗</a>',b('unwatch:'+x,'Remove')])):empty('No tracked symbols.'))):t==='sources'?section('Source directory',external('https://www.sec.gov/edgar/search/','SEC EDGAR')+external('https://fiscaldata.treasury.gov/','US Treasury Fiscal Data')+external('https://fred.stlouisfed.org/','Federal Reserve Economic Data')):section('Financial analytics',external('../terminal/','Open existing terminal')));}
case 'datasets':return datasetDesk(sub,id);
case 'risk':return riskDesk(sub,id);
case 'research':{const p=s.projects.find(x=>x.id===sub);if(!p)return head('Research projects','Develop a falsifiable hypothesis and preserve the evidence.')+
section('Project library',form('project',field('name','Project name')+select('template','Starting template',[['blank','Blank'],['strategy','Strategy evaluation'],['risk','Portfolio risk']],'blank'),'Create project')+
'<label>Search projects<input type="search" id="project-search" value="'+esc(projectSearch)+'"></label>'+
select('project-status','Project status',[['active','Active'],['archived','Archived'],['all','All']],projectStatus)+
'<div id="project-results">'+projectRows()+'</div>')+
section('Project portability',empty('Source bundles contain notes, source files and revisions. Datasets, computed results and account permissions stay in their current stores.')+
form('import-project','<label>Project source bundle<input type="file" name="bundle" accept=".json,application/json" required></label>','Import source bundle'))+
section('Advanced quantitative tools',external('../lab/','Open existing research studio'));
const t=['notes','backtest','runs','manage','compare','files','validation','notebook','python'].includes(id)?id:'notes',base='research/'+p.id;let c='';
if(t==='python')c=pythonDesk(p,detail);if(t==='notebook')c=notebookDesk(p,detail);if(t==='files')c=fileDesk(p,detail);if(t==='validation')c=validationDesk(p,detail,reportTab);
if(t==='notes')c=section('Research thesis',form('notes:'+p.id,area('notes','Hypothesis, sources, risk and falsification criteria',p.notes)));
if(t==='backtest')c=section('Backtest configuration',empty('Upload dated historical CSV. Existing research engine applies lagged signals, fees and chronological holdout.')+form('run:'+p.id,''+datasetInput('Historical data CSV')+''+select('strategy','Strategy',[['sma_crossover','SMA crossover'],['buy_hold','Buy and hold']],'sma_crossover')+'<div class="grid">'+field('fast','Fast SMA',10,'number')+field('slow','Slow SMA',30,'number')+field('fee','Trading cost (bps)',s.settings.fee,'number')+field('holdout','Holdout (%)',s.settings.holdout,'number')+'</div>','Run backtest'));
if(t==='runs')c=section('Execution history',p.runs.length?table(['Run','Holdout return','Sharpe','Drawdown',''],p.runs.map((r,i)=>[day(r.at),pct(r.test.totalReturn),r.test.sharpe==null?'—':r.test.sharpe.toFixed(2),pct(r.test.maxDrawdown),b('inspect:'+p.id+':'+i,'Inspect')])):empty('No completed runs.'));
if(t==='compare')c=section('Holdout comparison',p.runs.length?table(['Run','Strategy return','Benchmark return','Excess return','Sharpe','Drawdown'],p.runs.map((r,i)=>[b('inspect:'+p.id+':'+i,'Run '+(i+1)),pct(r.test.totalReturn),pct(r.baseline.totalReturn),pct(R.compare(r)[0].difference),r.test.sharpe==null?'—':r.test.sharpe.toFixed(2),pct(r.test.maxDrawdown)])):empty('Run a backtest to compare holdout outcomes.'))+section('Interpretation',empty('Compare runs only when datasets, dates, costs and benchmarks are consistent. Selecting the best historical result after observing the holdout can introduce selection bias.'));if(t==='manage')c=section('Project settings',form('rename:'+p.id,field('name','Project name',p.name))+b('export-source-bundle:'+p.id,'Export source bundle')+' '+b('duplicate-project:'+p.id,'Duplicate project')+' '+b('toggle-project-archive:'+p.id,p.archived?'Restore project':'Archive project')+' '+b('export-project:'+p.id,'Export project')+b('delete-project:'+p.id,'Delete project'));
return head(p.name,'Source notes, reproducible research and execution history.')+a('research','← All projects')+tabs(base,[['notes','Research notes'],['files','Project files'],['notebook','Research notebook'],['python','Python lab'],['backtest','Backtest'],['validation','Validation lab'],['runs','Run history'],['compare','Compare runs'],['manage','Project settings']],t)+c;}
case 'portfolio':{const t=['positions','orders','risk','manage'].includes(sub)?sub:'positions',al=M.allocation(s);let c='';
if(t==='positions')c='<div class="grid">'+section('Hypothetical cash','<span class="metric">'+money(s.cash)+'</span>')+section('Scenario equity','<span class="metric">'+money(al.total)+'</span>'+empty('Marked at simulated execution prices, not live quotes.'))+'</div>'+section('Positions',al.rows.length?table(['Symbol','Shares','Scenario value'],al.rows.map(r=>[esc(r.ticker),r.quantity,money(r.value)])):empty('No simulated positions.'));
if(t==='orders')c=section('Simulated execution ticket',form('trade','<div class="grid">'+field('symbol','Ticker')+select('side','Side',[['buy','Buy'],['sell','Sell']],'buy')+field('quantity','Quantity')+field('price','Hypothetical price (USD)')+'</div>'+empty('Simulated fee: '+s.settings.fee+' bps. No broker connection.'),'Record simulated execution'))+section('Transaction ledger',s.orders.length?table(['Symbol','Side','Quantity','Price','Fee'],s.orders.slice().reverse().map(o=>[esc(o.symbol),esc(o.side),o.quantity,money(o.price),money(o.fee)])):empty('No transactions.'));
if(t==='risk')c=section('Scenario concentration',al.rows.length?al.rows.map(r=>'<div><div class="row between"><strong>'+esc(r.ticker)+'</strong><span>'+pct(r.weight)+'</span></div><div class="bar"><span style="width:'+Math.min(100,Math.max(0,r.weight*100))+'%"></span></div></div>').join(''):empty('Create positions to calculate weights.'))+section('Methodology',empty('Scenario concentration only. Volatility and VaR require real historical data.'));
if(t==='manage')c=section('Simulation account',b('export-ledger','Export ledger')+b('reset-paper','Reset hypothetical cash and orders'));
return head('Portfolio laboratory','Evaluate hypothetical positions and allocation.')+note+tabs('portfolio',[['positions','Positions'],['orders','Orders & ledger'],['risk','Concentration'],['manage','Account settings']],t)+c;}
case 'ownership':return head('Shareholder intelligence','Understand who owns a company, how it is governed and what ownership means.')+tabs('ownership',[['filings','Filings'],['rights','Shareholder rights'],['memo','Research memoranda']],sub||'filings')+(sub==='memo'?memos():sub==='rights'?section('Voting and governance',empty('Review record dates, share classes and issuer proxy materials. A community poll is not a legal proxy vote.')+external('https://www.investor.gov/','Investor education')):section('Primary issuer evidence',external('https://www.sec.gov/edgar/search/','Find SEC filings and proxy statements')+empty('DEF 14A, 10-K, 13D/G and 13F are distinct disclosure types.')));
case 'collectives':return head('Investment collectives','Organize research, collective capital planning and transparent deliberation.')+tabs('collectives',[['groups','Member groups'],['memo','Memorandum drafts'],['rules','Governance principles']],sub||'groups')+(sub==='memo'?memos():sub==='rules'?section('Ownership charter',empty('Disclose conflicts, preserve dissent and exit rights, document mandates and prevent governance capture.')+external('../OWNERSHIP_CHARTER.md','Read COMMON ownership charter')):section('Shared communities',external('../live/','Open authenticated circles and capital planning')+empty('Open a joined circle, then Capital & treasury to model pooled capital and review investment scenarios. No actual deposits or trades are enabled.')));
case 'social':return head('Member network','Discover real research communities and participate in discussion.')+section('Authenticated community',external('../live/','Open member application')+empty('Shared member data remains in the existing authenticated application.'));
case 'venture':return head('Private capital','Research venture economics and potential ownership opportunities.')+section('Financial modeling',external('../terminal/#venture','Open existing private-capital tools')+empty('No live offerings or capital commitments.'))+memos();
case 'settings':return settings(sub);
}}
let datasets=[],dataError='',dataLoaded=false;
async function refreshDatasets(){try{datasets=await D.all();dataError='';}catch(e){dataError=e.message;}dataLoaded=true;}
function datasetInput(label){return '<label>Saved dataset<select name="dataset"><option value="">Upload a new CSV</option>'+datasets.map(d=>'<option value="'+esc(d.id)+'">'+esc((d.symbol?d.symbol+' · ':'')+d.name+' · '+d.diagnostics.rows+' rows')+'</option>').join('')+'</select></label><label>'+esc(label)+'<input name="csv" type="file" accept=".csv,text/csv"></label><p class="muted">Choose one saved dataset or upload a CSV, not both. '+a('datasets','Manage datasets')+'</p>';}
async function resolveSource(d){const hasFile=Boolean(d.csv?.size),hasDataset=Boolean(d.dataset);if(hasFile===hasDataset)throw Error('Choose exactly one saved dataset or upload one CSV.');if(hasDataset){const row=await D.get(d.dataset);if(!row)throw Error('Saved dataset no longer exists.');return {source:row.source,name:row.name};}if(d.csv.size>D.MAX_BYTES)throw Error('CSV exceeds 16 MB.');return {source:await d.csv.text(),name:d.csv.name};}
function riskDesk(sub,tab){const runs=s.riskRuns||[],r=runs.find(x=>x.id===sub),base='risk/'+sub;if(!r){const choices=datasets.map(d=>'<option value="'+esc(d.id)+'">'+esc((d.symbol?d.symbol+' · ':'')+d.name)+'</option>').join('');const fields=Array.from({length:8},(_,i)=>'<div class="risk-input-row"><label>Asset '+(i+1)+'<select aria-label="Asset '+(i+1)+'" name="asset'+i+'"><option value="">Not selected</option>'+choices+'</select></label><label>Target weight (%)<input aria-label="Target weight for asset '+(i+1)+' (%)" name="weight'+i+'" type="number" min="0" max="100" step="any" value="'+(i<2?'50':'0')+'"></label></div>').join('');return head('Multi-asset risk laboratory','Compare exposures before committing capital.')+section('Historical portfolio model',empty('Select 2–8 saved datasets. The model aligns identical return intervals and estimates historical covariance, correlations and downside risk.')+a('datasets','Manage source data')+(datasets.length>=2?form('risk-run',fields+'<div class="grid">'+field('capital','Hypothetical capital (USD)',100000,'number')+field('fee','Execution cost (bps)',s.settings.fee,'number')+'</div>','Calculate portfolio risk'):empty('Import at least two distinct daily CSV datasets to begin.')))+section('Risk research history',runs.length?table(['Date','Assets','Annual volatility','Historical VaR (95%)',''],runs.slice().reverse().map(x=>[day(x.at),x.assets.length,pct(x.annualVolatility),pct(x.var95),a('risk/'+x.id+'/overview','Inspect')])):empty('No risk reports saved.'));}
const current=['overview','correlation','exposure','downside','method'].includes(tab)?tab:'overview';let c='';if(current==='overview')c=section('Historical risk profile','<div class="report-kpis">'+[['Annual volatility',pct(r.annualVolatility)],['Sharpe',Number.isFinite(r.sharpe)?r.sharpe.toFixed(2):'—'],['Net modeled return',pct(r.netReturn)],['Maximum drawdown',pct(r.maxDrawdown)]].map(([k,v])=>'<div><span class="eyebrow">'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+empty(r.observations+' aligned return intervals · '+r.dates[0]+' to '+r.dates.at(-1))+empty(r.warning));
if(current==='correlation')c=section('Historical correlation matrix',table(['Asset',...r.assets.map(x=>x.label)],r.correlation.map((row,i)=>[esc(r.assets[i].label),...row.map(x=>x===null?'—':'<span class="corr-cell" style="background:rgba('+(x>=0?'95,151,118,':'189,103,98,')+Math.min(.65,Math.abs(x)*.65)+')">'+x.toFixed(2)+'</span>')]))+empty('Pearson correlations of aligned simple returns. Correlation is not causation or a stable future relationship.'));
if(current==='exposure')c=section('Target allocation and variance contributions',table(['Asset','Weight','Annual volatility','Share of portfolio variance'],r.assets.map(x=>[esc(x.label),pct(x.weight),pct(x.annualVol),pct(x.riskContribution)]))+empty('Variance contributions may be negative for diversifying assets. They sum to 100% if portfolio variance is positive.'));
if(current==='downside')c=section('Historical downside estimates',table(['Metric','Fraction','Hypothetical USD'],[['Daily historical VaR (95%)',pct(r.var95),money(r.var95*r.capital)],['Daily expected shortfall (95%)',pct(r.es95),money(r.es95*r.capital)]])+empty('These are historical gross-return estimates, not maximum losses. Expected shortfall averages the selected worst 5% of observations.'));
if(current==='method')c=section('Sources and assumptions',table(['Dataset label','SHA-256'],r.assets.map(x=>[esc(x.label),esc(x.id)]))+empty(r.warning)+b('export-risk:'+r.id,'Export analysis')+' '+b('delete-risk:'+r.id,'Delete report'));
return head('Portfolio risk report','Historical simulation / '+r.assets.length+' assets')+a('risk','← Risk laboratory')+tabs(base,[['overview','Overview'],['correlation','Correlation'],['exposure','Risk contribution'],['downside','Downside risk'],['method','Data & methodology']],current)+c+b('share-risk:'+r.id,'Prepare risk summary for sharing');}
function datasetDesk(sub,tab){const item=datasets.find(x=>x.id===sub),base='datasets/'+sub;if(dataError)return head('Dataset library','Local research evidence.')+section('Storage unavailable',empty(dataError)+b('reload-datasets','Retry'));
if(!item)return head('Dataset library','Import, inspect and reuse dated observations across projects.')+section('Import dataset',empty('Files remain in this browser’s IndexedDB; they are not uploaded to COMMON or model providers. Do not import confidential or unlicensed data. Up to 20 datasets and 64 MB total.')+form('import-dataset','<label>CSV source<input type="file" name="csv" accept=".csv,text/csv" required></label><label>Optional symbol label<input name="symbol" maxlength="12" placeholder="SPY"></label>','Import and validate'))+section('Saved datasets',!dataLoaded?empty('Loading library…'):datasets.length?table(['Dataset','Symbol','Observations','Sample range','Adjusted close',''],datasets.map(x=>[a('datasets/'+x.id+'/overview',x.name),esc(x.symbol||'—'),x.diagnostics.rows,esc(x.diagnostics.first+' — '+x.diagnostics.last),x.diagnostics.hasAdjustedClose?'Declared':'Not identified',b('download-dataset:'+x.id,'Export')])):empty('No saved data yet.'));
const current=['overview','quality','provenance'].includes(tab)?tab:'overview',d=item.diagnostics;let content='';
if(current==='overview')content=section('Observation summary','<div class="report-kpis">'+[['Observations',d.rows],['First date',d.first],['Last date',d.last],['File size',(item.bytes/1024).toFixed(1)+' KB']].map(([k,v])=>'<div><span class="eyebrow">'+esc(k)+'</span><strong>'+esc(v)+'</strong></div>').join('')+'</div>'+empty('Symbol is a user-supplied label, not an exchange-verified identity.'))+section('Use in research',a('research','Choose a project')+empty('Select this dataset in the backtest or validation laboratory.'));
if(current==='quality')content=section('Data quality',table(['Control','Result'],[['Unique dates','Validated'],['Input ordering',d.sortedInput?'Chronological':'Sorted during import'],['Adjusted close',d.hasAdjustedClose?'Declared in source header':'Not identified'],['Large gaps',d.totalLargeGaps],['Provider authenticity','Not verified']])+empty(d.warning))+section('Date gaps',d.largeGaps.length?table(['From','To','Calendar days'],d.largeGaps.map(g=>[esc(g.from),esc(g.to),g.days])):empty('No gaps exceeding seven calendar days.'));
if(current==='provenance')content=section('Source record',table(['Attribute','Value'],[['Filename',esc(item.name)],['Symbol label',esc(item.symbol||'Not supplied')],['Imported',esc(new Date(item.created).toLocaleString())]])+'<label>SHA-256<input readonly value="'+esc(item.sha256)+'"></label>'+empty('Hash identifies file text, not authenticity, licensing or corporate-action correctness.')+'<div class="row">'+b('download-dataset:'+item.id,'Download original CSV')+b('delete-dataset:'+item.id,'Delete source')+'</div>');
return head(item.name,'Historical data / local library')+a('datasets','← All datasets')+tabs(base,[['overview','Overview'],['quality','Quality checks'],['provenance','Source & actions']],current)+content;}
let pythonJob=null;
const pythonTarget=(id,cellId)=>cellId?id+':'+cellId:id;
const pythonStop=target=>'<button type="button" data-act="cancel-python:'+esc(target)+'" data-python-stop disabled>Stop execution</button>';
const pythonProgress=target=>'<p data-python-progress="'+esc(target)+'" role="status" class="muted"></p>';
const pythonOptions=()=>'<div class="python-packages"><span class="eyebrow">OPTIONAL SCIENTIFIC PACKAGES</span>'+P.packages.map(k=>'<label><input type="checkbox" name="pkg" value="'+k+'"> '+k+'</label>').join('')+'</div><label><input type="checkbox" name="consent" required> Run my own reviewed code locally; allow runtime/package downloads. Do not include secrets.</label>';
function syncPythonControls(){
  for(const node of app.querySelectorAll('[data-python-progress]'))
    node.textContent=pythonJob?.target===node.dataset.pythonProgress?pythonJob.status:'';
  for(const node of app.querySelectorAll('[data-python-stop]'))
    node.disabled=node.dataset.act!=='cancel-python:'+pythonJob?.target;
  for(const node of app.querySelectorAll('[data-python-start],form[data-form^="execute-python:"] button.primary'))
    node.disabled=Boolean(pythonJob);
}
async function executePython(target,request){
  if(pythonJob)throw Error('A Python execution is already running in this tab.');
  const job={target,status:''};
  pythonJob=job;
  try {
    job.handle=P.execute(request.code,request.libs,status=>{job.status=status;syncPythonControls();});
    return await job.handle.promise;
  } finally {
    pythonJob=null;
    syncPythonControls();
  }
}
function pythonOutput(run){
  return '<p class="muted">Runtime '+esc(run.version)+' · packages: '+esc(run.libs.join(', ')||'standard library')+'</p><pre>'+esc(run.output||'(No printed output)')+'</pre>'+
    (run.truncated?empty('Output truncated at 24,000 characters. Could also be shortened by the runtime.'):'');
}
function pythonDesk(p,detail){const files=F.list(p).filter(x=>x.path.endsWith('.py')),selected=files.find(x=>x.id===detail),runs=p.pythonRuns||[],base='research/'+p.id+'/python';
const input=selected?.content??'import statistics\nreturns = [0.01, -0.02, 0.015, 0.005]\nprint("Illustrative mean daily return:", statistics.mean(returns))';
return section('Local Python environment',empty('Experimental browser-based Python '+P.VERSION+' runtime. Each run starts in a fresh opaque-origin sandbox and worker. No server credentials, private circle records, or dataset files are injected. Runtime and selected packages download from a pinned CDN release. Never run untrusted code or include confidential information. Browser memory exhaustion and CDN access are possible; this is not a production multi-tenant compute service.')+empty('Example source is illustrative only; replace it with your own research. Use print() for results.')+select('unused','Open saved Python file',[['','Scratch editor'],...files.map(f=>[f.id,f.path])],selected?.id||'').replace('name="unused"','data-python-file="'+esc(base)+'"')+form('execute-python:'+p.id, '<label for="python-source">Python source</label><textarea id="python-source" name="code" class="source-editor" spellcheck="false" maxlength="40000" required>'+esc(input)+'</textarea>'+pythonOptions(),'Run Python')+'<div class="row">'+pythonStop(p.id)+b('save-python-file:'+p.id,'Save editor as source file')+'</div>'+pythonProgress(p.id))+section('Execution history',runs.length?runs.slice().reverse().map(r=>'<details class="python-result" '+(r===runs.at(-1)?'open':'')+'><summary><strong>'+esc(r.ok?'Completed':'Failed / cancelled')+'</strong> <span class="muted">'+esc(new Date(r.at).toLocaleString())+'</span></summary>'+pythonOutput(r)+'<details><summary>Executed source</summary><pre>'+esc(r.code)+'</pre></details>'+b('share-python:'+p.id+':'+r.id,'Prepare execution summary')+' '+b('export-python:'+p.id+':'+r.id,'Export run')+' '+b('delete-python:'+p.id+':'+r.id,'Delete run')+'</details>').join(''):empty('No Python executions saved.'));}
function notebookDesk(p,detail){const cells=N.list(p),base='research/'+p.id+'/notebook',selected=cells.find(x=>x.id===detail),kinds=Object.entries(N.kinds);
const edit=selected||{kind:'note',title:'',text:'',dataset:'',config:{}};const cfg=edit.config||{};
const sources=[['','Select a saved dataset'],...datasets.map(d=>[d.id,(d.symbol?d.symbol+' · ':'')+d.name])];if(edit.dataset&&!datasets.some(d=>d.id===edit.dataset))sources.push([edit.dataset,'Source removed · '+edit.dataset.slice(0,12)]);
const editor=section(selected?'Edit cell':'Add research cell',form('save-cell:'+p.id+(selected?':'+selected.id:''),
  field('title','Cell title',edit.title)+select('kind','Cell type',kinds,edit.kind)+
  '<label for="notebook-cell-source" data-notebook-source-label>'+esc(edit.kind==='python'?'Python source':'Research context and assumptions')+'</label><textarea id="notebook-cell-source" name="text" class="source-editor" maxlength="'+N.CELL_TEXT_LIMIT+'" spellcheck="false" '+(edit.kind==='python'?'required':'')+'>\n'+esc(edit.text)+'</textarea>'+
  '<div data-notebook-dataset '+(N.needsDataset(edit.kind)?'':'hidden')+'>'+select('dataset','Cell dataset',sources,edit.dataset)+'</div>'+
  '<fieldset class="notebook-parameters" data-notebook-backtest '+(edit.kind==='backtest'?'':'hidden disabled')+'><div class="grid">'+field('fast','Fast SMA',cfg.fast??10,'number')+field('slow','Slow SMA',cfg.slow??30,'number')+field('fee','Cost (bps)',cfg.fee??s.settings.fee,'number')+field('holdout','Holdout (%)',cfg.holdout??s.settings.holdout,'number')+'</div></fieldset>',
  'Save cell')+a(base,'New cell'));
const fmt=(v,t)=>v==null?'—':t==='pct'?pct(v):t==='number'&&typeof v==='number'?v.toFixed(4):String(v);
const renderOutput=o=>{let c=table(['Metric','Result'],o.metrics.map(([k,v,t])=>[esc(k),esc(fmt(v,t))]));if(o.histogram){const max=Math.max(1,...o.histogram.map(x=>x.count));c+='<div class="notebook-histogram" aria-label="Return histogram">'+o.histogram.map(x=>'<div><span>'+pct(x.lo)+'</span><div class="notebook-track"><i style="width:'+100*x.count/max+'%"></i></div><span>'+x.count+'</span></div>').join('')+'</div>';}if(o.curves){const ch=R.chart([{id:'strategy',values:o.curves.strategy},{id:'benchmark',values:o.curves.benchmark}]);if(ch)c+='<div class="report-chart"><svg viewBox="0 0 '+ch.width+' '+ch.height+'" role="img" aria-label="Notebook strategy and benchmark chart">'+ch.lines.map(x=>'<polyline fill="none" stroke="'+(x.id==='strategy'?'var(--accent)':'#8292b0')+'" stroke-width="2" points="'+x.points+'"/>').join('')+'</svg><p class="muted">Strategy / buy and hold</p></div>';}return c+empty(o.warning)+empty('Computed '+new Date(o.at).toLocaleString()+' · '+o.version+' · SHA-256 '+o.dataset);};
const renderCell=(c,i)=>{
  const isPython=c.kind==='python', target=pythonTarget(p.id,c.id);
  const status=c.output?(isPython?(c.output.ok?'Completed':'Failed / cancelled'):'Computed'):c.kind==='note'?'Note':'Not executed';
  const run=isPython?'<button type="button" class="primary" data-act="review-python-cell:'+esc(target)+'" data-python-start>Run Python cell</button>'+pythonStop(target):
    N.needsDataset(c.kind)?b('run-cell:'+p.id+':'+c.id,'Run cell','primary'):'';
  const output=c.output?(isPython?'<div class="python-result">'+empty('Executed '+new Date(c.output.at).toLocaleString())+pythonOutput(c.output)+'</div>':renderOutput(c.output)):'';
  return '<article class="panel notebook-cell"><div class="row between"><span class="eyebrow">CELL '+String(i+1).padStart(2,'0')+' / '+esc(N.kinds[c.kind])+'</span><span class="muted">'+status+'</span></div><h2>'+esc(c.title)+'</h2>'+
    (isPython?'<details><summary>Saved Python source</summary><pre class="notebook-text">'+esc(c.text)+'</pre></details>':'<p class="notebook-text">'+esc(c.text)+'</p>')+
    '<div class="row notebook-actions">'+a(base+'/'+c.id,'Edit')+run+(i>0?b('move-cell:'+p.id+':'+c.id+'/-1','Move up'):'')+(i<cells.length-1?b('move-cell:'+p.id+':'+c.id+'/1','Move down'):'')+b('delete-cell:'+p.id+':'+c.id,'Delete')+'</div>'+
    (isPython?pythonProgress(target):'')+(output?'<div class="notebook-result">'+output+'</div>':'')+'</article>';
};
return '<div class="notebook-layout"><div>'+section('Research notebook',empty('Save research notes, analyze a dataset, or run a Python cell in a fresh browser environment.')+a('datasets','Manage evidence datasets')+b('export-notebook:'+p.id,'Export notebook'))+cells.map(renderCell).join('')+(!cells.length?section('Empty notebook',empty('Add a research note, dataset analysis or Python cell to begin.')):'')+'</div><aside>'+editor+'</aside></div>';}
function fileDesk(p,detail){const files=F.list(p),base='research/'+p.id+'/files',file=files.find(x=>x.id===detail);
const explorer='<aside class="file-explorer"><div class="row between"><strong>Explorer</strong>'+b('new-file:'+p.id,'New file')+'</div>'+b('search-project-files:'+p.id,'Find and replace in project')+'<div class="eyebrow">PROJECT / '+files.length+' FILES</div>'+files.slice().sort((a,b)=>a.path.localeCompare(b.path)).map(f=>a(base+'/'+f.id,f.path,'file-row '+(f.id===detail?'active':''))).join('')+(files.length?'':empty('Create your first text file.'))+'</aside>';
const editor=file?'<div class="editor-pane"><div class="row between"><strong>'+esc(file.path)+'</strong><span class="muted">Text only · not executable</span></div>'+form('edit-file:'+p.id+':'+file.id,field('path','Relative path',file.path)+'<label for="file-source">Source editor</label><textarea id="file-source" class="source-editor" name="content" maxlength="40000" spellcheck="false">'+esc(file.content)+'</textarea>','Save revision')+'<div class="row">'+b('export-file:'+p.id+':'+file.id,'Download source')+b('delete-file:'+p.id+':'+file.id,'Delete file')+'</div>'+section('Revision history',file.revisions.length?table(['Modified','Path',''],file.revisions.map((r,i)=>[day(r.at),esc(r.path),b('restore-file:'+p.id+':'+file.id+'/'+i,'Restore')])):empty('No previous versions.'))+'</div>':'<div class="editor-pane"><h2>Project source files</h2><p class="muted">Maintain research notes, Python source, configuration JSON and small CSV samples. Paths and revisions are saved locally. Opening or editing source does not run it.</p>'+b('new-file:'+p.id,'Create source file','primary')+'</div>';
return '<div class="ide-layout">'+explorer+editor+'</div>';}
function validationDesk(p,detail,reportTab){const runs=p.validations||[],base='research/'+p.id+'/validation',run=runs.find(x=>x.id===detail);
if(!run)return section('Walk-forward parameter research',empty('Train on earlier data, select the best training Sharpe, and evaluate on the next unseen block. Only complete non-overlapping test folds are included.')+form('validate:'+p.id,''+datasetInput('Validation dataset CSV')+'<div class="grid">'+field('fast','Fast SMA periods (comma-separated)','5,10,20')+field('slow','Slow SMA periods (comma-separated)','30,50,100')+field('train','Training observations',252,'number')+field('test','Test observations',63,'number')+field('fee','Execution cost (bps)',s.settings.fee,'number')+'</div>','Run walk-forward analysis')+'<p id="quant-progress" role="status" class="muted"></p>'+b('cancel-quant:'+p.id,'Cancel active analysis'))+section('Validation history',runs.length?table(['Dataset','Folds','OOS return','Benchmark',''],runs.slice().reverse().map(r=>[esc(r.dataset.name),r.folds.length,pct(r.metrics.totalReturn),pct(r.benchmark.totalReturn),a(base+'/'+r.id,'Open report')])):empty('No validation runs. Upload your historical CSV to begin.'));
const chart=R.chart([{id:'strategy',values:run.metrics.curve},{id:'benchmark',values:run.benchmark.curve}]);const graph=chart?'<div class="report-chart"><svg viewBox="0 0 '+chart.width+' '+chart.height+'" role="img" aria-label="Walk-forward strategy and benchmark equity curves"><line x1="24" x2="'+(chart.width-24)+'" y1="'+chart.baseline+'" y2="'+chart.baseline+'" stroke="var(--line)" stroke-dasharray="4 4"/>'+chart.lines.map(l=>'<polyline fill="none" stroke="'+(l.id==='strategy'?'var(--accent)':'#8292b0')+'" stroke-width="2" points="'+l.points+'"/>').join('')+'</svg><div class="row muted"><span class="legend strategy">Walk-forward</span><span class="legend benchmark">Buy &amp; hold</span></div></div>':'';
const sharp=x=>Number.isFinite(x)?x.toFixed(2):'—';
let content='';const current=['performance','folds','parameters','regimes','trades','source'].includes(reportTab)?reportTab:'performance';if(current==='performance')content=section('Out-of-sample performance','<div class="report-kpis">'+[['Return',pct(run.metrics.totalReturn)],['Benchmark',pct(run.benchmark.totalReturn)],['Sharpe',sharp(run.metrics.sharpe)],['Drawdown',pct(run.metrics.maxDrawdown)]].map(([k,v])=>'<div><span class="eyebrow">'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+graph+empty(run.notice));if(current==='folds')content=section('Walk-forward folds',table(['Training through','Test from','Test through','Fast / slow','Training Sharpe','Test return','Benchmark'],run.folds.map(f=>[esc(f.trainThrough),esc(f.testFrom),esc(f.testThrough),f.pair.fast+' / '+f.pair.slow,sharp(f.training.sharpe),pct(f.test.totalReturn),pct(f.benchmark.totalReturn)])));if(current==='parameters')content=section('First training parameter sweep',table(['Fast','Slow','Training Sharpe','Training return','Drawdown'],run.firstTrainingGrid.map(c=>[c.pair.fast,c.pair.slow,sharp(c.metrics.sharpe),pct(c.metrics.totalReturn),pct(c.metrics.maxDrawdown)]))+empty('Candidates are ranked on the first training block, not on future test performance.'));if(current==='source')content=section('Reproducibility',table(['Source','Value'],[['Dataset',esc(run.dataset.name)],['SHA-256',esc(run.dataset.sha256)],['Engine',esc(run.version)],['Candidates',run.candidateCount],['Unused tail observations',run.unused]])+'<div class="row">'+b('export-validation:'+p.id+':'+run.id,'Export analysis')+b('delete-validation:'+p.id+':'+run.id,'Delete run')+'</div>');
if(current==='regimes')content=section('Historical market regimes',run.regimes?table(['Regime','Observations','Mean daily strategy return','Mean daily benchmark return'],run.regimes.map(x=>[esc(x.regime),x.observations,pct(x.strategyMean),pct(x.benchmarkMean)]))+empty('Regime is classified from the trailing 20 observations ending two bars before the return: rising/falling by cumulative return, high volatility at annualized volatility of 25% or more. Conditional means are descriptive, not forecasts; regime days are not necessarily contiguous.'):empty('This legacy result does not contain regime data. Run validation again.'));
if(current==='trades')content=section('Simulated position changes',run.trades?table(['Execution date','Signal date','Action','Hypothetical close','Cost (bps)','Fold'],run.trades.slice(-200).reverse().map(x=>[esc(x.date),esc(x.signalDate),esc(x.side),x.price.toFixed(4),(x.feeFraction*10000).toFixed(2),x.fold]))+empty('Showing up to 200 latest changes of '+run.trades.length+'. Full ledger in JSON export. Positions are modeled at the preceding close, not actual trades. No forced close at the final date.'):empty('This legacy result does not contain a transaction log.'));
return a(base,'← Validation history')+tabs(base+'/'+run.id,[['performance','Performance'],['folds','Walk-forward folds'],['parameters','Parameter grid'],['regimes','Market regimes'],['trades','Trade log'],['source','Data & methods']],current)+content;}
let activeQuant=null;
function startQuant(source,name,config,id){if(activeQuant)throw Error('An analysis is already running.');return new Promise((resolve,reject)=>{const worker=new Worker('quant-worker.js');const finish=(error,result)=>{if(activeQuant?.worker!==worker)return;clearTimeout(activeQuant.timer);activeQuant=null;worker.terminate();error?reject(Error(error)):resolve(result);};const timer=setTimeout(()=>finish('Analysis exceeded the 60-second compute limit.'),60000);activeQuant={worker,timer,id,cancel:()=>finish('Analysis cancelled.')};worker.onmessage=e=>{const x=e.data;x.ok?finish(null,x.result):finish(x.error||'Analysis failed.');};worker.onerror=()=>finish('Research worker failed.');worker.postMessage({source,name,config});});}
function memos(){return section('Private investment memoranda',form('memo',field('title','Title')+area('thesis','Evidence, assumptions, risks and conflicts'),'Save draft')+(s.proposals.length?table(['Title','Status',''],s.proposals.map(p=>[esc(p.title),esc(p.status),b('memo:'+p.id,'Open')])):empty('No private drafts.')));}
function settings(sub){const t=['appearance','research','integrations','data'].includes(sub)?sub:'appearance',v=s.settings;let c='';
if(t==='appearance')c=form('settings',select('theme','Theme',[['dark','Dark'],['light','Light']],v.theme)+select('density','Density',[['standard','Standard'],['compact','Compact']],v.density));
if(t==='research')c=form('settings',field('benchmark','Preferred benchmark (reference only)',v.benchmark)+field('fee','Default trading cost (bps)',v.fee,'number')+field('holdout','Default holdout (%)',v.holdout,'number'));
if(t==='integrations')c=table(['Service','Availability'],[['Member identity','Existing member app'],['Historical data','CSV upload'],['Macro data','Existing terminal'],['AI and isolated compute','Not connected'],['Brokerage, custody, proxy execution','Disabled']])+empty('Do not enter API keys or financial credentials in this local workspace.');
if(t==='data')c=empty('Saved to this browser only. Not synchronized with member accounts.')+b('export-all','Export workspace')+b('reset-all','Delete local workspace');
return head('Settings','Configure workspace appearance, analytical defaults and local storage.')+'<div class="settings"><nav aria-label="Settings categories">'+[['appearance','Appearance'],['research','Research defaults'],['integrations','Integrations'],['data','Data & privacy']].map(([k,x])=>a('settings/'+k,x,'nav '+(k===t?'active':''))).join('')+'</nav>'+section(t[0].toUpperCase()+t.slice(1),c)+'</div>';}
function show(title,content){dialog.classList.remove('wide-report');dialog.innerHTML='<div class="row between"><h2>'+esc(title)+'</h2>'+b('close','Close')+'</div><br>'+content;if(!dialog.open)dialog.showModal();CommonEditor.enhance(dialog);}
function searchProjectFiles(project) {
 const editor=app.querySelector('form[data-form^="edit-file:"]');
 if(editor){
  const selected=F.list(project).find(file=>file.id===editor.dataset.form.split(':').at(-1));
  if(selected&&(editor.elements.path.value!==selected.path||
   editor.elements.content.value!==selected.content.replace(/\r\n?/g,'\n'))){
   throw Error('Save the current source revision before searching the project.');
  }
 }
 const readWorkspace = () => {
  const snapshot = M.load(localStorage.getItem(key));
  const current = snapshot.projects.find(item => item.id === project.id);
  if (!current) throw Error('This project is no longer available.');
  return {snapshot,current};
 };
 show('Find and replace in project',empty('Searches saved source files in this project. Matching is case-sensitive. Each changed file keeps its previous revision.')+
  '<form data-file-search><label>Find text<input type="search" name="query" maxlength="240" required></label>'+
  '<label class="file-search-check"><input type="checkbox" name="replace"> Prepare replacements</label><label>Replace with<input name="replacement" maxlength="240" placeholder="Leave empty to remove matches" disabled></label>'+
  '<button class="primary" type="submit">Search saved files</button></form>'+
  '<div data-file-search-results></div><p role="status" data-file-search-status></p>');
 const form = dialog.querySelector('[data-file-search]');
 const results = dialog.querySelector('[data-file-search-results]');
 const status = dialog.querySelector('[data-file-search-status]');
 form.querySelector('[name=query]').focus();
 form.addEventListener('input',()=>{
  form.elements.replacement.disabled=!form.elements.replace.checked;
  results.replaceChildren();
  status.textContent='';
 });
 form.addEventListener('submit',event=>{
  event.preventDefault();
  results.replaceChildren();
  try {
   const {query,replacement,replace}=Object.fromEntries(new FormData(form));
   const editing=Boolean(replace)&&query!==replacement;
   const matches=F.search(readWorkspace().current,query);
   const total=matches.reduce((count,match)=>count+match.count,0);
   status.textContent=total?total+' matches in '+matches.length+(matches.length===1?' file.':' files.'):'No matching saved source files.';
   if(!matches.length)return;
   const base='research/'+project.id+'/files/';
   results.innerHTML='<form data-file-replacement><fieldset><legend>Files with matches</legend>'+matches.map(({file,count,before,after})=>
    '<div class="panel"><p>'+a(base+file.id,file.path)+' · '+count+(count===1?' match':' matches')+'</p><p>First match <code class="file-search-preview">'+esc(before)+'<mark>'+esc(query)+'</mark>'+esc(after)+'</code></p>'+
    (!editing?'':'<p>Preview <code class="file-search-preview">'+esc(before)+(replacement?'<mark>'+esc(replacement)+'</mark>':'')+esc(after)+'</code></p>')+
    (editing?'<label class="file-search-check"><input type="checkbox" name="selected" value="'+esc(file.id)+'"> Include '+esc(file.path)+'</label>':'')+'</div>').join('')+'</fieldset>'+
    (editing?'<button type="submit" class="primary">Replace in selected files</button>':'')+'</form>';
   const replaceForm=results.querySelector('form');
   replaceForm.addEventListener('submit',event=>{
    event.preventDefault();
    if(!editing)return;
    try {
     if(blocked)throw Error('Stored data could not be read. Export or reset it first.');
     const chosen=new Set(new FormData(replaceForm).getAll('selected'));
     const {snapshot,current}=readWorkspace();
     const updated={...F.replaceReviewed(current,matches,chosen,query,replacement),updated:new Date().toISOString()};
     save({...snapshot,projects:snapshot.projects.map(item=>item.id===current.id?updated:item)});
     dialog.close();
     toast('Updated '+chosen.size+(chosen.size===1?' source file.':' source files.'));
    } catch(err) { status.textContent=err.message; }
   });
  } catch(err) { status.textContent=err.message; }
 });
}
function reviewShare(draft){
 show('Review research before sharing',empty('Only the text below is transferred. Raw data and source files stay here.')+
 form('handoff','<label>Discussion title<input name="title" required minlength="8" maxlength="160" value="'+esc(draft.title)+'"></label>'+
 area('body','Research summary',draft.body),'Continue to Community'));
}
function report(p,index,tab){
const r=p?.runs[index];if(!r)throw Error('Research run not found.');
const labels={totalReturn:'Total return',annualReturn:'Annualized return',annualVolatility:'Annualized volatility',sharpe:'Sharpe ratio',maxDrawdown:'Maximum drawdown'};
const f=(key,n)=>key==='sharpe'?(Number.isFinite(n)?n.toFixed(2):'—'):pct(n);
const nav='<nav class="tabs report-tabs" aria-label="Run report">'+[['overview','Performance'],['validation','Validation'],['data','Data provenance'],['method','Methodology']].map(([k,t])=>b('report:'+p.id+':'+index+'/'+k,t,tab===k?'selected':'')).join('')+'</nav>';
let content='',c;
if(tab==='overview'){c=R.chart([{id:'strategy',values:r.test.curve},{id:'benchmark',values:r.baseline.curve}]);
const graph=c?'<div class="report-chart"><div class="row between"><strong>Holdout equity · normalized to 1.00</strong><span class="muted">Strategy / Buy &amp; hold</span></div><svg viewBox="0 0 '+c.width+' '+c.height+'" role="img" aria-label="Strategy and benchmark normalized equity curves"><line x1="24" x2="'+(c.width-24)+'" y1="'+c.baseline+'" y2="'+c.baseline+'" stroke="var(--line)" stroke-dasharray="4 4"/>'+c.lines.map(l=>'<polyline fill="none" stroke="'+(l.id==='strategy'?'var(--accent)':'#8292b0')+'" stroke-width="2" points="'+l.points+'"/>').join('')+'<line data-equity-cursor x1="24" x2="24" y1="24" y2="'+(c.height-24)+'" stroke="currentColor" stroke-dasharray="3 3"/></svg><div class="equity-inspector"><label for="equity-observation">Inspect holdout observation</label><input id="equity-observation" type="range" min="0" max="'+(r.test.curve.length-1)+'" value="'+(r.test.curve.length-1)+'"><output id="equity-values" for="equity-observation"></output></div><div class="row muted"><span class="legend strategy">Strategy</span><span class="legend benchmark">Buy &amp; hold</span></div></div>':empty('No equity curve stored.');
content='<div class="report-kpis">'+[['Holdout return',pct(r.test.totalReturn)],['Benchmark',pct(r.baseline.totalReturn)],['Sharpe',f('sharpe',r.test.sharpe)],['Max drawdown',pct(r.test.maxDrawdown)]].map(([k,v])=>'<div><span class="eyebrow">'+k+'</span><strong>'+v+'</strong></div>').join('')+'</div>'+graph+section('Risk-adjusted comparison','<details class="comparison-columns"><summary>Columns</summary><span role="status"></span></details><div data-report-comparison>'+table(['Metric','Strategy','Benchmark','Difference'],R.compare(r).map(x=>[labels[x.key],f(x.key,x.strategy),f(x.key,x.benchmark),f(x.key,x.difference)]))+'</div>')+empty('Difference is strategy minus benchmark; lower volatility and less-negative drawdown have different interpretations.');}
else if(tab==='validation'){const x=r.bootstrap;content=section('Historical block bootstrap',x?table(['Statistic','Result'],[['Paths',x.paths],['Seed',x.seed],['Block size',x.block],['5th percentile',pct(x.percentiles.p05)],['Median',pct(x.percentiles.p50)],['95th percentile',pct(x.percentiles.p95)],['Fraction of simulated losses',pct(x.probabilityOfLoss)]])+empty(x.caution):empty('No bootstrap saved. Run the strategy again to calculate it.'))+section('Evidence checklist',table(['Control','Status'],R.audit(r).map(x=>[esc(x.label),esc(x.status)])));}
else if(tab==='data'){content=section('Source and reproducibility',table(['Field','Value'],[['Filename',esc(r.dataset?.name||'Not recorded')],['Observations',r.diagnostics?.rows||'—'],['First date',esc(r.diagnostics?.first||'—')],['Last date',esc(r.diagnostics?.last||'—')],['Train through',esc(r.trainThrough||'—')],['Holdout starts',esc(r.testFrom||'—')],['Engine',esc(r.dataset?.engine||'Not recorded')]])+'<label>Dataset SHA-256<input readonly value="'+esc(r.dataset?.sha256||'Not recorded')+'"></label>'+empty('Original CSV is not retained. Keep the source file privately to reproduce this result. The hash identifies the uploaded text; it does not authenticate the data provider.'));}
else{content=section('Execution parameters',table(['Parameter','Value'],Object.entries(r.params).map(([k,v])=>[esc(k),esc(v)])))+section('Limitations',empty(r.warning)+empty('The holdout comparison uses the built-in buy-and-hold baseline from the same CSV, not the preferred ticker saved in settings. The strategy is not proof of future returns.'));}
show('Run '+(index+1)+' / '+p.name,nav+'<div class="report-body">'+content+'</div>'+b('export-run:'+p.id+':'+index,'Export run JSON')+' '+b('share-run:'+p.id+':'+index,'Prepare to share'));dialog.classList.add('wide-report');
if(tab==='overview'){
  if(c)CommonReportControls.inspectEquity(dialog,r,c);
  CommonReportControls.configureComparison(dialog);
};}
function exportData(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),el=document.createElement('a');el.href=url;el.download=name;el.click();setTimeout(()=>URL.revokeObjectURL(url),500);}
function update(id,fn){save({...s,projects:s.projects.map(x=>x.id===id?{...fn(x),updated:new Date().toISOString()}:x)});}
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;const [act,id,i]=el.dataset.act.split(':'),p=s.projects.find(x=>x.id===id);try{switch(act){
case 'menu':document.querySelector('#side').classList.toggle('open');break;
case 'close':dialog.close();break;
case 'search':show('Search workspace','<label>Find a section<input id="query" type="search"></label><div id="results">'+routes.map(([k,t])=>a(k,t,'nav')).join('')+'</div>');dialog.querySelector('#query').addEventListener('input',ev=>{dialog.querySelector('#results').innerHTML=routes.filter(r=>r[1].toLowerCase().includes(ev.target.value.toLowerCase())).map(([k,t])=>a(k,t,'nav')).join('');});dialog.querySelector('#query').focus();break;
case 'export-risk':{const r=(s.riskRuns||[]).find(x=>x.id===id);if(r)exportData('common-risk-report.json',r);break;}
case 'delete-risk':if(confirm('Delete risk report?')){save({...s,riskRuns:(s.riskRuns||[]).filter(x=>x.id!==id)});location.hash='risk';}break;
case 'reload-datasets':refreshDatasets().then(render);break;
case 'download-dataset':D.get(id).then(row=>{if(!row)throw Error('Dataset not found.');const url=URL.createObjectURL(new Blob([row.source],{type:'text/csv;charset=utf-8'})),el=document.createElement('a');el.href=url;el.download=row.name;el.click();setTimeout(()=>URL.revokeObjectURL(url),500);}).catch(err=>toast(err.message));break;
case 'delete-dataset':if(confirm('Delete this source file? Existing analysis reports will remain.'))D.remove(id).then(refreshDatasets).then(()=>{location.hash='datasets';render();}).catch(err=>toast(err.message));break;
case 'cancel-python':if(pythonJob?.target===pythonTarget(id,i))pythonJob.handle.cancel();break;
case 'review-python-cell':{
  if(pythonJob)throw Error('A Python execution is already running in this tab.');
  const cell=p&&N.list(p).find(x=>x.id===i);
  if(cell?.kind!=='python')throw Error('Python cell not found.');
  show('Run Python cell',empty('Runs in a fresh, experimental browser worker. It receives only the source below and your package choices. No saved datasets or credentials are passed in. Run only your reviewed code.')+
    '<p><strong>'+esc(cell.title)+'</strong></p><pre class="notebook-text">'+esc(cell.text)+'</pre>'+
    form('execute-python-cell:'+pythonTarget(id,i),pythonOptions(),'Run reviewed Python'));
  dialog.querySelector('form').dataset.reviewedSource=cell.text;
  break;
}
case 'save-python-file':{const source=document.querySelector('form[data-form^="execute-python:"] textarea[name="code"]')?.value;if(typeof source!=='string')throw Error('Editor not open.');show('Save Python source',form('new-file:'+id,field('path','Relative path','models/research.py')+'<label for="new-file-source">Source editor</label><textarea id="new-file-source" class="source-editor" name="content" maxlength="40000" spellcheck="false">'+esc(source)+'</textarea>','Create file'));break;}
case 'export-python':{const r=(p?.pythonRuns||[]).find(x=>x.id===i);if(r)exportData('common-python-run.json',r);break;}
case 'delete-python':if(confirm('Delete this Python output and source snapshot?'))update(id,p=>({...p,pythonRuns:(p.pythonRuns||[]).filter(x=>x.id!==i)}));break;
case 'run-cell':{if(!p)throw Error('Project not found.');const cell=N.list(p).find(x=>x.id===i);if(!cell||!N.needsDataset(cell.kind))throw Error('A dataset analysis cell is required.');el.disabled=true;D.get(cell.dataset).then(row=>{if(!row)throw Error('Source dataset removed.');const result=N.analyze(cell,E.parseCsv(row.source),E);update(id,current=>{const found=N.list(current).find(x=>x.id===i);if(!found||found.updated!==cell.updated)throw Error('Cell changed during calculation.');return {...current,notebook:N.list(current).map(x=>x.id===i?{...x,output:result}:x)};});toast('Cell executed.');}).catch(err=>toast(err.message)).finally(()=>{el.disabled=false;});break;}
case 'move-cell':{const [cid,delta]=String(i).split('/');update(id,p=>N.move(p,cid,Number(delta)));break;}
case 'delete-cell':if(confirm('Delete cell and output?')){update(id,p=>N.remove(p,i));location.hash='research/'+id+'/notebook';}break;
case 'export-notebook':if(p)exportData('common-research-notebook.json',{project:p.name,version:N.VERSION,cells:N.list(p)});break;
case 'search-project-files':if(p)searchProjectFiles(p);break;
case 'new-file':show('Create project file',form('new-file:'+id,field('path','Relative path','research/notes.md')+'<label for="new-file-source">Source editor</label><textarea id="new-file-source" class="source-editor" name="content" maxlength="40000" spellcheck="false"></textarea>','Create file'));break;
case 'export-file':{const f=F.list(p).find(x=>x.id===i);if(!f)throw Error('File not found.');const url=URL.createObjectURL(new Blob([f.content],{type:'text/plain;charset=utf-8'})),el=document.createElement('a');el.href=url;el.download=f.path.split('/').pop();el.click();setTimeout(()=>URL.revokeObjectURL(url),500);break;}
case 'delete-file':if(confirm('Delete this file and its revisions?')){update(id,p=>F.remove(p,i));location.hash='research/'+id+'/files';}break;
case 'restore-file':{const [fid,n]=String(i).split('/');if(confirm('Restore this revision as a new version?'))update(id,p=>F.restore(p,fid,Number(n)));break;}
case 'cancel-quant':if(activeQuant?.id===id)activeQuant.cancel();else toast('No active analysis in this project.');break;
case 'export-validation':{const r=(p.validations||[]).find(x=>x.id===i);if(r)exportData('common-walk-forward.json',r);break;}
case 'delete-validation':if(confirm('Delete this validation report?')){update(id,p=>({...p,validations:(p.validations||[]).filter(x=>x.id!==i)}));location.hash='research/'+id+'/validation';}break;
case 'unwatch':save({...s,watch:s.watch.filter(x=>x!==id)});break;
case 'inspect':report(p,Number(i),'overview');break;
case 'report':{const [index,tab]=String(i).split('/');report(p,Number(index),tab);break;}
case 'export-run':exportData('common-research-run.json',p.runs[Number(i)]);break;
case 'share-run':{const r=p?.runs[Number(i)];if(!r)throw Error('Research run not found.');reviewShare(CommonResearchDraft.backtest(p.name,r,{sha256:r.dataset?.sha256,first:r.diagnostics?.first,last:r.diagnostics?.last}));break;}
case 'share-python':{const r=p?.pythonRuns?.find(run=>run.id===i);if(!r)throw Error('Python run not found.');reviewShare(CommonResearchDraft.python(r));break;}
case 'share-risk':{const r=(s.riskRuns||[]).find(run=>run.id===id);if(!r)throw Error('Portfolio report not found.');reviewShare(CommonResearchDraft.portfolio(r));break;}
case 'export-project':exportData('common-project.json',p);break;
case 'export-source-bundle':{const contents=CommonProjectBundle.serialize(p);exportData('common-project-sources.json',JSON.parse(contents));break;}
case 'duplicate-project':{const copy=CommonProjectBundle.copy(p,M.project);save({...s,projects:[...s.projects,copy]});location.hash='research/'+copy.id+'/notes';break;}
case 'toggle-project-archive':{if(!p)throw Error('Project unavailable.');update(id,current=>({...current,archived:!current.archived}));projectStatus=p.archived?'active':'archived';location.hash='research';break;}
case 'delete-project':if(confirm('Delete project and research runs?')){save({...s,projects:s.projects.filter(x=>x.id!==id)});location.hash='research';}break;
case 'memo':{const m=s.proposals.find(x=>x.id===id);show('Memorandum',form('edit-memo:'+id,field('title','Title',m.title)+area('thesis','Evidence, risk and conflicts',m.thesis))+b('delete-memo:'+id,'Delete draft'));break;}
case 'delete-memo':if(confirm('Delete private draft?')){save({...s,proposals:s.proposals.filter(x=>x.id!==id)});dialog.close();}break;
case 'export-ledger':exportData('common-simulation.json',{mode:'simulation',cash:s.cash,orders:s.orders});break;
case 'reset-paper':if(confirm('Reset simulation?'))save({...s,cash:100000,orders:[]});break;
case 'export-all':if(blocked){const raw=localStorage.getItem(key);exportData('common-recovery.json',{raw});}else exportData('common-workspace.json',s);break;
case 'reset-all':if(confirm('Delete all browser-local workspace data and saved CSV sources?')){D.clear().then(()=>{localStorage.removeItem(key);s=M.initial();blocked=false;return refreshDatasets();}).then(render).catch(err=>toast(err.message));}break;
}}catch(err){toast(err.message);}});
dialog.addEventListener('close',()=>{if(!dialog.open)dialog.replaceChildren();});
dialog.addEventListener('click',e=>{if(e.target.closest('a[href^="#"]'))dialog.close();});
document.addEventListener('submit',async e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();const [act,id,detail]=f.getAttribute('data-form').split(':'),d=Object.fromEntries(new FormData(f)),submit=f.querySelector('button[type=submit],button.primary');if(submit)submit.disabled=true;try{switch(act){
case 'handoff':if(CommonResearchDraft.stage({title:d.title.trim().slice(0,160),body:d.body.trim()}))location.assign('../live/');break;
case 'risk-run':{if((s.riskRuns||[]).length>=10)throw Error('Export and delete an existing report before adding another (limit ten).');const chosen=[];for(let i=0;i<8;i++){if(!d['asset'+i])continue;const row=await D.get(d['asset'+i]);if(!row)throw Error('Dataset not found.');if(d['weight'+i]==='')throw Error('Enter each selected weight.');chosen.push({id:row.id,label:row.symbol||row.name,weight:Number(d['weight'+i])/100,bars:E.parseCsv(row.source).bars});}const report={id:crypto.randomUUID(),at:new Date().toISOString(),...K.analyze(chosen,{capital:d.capital,fee:d.fee})};save({...s,riskRuns:[...(s.riskRuns||[]),report]});location.hash='risk/'+report.id+'/overview';break;}
case 'import-dataset':{if(d.csv.size>D.MAX_BYTES)throw Error('CSV exceeds 16 MB.');const row=await D.inspect(await d.csv.text(),d.csv.name,d.symbol,E);const result=await D.put(row);await refreshDatasets();location.hash='datasets/'+result.id+'/overview';render();break;}
case 'execute-python':{
  if(d.consent!=='on')throw Error('Review and consent required.');
  if((s.projects.find(x=>x.id===id)?.pythonRuns||[]).length>=10)throw Error('Export and delete an existing run before starting another (limit ten).');
  const request=P.input(d.code,new FormData(f).getAll('pkg'));
  const result=await executePython(id,request);
  if(!s.projects.some(x=>x.id===id))throw Error('Project removed.');
  update(id,p=>({...p,pythonRuns:[...(p.pythonRuns||[]),{id:crypto.randomUUID(),...result,...request}]}));
  toast('Saved to this browser.');
  return;
}
case 'execute-python-cell':{
  if(pythonJob)throw Error('A Python execution is already running in this tab.');
  if(d.consent!=='on')throw Error('Review and consent required.');
  const project=s.projects.find(x=>x.id===id),cell=project&&N.list(project).find(x=>x.id===detail);
  if(cell?.kind!=='python'||cell.text!==f.dataset.reviewedSource)throw Error('Reopen the run dialog to review the current Python source.');
  const request=P.input(cell.text,new FormData(f).getAll('pkg'));
  dialog.close();
  const result=await executePython(pythonTarget(id,detail),request);
  if(!s.projects.some(x=>x.id===id))throw Error('Project removed. No output was saved.');
  update(id,p=>N.recordPython(p,cell,request,result));
  toast(result.ok?'Python cell completed.':'Python cell stopped or failed. See saved output.');
  return;
}
case 'save-cell':{const p=s.projects.find(x=>x.id===id);if(!p)throw Error('Project not found.');const next=N.write(p,d,detail);update(id,()=>next);location.hash='research/'+id+'/notebook';break;}
case 'new-file':{const p=s.projects.find(x=>x.id===id);if(!p)throw Error('Project not found.');const next=F.write(p,d.path,d.content);update(id,()=>next);location.hash='research/'+id+'/files/'+next.files.at(-1).id;break;}
case 'edit-file':update(id,p=>F.write(p,d.path,d.content,detail));break;
case 'validate':{if(activeQuant)throw Error('An analysis is already running.');if((s.projects.find(p=>p.id===id)?.validations||[]).length>=5)throw Error('Export and delete an existing validation report before starting another (limit five per project).');const {source,name}=await resolveSource(d);const progress=document.querySelector('#quant-progress');if(progress)progress.textContent='Computing parameter grid and walk-forward folds in background worker…';const result=await startQuant(source,name,{fast:d.fast,slow:d.slow,train:d.train,test:d.test,fee:d.fee},id);if(!s.projects.some(p=>p.id===id))throw Error('Project was removed.');update(id,p=>({...p,validations:[...(p.validations||[]),result]}));location.hash='research/'+id+'/validation/'+result.id;break;}
case 'watch':{const x=M.symbol(d.symbol);if(s.watch.includes(x))throw Error('Already tracked.');save({...s,watch:[...s.watch,x]});break;}
case 'import-project':{const file=d.bundle;if(!file?.size||file.size>CommonProjectBundle.MAX_BYTES)throw Error('Choose a project source bundle up to 2 MB.');const p=CommonProjectBundle.restore(CommonProjectBundle.read(await file.text()),M.project);save({...s,projects:[...s.projects,p]});location.hash='research/'+p.id+'/notes';break;}
case 'project':{const p=M.project(d.name);p.notes=Object.hasOwn(CommonProjectBundle.templates,d.template)?CommonProjectBundle.templates[d.template]:'';save({...s,projects:[...s.projects,p]});location.hash='research/'+p.id+'/notes';break;}
case 'notes':update(id,p=>({...p,notes:String(d.notes).slice(0,10000)}));break;
case 'rename':update(id,p=>({...p,name:M.label(d.name)}));break;
case 'run':{const {source,name}=await resolveSource(d);const parsed=E.parseCsv(source),r=E.backtest(parsed.bars,{strategy:d.strategy,fast:Number(d.fast),slow:Number(d.slow),costBps:Number(d.fee),holdout:Number(d.holdout)/100});if(!s.projects.some(p=>p.id===id))throw Error('Project no longer exists.');const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)),sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');const bootstrap=r.test.observations>=15?E.bootstrap(r.returns.slice(-r.test.observations),{paths:300,seed:42,block:5}):null;const record=R.summarize(r,parsed,{name,sha256,rows:parsed.bars.length,engine:E.VERSION},bootstrap);update(id,p=>({...p,runs:[...p.runs,record]}));location.hash='research/'+id+'/runs';break;}
case 'trade':save(M.trade(s,d));break;
case 'memo':save({...s,proposals:[...s.proposals,M.proposal(d.title,d.thesis)]});break;
case 'edit-memo':save({...s,proposals:s.proposals.map(p=>p.id===id?{...M.proposal(d.title,d.thesis),id}:p)});break;
case 'settings':save(M.settings(s,d));break;
}if(dialog.open)dialog.close();toast('Saved to this browser.');}catch(err){const progress=f.getAttribute('data-form').startsWith('validate:')?document.querySelector('#quant-progress'):null;if(progress)progress.textContent=err.message;toast(err.message);}finally{if(submit)submit.disabled=false;}});
document.addEventListener('change',e=>{const el=e.target.closest('[data-python-file]');if(el)location.hash=el.dataset.pythonFile+(el.value?'/'+el.value:'');
const cellEditor=e.target.closest('form[data-form^="save-cell:"] select[name="kind"]');
if(cellEditor){
  const f=cellEditor.form,kind=cellEditor.value;
  f.querySelector('[data-notebook-dataset]').hidden=!N.needsDataset(kind);
  const parameters=f.querySelector('[data-notebook-backtest]');
  parameters.hidden=parameters.disabled=kind!=='backtest';
  f.elements.text.required=kind==='python';
  f.querySelector('[data-notebook-source-label]').textContent=kind==='python'?'Python source':'Research context and assumptions';
}});document.addEventListener('input',event=>{
 const target=event.target;
 if(target.id==='project-search')projectSearch=target.value;
 else if(target.name==='project-status')projectStatus=target.value;
 else return;
 const results=document.querySelector('#project-results');
 if(results)results.innerHTML=projectRows();
});
window.addEventListener('hashchange',()=>{if(dataLoaded)render();});document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();document.querySelector('[data-act="search"]')?.click();}});app.textContent='Loading research workspace…';refreshDatasets().then(render);
})();