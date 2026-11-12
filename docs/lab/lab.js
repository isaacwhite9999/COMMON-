/* COMMON Research Studio. Real member-owned storage; real locally uploaded data.
 * Nothing here is live brokerage, exchange-licensed quotes, or an AI trading oracle.
 */
(() => {
'use strict';
const root=document.getElementById('lab-root');
const config=window.COMMON_CONFIG||{};
const engine=window.COMMON_RESEARCH_ENGINE;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const clean=s=>String(s??'').trim();
const id=()=>state.selected;
const formatPct=v=>v===null||!Number.isFinite(v)?'—':(v*100).toFixed(2)+'%';
const formatNum=v=>v===null||!Number.isFinite(v)?'—':Number(v).toFixed(2);
const niceDate=x=>x?new Date(x).toLocaleDateString():'—';
const api=async q=>{const r=await q;if(r.error)throw r.error;return r.data;};
const lessons=[
 ['hypothesis','Form a falsifiable hypothesis','A good hypothesis says what observation would prove you wrong. Avoid choosing parameters after reading the test period.',
  'A quantitative hypothesis needs a measurable prediction, time horizon, instrument universe, source and falsification test. Record the null hypothesis and avoid HARKing.'],
 ['provenance','Establish data provenance','Know where the prices came from. Adjusted close is normally preferable for equities.',
  'Trace timestamps, time zones, total-return adjustments, corporate actions, revisions, symbol survivorship, missing observations and exchange licensing.'],
 ['lookahead','Avoid lookahead bias','A strategy cannot act on today’s closing price before that price exists.',
  'Signals from bar t−2 apply to return from close t−1 through t. A full bar of decision delay prevents same-bar close fills; it does not model opening spreads.'],
 ['holdout','Protect out-of-sample data','Do not tune a strategy on the period you call a test.',
  'Use time-ordered train/test segmentation. Repeated OOS checks consume the holdout. Walk-forward nested validation is required before strong conclusions.'],
 ['costs','Include trading costs','A strategy may look profitable until you count fees and slippage.',
  'Net daily return = position × daily return − |position change| × (fee + slippage in bps)/10,000. This approximates commissions and market impact.'],
 ['sharpe','Interpret risk-adjusted performance','Sharpe compares average excess return with volatility, not the probability of a profit.',
  'Annualized Sharpe = √252 × mean(daily return − daily risk-free rate) / sample standard deviation. It is unstable on short and non-normal samples.'],
 ['drawdown','Measure maximum drawdown','Drawdown is the worst decline from a previous equity peak.',
  'At time t, D_t = Equity_t / max(Equity_0...Equity_t) − 1. The minimum D_t is historical maximum drawdown, not a future bound.'],
 ['bootstrap','Read Monte Carlo cautiously','Resampling past returns helps visualize uncertainty. It cannot predict a crash.',
  'Seeded circular block bootstrap approximately preserves short serial dependence. Results are conditional on the observed sample and omit regime breaks, tail dependence and execution constraints.']
];
let client=null,session=null;
const state={view:'overview',projects:[],runs:[],progress:[],selected:null,bars:null,diagnostics:null,sourceSha:null,sourceLabel:'',
  lastRun:null,sim:null,busy:false,error:'',notice:'',expert:false,lesson:'hypothesis',working:false,uploading:false};
function info(msg){state.notice=msg;state.error='';render();}
function fail(err){console.error(err);state.error=err?.message||String(err);state.notice='';render();}
function safe(fn){return async ev=>{ev?.preventDefault?.();if(state.busy)return;state.busy=true;try{await fn(ev);}catch(e){fail(e);}finally{state.busy=false;}};}
function current(){return state.projects.find(p=>p.id===id())||null;}
function action(text,cmd,secondary=false,attrs=''){
 return '<button type="button" class="lab-button'+(secondary?' secondary':'')+'" data-action="'+cmd+'" '+attrs+'>'+esc(text)+'</button>';
}
function hdr(title,subtitle){
 return '<div class="lab-section-head"><div><div class="lab-eyebrow">COMMON / RESEARCH STUDIO</div><h1>'+esc(title)+'</h1><p>'+esc(subtitle)+'</p></div>'+
   '<div class="lab-head-actions">'+action(state.expert?'Beginner guidance':'Expert detail','level',true)+'</div></div>';
}
function breadcrumbs(){const p=current();return '<div class="lab-crumb"><a href="../live/">← COMMON</a><span>/</span><span>'+esc(p?.title||'My research')+'</span><span class="lab-pill">PRIVATE</span></div>';}
function sidebar(){
 const nav=[['overview','Overview','▦'],['workspaces','Projects','◫'],['data','Data desk','▤'],['strategy','Strategy lab','⌁'],['validate','Validation','◉'],['catalog','Data & tools','⊞'],['guide','Instructor','◇']];
 return '<aside class="lab-sidebar"><div class="lab-brand"><span class="lab-mark">c</span><span>common<span class="lab-brand-dot">.</span></span></div>'+
 '<div class="lab-brand-caption">RESEARCH STUDIO <span>v1</span></div><nav class="lab-nav" aria-label="Research tools">'+
 nav.map(n=>'<button class="'+(state.view===n[0]?'active':'')+'" data-nav="'+n[0]+'"><span aria-hidden="true">'+n[2]+'</span>'+n[1]+'</button>').join('')+
 '</nav><div class="lab-side-bottom"><p>Advanced research should be understandable to everyone.</p><a href="../live/">← Return to social network</a></div></aside>';
}
function coach(section){
 const map={
 overview:['Start with a question you could prove wrong. Then identify a dataset that can fairly test it.',
   'Your research process should separate exploratory work from confirmatory testing. Every conclusion must specify a universe, data vintage, assumptions and uncertainty.'],
 workspaces:['A project is a notebook for one clear investing question, not an instruction to buy.',
   'State the null and alternative hypotheses, selection criteria and a precommitted evaluation metric. Keep decisions reproducible.'],
 data:['Upload your own dated price history. We will validate it here, in your browser, without storing the raw CSV.',
   'Missing sessions, timestamp inconsistencies, dividend/split adjustment, point-in-time membership and survivorship can bias estimated returns. Use licensed, documented data.'],
 strategy:['Choose the rule and its parameters before you inspect the holdout results.',
   'Signals are lagged two closes to avoid same-close hindsight. Cost models are approximations; spreads, volume constraints, shorting and taxes are not simulated.'],
 validate:['The test period is where your strategy has not been tuned. Compare against buy-and-hold.',
   'Out-of-sample performance is contaminated if you repeatedly adjust parameters on it. Sharpe and drawdown are sample statistics, not guarantees.'],
 catalog:['Features needing a market-data vendor are marked as unavailable rather than displaying imaginary numbers.',
   'Consolidated feeds, derivatives greeks, L2 order books, rolling continuous futures, SEC filings and FRED data each have distinct licenses and data-quality hazards.'],
 guide:['Complete each lesson while you work. The instructor explains what, why and how.',
   'Use preregistration, unbiased benchmark comparison, transaction-cost accounting, scenario analysis and independent review before interpreting performance.']
 };
 const a=map[section]||map.overview;
 return '<aside class="lab-coach"><div class="lab-coach-head"><span class="lab-coach-dot"></span><div><strong>Your research instructor</strong><span>'+(state.expert?'Advanced methods':'Step-by-step guidance')+'</span></div></div>'+
 '<p>'+esc(state.expert?a[1]:a[0])+'</p><div class="lab-coach-bottom"><button data-nav="guide">Explore the methods →</button><span>Education, not financial advice</span></div></aside>';
}
function alerts(){return (state.error?'<div class="lab-alert error" role="alert">'+esc(state.error)+'</div>':'')+
 (state.notice?'<div class="lab-alert" role="status">'+esc(state.notice)+'</div>':'');}
function workspaceOption(){
 return '<label class="lab-label" for="active-project">Active project</label><select class="lab-input" id="active-project" style="max-width:520px">'+
 '<option value="">Select a project</option>'+
 state.projects.map(p=>'<option value="'+esc(p.id)+'"'+(id()===p.id?' selected':'')+'>'+esc(p.title)+'</option>').join('')+'</select>';
}
function overview(){
 return hdr('Think rigorously. Invest independently.','A real workspace for research, backtests and financial methods—not invented market data.')+
 '<div class="lab-grid3"><div class="lab-stat"><span>Your projects</span><strong>'+state.projects.length+'</strong><small>Private and persistent</small></div>'+
 '<div class="lab-stat"><span>Saved experiments</span><strong>'+state.runs.length+'</strong><small>Client-calculated, unaudited</small></div>'+
 '<div class="lab-stat"><span>Lessons completed</span><strong>'+state.progress.filter(x=>x.completed).length+' / '+lessons.length+'</strong><small>Learning history saved</small></div></div>'+
 '<div class="lab-card"><h2>Research protocol</h2><div class="lab-steps">'+
 [['01','Form a thesis','Write a question someone could disprove.','workspaces'],['02','Inspect data','Import an actual historical CSV and check quality.','data'],['03','Test a rule','Run a lagged, fee-aware backtest.','strategy'],['04','Challenge results','Check holdout performance and risk.','validate']]
 .map(x=>'<button class="lab-step" data-nav="'+x[3]+'"><span>'+x[0]+'</span><div><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div><b>↗</b></button>').join('')+'</div></div>'+
 '<div class="lab-card"><div class="lab-split"><div><h2>Pick up where you left off</h2><p>No automatic trades. No fake balances. Data remains yours.</p></div>'+action('Create project','new-project')+'</div>'+
 (state.projects.length?'<div class="lab-item-list">'+state.projects.slice(0,5).map(p=>projectCard(p)).join('')+'</div>':'<div class="lab-empty">Your projects will appear here after you create one.</div>')+'</div>';
}
function projectCard(p){
 const count=state.runs.filter(x=>x.workspace_id===p.id).length;
 return '<div class="lab-project"><div><div class="lab-project-tag">'+esc(p.asset_class)+' · '+esc(p.lifecycle)+'</div><strong>'+esc(p.title)+'</strong><p>'+esc(p.hypothesis||'No hypothesis recorded yet.')+'</p><small>'+count+' experiments · Updated '+niceDate(p.updated_at)+'</small></div>'+
 action('Open','open-project',true,'data-id="'+esc(p.id)+'"')+'</div>';
}
function workspaces(){
 const p=current();
 return hdr('Research projects','Each research question has a private, persistent workspace.')+
 '<div class="lab-card"><div class="lab-split"><h2>Your projects</h2>'+action('New research project','new-project')+'</div>'+
 (state.projects.length?'<div class="lab-item-list">'+state.projects.map(projectCard).join('')+'</div>':'<div class="lab-empty">Nothing saved yet. Create a project to begin.</div>')+'</div>'+
 (p?'<div class="lab-card"><h2>Workspace notes</h2><p>Describe a hypothesis and why it might fail. No trade is placed.</p>'+
 '<form id="notes-form" class="lab-form"><label class="lab-label">Project title<input class="lab-input" name="title" minlength="3" maxlength="110" required value="'+esc(p.title)+'"></label>'+
 '<label class="lab-label">Falsifiable hypothesis<textarea class="lab-input" name="hypothesis" maxlength="5000" rows="4" placeholder="Example: Trend-following on this asset produces better out-of-sample risk-adjusted results than buy-and-hold after fees.">'+esc(p.hypothesis)+'</textarea></label>'+
 '<label class="lab-label">Observations and counterarguments<textarea class="lab-input" name="notes" maxlength="12000" rows="5">'+esc(p.research_notes)+'</textarea></label>'+
 '<div class="lab-split">'+action('Delete project','delete-project',true)+
 '<button class="lab-button" type="submit">Save changes</button></div></form></div>':'')+
 '<div id="create-project-dialog" class="lab-card" hidden><h2>New project</h2><form id="create-form" class="lab-form">'+
 '<label class="lab-label">Name<input class="lab-input" name="title" minlength="3" maxlength="110" required placeholder="e.g. Momentum versus buy-and-hold"></label>'+
 '<label class="lab-label">Asset type<select class="lab-input" name="asset_class"><option value="equity">US equity</option><option value="etf">Exchange-traded fund</option><option value="futures">Futures research</option><option value="equity_options">Options research</option><option value="macro">Macro / economics</option><option value="housing">Housing</option><option value="business">Local business</option></select></label>'+
 '<label class="lab-label">Instrument (optional)<input class="lab-input" name="symbol" maxlength="30" placeholder="e.g. SPY"></label>'+
 '<label class="lab-label">Hypothesis<textarea class="lab-input" name="hypothesis" maxlength="5000" rows="3" placeholder="What observation would falsify the idea?"></textarea></label>'+
 '<div class="lab-row"><button type="submit" class="lab-button">Create workspace</button>'+action('Cancel','close-create',true)+'</div></form></div>';
}
function dataDesk(){
 const d=state.diagnostics;
 return hdr('Data desk','Analyze your own dated prices; no quotes or fake datasets are supplied.')+
 '<div class="lab-card"><h2>Import historical prices</h2><p>Use an authorized CSV with a Date column (YYYY-MM-DD) and Close or Adjusted Close. 30–100,000 rows, up to 16 MB. No server upload.</p>'+
 '<label class="lab-upload" for="price-file"><strong>Choose your OHLCV CSV</strong><span>'+esc(state.sourceLabel||'Date, Open, High, Low, Close, Volume')+'</span></label>'+
 '<input type="file" id="price-file" accept=".csv,text/csv,text/plain" style="max-width:100%;margin:14px 0">'+
 '<div class="lab-hint">Data is parsed locally. Only a filename, SHA-256 digest, sample dates and computed experiment metrics may be saved to Supabase.</div></div>'+
 (d?'<div class="lab-card"><h2>Import diagnostics</h2><div class="lab-grid3"><div class="lab-stat"><span>Observations</span><strong>'+d.rows+'</strong></div>'+
 '<div class="lab-stat"><span>First date</span><strong class="smallvalue">'+esc(d.first)+'</strong></div><div class="lab-stat"><span>Last date</span><strong class="smallvalue">'+esc(d.last)+'</strong></div></div>'+
 '<div class="lab-hint">'+esc(d.warning)+'</div>'+
 '<div class="lab-hint">'+(d.sortedInput?'Dates were in order.':'Rows were sorted by date; verify the source feed.')+
 (d.totalLargeGaps?' · '+d.totalLargeGaps+' gaps longer than 7 days detected.':' · No gaps longer than 7 days.')+
 '</div><h3>Observed closing prices</h3>'+lineChart(state.bars.map(x=>x.close),state.bars.map(x=>x.date),'Observed close')+
 '<div class="lab-row">'+action('Continue to strategy lab','to-strategy')+'</div></div>':
 '<div class="lab-card lab-empty">Choose a CSV to inspect data quality and unlock strategy testing.</div>');
}
function lineChart(values,dates,label){
 if(!values||values.length<2)return '<p>Not enough observations to chart.</p>';
 const w=750,h=210,left=22,top=18,bottom=195;
 const lo=Math.min(...values),hi=Math.max(...values),range=Math.max(1e-9,hi-lo);
 const stride=Math.max(1,Math.ceil(values.length/350));
 const pts=[];
 for(let i=0;i<values.length;i+=stride){
  const x=left+(i/(values.length-1))*(w-left-16);
  const y=bottom-(values[i]-lo)/range*(bottom-top);
  pts.push(x.toFixed(2)+','+y.toFixed(2));
 }
 if((values.length-1)%stride!==0){pts.push((w-16)+','+(bottom-(values[values.length-1]-lo)/range*(bottom-top)).toFixed(2));}
 return '<figure class="lab-chart" role="img" aria-label="'+esc(label)+' over '+esc(dates?.[0])+' through '+esc(dates?.at(-1))+'">'+
 '<svg viewBox="0 0 750 210" xmlns="http://www.w3.org/2000/svg"><path d="M22 18 V195 H734" fill="none" stroke="#d9e3ef" stroke-width="1"/>'+
 '<polyline points="'+pts.join(' ')+'" fill="none" stroke="#4477ee" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/></svg>'+
 '<figcaption>'+esc(label)+' · '+esc(dates?.[0])+' — '+esc(dates?.at(-1))+' · Min '+formatNum(lo)+' · Max '+formatNum(hi)+'</figcaption></figure>';
}
function metric(label,value,detail=''){return '<div class="lab-metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong>'+(detail?'<small>'+esc(detail)+'</small>':'')+'</div>';}
function runSummary(r){
 if(!r)return '';
 return '<div class="lab-card"><h2>Computed result</h2><p><strong>'+esc(r.params.strategy.replace('_',' '))+'</strong> · In-sample ends '+esc(r.trainThrough)+' · Holdout begins '+esc(r.testFrom)+'</p>'+
 '<div class="lab-grid3">'+metric('Holdout total return',formatPct(r.test.totalReturn))+
 metric('Benchmark holdout',formatPct(r.baseline.totalReturn))+
 metric('Holdout Sharpe',formatNum(r.test.sharpe))+
 metric('Holdout max drawdown',formatPct(r.test.maxDrawdown))+
 metric('Holdout volatility',formatPct(r.test.annualVolatility))+
 metric('Position changes',String(r.turnover))+'</div>'+
 lineChart(r.test.curve,r.dates.slice(-r.test.observations),'Holdout strategy equity (start = 1.0)')+
 '<div class="lab-hint">'+esc(r.warning)+'</div>'+
 '<div class="lab-row">'+action('Inspect validation','to-validation')+'</div></div>';
}
function strategy(){
 return hdr('Strategy lab','Execute a simple, reproducible cost-aware strategy using your own price series.')+
 workspaceOption()+'<div class="lab-card"><h2>Set strategy assumptions</h2>'+
 '<form id="run-form" class="lab-form">'+
 '<div class="lab-grid2"><label class="lab-label">Strategy<select name="strategy" class="lab-input"><option value="sma_crossover">Long-only SMA crossover</option><option value="buy_hold">Buy and hold benchmark</option></select></label>'+
 '<label class="lab-label">Trading costs, basis points<input class="lab-input" type="number" name="cost" min="0" max="1000" step="1" value="10"></label>'+
 '<label class="lab-label">Fast SMA days<input class="lab-input" type="number" name="fast" min="2" max="1000" value="10"></label>'+
 '<label class="lab-label">Slow SMA days<input class="lab-input" type="number" name="slow" min="3" max="1000" value="30"></label>'+
 '<label class="lab-label">Held-out test fraction<select class="lab-input" name="holdout"><option value="0.30">30% chronological holdout</option><option value="0.20">20% chronological holdout</option><option value="0.40">40% chronological holdout</option></select></label>'+
 '<label class="lab-label">Risk-free rate (% annually)<input class="lab-input" type="number" name="rf" min="0" max="50" step=".1" value="0"></label></div>'+
 '<div class="lab-hint">Signal from day t−2 is applied to close-to-close return t−1 → t. Costs are charged on position changes. No future prices or order execution are used.</div>'+
 '<button type="submit" class="lab-button">Run actual calculation</button></form></div>'+
 (state.bars?'': '<div class="lab-alert">Import a real CSV in the Data desk before running a backtest.</div>')+
 runSummary(state.lastRun);
}
function validation(){
 const r=state.lastRun,sim=state.sim;
 return hdr('Validation & risk','Never confuse a backtest with evidence that you can predict the market.')+
 (!r?'<div class="lab-card lab-empty">Run a strategy first, using imported historical prices. There are no example returns on this screen.</div>':
 '<div class="lab-card"><h2>Time-ordered evaluation</h2><p>Training ended '+esc(r.trainThrough)+'. Holdout began '+esc(r.testFrom)+'. Parameters should not be retuned using these holdout results.</p>'+
 '<div class="lab-grid3">'+metric('Training total return',formatPct(r.train.totalReturn))+
 metric('Holdout total return',formatPct(r.test.totalReturn))+
 metric('Holdout benchmark return',formatPct(r.baseline.totalReturn))+
 metric('Holdout max drawdown',formatPct(r.test.maxDrawdown))+
 metric('Holdout annual volatility',formatPct(r.test.annualVolatility))+
 metric('Holdout Sharpe',formatNum(r.test.sharpe))+'</div>'+
 '<div class="lab-hint">Annualization uses 252 trading days; irregularly spaced observations and data gaps can distort these metrics. Risk-free rate is explicit. Results are gross of tax and borrow costs.</div></div>'+
 '<div class="lab-card"><h2>Seeded block-bootstrap scenarios</h2><p>Resample observed holdout returns in 5-day blocks. These are conditional sensitivity experiments, not forecasts.</p>'+
 action('Compute 300 scenarios','bootstrap')+
 (sim?'<div class="lab-grid3">'+metric('5th percentile return',formatPct(sim.percentiles.p05))+
 metric('Median simulated return',formatPct(sim.percentiles.p50))+
 metric('95th percentile return',formatPct(sim.percentiles.p95))+
 metric('Fraction with loss',formatPct(sim.probabilityOfLoss))+
 metric('Paths',String(sim.paths))+
 metric('Random seed',String(sim.seed))+'</div><div class="lab-hint">'+esc(sim.caution)+'</div>':'')+'</div>'+
 '<div class="lab-card"><h2>Save an experiment</h2><p>Save assumptions, source digest and calculated metrics under your private workspace. The CSV remains on this device.</p>'+
 action('Save this experiment','save-run')+'</div>')+
 '<div class="lab-card"><h2>Your saved runs</h2>'+
 (state.runs.length?state.runs.map(x=>'<div class="lab-project"><div><strong>'+esc(x.strategy.replaceAll('_',' '))+'</strong>'+
 '<p>'+esc(x.source_label||'Local data')+' · '+esc(x.sample_start)+' through '+esc(x.sample_end)+'</p>'+
 '<small>Holdout return: '+formatPct(x.metrics?.holdout?.totalReturn)+' · '+niceDate(x.created_at)+' · Unverified client calculation</small></div>'+
 action('Delete','delete-run',true,'data-id="'+esc(x.id)+'"')+'</div>').join(''):
 '<div class="lab-empty">No experiments saved yet.</div>')+'</div>';
}
function catalog(){
 const rows=[
 ['US stocks & ETFs','CSV historical OHLCV import','Working','Upload sourced daily bars with adjustments. No real-time quotes.'],
 ['Backtests','Long-only SMA and buy-and-hold','Working','Deterministic, one-day delayed signals and explicit fees.'],
 ['Walk-forward / Monte Carlo','Chronological holdout and seeded bootstrap','Working','Not nested walk-forward optimization or probabilistic forecasts.'],
 ['SEC EDGAR','Issuer filings and proxy documents','Public external resource','Open official filings; API ingestion needs a separate module.'],
 ['FRED','Macroeconomic time series','Public external resource','External source; data feeds require provenance.'],
 ['Futures contracts','Continuous futures and rolls','Not connected','Needs licensed contract histories and adjustment policy.'],
 ['Options chains','Greeks, open interest and pricing','Not connected','Requires historical options data, calendar, curve and volatility methods.'],
 ['Trade ticks & order flow','L1 quotes, L2 ten-depth book','Not connected','Paid exchange licensing and storage infrastructure.'],
 ['Python / Pine / NinjaScript','Secure research execution and adapters','Not connected','Needs sandboxes, worker service and language integrations.'],
 ['Cloud compute and autonomous agents','Managed research jobs','Not connected','Requires hosted compute, budgets, access controls and evaluated agents.'],
 ['Brokerage and prop simulation','Paper fills, venue rules','Not connected','No orders, copy trading, accounts or fictitious fills are available.']
 ];
 return hdr('Data & tools','Coverage status is explicit: operational, source-linked or not yet connected.')+
 '<div class="lab-card"><h2>Coverage inventory</h2>'+
 '<div class="lab-table">'+rows.map(x=>'<div class="lab-data-row"><div><strong>'+esc(x[0])+'</strong><small>'+esc(x[1])+'</small></div><span class="lab-pill '+(x[2]==='Working'?'good':'')+'">'+esc(x[2])+'</span><p>'+esc(x[3])+'</p></div>').join('')+'</div></div>'+
 '<div class="lab-card"><h2>Primary sources</h2><p>Use timestamped primary data rather than social-media claims.</p>'+
 '<div class="lab-links"><a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer">SEC EDGAR ↗</a>'+
 '<a href="https://fred.stlouisfed.org/" target="_blank" rel="noopener noreferrer">FRED ↗</a>'+
 '<a href="https://www.investor.gov/" target="_blank" rel="noopener noreferrer">Investor.gov ↗</a></div></div>';
}
function instructor(){
 const l=lessons.find(x=>x[0]===state.lesson)||lessons[0],complete=state.progress.some(x=>x.lesson_key===l[0]&&x.completed);
 return hdr('Research instructor','Beginner language when you need it; graduate-level detail when you want it.')+
 '<div class="lab-guide-layout"><div class="lab-card"><h2>Research curriculum</h2><div class="lab-lesson-list">'+
 lessons.map(x=>'<button class="'+(x[0]===l[0]?'active':'')+'" data-lesson="'+x[0]+'">'+
 '<span>'+(state.progress.some(p=>p.lesson_key===x[0]&&p.completed)?'✓':'○')+'</span>'+esc(x[1])+'</button>').join('')+'</div></div>'+
 '<div class="lab-card"><div class="lab-eyebrow">YOUR INSTRUCTOR</div><h2>'+esc(l[1])+'</h2>'+
 '<h3>Beginner explanation</h3><p>'+esc(l[2])+'</p>'+
 '<h3>Advanced methodology</h3><p>'+esc(l[3])+'</p>'+
 '<div class="lab-row">'+action(complete?'Mark incomplete':'Mark lesson complete','toggle-lesson',false,'data-id="'+l[0]+'"')+
 action('Open relevant screen','lesson-to-screen',true)+'</div></div></div>';
}
function layout(){
 root.innerHTML=sidebar()+'<div class="lab-main">'+breadcrumbs()+'<main>'+alerts()+
 (state.view==='overview'?overview():state.view==='workspaces'?workspaces():state.view==='data'?dataDesk():
 state.view==='strategy'?strategy():state.view==='validate'?validation():state.view==='catalog'?catalog():instructor())+
 '</main>'+coach(state.view)+'<footer class="lab-footer">COMMON Research Studio · Educational research only · No brokerage, trading, custody or investment recommendation · Client results are not independently audited</footer></div>';
}
function authScreen(){
 root.innerHTML='<div class="lab-auth"><div class="lab-auth-card"><div class="lab-brand"><span class="lab-mark">c</span>common.</div><h1>Research Studio</h1><p>Sign in to COMMON first. Your projects and results will be saved privately to your account.</p>'+
 '<a class="lab-button" href="../live/">Sign in to COMMON</a><p class="lab-hint">Data imported here stays on your device. No live quotes or fictional data are displayed.</p></div></div>';
}
function render(){
 if(!engine){root.textContent='Research engine could not load. Refresh and check your connection.';return;}
 if(!session?.user){authScreen();return;}
 layout();
}
async function refresh(){
 if(!session?.user)return;
 const uid=session.user.id;
 const [p,progress]=await Promise.all([
 api(client.from('research_workspaces').select('*').order('updated_at',{ascending:false}).limit(100)),
 api(client.from('research_learning_progress').select('lesson_key,completed').eq('user_id',uid))
 ]);
 state.projects=p;state.progress=progress;
 if(state.selected&&!p.some(x=>x.id===state.selected))state.selected=null;
 if(!state.selected&&p.length)state.selected=p[0].id;
 await loadRuns();
 render();
}
async function loadRuns(){
 if(!state.selected){state.runs=[];return;}
 state.runs=await api(client.from('research_experiments').select('id,workspace_id,strategy,source_label,sample_start,sample_end,metrics,created_at')
 .eq('workspace_id',state.selected).order('created_at',{ascending:false}).limit(75));
}
async function hash(s){
 if(!globalThis.crypto?.subtle)throw Error('Secure context required for SHA-256 provenance. Use HTTPS.');
 const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function fileSelected(file){
 if(!file)return;
 if(file.size>16_000_000)throw Error('CSV exceeds the 16MB limit.');
 const text=await file.text();
 const parsed=engine.parseCsv(text);
 const digest=await hash(text);
 state.bars=parsed.bars;state.diagnostics=parsed.diagnostics;state.sourceSha=digest;
 state.sourceLabel=file.name.slice(0,120);state.lastRun=null;state.sim=null;
 state.view='data';
 info('Imported '+parsed.bars.length+' actual historical prices. No raw rows were uploaded.');
}
async function createProject(form){
 const f=new FormData(form),title=clean(f.get('title')),symbol=clean(f.get('symbol')).toUpperCase(),hypothesis=clean(f.get('hypothesis'));
 const item=await api(client.from('research_workspaces').insert({
  owner_id:session.user.id,title,asset_class:f.get('asset_class'),symbol,hypothesis
 }).select('*').single());
 state.selected=item.id;state.view='workspaces';
 await refresh();info('Private research project created.');
}
async function saveNotes(form){
 const f=new FormData(form);
 await api(client.from('research_workspaces').update({
  title:clean(f.get('title')),hypothesis:clean(f.get('hypothesis')),research_notes:clean(f.get('notes'))
 }).eq('id',state.selected).eq('owner_id',session.user.id));
 await refresh();info('Notes saved to your account.');
}
function runStrategy(form){
 if(!state.bars)throw Error('Import a real OHLCV CSV before running a strategy.');
 if(!current())throw Error('Create a private project first to associate the research.');
 const f=new FormData(form);
 state.lastRun=engine.backtest(state.bars,{
  strategy:f.get('strategy'),fast:Number(f.get('fast')),slow:Number(f.get('slow')),
  costBps:Number(f.get('cost')),holdout:Number(f.get('holdout')),riskFree:Number(f.get('rf'))/100
 });
 state.sim=null;state.view='strategy';info('Backtest calculated from uploaded observations; no data or trades were fabricated.');
}
async function saveRun(){
 const r=state.lastRun;
 if(!r||!state.sourceSha||!state.bars||!state.selected)throw Error('Run and inspect a backtest first.');
 const diagnostics={...state.diagnostics,method:'SMA long-only / buy-hold lagged two-close',sourceNote:'Raw CSV remains local'};
 const metrics={train:r.train,test:r.test,holdout:r.test,benchmark:r.baseline,turnover:r.turnover,
  totalCostFraction:r.totalCostFraction,bootstrap:state.sim,trainThrough:r.trainThrough,testFrom:r.testFrom};
 // Omit full equity-curve arrays from the database. Save computed summaries only.
 for(const k of ['train','test','holdout','benchmark']){
  if(metrics[k])metrics[k]=Object.fromEntries(Object.entries(metrics[k]).filter(([key])=>key!=='curve'));
 }
 await api(client.from('research_experiments').insert({
  workspace_id:state.selected,owner_id:session.user.id,strategy:r.params.strategy,
  source_label:state.sourceLabel,source_sha256:state.sourceSha,
  dataset_rows:state.bars.length,sample_start:state.bars[0].date,sample_end:state.bars.at(-1).date,
  assumptions:r.params,metrics,diagnostics,method_version:engine.VERSION
 }));
 await loadRuns();info('Experiment saved as a private, immutable research run. It is not verified trading performance.');
}
async function dispatch(action,element){
 if(action==='level'){state.expert=!state.expert;render();return;}
 if(action==='new-project'){state.view='workspaces';render();const dialog=$('#create-project-dialog');if(dialog){dialog.hidden=false;dialog.scrollIntoView({block:'nearest'});}return;}
 if(action==='close-create'){const d=$('#create-project-dialog');if(d)d.hidden=true;return;}
 if(action==='open-project'){
  state.selected=element.dataset.id;state.lastRun=null;state.sim=null;state.bars=null;state.diagnostics=null;
  await loadRuns();state.view='workspaces';render();return;
 }
 if(action==='delete-project'){
  if(!state.selected||!confirm('Permanently delete this project and all saved experiments?'))return;
  await api(client.from('research_workspaces').delete().eq('id',state.selected).eq('owner_id',session.user.id));
  state.selected=null;state.lastRun=null;state.bars=null;await refresh();info('Project and its experiments deleted.');return;
 }
 if(action==='delete-run'){
  if(!confirm('Delete this saved research experiment?'))return;
  await api(client.from('research_experiments').delete().eq('id',element.dataset.id).eq('owner_id',session.user.id));
  await loadRuns();info('Saved experiment deleted.');return;
 }
 if(action==='to-strategy'){state.view='strategy';render();return;}
 if(action==='to-validation'){state.view='validate';render();return;}
 if(action==='bootstrap'){
  if(!state.lastRun)throw Error('Run a backtest first.');
  state.sim=engine.bootstrap(state.lastRun.returns.slice(-state.lastRun.test.observations),{paths:300,seed:42,block:5});
  info('Bootstrap computed using seeded resampling. It is not a price forecast.');return;
 }
 if(action==='save-run'){await saveRun();return;}
 if(action==='toggle-lesson'){
  const key=element.dataset.id;
  const now=state.progress.some(x=>x.lesson_key===key&&x.completed);
  await api(client.from('research_learning_progress').upsert({
   user_id:session.user.id,lesson_key:key,completed:!now,updated_at:new Date().toISOString()
  },{onConflict:'user_id,lesson_key'}));
  await refresh();return;
 }
 if(action==='lesson-to-screen'){
  const map={hypothesis:'workspaces',provenance:'data',lookahead:'strategy',holdout:'validate',
   costs:'strategy',sharpe:'validate',drawdown:'validate',bootstrap:'validate'};
  state.view=map[state.lesson]||'overview';render();return;
 }
}
document.addEventListener('click',ev=>{
 const nav=ev.target.closest('[data-nav]');
 if(nav){state.view=nav.dataset.nav;state.error=state.notice='';render();return;}
 const lesson=ev.target.closest('[data-lesson]');
 if(lesson){state.lesson=lesson.dataset.lesson;render();return;}
 const btn=ev.target.closest('[data-action]');
 if(btn){safe(e=>dispatch(btn.dataset.action,btn))(ev);}
});
document.addEventListener('change',ev=>{
 if(ev.target.id==='active-project'){
  state.selected=ev.target.value||null;state.lastRun=null;state.sim=null;
  safe(async()=>{await loadRuns();render();})();return;
 }
 if(ev.target.id==='price-file'){
  const file=ev.target.files?.[0];
  if(file)safe(async()=>{await fileSelected(file)})();return;
 }
});
document.addEventListener('submit',ev=>{
 const form=ev.target;
 const action=form.id==='create-form'?createProject:form.id==='notes-form'?saveNotes:form.id==='run-form'?runStrategy:null;
 if(action)safe(()=>action(form))(ev);
});
async function init(){
 if(!engine)throw Error('Research engine is missing.');
 if(!config.communityBackendReady||!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase?.createClient)throw Error('Supabase backend has not been configured.');
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 const r=await client.auth.getSession();if(r.error)throw r.error;
 session=r.data.session;
 client.auth.onAuthStateChange((_evt,next)=>{session=next;if(next)queueMicrotask(()=>refresh().catch(fail));else render();});
 if(session)await refresh();else render();
}
init().catch(fail);
})();
