/* COMMON — Financial Intelligence Terminal.
   Independent original experience: real official macro data plus local analytical models.
   Public no-login review: no fake accounts, trading, feeds, or institution affiliations. */
(()=>{
'use strict';
const root=document.getElementById('main-view');
const coach=document.getElementById('coach-box');
const cmd=document.getElementById('command-dialog');
const sections=[
 ['overview','Overview','Cross-asset research'],
 ['macro','Macro & Rates','Fiscal data and fixed income'],
 ['equities','Equity Research','Fundamentals and governance'],
 ['options','Derivatives','Option valuation and Greeks'],
 ['strategies','Quant Strategies','Backtesting and validation'],
 ['communities','Research Desks','Institutional-style coverage'],
 ['venture','Private Capital','Venture finance and dilution']
];
const disciplines=[
 {id:'equity',name:'Fundamental Equity Research',tag:'PUBLIC MARKETS',why:'Company fundamentals, competitive positioning and valuation.',deliver:'Investment thesis, primary-file research, DCF, scenario analysis, risk factors',methods:'10-K / 10-Q, segment economics, unit economics, WACC, free cash flow, competitive moats',open:'equities'},
 {id:'special',name:'Event-Driven & Special Situations',tag:'PUBLIC MARKETS',why:'Corporate actions, spin-offs, restructurings, mergers and catalysts.',deliver:'Event timeline, probability-weighted outcomes, downside cases, primary disclosures',methods:'8-K disclosures, merger proxy, cap structure, financing contingencies, capital structure',open:'equities'},
 {id:'macro',name:'Macro & Rates',tag:'MULTI-ASSET',why:'Interest-rate transmission, fiscal conditions and macro regimes.',deliver:'Timestamped observations, curve and duration scenarios, source provenance',methods:'Treasury Fiscal Data, FRED, yield curves, term premiums, DV01 and convexity',open:'macro'},
 {id:'deriv',name:'Volatility & Derivatives',tag:'MARKET STRUCTURE',why:'Understand the price and risk of option positions before trading.',deliver:'Theoretical pricing, sensitivities, volatility scenarios, model limitations',methods:'Implied vs realized volatility, delta, gamma, theta, vega, skew and term structure',open:'options'},
 {id:'micro',name:'Market Microstructure',tag:'EXECUTION STUDIES',why:'Understand the mechanics of order flow, spreads, liquidity and borrow.',deliver:'Execution quality research, liquidity assumptions, data licensing assessment',methods:'Bid-ask spreads, order book, short interest vs short volume, stock loan, market impact',open:'options'},
 {id:'quant',name:'Systematic Strategies',tag:'QUANTITATIVE',why:'Test falsifiable trading hypotheses rather than trusting narratives.',deliver:'Reproducible backtest, benchmark, holdout validation, costs and drawdown',methods:'Time-series splits, regime risk, transaction costs, Monte Carlo, lookahead controls',open:'strategies'},
 {id:'asset',name:'Portfolio Construction & Risk',tag:'ASSET MANAGEMENT',why:'Translate security-level research into exposures and downside constraints.',deliver:'Risk budgets, factor exposure questions, concentration and liquidity analysis',methods:'Beta, VaR limitations, tracking error, factor decomposition, drawdown and stress tests',open:'strategies'},
 {id:'govern',name:'Corporate Governance & Stewardship',tag:'SHAREHOLDER RIGHTS',why:'Improve shareholder knowledge and engagement with listed companies.',deliver:'Issuer questions, proxy research, governance scorecards and documented concerns',methods:'DEF 14A, voting record dates, shareholder proposals, board independence and dilution',open:'equities'},
 {id:'real',name:'Real Assets & Private Credit',tag:'ALTERNATIVES',why:'Evaluate real-estate cash flows, debt claims and illiquidity.',deliver:'Underwriting checklist, debt service, financing and valuation sensitivity',methods:'NOI, cap rates, DSCR, LTV, covenant structures, discount rates and exit liquidity',open:'venture'},
 {id:'venture',name:'Venture Capital & Growth Equity',tag:'PRIVATE CAPITAL',why:'Review early-stage ownership economics and founder fundraising.',deliver:'Capitalization table, diligence questions, runway, funding route',methods:'Pre-/post-money valuation, dilution, SAFE conversion, liquidation preferences, ARR and burn multiple',open:'venture'}
];
const guide={
 overview:{title:'What is financial intelligence?',simple:'Start with the source, not the story. A claim is research only when you can check its data, assumptions, and possible failure cases.',technical:'A defensible research workflow separates fact, forecast, valuation, and action. Define the null hypothesis, establish a timestamped dataset, benchmark outcomes, examine alternative explanations, and disclose material conflicts.',formula:'Evidence → Hypothesis → Model → Falsification'},
 macro:{title:'Macro is not a price prediction',simple:'Government debt and Treasury borrowing costs describe the financing environment. They do not tell you what a stock will do tomorrow.',technical:'Debt outstanding, the average embedded coupon cost of outstanding securities, secondary-market yields, forward curves and term premia are distinct quantities. Do not substitute average coupon cost for yield to maturity.',formula:'DV01 ≈ Modified Duration × Bond Price × 0.0001'},
 equities:{title:'Value the business, not the ticker',simple:'DCF estimates what future business cash flows could be worth today. Change the assumptions to see how fragile a valuation is.',technical:'Match unlevered free cash flow to WACC, adjust for non-operating assets and net debt, use diluted shares for equity value per share, and interrogate terminal-value concentration. The model is not a target price.',formula:'Equity Value = PV(FCF) + PV(Terminal Value) − Net Debt'},
 options:{title:'An option quote is not a forecast',simple:'A theoretical option price depends on the stock price, strike, time, volatility, interest rates, and dividends. Greeks explain how that model price changes.',technical:'Black–Scholes assumes lognormal diffusion and constant volatility/continuous carry. This page uses European-style option economics and analytic sensitivities. American exercise, borrow, skew, discrete dividends, and liquidity can dominate actual execution.',formula:'Call − Put = S·e^(−qT) − K·e^(−rT)'},
 strategies:{title:'Most backtests are too optimistic',simple:'A strategy is credible only if the rules were fixed before testing them on unseen dates. Trading costs matter.',technical:'Chronological holdouts, point-in-time data, corporate-action adjustments, appropriate lag, transaction costs, sensitivity checks, out-of-sample stability, and realistic capacity constraints are all required. Resampling observed returns cannot model unseen regime breaks.',formula:'Strategy Returnₜ = Positionₜ × Returnₜ − Turnoverₜ × Costs'},
 communities:{title:'Research desks are not trading mobs',simple:'People with different skills can independently investigate the same question, challenge assumptions, and make their own decisions.',technical:'A credible investment committee-style process captures a falsifiable thesis, bear case, data sources, valuation alternatives, position conflicts, and a documented dissenting view. Shared research must not become synchronized price manipulation.',formula:'Independent research + documented dissent ≠ coordinated trades'},
 venture:{title:'Ownership and valuation are different',simple:'When a startup raises new equity, the company gets cash and existing owners usually hold a smaller percentage.',technical:'Post-money ownership in a straightforward priced round equals capital invested divided by pre-money valuation plus new capital. SAFEs, option pool refreshes and preferred liquidation rights can change the economics materially.',formula:'Investor Ownership = New Investment / Post-Money Valuation'}
};
const apiBase='https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
const urlDebt=apiBase+'/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page%5Bsize%5D=120';
const urlRates=apiBase+'/v2/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=security_desc:eq:Treasury%20Bills&sort=-record_date&page%5Bsize%5D=72';
const finance=window.COMMON_FINANCE;
const engine=window.COMMON_RESEARCH_ENGINE;
const state={
 route:'overview',expert:false,macro:{loading:true,debt:[],rates:[],error:null,loadedAt:null},range:60,
 bs:{spot:100,strike:100,days:90,ivPct:25,ratePct:4,divPct:0},bsType:'call',bsResult:null,
 dcf:{fcf:5,growthPct:6,waccPct:9,terminalPct:2.5,netDebt:8,shares:2},dcfResult:null,
 bond:{face:1000,couponPct:4,yieldPct:4.5,years:10,frequency:2},bondResult:null,
 venture:{pre:20000000,invested:5000000,holdingPct:80},ventureResult:null,
 bars:null,source:null,sourceDigest:null,backtest:null,sim:null,
 sma:{fast:12,slow:40,costBps:10,holdout:.3,riskFree:0},csvError:null,
 researchInput:'',researchTheme:'equity'
};
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>Number.isFinite(n)?Number(n).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const pct=(v,d=2)=>Number.isFinite(v)?fmt(v*100,d)+'%':'—';
const dec=(n,d=4)=>Number.isFinite(n)?fmt(n,d):'—';
const usd=(v,d=2)=>Number.isFinite(v)?'$'+fmt(v,d):'—';
const trillions=n=>Number.isFinite(n)?'$'+fmt(n/1e12,3)+'T':'—';
function head(k,title,detail,actions=''){
 return '<div class="screen-header"><div><div class="eyebrow">INTELLIGENCE / '+e(k)+'</div><h1>'+title+'</h1><p>'+detail+'</p></div>'+ (actions?'<div class="screen-actions">'+actions+'</div>':'')+'</div>';
}
function surface(title,body,meta='',footer=''){
 return '<section class="surface"><div class="surface-header"><h2>'+title+'</h2>'+(meta?'<span class="meta">'+meta+'</span>':'')+'</div>'+body+(footer?'<div class="source-line">'+footer+'</div>':'')+'</section>';
}
function btn(label,act,cls='',attrs=''){
 return '<button class="btn '+cls+'" type="button" data-act="'+act+'" '+attrs+'>'+label+'</button>';
}
function link(to,label,cls='btn btn-muted'){
 return '<button class="'+cls+'" type="button" data-go="'+to+'">'+label+'</button>';
}
function srcFoot(detail,href='https://fiscaldata.treasury.gov/'){
 return '<span><strong>SOURCE</strong> · '+detail+'</span><a href="'+href+'" target="_blank" rel="noopener noreferrer">Verify source ↗</a>';
}
function input(label,name,value,opts=''){
 return '<label class="field"><span>'+label+'</span><input class="input" name="'+name+'" type="number" inputmode="decimal" value="'+e(value)+'" '+opts+'></label>';
}
function badgelink(title){return '<span class="tag blue">'+title+'</span>';}
function formulaBox(text,foot){return '<div class="info-strip"><strong class="mono">'+text+'</strong><div style="margin-top:6px">'+foot+'</div></div>';}
function inlineGuide(){
 const g=guide[state.route];
 return '<section class="info-strip" style="margin-bottom:17px;border-color:#3a4d46"><div class="space">'+
 '<span class="eyebrow" style="color:var(--lime)">RESEARCH INSTRUCTOR · '+(state.expert?'TECHNICAL':'FOUNDATIONS')+'</span>'+
 btn(state.expert?'Switch to beginner':'Advanced explanation','toggle-expert','small btn-muted')+'</div>'+
 '<div style="font-size:12px;color:#becdd8;line-height:1.8;margin-top:9px">'+e(state.expert?g.technical:g.simple)+'</div></section>';
}
function stat(title,value,detail,emphasis=false){
 return '<div class="surface stat"><span class="stat-name">'+title+'</span>'+
 (value===null?'<span class="stat-skeleton"></span>':'<strong class="'+(emphasis?'positive':'')+'">'+e(value)+'</strong>')+
 '<span class="stat-footer">'+detail+'</span></div>';
}
function lineChart(points,labels,caption='Observed dataset',unit='',height=220){
 if(!points?.length||points.length<2)return '<div class="surface-inner data-note">No time-series observations available from the source. No values have been invented.</div>';
 const min=Math.min(...points),max=Math.max(...points),span=Math.max(1e-8,max-min);
 let coords=[];
 const stride=Math.max(1,Math.ceil(points.length/290));
 for(let i=0;i<points.length;i+=stride){
  const x=40+i/(points.length-1)*690,y=188-(points[i]-min)/span*145;
  coords.push([x,y]);
 }
 if((points.length-1)%stride!==0)coords.push([730,188-(points.at(-1)-min)/span*145]);
 const line=coords.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2)).join(' ');
 const area=line+' L730 195 L40 195 Z';
 const ticks=[0,.5,1].map(v=>{
  const y=188-v*145,value=min+v*span;
  return '<line x1="40" y1="'+y+'" x2="730" y2="'+y+'" class="axis-line"/>'+
    '<text x="29" y="'+(y+3)+'" text-anchor="end" class="axis-label">'+
    (unit==='$T'?'$'+fmt(value,1):unit==='%'?fmt(value,1)+'%':fmt(value,1))+'</text>';
 }).join('');
 return '<div class="chart-wrap"><svg class="chart-main" viewBox="0 0 760 220" role="img" aria-label="'+e(caption)+' from '+e(labels?.[0])+' to '+e(labels?.at(-1))+'" preserveAspectRatio="none"><defs><linearGradient id="macro-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c3e886" stop-opacity=".19"/><stop offset="1" stop-color="#c3e886" stop-opacity="0"/></linearGradient></defs>'+
 ticks+'<path class="area" d="'+area+'"/><path class="trace" d="'+line+'"/>'+
 '<text x="40" y="212" class="axis-label">'+e(labels?.[0]||'')+'</text>'+
 '<text x="730" y="212" text-anchor="end" class="axis-label">'+e(labels?.at(-1)||'')+'</text></svg></div>'+
 '<div class="chart-bottom"><span class="chart-summary">'+e(caption)+' · '+points.length+' observed records</span><span class="tag">'+e(unit||'SERIES')+'</span></div>';
}
function dashboard(){
 const debt=state.macro.debt,rate=state.macro.rates,d=debt.at(-1),r=rate.at(-1);
 return head('OVERVIEW','Research begins with <em>evidence.</em>',
  'A professional workspace for macro data, fundamental valuation, derivatives, systematic strategies and shareholder intelligence. Public preview: no synthetic market feeds or imaginary accounts.',
  link('macro','Explore macro data ↗','btn btn-primary'))+
 inlineGuide()+
 '<div class="hero"><div><div class="eyebrow" style="color:var(--lime)">A DIFFERENT LEVEL OF FINANCIAL LITERACY</div>'+
 '<h2>Institutional tools.<br><em>Independent minds.</em></h2><p>Build models, challenge narratives, scrutinize issuers, and understand the mechanics behind markets. Knowledge first. Your decisions remain yours.</p>'+
 '<div class="row" style="flex-wrap:wrap">'+link('equities','Begin equity research','btn btn-primary')+link('communities','Explore research desks','btn')+'</div></div>'+
 '<div class="hero-symbol" aria-hidden="true"><div class="hero-abstract"><span>c.</span></div></div></div>'+
 '<div class="section-head"><h2>U.S. Treasury monitor</h2><span class="eyebrow">OFFICIAL PUBLIC DATA · NOT MARKET QUOTES</span></div>'+
 '<div class="grid grid-3">'+
 stat('TOTAL PUBLIC DEBT OUTSTANDING',d?trillions(d.value):null,d?'As of '+d.date:(state.macro.error?'Unavailable — source request failed':'Loading verified data'),true)+
 stat('AVG RATE ON OUTSTANDING T-BILLS',r?fmt(r.value,3)+'%':null,r?'As of '+r.date+' · NOT T-BILL YIELD':(state.macro.error?'Unavailable — source request failed':'Loading verified data'))+
 stat('ANALYTICAL COVERAGE','5','Live macro series + 4 computed model families')+'</div>'+
 '<div class="grid grid-2" style="margin-top:13px">'+
 surface('Federal debt outstanding',lineChart(debt.slice(-70).map(x=>x.value/1e12),debt.slice(-70).map(x=>x.date),'Total public debt','$T'),
  'TREASURY · SERIES OBSERVATIONS',srcFoot('Debt to the Penny'))+
 surface('Average interest rate on Treasury bills',lineChart(rate.slice(-60).map(x=>x.value),rate.slice(-60).map(x=>x.date),'Avg interest rate on outstanding bills','%'),
  'TREASURY · NOT YIELD CURVE',srcFoot('Average Interest Rates'))+'</div>'+
 (state.macro.error?'<div class="warning-strip" style="margin-top:15px">The official Treasury feed could not be reached in your browser. Models remain available; no fallback data has been fabricated. '+e(state.macro.error)+'</div>':'')+
 '<div class="section-head"><h2>Research workbench</h2><span class="eyebrow">WORKING CALCULATIONS · DATA-SOURCED ANALYSIS</span></div>'+
 '<div class="grid grid-2">'+
 surface('Valuation & capital markets',[
 ['▤','Equity valuation','Five-year DCF, WACC and terminal sensitivity','equities'],
 ['◈','Options Greeks','Black–Scholes theoretical premium and sensitivities','options'],
 ['⌁','Fixed income risk','Bond price, duration, convexity and DV01','macro']].map(x=>featureRow(...x)).join(''))+
 surface('Strategy & ownership',[
 ['⌇','Systematic strategy lab','Historical CSV, OOS validation, drawdowns and bootstrap','strategies'],
 ['◎','Institutional research desks','Fundamentals, special situations, market structure and stewardship','communities'],
 ['↗','Private capital underwriting','Pre-/post-money, dilution and diligence protocols','venture']].map(x=>featureRow(...x)).join(''))+'</div>';
}
function featureRow(icon,title,detail,target){
 return '<button class="feature-link" data-go="'+target+'"><span class="icon-box">'+icon+'</span><span class="detail"><strong>'+title+'</strong><small>'+detail+'</small></span><span class="arrow">↗</span></button>';
}
function macro(){
 const debt=state.macro.debt,rate=state.macro.rates,d=debt.at(-1),r=rate.at(-1);
 return head('MACRO & RATES','Sovereign funding & <em>duration.</em>',
  'Monitor original U.S. Treasury observations, then model how fixed-rate bond prices respond to changes in yield. Do not confuse average rates on outstanding debt with tradable market yields.',
  btn('Refresh source','refresh-macro','btn-muted'))+inlineGuide()+
 '<div class="grid grid-3">'+
 stat('PUBLIC DEBT',d?trillions(d.value):null,d?'Official record '+d.date:'Source unavailable',true)+
 stat('AVG INTEREST · T-BILLS',r?fmt(r.value,3)+'%':null,r?'Official record '+r.date:'Source unavailable')+
 stat('OBSERVATIONS',debt.length+rate.length,'Historical data points returned')+'</div>'+
 '<div class="grid grid-2" style="margin-top:14px">'+
 surface('Public debt outstanding',lineChart(debt.map(x=>x.value/1e12),debt.map(x=>x.date),'Treasury total debt','$T'),
 'REPORTED DOLLARS · TRILLIONS',srcFoot('Fiscal Data / Debt to the Penny'))+
 surface('Historical average rates on bills',lineChart(rate.map(x=>x.value),rate.map(x=>x.date),'Average outstanding Treasury bill rate','%'),
 'REPORTED RATE · NOT YTM',srcFoot('Fiscal Data / Average Interest Rates'))+'</div>'+
 (state.macro.error?'<div class="warning-strip" style="margin:16px 0">'+e(state.macro.error)+'</div>':'')+
 '<div class="section-head"><h2>Fixed income risk workbench</h2><span class="eyebrow">BOND MATHEMATICS · SCENARIO INPUTS</span></div>'+
 '<div class="grid grid-2">'+
 surface('Model a fixed-coupon bond','<div class="surface-inner"><div class="warning-strip">Illustrative inputs only. They are not live Treasury prices, yields or tradable quotes.</div>'+
 '<form class="grid form-grid" id="bond-form" style="margin-top:16px">'+
 input('Face value ($)','face',state.bond.face,'min="1" step="1"')+
 input('Annual coupon (%)','couponPct',state.bond.couponPct,'min="0" max="100" step=".1"')+
 input('Yield to maturity (%)','yieldPct',state.bond.yieldPct,'min="-50" max="100" step=".1"')+
 input('Maturity (years)','years',state.bond.years,'min=".5" max="100" step=".5"')+
 '<label class="field"><span>Coupon frequency</span><select class="select" name="frequency">'+[1,2,4,12].map(f=>'<option value="'+f+'"'+(state.bond.frequency===f?' selected':'')+'>'+({1:'Annual',2:'Semiannual',4:'Quarterly',12:'Monthly'}[f])+'</option>').join('')+'</select></label>'+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">Calculate bond risk ↗</button></div></form></div>')+
 surface('Interest-rate exposure',state.bondResult?'<div class="surface-inner"><div class="value-row">'+
 cell('MODEL PRICE',usd(state.bondResult.price),'/bond')+
 cell('MODIFIED DURATION',fmt(state.bondResult.modifiedDuration),'years')+
 cell('DV01',usd(state.bondResult.dv01,4),'$/1bp move')+
 cell('CONVEXITY',fmt(state.bondResult.convexity,2),'curvature')+'</div>'+
 '<p class="data-note" style="margin:17px 0">'+e(state.bondResult.caveat)+'</p>'+
 formulaBox('ΔP ≈ −Duration × P × Δy','DV01 estimates the dollar change for a one-basis-point yield shift; convexity matters for larger moves.')+'</div>':
 '<div class="surface-inner"><p class="data-note">Enter bond terms and calculate dollar-rate exposure. Duration is a sensitivity measure, not an investment recommendation.</p></div>')+'</div>';
}
function cell(title,value,desc=''){
 return '<div class="value-cell"><span>'+title+'</span><strong>'+e(value)+'</strong><small>'+e(desc)+'</small></div>';
}
function equities(){
 const d=state.dcfResult;
 return head('EQUITY RESEARCH','Intrinsic value is <em>conditional.</em>',
  'Analyze company cash flows, the cost of capital and sensitivity to assumptions. Use primary SEC filings rather than crowdsourced targets.',
  '<a class="btn" href="https://www.sec.gov/edgar/search/" rel="noopener noreferrer" target="_blank">SEC EDGAR ↗</a>')+inlineGuide()+
 surface('Issuer due diligence','<div class="surface-inner"><div class="grid grid-2">'+
 '<div><div class="eyebrow" style="margin-bottom:9px">START WITH A PRIMARY FILING</div><p class="data-note">Open EDGAR and search the company ticker or legal name. Read the latest Form 10-K, 10-Q, 8-K and DEF 14A, including exhibits and subsequent amendments.</p>'+
 '<div class="row" style="margin-top:16px;flex-wrap:wrap"><a class="btn btn-primary" href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer">Search filings ↗</a><a class="btn" href="https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks" target="_blank" rel="noopener noreferrer">Shareholder basics ↗</a></div></div>'+
 '<div class="subsurface" style="padding:17px"><div class="section-label">RESEARCH MEMO STANDARD</div>'+
 '<ol style="padding-left:19px;color:#a6b9c8;font-size:11px;line-height:2;margin:10px 0 0"><li>Business model and segment economics</li><li>Balance sheet and financing risks</li><li>Unit economics / competitive dynamics</li><li>Valuation assumptions and sensitivity</li><li>Governance, dilution, conflicts and bear case</li></ol></div></div></div>',
 'OFFICIAL SOURCE · SEC EDGAR')+
 '<div class="section-head"><h2>Discounted cash flow model</h2><span class="eyebrow">FIVE-YEAR FCFF · USER ASSUMPTIONS</span></div>'+
 '<div class="grid grid-2">'+
 surface('Build a valuation scenario','<div class="surface-inner"><div class="warning-strip">The example figures are editable scenario inputs, NOT company fundamentals. No live prices, cash flows or analyst targets are imported.</div>'+
 '<form id="dcf-form" class="grid form-grid" style="margin-top:17px">'+
 input('Starting annual unlevered FCF ($B)','fcf',state.dcf.fcf,'step=".1"')+
 input('Annual forecast growth (%)','growthPct',state.dcf.growthPct,'step=".1"')+
 input('Weighted avg. cost of capital (%)','waccPct',state.dcf.waccPct,'min=".1" step=".1"')+
 input('Perpetual terminal growth (%)','terminalPct',state.dcf.terminalPct,'step=".1"')+
 input('Net debt ($B)','netDebt',state.dcf.netDebt,'step=".1"')+
 input('Diluted shares outstanding (B)','shares',state.dcf.shares,'min=".000001" step=".01"')+
 '<div class="form-actions"><button type="submit" class="btn btn-primary">Run DCF analysis ↗</button></div></form></div>')+
 surface('Valuation output',d?'<div class="surface-inner"><div class="value-row">'+
 cell('ENTERPRISE VALUE',usd(d.enterpriseValue)+'B','PV of operating cash flow')+
 cell('EQUITY VALUE',usd(d.equityValue)+'B','less net debt')+
 cell('PER SHARE',usd(d.intrinsicPerShare),'illustrative, not target')+
 cell('TERMINAL WEIGHT',pct(d.terminalWeight),'of enterprise value')+'</div>'+
 '<div class="section-head"><h2>Projection schedule</h2></div><div class="table-scroll"><table class="table"><thead><tr><th>YEAR</th><th>FCF ($B)</th><th>PV ($B)</th></tr></thead><tbody>'+
 d.projections.map(p=>'<tr><td>'+p.year+'</td><td>'+fmt(p.fcf)+'</td><td>'+fmt(p.pv)+'</td></tr>').join('')+
 '</tbody></table></div><div class="section-head"><h2>Sensitivity matrix</h2></div><div class="table-scroll"><table class="table"><thead><tr><th>WACC / TERMINAL</th>'+
 [...new Set(d.matrix.map(x=>fmt(x.terminalPct,2)))].map(x=>'<th>'+x+'%</th>').join('')+'</tr></thead><tbody>'+
 [0,1,2].map(i=>'<tr><td>'+fmt(d.matrix[i*3].waccPct)+'%</td>'+d.matrix.slice(i*3,i*3+3).map(x=>'<td>'+usd(x.perShare)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+
 '<p class="data-note" style="margin:16px 0">A large terminal-value share indicates high model sensitivity. Negative equity values are possible under entered assumptions.</p></div>':
 '<div class="surface-inner"><p class="data-note">Calculate enterprise value, equity value per diluted share, forward cash-flow schedule and WACC/terminal growth sensitivity.</p></div>')+'</div>'+
 '<div class="section-head"><h2>Corporate governance & shareholder stewardship</h2></div>'+
 surface('Turn research into lawful influence','<div class="grid grid-2 surface-inner"><div><div class="section-label">STEWARDSHIP WORKFLOW</div>'+
 '<ul style="padding-left:19px;color:#a9b9c7;font-size:12px;line-height:2"><li>Evaluate board independence and executive incentives.</li><li>Review proxy disclosures and voting rights.</li><li>Document dilution, related-party transactions and conflicts.</li><li>Draft evidence-backed issuer questions and shareholder requests.</li></ul></div>'+
 '<div class="info-strip"><strong>No coordinated price manipulation.</strong><p style="margin:9px 0 0">COMMON can support research collaboration, education and lawful investor engagement. It cannot coordinate buys to artificially move prices or guarantee that large investors will lose money.</p></div></div>');
}
function options(){
 const o=state.bsResult,res=o?.[state.bsType];
 return head('DERIVATIVES','Model optionality. <em>Know the risks.</em>',
  'European-style option pricing, put–call parity and first-order Greeks. Inputs are scenarios, not live option chains or trade recommendations.')+
 inlineGuide()+
 '<div class="grid grid-2">'+
 surface('Theoretical option valuation','<div class="surface-inner"><div class="warning-strip">ILLUSTRATIVE INPUTS · NOT CURRENT STOCK OR OPTIONS PRICES</div>'+
 '<div class="segmented" style="margin-top:18px;width:max-content"><button type="button" data-act="option-call" class="'+(state.bsType==='call'?'active':'')+'">CALL</button>'+
 '<button type="button" data-act="option-put" class="'+(state.bsType==='put'?'active':'')+'">PUT</button></div>'+
 '<form id="bs-form" class="grid form-grid" style="margin-top:18px">'+
 input('Underlying price ($)','spot',state.bs.spot,'min=".01" step=".01"')+
 input('Strike price ($)','strike',state.bs.strike,'min=".01" step=".01"')+
 input('Days to expiry','days',state.bs.days,'min="1" max="3650" step="1"')+
 input('Implied volatility (%)','ivPct',state.bs.ivPct,'min=".01" max="500" step=".1"')+
 input('Risk-free rate (%)','ratePct',state.bs.ratePct,'step=".1"')+
 input('Dividend yield (%)','divPct',state.bs.divPct,'min="0" step=".1"')+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">Compute pricing and Greeks ↗</button></div></form></div>')+
 surface('Model risk exposures',res?'<div class="surface-inner"><div class="value-row">'+
 cell('FAIR VALUE',usd(res.price,4),'per option share')+
 cell('DELTA',dec(res.delta),'Δ premium / Δspot')+
 cell('GAMMA',dec(res.gamma,6),'change in delta per $')+
 cell('THETA / DAY',usd(res.theta,4),'time decay, theoretical')+
 cell('VEGA / 1 VOL POINT',usd(res.vega,4),'premium / +1% vol')+
 cell('RHO / 1 RATE POINT',usd(res.rho,4),'premium / +1% rate')+
 cell('BREAK EVEN',usd(res.breakeven),'at expiration, simplified')+
 cell('PARITY ERROR',usd(o.parityError,7),'should be ~0')+'</div>'+
 '<div class="info-strip" style="margin-top:17px"><strong>MODEL LIMITS</strong><p style="margin:8px 0 0">'+e(o.note)+'</p></div></div>':
 '<div class="surface-inner"><p class="data-note">Change inputs and calculate a theoretical call or put price, delta, gamma, theta, vega and rho. Real markets include bid-ask costs, early exercise and volatility skew.</p></div>')+'</div>'+
 '<div class="section-head"><h2>Reading risk correctly</h2></div>'+
 '<div class="grid grid-3">'+
 surface('Delta','<div class="surface-inner"><strong>Directional sensitivity</strong><p class="data-note">A delta of 0.50 means the theoretical option premium changes about $0.50 for a $1 spot move, all else equal. Delta is not a guaranteed probability of exercise.</p></div>')+
 surface('Gamma','<div class="surface-inner"><strong>Nonlinear exposure</strong><p class="data-note">Gamma measures how delta changes as the underlying moves. Near-expiry at-the-money gamma can be significant.</p></div>')+
 surface('Vega','<div class="surface-inner"><strong>Volatility repricing</strong><p class="data-note">Vega estimates the premium change for one volatility percentage-point move, assuming other inputs remain fixed.</p></div>')+'</div>';
}
function strategies(){
 const b=state.backtest,s=state.sim;
 const imported=state.bars;
 return head('SYSTEMATIC RESEARCH','Prove it <em>out of sample.</em>',
  'An actual daily historical-price parser and cost-aware backtesting engine. Import your own CSV; COMMON never generates sample returns or invents tick data.',
  '<a class="btn" href="../lab/" target="_blank" rel="noopener noreferrer">Member Research Studio ↗</a>')+inlineGuide()+
 surface('Historical data intake','<div class="surface-inner"><div class="grid grid-2"><div><div class="section-label" style="margin-bottom:13px">SOURCE PROVENANCE</div>'+
 '<label class="field" for="csv-file"><span>Import your own authorized OHLCV history</span><input id="csv-file" type="file" accept=".csv,text/csv" class="input" aria-label="Choose a CSV of historical prices"></label>'+
 '<p class="data-note" style="margin-top:11px">Requires YYYY-MM-DD Date and positive Close/Adjusted Close columns, at least 30 daily observations. Price data remains on this device.</p>'+
 '</div><div class="subsurface" style="padding:18px"><div class="section-label">DATA STATUS</div>'+
 (imported?'<div style="font:600 23px var(--mono);margin:13px 0;color:var(--lime)">'+fmt(imported.length,0)+' <span style="font:11px var(--font);color:var(--muted)">ROWS</span></div>'+
 '<div class="data-note">'+e(state.source)+'<br>'+e(imported[0].date)+' — '+e(imported.at(-1).date)+'</div>':
 '<div style="font-size:18px;margin-top:13px;font-weight:600">Awaiting dataset</div><p class="data-note">No price feed connected. Upload a CSV to execute.</p>')+
 '</div></div></div>')+
 '<div class="section-head"><h2>Strategy research parameters</h2><span class="eyebrow">NO SAME-BAR EXECUTION · COST MODEL INCLUDED</span></div>'+
 '<div class="grid grid-2">'+
 surface('Model specification','<div class="surface-inner"><form id="backtest-form" class="grid form-grid">'+
 input('Fast SMA window (days)','fast',state.sma.fast,'min="2" step="1"')+
 input('Slow SMA window (days)','slow',state.sma.slow,'min="3" step="1"')+
 input('Turnover cost (basis points)','costBps',state.sma.costBps,'min="0" max="1000" step="1"')+
 '<label class="field"><span>Chronological out-of-sample share</span><select class="select" name="holdout">'+[.2,.3,.4].map(x=>'<option value="'+x+'"'+(state.sma.holdout===x?' selected':'')+'>'+Math.round(x*100)+'% holdout</option>').join('')+'</select></label>'+
 input('Annual risk-free assumption (%)','riskFree',state.sma.riskFree,'step=".1"')+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">Execute backtest ↗</button></div></form>'+
 '<p class="data-note" style="margin-top:15px">Long-only SMA crossovers, signal lag, baseline buy-and-hold comparison; not a fill simulator. No commissions, exchange feed or broker connection beyond entered bps.</p></div>')+
 surface('Research diagnostics',b?'<div class="surface-inner"><div class="value-row">'+
 cell('OOS TOTAL RETURN',pct(b.test.totalReturn),'after configured costs')+
 cell('OOS BENCHMARK',pct(b.baseline.totalReturn),'buy and hold')+
 cell('OOS SHARPE',fmt(b.test.sharpe),'annualized, unstable')+
 cell('MAX DRAWDOWN',pct(b.test.maxDrawdown),'observed sample')+'</div>'+
 '<div style="margin-top:15px">'+lineChart(b.test.curve,b.dates.slice(-b.test.observations),'Holdout strategy equity','INDEX')+'</div>'+
 '<div class="grid grid-2" style="margin-top:10px">'+
 '<div class="subsurface" style="padding:13px"><span class="eyebrow">TRAINING ENDS</span><div class="mono" style="margin-top:8px">'+e(b.trainThrough)+'</div></div>'+
 '<div class="subsurface" style="padding:13px"><span class="eyebrow">HOLDOUT BEGINS</span><div class="mono" style="margin-top:8px">'+e(b.testFrom)+'</div></div></div>'+
 '<div class="form-actions">'+btn('Block-bootstrap risk analysis','bootstrap','btn-primary')+'</div>'+
 (s?'<div class="value-row" style="margin-top:17px">'+
 cell('5TH PCTL',pct(s.percentiles.p05),'lower tail')+
 cell('MEDIAN',pct(s.percentiles.p50),'conditional')+
 cell('95TH PCTL',pct(s.percentiles.p95),'upper tail')+
 cell('LOSS FRACTION',pct(s.probabilityOfLoss),'of simulations')+'</div><p class="data-note" style="margin-top:14px">'+e(s.caution)+'</p>':'')+
 '</div>':
 '<div class="surface-inner"><div class="eyebrow">RESEARCH OUTPUT</div><p class="data-note" style="margin-top:15px">Upload historical data, specify parameters, and run the test to produce real numerical diagnostics. This panel intentionally does not contain placeholder returns or fake trading history.</p></div>')+'</div>'+
 (state.csvError?'<div class="warning-strip" role="alert" style="margin-top:15px">'+e(state.csvError)+'</div>':'')+
 '<div class="section-head"><h2>Model validation protocol</h2></div>'+
 surface('Professional research controls','<ol class="checklist">'+[
 ['Hypothesis pre-registration','Freeze candidate rules before reviewing the holdout.'],
 ['Point-in-time dataset','Inspect adjustment factors, missing sessions, publication lags and symbol survivorship.'],
 ['Friction and capacity','Include estimated commissions, spreads, slippage and market impact.'],
 ['Walk-forward validation','Retune only on training windows. Treat repeated holdout checks as data snooping.'],
 ['Benchmark comparison','Use a relevant passive benchmark and appropriate time-varying risk assumptions.'],
 ['Independent replication','Make data provenance, model code, parameters and adverse scenarios reproducible.']
 ].map((x,i)=>'<li><span class="tag">'+String(i+1).padStart(2,'0')+'</span><label><strong>'+x[0]+'</strong><small>'+x[1]+'</small></label></li>').join('')+'</ol>') ;
}
function communities(){
 return head('RESEARCH DESKS','Organized by <em>discipline.</em>',
 'Financial research communities should be organized around professional mandates and repeatable analytical methods—not random tickers or meme slogans.',
 '<a class="btn" href="../live/" target="_blank" rel="noopener noreferrer">Explore member communities ↗</a>')+inlineGuide()+
 '<div class="warning-strip" style="margin-bottom:18px">These are research coverage disciplines, not fake active communities. Real group creation, members, posts and permissions live behind the member application.</div>'+
 '<div class="grid grid-2">'+disciplines.map((x,i)=>
 '<article class="surface"><div class="surface-inner" style="min-height:215px;display:flex;flex-direction:column">'+
 '<div class="space"><span class="eyebrow">'+e(x.tag)+'</span><span class="tag">'+String(i+1).padStart(2,'0')+'</span></div>'+
 '<h2 style="font-size:19px;letter-spacing:-.03em;font-weight:650;margin:12px 0 9px">'+e(x.name)+'</h2>'+
 '<p class="data-note" style="margin:0 0 13px">'+e(x.why)+'</p>'+
 '<div style="font-size:11px;color:#adbecb;margin-bottom:9px"><strong>Research deliverable:</strong> '+e(x.deliver)+'</div>'+
 '<div class="tiny" style="margin:0 0 18px">METHODS · '+e(x.methods)+'</div>'+
 '<div style="margin-top:auto">'+link(x.open,'Explore analytical tools ↗','btn small')+'</div>'+
 '</div></article>').join('')+'</div>';
}
function venture(){
 const v=state.ventureResult;
 return head('PRIVATE CAPITAL','Underwrite the <em>ownership.</em>',
 'Founder discovery, venture capital due diligence and capitalization economics. Research and introductions are separate from executing securities offerings.',
 '<a class="btn" target="_blank" rel="noopener noreferrer" href="https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/regulation-crowdfunding">SEC Reg CF ↗</a>')+inlineGuide()+
 '<div class="grid grid-2">'+
 surface('Priced equity financing','<div class="surface-inner"><div class="warning-strip">Illustrative scenario; not an active fundraising offer, investment commitment or securities solicitation.</div>'+
 '<form id="capital-form" class="grid form-grid" style="margin-top:17px">'+
 input('Pre-money valuation ($)','pre',state.venture.pre,'min=".01" step="100000"')+
 input('New equity capital ($)','invested',state.venture.invested,'min=".001" step="100000"')+
 input('Existing shareholder holding (%)','holdingPct',state.venture.holdingPct,'min="0" max="100" step=".1"')+
 '<div class="form-actions"><button class="btn btn-primary" type="submit">Calculate post-money cap table ↗</button></div></form></div>')+
 surface('Ownership after financing',v?'<div class="surface-inner"><div class="value-row">'+
 cell('POST-MONEY',usd(v.postMoney,0),'equity valuation')+
 cell('NEW INVESTOR',pct(v.newInvestorOwnership),'post financing')+
 cell('EXISTING HOLDERS',pct(v.existingHoldersOwnership),'post financing')+
 cell('EXISTING HOLDER STAKE',pct(v.existingShareholderAfter),'after dilution')+'</div>'+
 '<div style="margin:20px 0 11px" class="section-label">POST-FINANCING ECONOMIC OWNERSHIP</div>'+
 '<div style="display:flex;height:16px;border-radius:5px;overflow:hidden;background:#40576d"><div style="width:'+((v.existingHoldersOwnership)*100).toFixed(4)+'%;background:var(--lime)"></div>'+
 '<div style="flex:1;background:#739ab5"></div></div>'+
 '<div class="space tiny" style="margin-top:8px"><span>Existing '+pct(v.existingHoldersOwnership)+'</span><span>New '+pct(v.newInvestorOwnership)+'</span></div>'+
 '<p class="data-note" style="margin-top:18px">'+e(v.note)+'</p></div>':
 '<div class="surface-inner"><p class="data-note">Calculate how a priced venture round changes economic ownership. This simple model excludes SAFEs, liquidation preference waterfalls, option pools and financing terms.</p></div>')+'</div>'+
 '<div class="section-head"><h2>Venture underwriting protocol</h2><span class="eyebrow">RISK, GOVERNANCE AND SOURCE DOCUMENTS</span></div>'+
 '<div class="grid grid-2">'+
 surface('Company-level due diligence','<ol class="checklist">'+[
 ['Revenue quality','ARR definition, churn, customer concentration, retention cohorts'],
 ['Unit economics','CAC payback, contribution margin, gross margin, net retention'],
 ['Cash runway','Net burn rate, cash balance, financing needs and milestones'],
 ['Cap table','Issued shares, vesting, SAFEs, notes and option pool refresh'],
 ['Governance','Board seats, information rights, consent and liquidation priorities'],
 ['Commercial evidence','Customer contracts, product usage, security posture, intellectual property']
 ].map((x,i)=>'<li><span class="tag">'+String(i+1).padStart(2,'0')+'</span><label><strong>'+x[0]+'</strong><small>'+x[1]+'</small></label></li>').join('')+'</ol>')+
 surface('Compliance gateway','<div class="surface-inner"><div class="eyebrow" style="color:var(--lime)">NO UNREGISTERED FUNDRAISING</div>'+
 '<p class="data-note" style="margin:13px 0">U.S. startup securities offerings are regulated. Regulation Crowdfunding offerings must be conducted through a registered broker-dealer or funding portal; other exemptions have different requirements. A group discussion or expression of interest is not a purchase or subscription.</p>'+
 '<div class="row" style="flex-wrap:wrap"><a class="btn btn-primary" href="https://www.sec.gov/resources-small-businesses/capital-raising-building-blocks/regulation-crowdfunding" target="_blank" rel="noopener noreferrer">Read SEC guidance ↗</a>'+
 '<a class="btn" href="../live/" target="_blank" rel="noopener noreferrer">COMMON founder network ↗</a></div></div>')+'</div>';
}
function updateCoach(){
 const g=guide[state.route];if(!g)return;
 coach.innerHTML='<div class="coach-icon">↗</div><h4>'+e(g.title)+'</h4>'+
 '<p>'+e(state.expert?g.technical:g.simple)+'</p><div class="divider"></div>'+
 '<div class="eyebrow" style="margin-bottom:9px">KEY RELATIONSHIP</div><div class="formula">'+e(g.formula)+'</div>'+
 '<div class="divider"></div><a href="#" data-act="toggle-expert">'+(state.expert?'Explain simply':'Show technical context')+' ↗</a>';
}
function show(route,focus=true){
 state.route=sections.some(x=>x[0]===route)?route:'overview';
 document.querySelectorAll('[data-go]').forEach(b=>{b.classList.toggle('active',b.dataset.go===state.route&&b.classList.contains('navlink'))});
 document.querySelectorAll('.mobile-nav button').forEach(b=>b.classList.toggle('active',b.dataset.go===state.route));
 const section=sections.find(x=>x[0]===state.route);
 document.getElementById('current-path').textContent=section[0].toUpperCase().replaceAll('_',' ');
 updateCoach();
 const screens={overview:dashboard,macro,equities,options,strategies,communities,venture};
 root.innerHTML=screens[state.route]();
 if(focus)root.focus({preventScroll:true});
 window.scrollTo({top:0,behavior:'instant'});
}
function notice(message){
 const node=document.getElementById('toast');
 node.textContent=message;node.classList.add('show');
 clearTimeout(notice.timer);notice.timer=setTimeout(()=>node.classList.remove('show'),3700);
}
function errorMessage(err){
 notice(err?.message||'Unable to calculate. Check the inputs and retry.');
}
async function loadFiscal(){
 state.macro.loading=true;state.macro.error=null;
 const fetchJson=async url=>{
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),13000);
  try{
   const r=await fetch(url,{headers:{Accept:'application/json'},signal:abort.signal});
   if(!r.ok)throw Error('HTTP '+r.status);
   const j=await r.json();if(!Array.isArray(j?.data))throw Error('Unexpected official data response');
   return j.data;
  }finally{clearTimeout(timer)}
 };
 const tasks=await Promise.allSettled([fetchJson(urlDebt),fetchJson(urlRates)]);
 for(let i=0;i<tasks.length;i++){
  const k=i===0?'debt':'rates',key=i===0?'tot_pub_debt_out_amt':'avg_interest_rate_amt';
  if(tasks[i].status==='fulfilled'){
   const entries=tasks[i].value.map(x=>({date:x.record_date,value:Number(x[key])}))
     .filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&Number.isFinite(x.value)&&x.value>=0)
     .sort((a,b)=>a.date.localeCompare(b.date));
   state.macro[k]=entries;
   if(!entries.length)state.macro.error='No valid '+k+' observations were returned by Treasury.';
  }else{
   state.macro[k]=[];
   state.macro.error='Official '+k+' dataset could not be retrieved. Check network access or the Treasury API.';
  }
 }
 state.macro.loading=false;state.macro.loadedAt=new Date().toISOString();
 if(['overview','macro'].includes(state.route))show(state.route,false);
}
function readForm(form){return Object.fromEntries(new FormData(form).entries());}
function optionFields(form){const x=readForm(form);return Object.fromEntries(Object.entries(x).map(([k,v])=>[k,Number(v)]));}
async function fileDigest(content){
 const bytes=new TextEncoder().encode(content),digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function onFile(file){
 if(!file)return;
 if(file.size>16_000_000)throw Error('Maximum CSV size is 16 MB.');
 if(!engine)throw Error('The local backtest engine did not load.');
 const text=await file.text(),parsed=engine.parseCsv(text);
 state.bars=parsed.bars;state.source=file.name.slice(0,150);
 state.sourceDigest=await fileDigest(text);
 state.backtest=null;state.sim=null;state.csvError=null;
 notice('Imported '+parsed.bars.length+' historical observations locally.');
 show('strategies',false);
}
function execForm(form){
 const fields=optionFields(form);
 if(form.id==='bs-form'){state.bs=fields;state.bsResult=finance.blackScholes(fields);show('options',false);}
 if(form.id==='dcf-form'){state.dcf=fields;state.dcfResult=finance.dcf(fields);show('equities',false);}
 if(form.id==='bond-form'){state.bond=fields;state.bondResult=finance.bondRisk(fields);show('macro',false);}
 if(form.id==='capital-form'){state.venture=fields;state.ventureResult=finance.capTable(fields);show('venture',false);}
 if(form.id==='backtest-form'){
  if(!state.bars)throw Error('Import actual historical prices before testing a strategy.');
  state.sma=fields;
  state.backtest=engine.backtest(state.bars,{strategy:'sma_crossover',fast:fields.fast,slow:fields.slow,costBps:fields.costBps,
     holdout:fields.holdout,riskFree:fields.riskFree/100});
  state.sim=null;state.csvError=null;
  show('strategies',false);
 }
}
function commandResults(value=''){
 const q=value.trim().toLowerCase();
 const list=sections.filter(x=>(x[0]+' '+x[1]+' '+x[2]).toLowerCase().includes(q));
 document.getElementById('command-results').innerHTML=list.map(x=>
 '<button data-go="'+x[0]+'"><span>'+e(x[1])+'</span><small>'+e(x[2])+' ↗</small></button>').join('')||
 '<div class="surface-inner data-note">No matching research tool. Try valuation, rates, options or governance.</div>';
}
function openCommand(){
 cmd.classList.remove('hidden');cmd.setAttribute('aria-hidden','false');
 document.getElementById('command-input').value='';
 commandResults('');
 document.getElementById('command-input').focus();
}
function closeCommand(){cmd.classList.add('hidden');cmd.setAttribute('aria-hidden','true');document.getElementById('command-open').focus();}
document.addEventListener('click',event=>{
 const go=event.target.closest('[data-go]');
 if(go){const next=go.dataset.go;event.preventDefault();if(!cmd.classList.contains('hidden'))closeCommand();show(next);return;}
 const a=event.target.closest('[data-act]');
 if(a){
  event.preventDefault();
  try{
   switch(a.dataset.act){
    case'toggle-expert':state.expert=!state.expert;show(state.route,false);break;
    case'refresh-macro':loadFiscal().catch(errorMessage);notice('Refreshing Treasury observations…');break;
    case'option-call':state.bsType='call';show('options',false);break;
    case'option-put':state.bsType='put';show('options',false);break;
    case'bootstrap':
     if(!state.backtest)throw Error('Run a backtest on uploaded data first.');
     state.sim=engine.bootstrap(state.backtest.returns.slice(-state.backtest.test.observations),{paths:300,seed:42,block:5});
     show('strategies',false);break;
   }
  }catch(err){errorMessage(err);}return;
 }
 if(event.target===cmd&&!cmd.classList.contains('hidden'))closeCommand();
});
document.addEventListener('submit',event=>{
 if(!['bs-form','dcf-form','bond-form','capital-form','backtest-form'].includes(event.target.id))return;
 event.preventDefault();
 try{execForm(event.target);}catch(err){state.csvError=err.message;errorMessage(err);}
});
document.addEventListener('change',event=>{
 if(event.target.id==='csv-file'){
  onFile(event.target.files?.[0]).catch(err=>{
   state.csvError=err?.message||String(err);errorMessage(err);show('strategies',false);
  });
 }
});
document.getElementById('command-open').addEventListener('click',openCommand);
document.getElementById('command-close').addEventListener('click',closeCommand);
document.getElementById('command-input').addEventListener('input',event=>commandResults(event.target.value));
document.getElementById('command-input').addEventListener('keydown',event=>{
 if(event.key==='Enter'){
  const next=document.querySelector('#command-results [data-go]');
  if(next){event.preventDefault();show(next.dataset.go);closeCommand();}
 }
});
document.addEventListener('keydown',event=>{
 if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();openCommand();}
 if(event.key==='Escape'&&!cmd.classList.contains('hidden'))closeCommand();
});
document.getElementById('mobile-nav').innerHTML=sections.map(x=>
 '<button type="button" data-go="'+x[0]+'"'+(state.route===x[0]?' class="active"':'')+'>'+e(x[1])+'</button>').join('');
document.getElementById('today').textContent=new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
try{
 if(!finance||!engine)throw Error('A calculation library failed to load.');
 state.bsResult=finance.blackScholes(state.bs);
 state.dcfResult=finance.dcf(state.dcf);
 state.bondResult=finance.bondRisk(state.bond);
 state.ventureResult=finance.capTable(state.venture);
 show('overview',false);
 loadFiscal().catch(err=>{state.macro.error=String(err);show(state.route,false);});
}catch(err){
 root.innerHTML='<section class="surface surface-inner"><h2>Research tools unavailable</h2><p class="data-note">'+e(err.message)+'</p></section>';
 console.error(err);
}
})();
