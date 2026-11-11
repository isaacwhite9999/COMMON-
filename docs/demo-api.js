/* COMMON GitHub Pages educational sandbox. No real accounts, shared state, funds, or trades. */
'use strict';
(() => {
const KEY='common_showcase_local_v1', now=()=>new Date().toISOString(), uid=()=>crypto.randomUUID();
const companies={TSLA:['Tesla, Inc.',1318605],AAPL:['Apple Inc.',320193],MSFT:['Microsoft Corporation',789019],NVDA:['NVIDIA Corporation',1045810],AMZN:['Amazon.com, Inc.',1018724]};
const communitySeeds=[
['tesla-shareholders','Tesla Shareholders','PUBLIC_EQUITY','TSLA','zap','Research Tesla SEC filings and shareholder voting rights.',true],
['neighborhood-housing','Neighborhood Housing','HOUSING',null,'building','Explore housing cooperatives, community land trusts, and affordable ownership.',true],
['main-street-owners','Main Street Owners','BUSINESS',null,'store','Learn about employee buyouts and community ownership of local businesses.',false],
['index-fund-learners','Long-Term Investors','PUBLIC_EQUITY',null,'chart','Discuss long-term investing, diversification, fund fees and risk.',false]];
const proposalSeeds=[
['tesla-shareholders','What should retail shareholders know before the next proxy vote?','GOVERNANCE','Review official Tesla proxy materials and explain each proposal before forming an opinion.'],
['tesla-shareholders','Create an easy-to-read earnings research brief','RESEARCH','Explore Tesla earnings, cash flow, operating margins and important risks from SEC filings.'],
['neighborhood-housing','Explore community land trusts for housing','OWNERSHIP','How can land trusts support housing affordability and give residents a meaningful voice?'],
['main-street-owners','How employee buyouts can preserve local businesses','OWNERSHIP','Discuss the costs, governance, financing and risks of a hypothetical employee buyout.'],
['index-fund-learners','What is the real cost of fund fees?','EDUCATION','Compare expense ratios using hypothetical amounts and explain the effect of diversification.']];
function initial(){
const communities=communitySeeds.map(([slug,name,category,symbol,icon,description,featured])=>({
 id:slug,slug,name,category,symbol,icon,description,featured,sample:true,members:slug==='tesla-shareholders'?1:0,joined:slug==='tesla-shareholders',owner:false,visibility:'PUBLIC'}));
const proposals=proposalSeeds.map(([slug,title,topic,body],i)=>({
 id:'example-'+i,title,topic,body,community_slug:slug,community_name:communities.find(x=>x.slug===slug).name,
 author:'COMMON Research Desk',created_at:'2026-11-11T00:00:00Z',sample:true,
 poll_counts:{SUPPORT:0,OPPOSE:0,ABSTAIN:0},my_vote:null}));
return {user:null,communities,proposals,watches:[],activity:[],plans:{}};}
let db;try{db=JSON.parse(sessionStorage.getItem(KEY))||initial()}catch{db=initial()}
if(!db||!Array.isArray(db.communities)||!Array.isArray(db.proposals))db=initial();
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(db))}catch{}};
const fail=(code,message)=>{const e=new Error(message);e.code=code;throw e;};
const user=()=>{if(!db.user)fail(401,'Enter the educational demo first')};
const payload=o=>{try{return JSON.parse(o?.body||'{}')}catch{fail(400,'Invalid example data')}};
const community=slug=>db.communities.find(c=>c.slug===decodeURIComponent(slug));
const visible=c=>Boolean(c&&(c.visibility==='PUBLIC'||c.joined));
const activity=(action,entity_type)=>{db.activity.unshift({action,entity_type,created_at:now()});db.activity=db.activity.slice(0,20)};
function fund(c){
const p=db.plans[c.slug]||{contribution_example:100,new_members_example:5,months_example:12};
const members=c.members+p.new_members_example*p.months_example;
return {can_edit:c.owner,plan:{community_slug:c.slug,group_members:c.members,...p,hypothetical_members:members,
 hypothetical_capital:members*p.contribution_example,real_money_collected:0,mode:'EDUCATIONAL_SIMULATION',
 notice:'This is hypothetical arithmetic only. No invested money, shares or fund assets exist.'}};}
window.commonDemoApi=async(path,options={})=>{
const method=(options.method||'GET').toUpperCase();
if(path==='/config')return {public_preview_only:true,data_persistence:'browser-session-only',real_money_enabled:false};
if(path==='/health')return {status:'ok',mode:'browser-only',real_money_enabled:false};
if(path==='/auth/demo'&&method==='POST'){
 db.user={id:'local-demo',name:'Joe',demo:true,csrf:'educational-only'};save();return {user:db.user};}
if(path==='/auth/login'||path==='/auth/register')fail(403,'This site has no real member accounts.');
if(path==='/me'){user();return {user:db.user};}
if(path==='/auth/logout'&&method==='POST'){db.user=null;save();return {ok:true};}
if(path==='/research/companies')return {items:Object.entries(companies).map(([symbol,x])=>({symbol,company_name:x[0]})),source:'SEC filing links',price_quotes_included:false};
if(path.startsWith('/research/companies/')){
 const symbol=path.split('/').pop().toUpperCase(),co=companies[symbol];if(!co)fail(404,'Company not configured');
 return {symbol,company_name:co[0],status:'not_configured',facts:{},
 message:'This static preview cannot fetch live market data. Visit the SEC for real filings, dates, and numbers.',
 filing_page:'https://www.sec.gov/edgar/browse/?CIK='+co[1]+'&owner=exclude'};
}
user();
if(path==='/communities'&&method==='GET')return {items:db.communities.filter(visible)};
if(path==='/proposals'&&method==='GET')return {items:db.proposals.filter(p=>visible(community(p.community_slug)))};
if(path==='/activity'&&method==='GET')return {items:db.activity};
if(path==='/watchlist'&&method==='GET')return {symbols:db.watches};
if(path==='/watchlist'&&method==='POST'){
 const symbol=String(payload(options).symbol||'').trim().toUpperCase();
 if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))fail(422,'Invalid symbol');
 db.watches=[...new Set([...db.watches,symbol])].sort();activity('WATCH_ADD','watch');save();
 return {symbol,tracking_only:true};}
if(path.startsWith('/watchlist/')&&method==='DELETE'){
 db.watches=db.watches.filter(x=>x!==path.split('/').pop().toUpperCase());activity('WATCH_REMOVE','watch');save();return {ok:true};}
if(path==='/communities'&&method==='POST'){
 const p=payload(options),name=String(p.name||'').trim(),description=String(p.description||'').trim();
 if(name.length<4||name.length>80||description.length<30||description.length>600)fail(422,'Add a name and a longer description');
 if(!['PUBLIC_EQUITY','HOUSING','BUSINESS'].includes(p.category)||!['PUBLIC','PRIVATE'].includes(p.visibility))fail(422,'Invalid group category');
 const slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)+'-'+uid().slice(0,8);
 const c={id:uid(),slug,name,description,category:p.category,symbol:null,icon:'users',
 featured:false,sample:false,owner:true,joined:true,members:1,visibility:p.visibility};
 db.communities.push(c);activity('COMMUNITY_CREATE','community');save();return {community:c};}
let m=path.match(/^\/communities\/([^/]+)\/fund-lab$/);
if(m){
 const c=community(m[1]);if(!visible(c))fail(404,'Group not found');
 if(method==='GET')return fund(c);
 if(method==='PUT'){
  if(!c.owner)fail(403,'Only the local group creator can edit this example');
  const p=payload(options);
  for(const [k,min,max] of [['contribution_example',0,1000000],['new_members_example',0,10000],['months_example',1,120]]){
   if(!Number.isInteger(p[k])||p[k]<min||p[k]>max)fail(422,'Invalid scenario amount');}
  db.plans[c.slug]=p;activity('FUND_LAB_PLAN_UPDATE','community');save();return fund(c);}}
m=path.match(/^\/communities\/([^/]+)\/invites$/);
if(m&&method==='POST')fail(403,'Shareable invitations require a live backend. This is a private browser demonstration.');
if(/^\/invites\//.test(path))fail(403,'Invitation links require a live backend.');
m=path.match(/^\/communities\/([^/]+)\/(join|leave)$/);
if(m&&method==='POST'){
 const c=community(m[1]);if(!c)fail(404,'Group not found');
 if(m[2]==='join'){
  if(c.visibility==='PRIVATE')fail(403,'This private group is only an example');
  if(!c.joined){c.joined=true;c.members++;activity('COMMUNITY_JOIN','community')}}
 else{
  if(c.owner)fail(403,'Creator cannot leave their example group');
  if(c.joined){c.joined=false;c.members=Math.max(0,c.members-1);activity('COMMUNITY_LEAVE','community')}}
 save();return {community:c};}
m=path.match(/^\/communities\/([^/]+)\/proposals$/);
if(m&&method==='POST'){
 const c=community(m[1]),p=payload(options);if(!c?.joined)fail(403,'Join the group first');
 if(String(p.title||'').length<12||String(p.body||'').length<40)fail(422,'Please add more detail');
 const proposal={id:uid(),title:String(p.title).slice(0,160),body:String(p.body).slice(0,4000),topic:p.topic,
 community_slug:c.slug,community_name:c.name,author:'Joe (local example)',created_at:now(),
 sample:true,poll_counts:{SUPPORT:0,OPPOSE:0,ABSTAIN:0},my_vote:null};
 db.proposals.unshift(proposal);activity('DISCUSSION_CREATE','proposal');save();return {proposal};}
m=path.match(/^\/proposals\/([^/]+)\/vote$/);
if(m&&method==='POST'){
 const p=db.proposals.find(x=>x.id===decodeURIComponent(m[1]));if(!p)fail(404,'Discussion not found');
 if(!community(p.community_slug)?.joined)fail(403,'Join this group before voting');
 const choice=payload(options).choice;if(!['SUPPORT','OPPOSE','ABSTAIN'].includes(choice))fail(422,'Invalid poll choice');
 if(p.my_vote)p.poll_counts[p.my_vote]=Math.max(0,p.poll_counts[p.my_vote]-1);
 p.my_vote=choice;p.poll_counts[choice]++;activity('DISCUSSION_POLL_VOTE','proposal');save();
 return {proposal:p,notice:'Demo sentiment poll only. Not a legal proxy vote.'};}
m=path.match(/^\/communities\/([^/]+)$/);
if(m&&method==='GET'){const c=community(m[1]);if(!visible(c))fail(404,'Group not found');
 return {community:c,proposals:db.proposals.filter(x=>x.community_slug===c.slug)};}
fail(404,'This feature requires the future live platform.');
};
})();