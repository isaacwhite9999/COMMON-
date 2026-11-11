
/* COMMON 3 — A consumer finance / social community experience.
   All financial movement and demo interactions are explicitly non-live until
   regulated partners and an authenticated database are configured. */
(() => {
'use strict';
const ICONS={
home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-8h6v8"/>',
users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
wallet:'<rect x="2" y="5" width="20" height="16" rx="2"/><path d="M2 9h20M16 15h2"/>',
chart:'<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-8"/>',
chat:'<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8A8.5 8.5 0 0 1 12.5 20a8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 8.7 3.9a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
plus:'<path d="M12 5v14M5 12h14"/>',
search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
right:'<path d="m9 18 6-6-6-6"/>',down:'<path d="m6 9 6 6 6-6"/>',
heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
send:'<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
bookmark:'<path d="M5 4h14v17l-7-5-7 5z"/>',
building:'<path d="M4 21V3h16v18M9 21v-5h6v5M8 7h.01M16 7h.01M8 11h.01M16 11h.01M2 21h20"/>',
book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM4 19.5A2.5 2.5 0 0 0 6.5 22H20"/>',
shield:'<path d="m12 22 8-4V6l-8-4-8 4v12z"/><path d="m9 12 2 2 4-4"/>',
check:'<path d="m5 12 4 4L19 6"/>',
x:'<path d="M18 6 6 18M6 6l12 12"/>',
logout:'<path d="M10 17l5-5-5-5M15 12H3M12 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8"/>',
help:'<circle cx="12" cy="12" r="10"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.5-2.5 4M12 17h.01"/>',
lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
credit:'<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v5M12 7h.01"/>',
sliders:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
layers:'<path d="m12 2-9 5 9 5 9-5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
arrow:'<path d="M7 17 17 7M8 7h9v9"/>',
menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
edit:'<path d="M12 20h9M16 4l4 4-11 11-4 1 1-4z"/>',
filter:'<path d="M3 5h18M6 12h12M10 19h4"/>',
handshake:'<path d="M2 12 9 5l4 2 5-2 4 4-7 9-4-1-3 2-6-6"/>',
spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>'
};
const ic=(n,sz=20)=>'<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" aria-hidden="true">'+(ICONS[n]||ICONS.info)+'</svg>';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,11);
const names=['Tesla Shareholder Circle','Neighborhood Housing Collective','Main Street Owners','The Long Game'];
const initialGroups=[
{id:'tesla',name:names[0],category:'Stocks',summary:'Understand Tesla, talk strategy, and use your shareholder voice.',members:41,joined:true,private:false,accent:'T',about:'A member-driven space for company research, corporate governance and shareholder education.'},
{id:'housing',name:names[1],category:'Housing',summary:'Explore community ownership, co-ops and land trusts.',members:127,joined:false,private:false,accent:'H',about:'A practical research community exploring pathways to long-term affordable housing.'},
{id:'local',name:names[2],category:'Business',summary:'Help local businesses stay in the hands of their communities.',members:69,joined:false,private:false,accent:'M',about:'Research business transitions, employee buyouts and community ownership.'},
{id:'long',name:names[3],category:'Learning',summary:'Learn the basics and build a long-term investing mindset.',members:316,joined:false,private:false,accent:'L',about:'Friendly lessons and source-backed discussions for new investors.'}
];
const initialPosts=[
{id:'p1',group:'tesla',author:'Morgan P.',avatar:'MP',time:'2h ago',title:'What does voting at Tesla actually change?',body:'I put together a beginner-friendly explainer of what shareholders can vote on, what board elections mean, and why reading the official proxy statement matters. Let’s discuss the proposal rather than just the stock price.',likes:24,liked:false,comments:[{by:'Alex',text:'The proxy statement is the right starting point.'}]},
{id:'p2',group:'housing',author:'Riley J.',avatar:'RJ',time:'5h ago',title:'Could a community land trust protect these homes?',body:'I’ve been learning about land trusts and resident cooperatives. What would a neighborhood actually need to research before exploring a property acquisition? I added the NYC HPD land-trust resources to our reading list.',likes:18,liked:false,comments:[]},
{id:'p3',group:'local',author:'Sam D.',avatar:'SD',time:'Yesterday',title:'Imagine the employees buying the shop they work in',body:'Instead of a sale to a distant buyer, what would a worker ownership transition look like? Who finances the deal, who votes, and what can go wrong? Looking for research partners.',likes:33,liked:false,comments:[]}
];
const initialProjects=[
{id:'r1',category:'Housing',title:'Community-owned apartment buildings',description:'Explore cooperative housing, resident governance, financing and long-term affordability.',stage:'Research',followers:89,followed:false,icon:'building'},
{id:'r2',category:'Local business',title:'Keep Main Street independent',description:'Research employee buyouts and local-business transitions, with ownership shared by participants.',stage:'Idea',followers:117,followed:false,icon:'handshake'},
{id:'r3',category:'Public markets',title:'A stronger shareholder voice',description:'Learn how individual shareholders can understand proxies and engage with company governance.',stage:'Research',followers:226,followed:true,icon:'chart'}
];
const tickerCatalog=[
{symbol:'TSLA',name:'Tesla, Inc.',cik:'1318605',explain:'Automotive and energy business; read risks and filings before deciding anything.'},
{symbol:'AAPL',name:'Apple Inc.',cik:'320193',explain:'Consumer devices, services and a large global supply chain.'},
{symbol:'MSFT',name:'Microsoft',cik:'789019',explain:'Software, cloud infrastructure, AI and business services.'},
{symbol:'NVDA',name:'NVIDIA',cik:'1045810',explain:'Semiconductors and AI computing infrastructure.'},
{symbol:'AMZN',name:'Amazon',cik:'1018724',explain:'Online commerce, cloud and digital services.'}
];
const SEED={groups:initialGroups,posts:initialPosts,projects:initialProjects,watch:['TSLA','MSFT'],threads:[{id:'general',name:'The Commons',caption:'Welcome to your space',messages:[{mine:false,author:'COMMON',text:'When live communities launch, this is where your conversations will live.'}]},{id:'tesla',name:'Tesla Shareholder Circle',caption:'Group chat preview',messages:[{mine:false,author:'Morgan',text:'What matters most to you in the next proxy statement?'},{mine:false,author:'Riley',text:'I want to understand shareholder votes before getting involved.'}]}],interest:'Build wealth',profile:{name:'Joe',handle:'@joe'},seen:false};
let store;try{store=JSON.parse(sessionStorage.getItem('common_v3_demo')||'null')}catch{store=null}
if(!store||!Array.isArray(store.groups))store=JSON.parse(JSON.stringify(SEED));
const save=()=>{try{sessionStorage.setItem('common_v3_demo',JSON.stringify(store))}catch{}};
const cfg=window.COMMON_CONFIG||{};let supa=null;
try{if(cfg.supabaseUrl&&cfg.supabaseAnonKey&&cfg.communityBackendReady===true&&window.supabase?.createClient){supa=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey)}}catch{}
const ui={screen:'welcome',tab:'home',filter:'For you',selectedGroup:null,groupTab:'discussion',thread:'general',modal:null,expandComments:null,authError:'',authWorking:false,search:'',focusGroup:null,groupFilter:'All'};
const root=document.getElementById('root');
function toast(message){let t=document.getElementById('toast');t.textContent=message;t.classList.remove('hidden');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.add('hidden'),3700)}
function avatar(text,klass=''){return '<div class="avatar '+klass+'">'+esc(text.slice(0,2).toUpperCase())+'</div>'}
function logo(){return '<span class="logo"><span class="logo-mark">c</span><span class="logo-word">common<span style="color:#5883fb">.</span></span></span>'}
function show(tab,group=null){
 ui.tab=tab;ui.selectedGroup=group;ui.modal=null;ui.search='';
 location.hash=tab==='groups'&&group?'#community-'+encodeURIComponent(group):'#'+tab;
 render();window.scrollTo(0,0);
}
function defaultPostGroup(){return store.groups.find(g=>g.joined)?.id||'tesla'}
function notice(text){return '<div class="preview-banner">'+ic('info')+'<div>'+text+'</div></div>'}
function authPage(){
 const sign=ui.screen==='signin',create=ui.screen==='signup',welcome=ui.screen==='welcome';
 return '<main class="auth-shell"><section class="auth-left">'+logo()+
 '<div class="auth-feature"><span class="pill" style="background:#ffffff20;color:#d8e8ff;margin-bottom:26px">THE OWNERSHIP NETWORK</span><h1>More than your money.<br><em>Our future.</em></h1><p>Discover people with your goals, build knowledge together, and turn ideas into meaningful ownership.</p></div>'+
 '<div class="auth-proof"><div class="auth-faces">'+avatar('JP','mint')+avatar('AS','peach')+avatar('RK','ink')+'</div><span>Built for everyday people, not just Wall Street.</span></div></section>'+
 '<section class="auth-right"><div class="auth-form-wrap"><span class="pill blue">'+ic('shield',13)+' A new kind of finance community</span>'+
 '<h2>'+(welcome?'Welcome to COMMON':sign?'Welcome back':'Join the movement')+'</h2>'+
 '<p class="intro">'+(welcome?'Get closer to your goals with tools for money, investing and collective ownership.':sign?'Sign in to your COMMON account.':'Create an account to find your people and explore what ownership can look like.')+'</p>'+
 (welcome?'<div class="stack"><button class="button full" data-act="auth-view" data-val="signup">Create your account '+ic('right')+'</button><button class="button secondary full" data-act="auth-view" data-val="signin">I already have an account</button><button class="button soft full" data-act="demo">'+ic('spark')+' Explore interactive preview</button></div>':
 '<form id="auth-form" class="stack">'+(create?'<div><label class="form-label" for="displayName">Your name</label><input id="displayName" class="field" autocomplete="name" placeholder="Your full name" required maxlength="80"></div>':'')+
 '<div><label class="form-label" for="email">Email address</label><input id="email" class="field" type="email" autocomplete="email" placeholder="you@example.com" required></div>'+
 '<div><label class="form-label" for="password">Password</label><input id="password" class="field" type="password" minlength="8" autocomplete="'+(sign?'current-password':'new-password')+'" placeholder="At least 8 characters" required></div>'+
 (create?'<label class="small muted"><input type="checkbox" required> I understand COMMON does not hold investments or offer live trading yet.</label>':'')+
 (ui.authError?'<div class="auth-notice" role="alert">'+esc(ui.authError)+'</div>':'')+
 '<button class="button full" type="submit" '+(ui.authWorking?'disabled':'')+'>'+(ui.authWorking?'Checking…':sign?'Sign in':'Create account')+'</button></form>'+
 '<div class="auth-switch">'+(sign?'New to COMMON? <button class="link-btn" data-act="auth-view" data-val="signup">Create an account</button>':'Already have an account? <button class="link-btn" data-act="auth-view" data-val="signin">Sign in</button>')+'</div><button style="margin-top:18px" class="button soft full" data-act="demo">Try the interactive preview instead</button>')+
 '<div class="auth-notice"><strong>Preview status</strong><br>'+(!supa?'Real signups are not activated yet. The interactive preview does not create an account or collect money.':'Email sign-in is available through our connected identity provider.')+'</div>'+
 '<p class="tiny muted">COMMON is a community and education platform. No custody, trading, promised returns or live investment pools.</p></div></section></main>';
}
const tabs=[['home','Home','home'],['invest','Invest','chart'],['groups','Communities','users'],['money','Money','wallet'],['messages','Inbox','chat']];
function chrome(){
 return '<div class="app-shell"><aside class="navbar">'+logo()+
 '<div class="nav-links">'+tabs.map(([t,label,icon])=>'<button class="nav-item '+(ui.tab===t?'active':'')+'" data-tab="'+t+'">'+ic(icon)+'<span>'+label+'</span>'+(t==='messages'?'<span class="counter">2</span>':'')+'</button>').join('')+
 '<button class="nav-item '+(ui.tab==='ownership'?'active':'')+'" data-tab="ownership">'+ic('building')+'<span>Ownership</span></button>'+
 '<button class="nav-item '+(ui.tab==='learn'?'active':'')+'" data-tab="learn">'+ic('book')+'<span>Learn</span></button></div>'+
 '<div class="nav-spacer"></div><div class="nav-person"><button data-tab="profile">'+avatar(store.profile.name)+'<span class="details"><strong>'+esc(store.profile.name)+'</strong><span class="tiny muted">Preview account</span></span>'+ic('right',16)+'</button></div></aside>'+
 '<div class="main-wrap"><header class="mobile-head">'+logo()+'<div class="row"><button class="icon-btn" data-tab="learn" aria-label="Learn">'+ic('help')+'</button><button class="icon-btn" data-tab="profile" aria-label="Profile">'+ic('users')+'</button></div></header>'+
 '<header class="topbar"><h2>'+({home:'Your home',invest:'Investing',groups:'Communities',money:'Money',messages:'Messages',ownership:'Ownership',learn:'COMMON Academy',profile:'My profile'}[ui.tab]||'COMMON')+'</h2><label class="top-search">'+ic('search',17)+'<input id="global-search" placeholder="Search groups, people or assets" value="'+esc(ui.search)+'" aria-label="Search"/></label><button class="icon-btn" aria-label="Help" data-tab="learn">'+ic('help')+'</button><button class="icon-btn" data-tab="profile">'+avatar(store.profile.name)+'</button></header>'+
 '<main class="content">'+page()+'</main></div><nav class="mobile-nav" aria-label="Main navigation">'+tabs.map(([t,label,icon])=>'<button class="'+(ui.tab===t?'active':'')+'" data-tab="'+t+'">'+ic(icon)+'<span>'+label+'</span></button>').join('')+'</nav></div>'+
 (ui.modal?modal(): '')+'<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>';
}
function page(){
 if(ui.tab==='home')return home();
 if(ui.tab==='groups')return communities();
 if(ui.tab==='invest')return investing();
 if(ui.tab==='money')return money();
 if(ui.tab==='messages')return messages();
 if(ui.tab==='ownership')return ownership();
 if(ui.tab==='learn')return learn();
 if(ui.tab==='profile')return profile();
 return home();
}
function head(t,s='',right=''){return '<div class="space" style="align-items:flex-start;margin-bottom:22px"><div><h1 class="page-title">'+t+'</h1>'+(s?'<p class="subhead">'+s+'</p>':'')+'</div>'+right+'</div>'}
function home(){
 const list=(ui.filter==='My circles'?store.posts.filter(p=>store.groups.find(g=>g.id===p.group)?.joined):store.posts);
 return '<div class="columns"><div><div class="tour-stamp">'+ic('spark')+'<div><strong>Explore COMMON.</strong> This is a guided product preview. Posts and messages are examples or browser-only drafts.</div></div>'+
 '<div class="feature-hero"><div><span class="pill" style="background:#ffffff20;color:white">PEOPLE + POSSIBILITY</span><h2 style="margin-top:16px">The future is something we can own together.</h2><p>Find your community. Share an idea. Build a case for collective ownership.</p></div><button class="button" data-tab="groups">Explore communities '+ic('right',15)+'</button></div>'+
 '<div class="quick-actions"><button class="quick-action" data-act="compose"><span class="glyph">'+ic('edit')+'</span>Start a discussion</button><button class="quick-action" data-act="create-group"><span class="glyph">'+ic('users')+'</span>Create a group</button><button class="quick-action" data-tab="ownership"><span class="glyph">'+ic('building')+'</span>Explore ownership</button></div>'+
 '<div class="feed-tabs"><button class="feed-tab '+(ui.filter==='For you'?'active':'')+'" data-filter="For you">For you</button><button class="feed-tab '+(ui.filter==='My circles'?'active':'')+'" data-filter="My circles">My circles</button></div>'+
 '<div class="surface composer"><div class="row">'+avatar(store.profile.name)+'<textarea id="quick-post" placeholder="What should your community be talking about?"></textarea></div><div class="composer-bottom"><span class="small muted">'+ic('lock',13)+' Browser-only draft in preview</span><button class="button small" data-act="post-quick">Post idea '+ic('right',14)+'</button></div></div>'+
 '<div style="margin-top:15px">'+(list.length?list.map(post).join(''):'<div class="empty">Join a community to start seeing posts from your circles.</div>')+'</div></div><aside class="rail">'+rail()+'</aside></div>';
}
function post(p){
 const group=store.groups.find(g=>g.id===p.group);
 return '<article class="surface post"><div class="post-head">'+avatar(p.avatar||p.author,'mint')+'<div class="post-meta"><strong>'+esc(p.author)+'</strong><p><button class="link-btn" style="font-size:11px;padding:0" data-group="'+esc(p.group)+'">'+esc(group?.name||'Community')+'</button> · '+esc(p.time)+'</p></div><span class="pill">'+(p.sample===false?'Your draft':'Discussion')+'</span></div>'+
 '<h3 class="post-title">'+esc(p.title)+'</h3><p class="post-body">'+esc(p.body)+'</p>'+
 '<div class="post-actions"><button data-act="like" data-id="'+esc(p.id)+'" class="'+(p.liked?'liked':'')+'">'+ic('heart')+' '+p.likes+'</button><button data-act="comments" data-id="'+esc(p.id)+'">'+ic('chat')+' '+p.comments.length+'</button><button data-act="share-post" data-id="'+esc(p.id)+'">'+ic('share')+' Share</button></div>'+
 (ui.expandComments===p.id?'<div class="comment-list">'+p.comments.map(c=>'<div class="comment"><strong>'+esc(c.by)+': </strong>'+esc(c.text)+'</div>').join('')+'</div><form class="comment-form" data-comment="'+esc(p.id)+'"><input required class="field" name="comment" maxlength="600" placeholder="Add a thoughtful comment"/><button class="button small" type="submit">'+ic('send',15)+'</button></form>':'')+'</article>';
}
function rail(){
 return '<div class="surface rail-box"><div class="space"><h3>Trending communities</h3><span class="pill blue">Explore</span></div>'+
 store.groups.slice(0,3).map(g=>'<div class="rail-link" data-group="'+esc(g.id)+'">'+avatar(g.accent)+( '<div style="flex:1"><strong>'+esc(g.name)+'</strong><p>'+g.members+' members</p></div>')+ic('right')+'</div>').join('')+
 '</div><div class="surface rail-box education-prompt"><span class="iconbig">'+ic('book',23)+'</span><h3>New to investing?</h3><p>We'll explain the words, the tradeoffs and the risks, without assuming you know Wall Street.</p><button class="button secondary small" data-tab="learn">Start with the basics '+ic('right',14)+'</button></div>'+
 '<div class="surface rail-box"><h3>The COMMON rule</h3><p class="small muted">Your community can organize, research, and discuss ownership. No one is investing or depositing money through this preview.</p></div>';
}
function communities(){
 if(ui.selectedGroup){const g=store.groups.find(v=>v.id===ui.selectedGroup);if(g)return groupDetail(g)}
 const results=store.groups.filter(g=>(ui.groupFilter==='All'||g.category===ui.groupFilter)&&(!ui.search||(g.name+' '+g.summary).toLowerCase().includes(ui.search.toLowerCase())));
 return head('Find your people','Research together. Discuss openly. Organize around what matters.', '<button class="button" data-act="create-group">'+ic('plus',16)+' Create community</button>')+
 '<div class="tour-stamp">'+ic('info')+'<div>Preview communities are examples. Your own groups, posts, and member counts in this tour exist only in your browser.</div></div>'+
 '<div class="feed-tabs">'+['All','Stocks','Housing','Business','Learning'].map(x=>'<button class="feed-tab '+(ui.groupFilter===x?'active':'')+'" data-group-filter="'+x+'">'+x+'</button>').join('')+'</div>'+
 '<div class="group-list">'+results.map(g=>'<div class="surface group-card"><div class="space"><span class="group-symbol">'+esc(g.accent)+'</span><span class="pill">'+esc(g.category)+'</span></div><h3>'+esc(g.name)+'</h3><p>'+esc(g.summary)+'</p><div class="bottom"><span class="small muted">'+g.members+' members · '+(g.private?'Private':'Public')+'</span><button class="button small '+(g.joined?'secondary':'')+'" data-group="'+esc(g.id)+'">'+(g.joined?'Open':'Explore')+' '+ic('right',14)+'</button></div></div>').join('')+'</div>';
}
function groupDetail(g){
 return '<button class="link-btn" data-act="back-groups" style="margin-bottom:15px">‹ All communities</button>'+
 '<div class="group-hero"><span class="pill">'+esc(g.category)+' COMMUNITY</span><h1>'+esc(g.name)+'</h1><p>'+esc(g.about||g.summary)+'</p><div class="space" style="margin-top:23px"><span class="small">'+g.members+' example members · '+(g.private?'Private':'Public')+' community</span><button class="button '+(g.joined?'secondary':'')+'" data-act="join-group" data-id="'+esc(g.id)+'">'+(g.joined?'✓ Joined':'Join community')+'</button></div></div>'+
 '<div class="group-tabs">'+[['discussion','Discussion'],['decisions','Decisions'],['fund','Fund lab'],['about','About']].map(([k,v])=>'<button class="'+(ui.groupTab===k?'active':'')+'" data-group-tab="'+k+'">'+v+'</button>').join('')+'</div>'+
 '<div class="group-detail"><div>'+groupPane(g)+'</div><aside class="rail"><div class="surface rail-box"><h3>Your circle</h3><p class="small muted">Build knowledge with others. Real membership and messaging require the connected community backend.</p><button class="button secondary full" style="margin-top:17px" data-act="preview-invite">Invite people '+ic('share',15)+'</button></div></aside></div>';
}
function groupPane(g){
 if(ui.groupTab==='discussion')return '<div class="space" style="margin-bottom:14px"><h3>Community discussions</h3><button class="button small" data-act="compose" data-val="'+esc(g.id)+'">Write a post</button></div>'+
 (store.posts.filter(p=>p.group===g.id).map(post).join('')||'<div class="empty">No conversations yet. Start a discussion.</div>');
 if(ui.groupTab==='decisions')return '<div class="surface" style="padding:22px"><span class="pill orange">NONBINDING COMMUNITY POLL</span><h3 style="font-size:21px;margin:15px 0">What should this community research next?</h3><p class="small muted">This is an opinion poll, not a securities vote or instruction to trade.</p>'+
 ['Research governance','Learn about valuation','Explore ownership structure'].map((v,i)=>'<button class="feature-row" style="width:100%;text-align:left;margin-top:10px" data-act="vote" data-id="'+i+'">'+ic('check',16)+' <span>'+v+'</span>'+((store.votes||{})[g.id]===i?'<span class="pill blue">Your vote</span>':'')+'</button>').join('')+'</div>';
 if(ui.groupTab==='fund')return '<div class="surface" style="padding:24px"><span class="pill blue">FUND BUILDER · EDUCATIONAL ONLY</span><h2 style="font-size:24px;margin:16px 0 8px">From a few friends to a collective vision.</h2><p class="muted small">Explore how membership and hypothetical contributions would scale. These figures are not balances, AUM, investments, or commitments.</p>'+
 '<div class="stack" style="margin-top:20px"><label><span class="form-label">Example amount per person ($)</span><input class="field" id="fund-amount" type="number" min="0" max="1000000" step="50" value="'+(store.fundAmount||100)+'"></label><label><span class="form-label">Potential members</span><input class="field" id="fund-members" type="number" min="1" max="1000000" value="'+(store.fundMembers||41)+'"></label><div class="tutorial-highlight"><div class="small muted">Hypothetical total (not money held)</div><div id="fund-result" style="font-size:34px;font-weight:900;letter-spacing:-.06em">$'+((store.fundAmount||100)*(store.fundMembers||41)).toLocaleString()+'</div><p class="small muted">Simple multiplication, not investment performance. A real pooled fund would require separate legal and financial arrangements.</p></div><button class="button secondary" data-act="fund-info">How would a real club work? '+ic('right',15)+'</button></div></div>';
 return '<div class="surface" style="padding:25px"><h3>What this group is about</h3><p class="muted" style="margin-top:12px;line-height:1.8">'+esc(g.about||g.summary)+'</p><div style="margin-top:19px">'+notice('Community participation is not equity ownership. Members retain their own investment decisions unless they separately establish a lawful pooled entity.')+'</div></div>';
}
function investing(){
 return head('Invest with understanding','Research first. See the bigger picture before you make a move.')+
 '<div class="feature-hero" style="min-height:190px;background:#192952"><div><span class="pill" style="background:#ffffff22;color:white">MARKETS, MADE HUMAN</span><h2 style="margin-top:14px">Own a piece of what you believe in.</h2><p>Explore publicly traded companies. Investment orders are a future capability.</p></div><button class="button" data-act="invest-demo">Preview how investing works '+ic('right',15)+'</button></div>'+
 notice('<strong>Research mode:</strong> no live share prices, investment execution, or brokerage balances are shown. Company links lead to actual SEC filings.')+
 '<div class="section-bar"><h3>Explore companies</h3><span class="pill blue">Official SEC sources</span></div>'+
 '<div class="watch-grid">'+tickerCatalog.map((t,i)=>'<div class="stock-card" data-act="open-asset" data-id="'+t.symbol+'"><div class="space"><div class="row"><span class="symbol-blob">'+t.symbol.slice(0,1)+'</span><div><div class="symbol">'+t.symbol+'</div><h3>'+esc(t.name)+'</h3></div></div>'+ic('right',16)+'</div><div class="chart"><svg viewBox="0 0 170 42" preserveAspectRatio="none"><path d="'+(i%2?'M2 32 25 22 46 27 69 12 92 22 113 8 140 17 168 3':'M2 35 25 24 46 29 69 17 92 26 113 11 140 15 168 4')+'" /></svg></div><span class="tiny muted">Illustrative line only · No price feed</span></div>').join('')+'</div>'+
 '<div class="section-bar"><h3>Your research watchlist</h3><span class="tiny muted">Local preview</span></div><div class="surface" style="padding:12px 22px">'+store.watch.map(t=>'<div class="account-row"><div><h3>'+t+'</h3><p>'+esc(tickerCatalog.find(x=>x.symbol===t)?.name||'Watchlist symbol')+'</p></div><button class="button small secondary" data-act="watch" data-id="'+t+'">Remove</button></div>').join('')+'</div>';
}
function money(){
 return head('Your money, simplified','One place to understand what your future financial tools could do.')+
 '<div class="finance-head"><div class="money-card"><div class="space"><strong>COMMON money</strong><span class="pill" style="background:#ffffff77;color:#23492d">COMING WITH A LICENSED PARTNER</span></div><div><p>Available balance</p><div class="balance">—</div><p>No account or funds connected</p></div><div class="actions"><button data-act="wallet-preview">Add money</button><button data-act="wallet-preview">Send</button><button data-act="wallet-preview">Withdraw</button></div></div>'+
 '<div class="preview-balance"><div><span class="pill blue">WALLET WALKTHROUGH</span><h3 style="font-size:22px;margin:18px 0 9px">Money with purpose.</h3><p class="small muted">See how card linking, money movement, shared goals and account protections would work through a regulated partner.</p></div><button class="button secondary" data-act="wallet-preview">See how it works '+ic('right',15)+'</button></div></div>'+
 notice('<strong>No funds are stored here.</strong> This screen does not accept debit card numbers, initiate payments or claim a bank account exists. Future wallet services require authorized financial institutions.')+
 '<div class="section-bar"><h3>Built for the way you live</h3><span class="pill orange">Roadmap preview</span></div>'+
 '<div class="feature-list">'+[
 ['credit','Connect a debit card','Funding from verified accounts, through approved payment partners.'],
 ['wallet','Shared money goals','Transparent group funding plans, contributions and balances when legally supported.'],
 ['shield','Security & controls','Statements, alerts, account recovery and dispute resolution.'],
 ['layers','Investment club accounts','Entity accounts and contribution records, subject to legal and brokerage approval.']
 ].map(([icon,title,sub])=>'<div class="feature-row"><span class="glyph">'+ic(icon)+'</span><div style="flex:1"><h3>'+title+'</h3><p>'+sub+'</p></div><span class="pill orange">Preview</span></div>').join('')+'</div>';
}
function messages(){
 const thread=store.threads.find(t=>t.id===ui.thread)||store.threads[0];
 return head('Your conversations','The place for direct messages and group discussion.')+
 notice('This is an interactive messaging preview. Messages remain in your browser session and are never sent to other people.')+
 '<div class="messages-layout"><div class="thread-list">'+store.threads.map(t=>'<button class="thread-item '+(t.id===ui.thread?'active':'')+'" data-thread="'+esc(t.id)+'">'+avatar(t.name,'mint')+'<div><strong style="font-size:12px">'+esc(t.name)+'</strong><p>'+esc(t.caption)+'</p></div></button>').join('')+'</div>'+
 '<div class="chat-panel"><div class="chat-header row">'+avatar(thread.name)+'<div><strong>'+esc(thread.name)+'</strong><div class="tiny muted">Example conversation</div></div></div><div class="chat-messages">'+thread.messages.map(m=>'<div class="bubble '+(m.mine?'mine':'')+'"><strong>'+esc(m.mine?'You':m.author)+':</strong> '+esc(m.text)+'</div>').join('')+'</div>'+
 '<form class="chat-write" id="chat-form"><input name="message" maxlength="1200" required class="field" placeholder="Write a message…"/><button class="button" type="submit" aria-label="Send">'+ic('send',17)+'</button></form></div></div>';
}
function ownership(){
 return head('Make ownership matter','Find ideas worth building together, from local property to public companies.','<button class="button" data-act="project-create">'+ic('plus',16)+' New idea</button>')+
 '<div class="feature-hero" style="background:#123c3f;min-height:200px"><div><span class="pill" style="background:#ffffff20;color:white">BEYOND BUYING A STOCK</span><h2 style="margin-top:14px">What if the people who lived there owned it?</h2><p>Explore housing, businesses and shareholder action with community-led research.</p></div><button class="button" data-tab="learn">Learn how ownership works '+ic('right',15)+'</button></div>'+
 notice('Projects here are educational research ideas, not investment offerings. Following a project does not create a financial commitment or property interest.')+
 '<div class="section-bar"><h3>Ideas taking shape</h3><span class="pill blue">Discover</span></div>'+
 '<div class="project-grid">'+store.projects.map(p=>'<div class="surface project-card"><span class="pill tag">'+esc(p.category)+' · '+esc(p.stage)+'</span><span class="group-symbol">'+ic(p.icon)+'</span><h3>'+esc(p.title)+'</h3><p>'+esc(p.description)+'</p><div class="space" style="margin-top:auto"><span class="small muted">'+p.followers+' interested</span><button class="button small '+(p.followed?'secondary':'')+'" data-act="follow-project" data-id="'+esc(p.id)+'">'+(p.followed?'Following':'Follow idea')+'</button></div></div>').join('')+'</div>';
}
function learn(){
 const lessons=[
 ['What is a stock?','A stock is a share of ownership in a company. Buying shares carries risks, including losing money. Owning a share does not mean you can dictate company decisions.'],
 ['What is an ETF?','An exchange-traded fund is a basket of investments traded on an exchange. ETFs can help diversify, but they can still lose value and charge fees.'],
 ['What does AUM mean?','Assets under management is the value of assets a manager manages for clients. A group\'s hypothetical member contributions are not real AUM.'],
 ['What is a hedge fund?','A privately operated investment fund with distinct legal requirements and often restricted investor eligibility. A chat group cannot simply declare itself a hedge fund.'],
 ['What is a community land trust?','An organization that holds land for a community purpose, frequently with long-term affordability requirements, while buildings or homes can have separate owners.'],
 ['What is a shareholder vote?','Eligible shareholders can vote on certain company matters through authorized voting channels. A community opinion poll is not a proxy vote.'],
 ['What happens when friends pool money?','A real pooled investment needs an appropriate legal entity, bank or brokerage account, accounting, agreements, and often securities-law analysis. COMMON does not accept those funds today.']
 ];
 return head('Understand money. Build confidence.','No jargon. No assumptions. Learn in the same place you organize.')+
 '<div class="surface tutorial-highlight" style="margin-bottom:20px"><span class="pill blue">START HERE</span><h2 style="font-size:24px;margin:14px 0 10px">You don\'t need to be an expert to belong.</h2><p class="small muted">Open any question below. We explain concepts with simple examples and the trade-offs that matter.</p></div>'+
 lessons.map((l,i)=>'<details class="surface lesson"><summary>'+String(i+1).padStart(2,'0')+' &nbsp; '+esc(l[0])+'</summary><p>'+esc(l[1])+'</p></details>').join('')+
 '<div class="surface" style="padding:23px"><h3>Real sources, not hype.</h3><p class="small muted" style="margin-top:10px">For public companies, use dated SEC filings and official proxy statements. For housing and business transactions, use verified documents and professional advice.</p><a class="button secondary" style="margin-top:15px" href="https://www.investor.gov/introduction-investing" target="_blank" rel="noopener noreferrer">Visit SEC Investor.gov '+ic('arrow',14)+'</a></div>';
}
function profile(){
 return head('Your profile','Your community identity and learning preferences.')+
 '<div class="surface" style="padding:26px"><div class="row" style="gap:18px">'+avatar(store.profile.name,'xl')+'<div><h2 style="font-size:24px">'+esc(store.profile.name)+'</h2><p class="muted">'+esc(store.profile.handle)+'</p><span class="pill orange" style="margin-top:9px">Interactive preview account</span></div></div>'+
 '<div class="line" style="margin:24px 0"></div><div class="space"><h3>What are you here for?</h3><span class="pill blue">'+esc(store.interest)+'</span></div><p class="small muted" style="margin-top:8px">Everything in this session is local. Live profiles will be protected by proper account authentication and privacy controls.</p>'+
 '<div class="stack" style="margin-top:25px"><button class="button secondary" data-act="profile-edit">'+ic('edit',16)+' Edit preview profile</button><button class="button soft" data-tab="learn">'+ic('help')+' Help & education</button><button class="button soft" data-act="logout">'+ic('logout')+' Exit interactive preview</button></div></div>';
}
function modal(){
 const t=ui.modal;
 let body='';
 if(t.type==='compose')body='<div class="modal-head"><div><span class="pill blue">COMMUNITY DISCUSSION</span><h2 style="margin-top:10px">Share an idea</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><form id="post-form" class="stack"><label><span class="form-label">Community</span><select class="field" name="group">'+store.groups.filter(g=>g.joined).map(g=>'<option value="'+esc(g.id)+'" '+(t.group===g.id?'selected':'')+'>'+esc(g.name)+'</option>').join('')+'</select></label><label><span class="form-label">Headline</span><input class="field" required minlength="8" maxlength="150" name="title" placeholder="The idea in one sentence"></label><label><span class="form-label">Your reasoning</span><textarea class="field" name="body" required minlength="20" maxlength="5000" placeholder="What have you researched? Which questions should your community discuss?"></textarea></label>'+notice('Visible only to you in this browser preview. Real group posting requires the community backend.')+'<button class="button full" type="submit">Publish example post '+ic('send',16)+'</button></form>';
 else if(t.type==='create-group')body='<div class="modal-head"><div><span class="pill blue">BUILD A CIRCLE</span><h2 style="margin-top:10px">Create a community</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><form id="group-form" class="stack"><label><span class="form-label">Community name</span><input required minlength="4" maxlength="90" class="field" name="name" placeholder="e.g. East Side Owners"></label><label><span class="form-label">Focus</span><select class="field" name="category"><option>Stocks</option><option>Housing</option><option>Business</option><option>Learning</option></select></label><label><span class="form-label">What will members do?</span><textarea required minlength="20" maxlength="550" class="field" name="summary" placeholder="Explain your community’s purpose"></textarea></label><label><span class="form-label">Visibility</span><select class="field" name="visibility"><option value="public">Public</option><option value="private">Private</option></select></label>'+notice('Preview groups are private to your current browser session, even if marked public.')+'<button class="button full" type="submit">Create preview community</button></form>';
 else if(t.type==='wallet')body='<div class="modal-head"><div><span class="pill orange">FINANCIAL TOOLS · PREVIEW</span><h2 style="margin-top:10px">Your future COMMON wallet</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><p class="muted small">This is an educational walkthrough—not a place to enter real card information.</p><div class="stack" style="margin-top:18px">'+[
 ['1','Identity','Confirm your identity and eligibility with the regulated provider.'],
 ['2','Link a payment method','Connect an eligible external card or bank account through secure partner infrastructure.'],
 ['3','See your real balance','Transactions reconcile to funds actually held by a licensed institution.'],
 ['4','Plan group goals','Subject to legal structure, members can explore investment clubs and future funding workflows.']
 ].map(x=>'<div class="feature-row"><span class="pill blue">'+x[0]+'</span><div><h3>'+x[1]+'</h3><p>'+x[2]+'</p></div></div>').join('')+'</div><button class="button full" data-act="modal-close">Got it</button>';
 else if(t.type==='invest')body='<div class="modal-head"><div><span class="pill blue">STOCK INVESTING · FUTURE EXPERIENCE</span><h2 style="margin-top:10px">See how investing will work</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><p class="muted small">Research companies, understand potential losses, choose an amount, and eventually place an order through a licensed brokerage partner.</p><div class="stack" style="margin-top:18px"><div class="feature-row"><span class="glyph">'+ic('search')+'</span><div><h3>Research</h3><p>Review a real public-company filing and dated financial information.</p></div></div><div class="feature-row"><span class="glyph">'+ic('wallet')+'</span><div><h3>Choose amount and review</h3><p>Future licensed order preview with buying power, fees and risks.</p></div></div><div class="feature-row"><span class="glyph">'+ic('shield')+'</span><div><h3>Execute through a broker</h3><p>Orders and custody remain with approved regulated partners.</p></div></div></div><button class="button full" data-act="modal-close">Back to research</button>';
 else if(t.type==='asset'){const q=tickerCatalog.find(x=>x.symbol===t.symbol)||tickerCatalog[0];body='<div class="modal-head"><div><span class="pill blue">'+q.symbol+' · PUBLIC COMPANY</span><h2 style="margin-top:10px">'+esc(q.name)+'</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><p class="muted small">'+esc(q.explain)+'</p><div class="tutorial-highlight" style="margin-top:18px"><strong>No live price shown</strong><p class="small muted" style="margin-top:7px">We will never invent a market price or suggest a simulated trade was executed.</p></div><div class="stack" style="margin-top:17px"><a class="button secondary full" href="https://www.sec.gov/edgar/browse/?CIK='+q.cik+'&owner=exclude" target="_blank" rel="noopener noreferrer">'+ic('book')+' View official SEC filings '+ic('arrow',14)+'</a><button class="button full" data-act="watch" data-id="'+q.symbol+'">'+(store.watch.includes(q.symbol)?'Remove from watchlist':'Add to watchlist')+'</button><button class="button soft full" data-act="invest-demo">Preview future buy flow</button></div>';}
 else if(t.type==='info'){body='<div class="modal-head"><div><span class="pill blue">HOW IT WORKS</span><h2 style="margin-top:10px">'+esc(t.heading||'An important distinction')+'</h2></div><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><p class="muted" style="line-height:1.8">'+esc(t.body||'')+'</p><button class="button full" data-act="modal-close">Understood</button>'}
 else if(t.type==='profile')body='<div class="modal-head"><h2>Edit preview identity</h2><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><form id="profile-form" class="stack"><label><span class="form-label">Display name</span><input class="field" required minlength="2" maxlength="45" name="name" value="'+esc(store.profile.name)+'"></label><button class="button full" type="submit">Save preview profile</button></form>';
 else if(t.type==='project')body='<div class="modal-head"><h2>Start a research project</h2><button class="icon-btn" data-act="modal-close">'+ic('x')+'</button></div><form id="project-form" class="stack"><label><span class="form-label">Project title</span><input class="field" name="title" required minlength="8" maxlength="100" placeholder="A community ownership idea"></label><label><span class="form-label">Project type</span><select class="field" name="category"><option>Housing</option><option>Local business</option><option>Public markets</option></select></label><label><span class="form-label">What do you want to research?</span><textarea class="field" required minlength="30" maxlength="1000" name="description" placeholder="The problem, the opportunity, and what you need to learn first"></textarea></label>'+notice('This collects interest in ideas, not funds or investment commitments.')+'<button class="button full" type="submit">Create example project</button></form>';
 return '<div class="modal-backdrop" data-act="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="COMMON dialog">'+body+'</div></div>';
}
function render(){if(ui.screen==='app'){root.innerHTML=chrome();}else root.innerHTML=authPage()+'<div id="toast" class="toast hidden" role="status" aria-live="polite"></div>';document.title=(ui.screen==='app'?ui.tab.charAt(0).toUpperCase()+ui.tab.slice(1)+' · ':'')+'COMMON — Your future, together'}
function enterDemo(){ui.screen='app';ui.tab='home';ui.selectedGroup=null;save();render();}
function openModal(type,data={}){ui.modal={type,...data};render()}
function action(act,element){
 const id=element.dataset.id,val=element.dataset.val;
 if(act==='auth-view'){ui.screen=val;ui.authError='';render();return}
 if(act==='demo'){enterDemo();return}
 if(act==='modal-close'||act==='modal-backdrop'){if(act==='modal-backdrop'&&element!==event.target)return;ui.modal=null;render();return}
 if(act==='compose'){openModal('compose',{group:val||defaultPostGroup()});return}
 if(act==='create-group'){openModal('create-group');return}
 if(act==='post-quick'){const input=document.getElementById('quick-post');const body=input?.value.trim()||'';if(body.length<15){toast('Add a little more detail to your idea.');return}store.posts.unshift({id:uid(),group:defaultPostGroup(),author:store.profile.name,avatar:store.profile.name,time:'Just now',title:body.slice(0,80),body,likes:0,liked:false,comments:[],sample:false});save();render();toast('Added to your browser preview');return}
 if(act==='like'){const p=store.posts.find(x=>x.id===id);if(p){p.likes+=p.liked?-1:1;p.liked=!p.liked;save();render()}return}
 if(act==='comments'){ui.expandComments=ui.expandComments===id?null:id;render();return}
 if(act==='share-post'){const p=store.posts.find(x=>x.id===id);if(navigator.share){navigator.share({title:p?.title||'COMMON',text:'Explore the COMMON ownership network',url:location.origin+location.pathname}).catch(()=>{})}else if(navigator.clipboard){navigator.clipboard.writeText(location.origin+location.pathname).then(()=>toast('Preview link copied')).catch(()=>toast('Sharing not available'))}else toast('Sharing not available');return}
 if(act==='join-group'){const g=store.groups.find(x=>x.id===id);if(!g)return;if(g.joined){toast('You are already in this preview group');return}g.joined=true;g.members++;save();render();toast('Joined in your demo session');return}
 if(act==='back-groups'){show('groups');return}
 if(act==='preview-invite'){openModal('info',{heading:'Inviting friends',body:'In the live community product, groups can share secure invitation links and new people join the same membership record. The current GitHub Pages tour does not have multi-user accounts.'});return}
 if(act==='vote'){const group=ui.selectedGroup||'tesla';store.votes=store.votes||{};store.votes[group]=Number(id);save();render();toast('Saved your nonbinding demo vote');return}
 if(act==='fund-info'){openModal('info',{heading:'From a group to a real investment club',body:'Members would need a suitable legal structure, governing documents, accounting and a separate financial account. Whether securities and investment-adviser obligations apply depends on who manages money, whether members are passive, and other facts. COMMON cannot accept pooled money in this preview.'});return}
 if(act==='wallet-preview'){openModal('wallet');return}
 if(act==='invest-demo'){openModal('invest');return}
 if(act==='watch'){if(store.watch.includes(id))store.watch=store.watch.filter(x=>x!==id);else store.watch.push(id);save();render();toast('Watchlist updated in this preview');return}
 if(act==='open-asset'){openModal('asset',{symbol:id});return}
 if(act==='follow-project'){const p=store.projects.find(x=>x.id===id);if(p){p.followers+=p.followed?-1:1;p.followed=!p.followed;save();render();toast('Project interest saved locally')}return}
 if(act==='project-create'){openModal('project');return}
 if(act==='profile-edit'){openModal('profile');return}
 if(act==='logout'){ui.screen='welcome';ui.modal=null;ui.tab='home';render();return}
}
document.addEventListener('click',e=>{
 const link=e.target.closest('[data-tab]');if(link){show(link.dataset.tab);return}
 const group=e.target.closest('[data-group]');if(group){ui.groupTab='discussion';show('groups',group.dataset.group);return}
 const filter=e.target.closest('[data-filter]');if(filter){ui.filter=filter.dataset.filter;render();return}
 const gf=e.target.closest('[data-group-filter]');if(gf){ui.groupFilter=gf.dataset.groupFilter;render();return}
 const gt=e.target.closest('[data-group-tab]');if(gt){ui.groupTab=gt.dataset.groupTab;render();return}
 const thread=e.target.closest('[data-thread]');if(thread){ui.thread=thread.dataset.thread;render();return}
 const btn=e.target.closest('[data-act]');if(btn)action(btn.dataset.act,btn);
});
document.addEventListener('input',e=>{
 if(e.target.id==='fund-members'||e.target.id==='fund-amount'){
 const a=Math.max(0,Number(document.getElementById('fund-amount')?.value||0)),n=Math.max(0,Number(document.getElementById('fund-members')?.value||0));
 store.fundAmount=Math.min(a,1e6);store.fundMembers=Math.min(n,1e6);save();
 const out=document.getElementById('fund-result');if(out)out.textContent='$'+(store.fundAmount*store.fundMembers).toLocaleString();
 }
 if(e.target.id==='global-search'){ui.search=e.target.value;}
});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!form.matches('#auth-form,#post-form,#group-form,#chat-form,.comment-form,#profile-form,#project-form'))return;
 e.preventDefault();
 if(form.id==='auth-form'){
  if(!supa){ui.authError='Real accounts aren’t activated yet. Use Explore interactive preview; no password has been submitted.';render();return}
  try{
   ui.authWorking=true;ui.authError='';const email=form.querySelector('#email').value,password=form.querySelector('#password').value;
   if(ui.screen==='signup'){
    const name=form.querySelector('#displayName').value.trim();
    const result=await supa.auth.signUp({email,password,options:{data:{display_name:name}}});if(result.error)throw result.error;
    ui.authWorking=false;ui.authError='Check your inbox for your confirmation link. You can explore the interactive tour meanwhile.';render();return;
   }else{
    const result=await supa.auth.signInWithPassword({email,password});if(result.error)throw result.error;
    // This particular static showcase is NOT wired to shared social data.
    ui.authWorking=false;ui.authError='Identity verified. The full shared social app requires database and UI launch completion.';render();return;
   }
  }catch(err){ui.authError=err.message||'Sign-in failed';ui.authWorking=false;render();return}
 }
 if(form.id==='post-form'){
  const f=new FormData(form),group=f.get('group'),body=String(f.get('body')||'').trim(),title=String(f.get('title')||'').trim();
  if(!store.groups.some(g=>g.id===group&&g.joined)){toast('Join this group before publishing');return}
  store.posts.unshift({id:uid(),group,author:store.profile.name,avatar:store.profile.name,time:'Just now',title,body,likes:0,liked:false,comments:[],sample:false});save();ui.modal=null;show('groups',group);toast('Demo post created in your browser');return;
 }
 if(form.id==='group-form'){
  const f=new FormData(form),name=String(f.get('name')||'').trim();
  const id=uid();store.groups.unshift({id,name,category:f.get('category'),summary:String(f.get('summary')||'').trim(),about:String(f.get('summary')||'').trim(),members:1,joined:true,private:f.get('visibility')==='private',accent:name.slice(0,1).toUpperCase()});
  save();ui.modal=null;show('groups',id);toast('Preview community created');return;
 }
 if(form.id==='chat-form'){const v=String(new FormData(form).get('message')||'').trim();if(!v)return;const t=store.threads.find(x=>x.id===ui.thread);t.messages.push({mine:true,text:v});save();render();return}
 if(form.matches('.comment-form')){const v=String(new FormData(form).get('comment')||'').trim(),p=store.posts.find(x=>x.id===form.dataset.comment);if(v&&p){p.comments.push({by:store.profile.name,text:v});save();render()}return}
 if(form.id==='profile-form'){store.profile.name=String(new FormData(form).get('name')||'').trim();save();ui.modal=null;render();toast('Demo profile updated');return}
 if(form.id==='project-form'){const f=new FormData(form);store.projects.unshift({id:uid(),category:String(f.get('category')),title:String(f.get('title')).trim(),description:String(f.get('description')).trim(),stage:'Idea',followers:1,followed:true,icon:'building'});save();ui.modal=null;show('ownership');toast('Demo ownership project created');return}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal){ui.modal=null;render()}});
const hash=location.hash.slice(1);if(hash.startsWith('community-')){ui.screen='app';ui.tab='groups';ui.selectedGroup=decodeURIComponent(hash.slice(10));}else if(tabs.some(x=>x[0]===hash)||['ownership','learn','profile'].includes(hash)){ui.screen='app';ui.tab=hash} else if(hash==='login'){ui.screen='signin'}
render();
})();
