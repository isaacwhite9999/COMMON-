/* COMMON Member App
 * Real social data only. Requires Supabase Auth + the SQL migrations in /supabase/migrations.
 * No mock member accounts, fictional activity, broker orders, custody or financial balances.
 */
(() => {
'use strict';
const config=window.COMMON_CONFIG||{};
const root=document.getElementById('root');
const e=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const short=(s,n=80)=>String(s??'').slice(0,n);
const el=(tag,attrs={},text)=>{const node=document.createElement(tag);for(const [k,v] of Object.entries(attrs))node.setAttribute(k,v);if(text!==undefined)node.textContent=text;return node};
const icons={
 home:'⌂',groups:'◎',chat:'◉',ownership:'◇',invest:'↗',studio:'⌇',agent:'◇',money:'\u0024',learn:'?',profile:'◍',add:'＋',safety:'⚑'
};
let blockedMembers=[],bookmarks=[],memberDetail=null,profileSection='identity',memberDirectory=[],mobileMore=false;let agentOutput=null,agentInput='',agentMode='review',agentSending=false,agentDeskTab='analysis',agentDesk=CommonAgentDesk.initial(),agentDeskOwner=null,agentLastRequest=null;let client=null,session=null,profile=null,groups=[],memberships=[],proposals=[],projects=[],watches=[],people={},messages=[],dm=[],selectedGroup=null,selectedPeer=null,view='home',busy=false,search='',error='',info='',pendingInvite=null,memberPoll=[],pollSelection=null,lastAuthView='signin',recovering=false,moderationCases=[],moderationAppeals=[],accountRestrictions=[],googleProviderStatus='checking';
const capitalDrafts=new Map();let capitalTab='overview';let ledgerRows=[],ledgerCircle=null,ledgerError='',ledgerLoading=false;let decisionDetail=null,pollRows=[],pollOwn=null;
const state={directory:'mine',feed:'mine',groupTab:'posts',comments:null,composer:false,groupCreate:false,projectCreate:false,proposalCreate:false,inviteToken:null,showMembers:false};
let researchReview=null,pollDraft=null,composerDraft=null;
const base=location.pathname.replace(/\/live\/?(?:index.html)?$/,'/live/');
const groupById=id=>groups.find(x=>x.id===id);
const joined=id=>memberships.some(x=>x.community_id===id);
const own=id=>memberships.some(x=>x.community_id===id&&['owner','moderator'].includes(x.role));
const person=id=>people[id]?.display_name||'COMMON member';
const isBlocked=id=>blockedMembers.includes(id);
const bookmarkKey=()=>session?.user?.id?'common.bookmarks.'+session.user.id:null;
function loadBookmarks(){try{const k=bookmarkKey(),v=k?JSON.parse(localStorage.getItem(k)||'[]'):[];bookmarks=Array.isArray(v)?v.filter(x=>typeof x==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x)).slice(0,500):[];}catch{bookmarks=[];}}
function toggleBookmark(id){const k=bookmarkKey();if(!k)throw Error('Sign in required');const next=bookmarks.includes(id)?bookmarks.filter(x=>x!==id):[id,...bookmarks];if(next.length>500)throw Error('Saved research limit reached.');localStorage.setItem(k,JSON.stringify(next));bookmarks=next;if(state.feed==='saved')resetDiscussionFeed();render();}
const saved=async () => client.auth.getSession();
const explainAuthError=err=>{
 const message=err?.message||String(err), code=String(err?.code||'');
 if(/email.address.not.authorized|email_address_not_authorized/i.test(message+' '+code))
   return 'Public email confirmation is restricted until COMMON adds a mail provider. Supabase currently only sends verification to project-team addresses.';
 if(/email.rate.limit|over_email_send_rate_limit/i.test(message+' '+code))
   return 'Email provider sending limit reached. Public email signup requires a configured SMTP provider.';
 if(/provider.*(not enabled|not supported|disabled)|unsupported.provider/i.test(message+' '+code))
   return 'Google sign-in must first be enabled in Supabase Authentication → Providers.';
 if(/redirect.*(not allowed|invalid)|redirect_uri_mismatch/i.test(message+' '+code))
   return 'OAuth redirect not allowed. The COMMON live URL needs to be added to Supabase Authentication URL settings.';
 return message;
};
const handleError=err=>{console.error(err);error=explainAuthError(err);render();};
async function checkGoogleProvider(){
 try{
   const response=await fetch(config.supabaseUrl.replace(/\/$/,'')+'/auth/v1/settings',{
     headers:{apikey:config.supabaseAnonKey,Accept:'application/json'},cache:'no-store'
   });
   if(!response.ok)throw Error('Could not read provider settings');
   const settings=await response.json();
   googleProviderStatus=settings?.external?.google===true?'enabled':'disabled';
 }catch(err){
   googleProviderStatus='unavailable';
   console.warn('COMMON could not verify Google OAuth status:',err);
 }
 if(!session?.user)render();
}
const status=t=>{info=t;error='';render();};
const requireClient=()=>{if(!client)throw new Error('Connect a hosted PostgreSQL + identity project first. This application never saves shared data in browser demo storage.')};
const call=async (query)=>{const r=await query;if(r.error)throw r.error;return r.data;};
const escAttr=s=>e(s);
const button=(act,label,kind='secondary',more='')=>'<button class="button '+kind+' small" data-act="'+act+'" '+more+'>'+label+'</button>';
const researchDisciplines=[["equity_research","Fundamental Equity Research"],["event_driven","Event-Driven & Special Situations"],["macro_rates","Macro & Rates"],["derivatives","Volatility & Derivatives"],["market_structure","Market Microstructure"],["quant_strategies","Systematic Strategies"],["portfolio_risk","Portfolio Construction & Risk"],["shareholder_stewardship","Corporate Governance & Stewardship"],["real_assets","Real Assets & Real Estate"],["private_credit","Private Credit"],["venture_capital","Venture Capital & Growth Equity"],["private_equity","Private Equity & Acquisitions"],["personal_finance","Financial Literacy & Planning"],["markets","Public Markets (Legacy)"],["housing","Housing (Legacy)"],["businesses","Businesses (Legacy)"],["local","Local Ownership (Legacy)"],["education","Education (Legacy)"]];
const researchCategoryLabel=category=>researchDisciplines.find(([value])=>value===category)?.[1]||category;
const navs=[['home','Home'],['groups','Research Desks'],['chat','Messages'],['ownership','Ownership'],['invest','Research'],['studio','Studio'],['agent','Research assistant'],['money','Money'],['learn','Learn'],['safety','Safety'],['profile','Profile']];
const titleCase=s=>s.charAt(0).toUpperCase()+s.slice(1);
function logo(){return '<span class="logo"><span class="logo-mark">c</span><span class="logo-word">common<span style="color:#5883fb">.</span></span></span>'}
function banner(){return (error?'<div class="preview-banner" role="alert" style="border-color:#edc1c1;color:#912b2b">'+e(error)+'</div>':'')+(info?'<div class="preview-banner" role="status">'+e(info)+'</div>':'')}
function setup(){
 root.innerHTML='<div class="auth-shell"><div class="auth-left">'+logo()+'<div class="auth-feature"><h1>Build real<br><em>ownership.</em></h1><p>Groups, conversations, shared research, and member governance—with persistent accounts and no fake numbers.</p></div></div><div class="auth-right"><div class="auth-form-wrap"><span class="pill blue">PRIVATE SYSTEM SETUP</span><h2>Community backend required</h2><p class="intro">This is the real app, not a browser demo. Member registration stays disabled until a database and identity provider are configured and security-tested.</p><div class="auth-notice">Connect a Supabase project, apply the SQL migrations, then set the public URL and publishable key in <code>docs/config.js</code> after RLS tests pass. Never put a service-role key into this file.</div><a class="button full" href="https://supabase.com/dashboard/projects" target="_blank" rel="noopener noreferrer">Open Supabase project dashboard</a><a class="button soft full" style="margin-top:9px" href="../">View public educational showcase</a></div></div></div>';
}
function auth(){
 const signup=lastAuthView==='signup',reset=lastAuthView==='reset';
 root.innerHTML='<main class="auth-shell"><section class="auth-left">'+logo()+'<div class="auth-feature"><span class="pill" style="background:#ffffff20;color:#d8e8ff">THE OWNERSHIP NETWORK</span><h1 style="margin-top:22px">More than money.<br><em>Our future.</em></h1><p>Build real communities, share research, and organize with people who believe ownership should be accessible to everyone.</p></div></section><section class="auth-right"><div class="auth-form-wrap"><span class="pill blue">REAL MEMBER ACCOUNTS</span><h2>'+(reset?'Recover access':signup?'Create your account':'Welcome back')+'</h2><p class="intro">'+(reset?'Receive a secure password reset email.':signup?'Create a secure identity. Your groups and discussions persist across sessions.':'Sign in to your communities, discussions and research.')+'</p>'+banner()+
 '<button class="button soft full" style="margin:2px 0 15px;min-height:50px;border:1px solid #dfe5ed" type="button" data-act="google-auth" aria-label="Continue with Google" '+(googleProviderStatus==='enabled'?'':'disabled aria-disabled="true"')+'><span aria-hidden="true" style="font-weight:900;font-family:Arial,sans-serif;font-size:20px;color:#4285f4">G</span> Continue with Google</button>'+
 (googleProviderStatus==='enabled'?'':googleProviderStatus==='checking'
   ?'<p class="hint" style="margin:-8px 0 15px">Checking Google sign-in…</p>'
   :'<p class="hint" style="margin:-8px 0 15px">Google signup is not available yet. COMMON must activate the Google provider in Supabase before this button will work.</p>')+
 '<div class="row" style="align-items:center;gap:14px;color:#8792a4;font-size:11px;margin-bottom:16px"><span style="height:1px;background:#dce3ec;flex:1"></span>or use email<span style="height:1px;background:#dce3ec;flex:1"></span></div>'+
 '<form id="auth-form" class="stack">'+(signup?'<label><span class="form-label">Name</span><input class="field" name="name" required minlength="2" maxlength="80" autocomplete="name"></label>':'')+
 '<label><span class="form-label">Email</span><input class="field" name="email" required type="email" autocomplete="email"></label>'+
 (!reset?'<label><span class="form-label">Password</span><input class="field" name="password" required type="password" minlength="8" autocomplete="'+(signup?'new-password':'current-password')+'"></label>':'')+
 '<button type="submit" class="button full" '+(busy?'disabled':'')+'>'+(busy?'Working…':reset?'Email recovery link':signup?'Create account':'Sign in')+'</button></form>'+
 '<div class="auth-switch">'+(signup?'Already a member? ':reset?'Remember your password? ':'New to COMMON? ')+
 '<button class="link-btn" data-act="auth-mode" data-mode="'+(signup||reset?'signin':'signup')+'">'+(signup||reset?'Sign in':'Create account')+'</button></div>'+
 (!signup&&!reset?'<button class="link-btn" data-act="auth-mode" data-mode="reset" style="margin-top:14px">Forgot your password?</button>':'')+
 '<div class="auth-notice"><strong>Registration notice:</strong> Public email confirmation is not fully configured. The default Supabase mail sender restricts delivery to project-team addresses. COMMON does not hold deposits, execute trades, or accept pooled investment contributions.</div></div></section></main>';
}
function baseNav(){
 const items=navs.map(([id,label])=>'<button class="nav-item '+(view===id?'active':'')+'" data-tab="'+id+'" aria-label="'+e(label)+'"'+(view===id?' aria-current="location"':'')+'><span aria-hidden="true" style="font-size:20px;width:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('');
 return '<div class="app-shell"><aside class="navbar">'+logo()+'<div class="nav-links" style="margin-top:25px">'+items+'</div><a class="nav-item workspace-link" href="../workspace/">Research workspace ↗</a><div class="nav-spacer"></div><div class="nav-person"><button data-tab="profile"><span class="avatar">'+e((profile?.display_name||'?').slice(0,2).toUpperCase())+'</span><span class="details"><strong>'+e(profile?.display_name||'Member')+'</strong><span class="tiny muted">@'+e(profile?.handle||'member')+'</span></span></button></div></aside><div class="main-wrap"><header class="mobile-head">'+logo()+'<button class="icon-btn" data-act="mobile-more" aria-expanded="'+mobileMore+'" aria-label="More navigation">☰</button></header>'+(mobileMore?'<nav class="mobile-more" aria-label="More sections">'+navs.slice(5).map(([id,label])=>'<button class="nav-item" data-tab="'+id+'">'+e(label)+'</button>').join('')+'<a href="../workspace/">Research workspace ↗</a></nav>':'')+'<header class="topbar"><h2>'+e(titleCase(view))+'</h2><div style="margin-left:auto"><span class="pill lime">LIVE COMMUNITY</span></div></header><main class="content">'+banner()+researchDraftNotice()+page()+'</main></div><nav class="mobile-nav">'+navs.slice(0,5).map(([id,label])=>'<button data-tab="'+id+'" class="'+(view===id?'active':'')+'"><span style="font-size:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('')+'</nav></div>';
}
function page(){if(view==='research-review')return researchReviewPage();if(view==='home')return home();if(view==='groups')return selectedGroup?groupDetail():communities();if(view==='chat')return chat();if(view==='ownership')return ownership();if(view==='invest')return research();if(view==='agent')return agentPage();if(view==='member')return memberPage();if(view==='money')return money();if(view==='learn')return learn();if(view==='safety')return safety();return profilePage();}
function head(t,s='',extra=''){return '<div class="space" style="align-items:flex-start;margin-bottom:24px"><div><h1 class="page-title">'+e(t)+'</h1><p class="subhead">'+e(s)+'</p></div>'+extra+'</div>'}
function groupName(id){return groupById(id)?.name||'Community'}
function contentFlag(kind,id){
 return moderationCases.find(c=>c.item_type===kind&&c.item_id===id&&c.review_status!=='approved');
}
function safetyLabel(kind,id){
 const flag=contentFlag(kind,id);
 if(!flag)return '';
 return '<span class="pill orange" style="margin-left:8px">'+(flag.review_status==='rejected'?'Removed after review':'Under safety review')+'</span>';
}
function safety(){
 const userId=session.user.id;
 const mine=moderationCases.filter(c=>c.actor_id===userId);
 const pending=moderationCases.filter(c=>c.actor_id!==userId&&c.review_status==='pending');
 const pendingAppeals=moderationAppeals.filter(a=>a.appellant_id!==userId&&a.appeal_status==='pending'
   &&moderationCases.some(c=>c.id===a.case_id&&c.reviewed_by!==userId));
 const riskDescription={
  meme_coin_mention:'Meme-coin discussion',
  rug_pull_or_manipulation:'Possible rug-pull or manipulation language',
  suspicious_financial_solicitation:'Suspicious wallet payment or return claim'
 };
 const item=c=>{
  const appeal=moderationAppeals.find(a=>a.case_id===c.id&&a.appellant_id===userId);
  return '<article class="surface" style="padding:19px;margin-bottom:10px">'+
   '<div class="space"><strong>'+e(c.item_type.replaceAll('_',' '))+'</strong><span class="pill '+(c.review_status==='pending'?'orange':'blue')+'">'+e(c.review_status)+'</span></div>'+
   '<p class="small muted" style="margin-top:10px">'+e((c.matched_rules||[]).map(x=>riskDescription[x]||x).join(' · '))+'</p>'+
   '<div class="preview-banner" style="white-space:pre-wrap;overflow-wrap:anywhere">'+e(c.content_preview)+'</div>'+
   '<p class="tiny muted">'+new Date(c.created_at).toLocaleString()+' · '+e(c.community_id?groupName(c.community_id):'Private conversation')+'</p>'+
   (c.actor_id!==userId&&c.review_status==='pending'
    ?'<div class="row" style="margin-top:14px">'+button('review-approve','Approve educational content','secondary','data-id="'+c.id+'"')+
      button('review-reject','Reject & keep hidden','ghost','data-id="'+c.id+'"')+'</div>':'')+
   (c.actor_id===userId&&c.review_status==='rejected'
    ?'<div style="margin-top:14px">'+(appeal?'<span class="pill blue">Appeal: '+e(appeal.appeal_status)+'</span>'
      :button('appeal-case','Request independent second review','secondary','data-id="'+c.id+'"'))+'</div>':'')+
   '</article>';
 };
 const appealItem=a=>{
   const c=moderationCases.find(c=>c.id===a.case_id);
   return '<article class="surface" style="padding:19px;margin-bottom:10px"><strong>Second-review request</strong>'+
     '<p class="small muted" style="margin:10px 0">Flagged content: '+e(c?.item_type||'item')+
     ' · '+e(c?.community_id?groupName(c.community_id):'Private conversation')+'</p>'+
     '<p class="small muted" style="white-space:pre-wrap">'+e(a.statement)+'</p>'+
     '<div class="row" style="margin-top:14px">'+
       button('review-appeal-accept','Accept appeal','secondary','data-id="'+a.id+'"')+
       button('review-appeal-deny','Deny appeal','ghost','data-id="'+a.id+'"')+'</div></article>';
 };
 return head('Trust & safety','Scam signals are confidential. A flag is not proof of fraud.')+
 (accountRestrictions.length?'<div class="preview-banner" role="alert"><strong>Account restriction active:</strong> '+
  e(accountRestrictions[0].restriction)+'. '+e(accountRestrictions[0].reason)+'</div>':'')+
 '<div class="surface" style="padding:24px;margin-bottom:15px"><h3>Zero tolerance for meme-coin promotion</h3>'+
 '<p class="small muted" style="margin-top:10px;line-height:1.8">Meme-coin mentions, rug-pull language, pump-and-dumps, misleading return guarantees and suspicious wallet solicitations are automatically held for review. Independent moderators may release educational warnings, not investment pitches. No public scammer labels are assigned from keywords.</p>'+
 '<p class="small muted" style="margin-top:8px">Never transfer funds to a stranger through a link in COMMON. Report suspicious posts using their Report control.</p></div>'+
 (pending.length?'<div class="section-bar"><h3>Moderator review queue ('+pending.length+')</h3></div>'+pending.map(item).join(''):'')+
 (pendingAppeals.length?'<div class="section-bar"><h3>Independent appeals ('+pendingAppeals.length+')</h3></div>'+pendingAppeals.map(appealItem).join(''):'')+
 '<div class="section-bar"><h3>Your safety cases ('+mine.length+')</h3></div>'+
 (mine.length?mine.map(item).join(''):'<div class="empty">No safety flags on your account.</div>')+
 '<p class="small muted" style="margin-top:16px">Confirmed scams may lead to staff-enforced account restrictions. Only trained Trust & Safety staff can review held private-message content. A flagged term alone never suspends an account.</p>';
}
// Only the active feed page and open thread are held in memory. Cursor
// timestamps are opaque strings so PostgreSQL microseconds survive pagination.
let discussionFeed=null, discussionThread=null;
function resetDiscussionFeed(){
 discussionFeed=discussionThread=null;
 state.comments=null;
}
function currentDiscussionScope(){
 if(view==='home')return {feed_scope:state.feed};
 if(view==='member'&&memberDetail)return {feed_scope:'member',scope_id:memberDetail.id};
 if(view==='groups'&&state.groupTab==='posts'&&joined(selectedGroup))return {feed_scope:'circle',scope_id:selectedGroup};
 return null;
}
function prepareDiscussionFeed(){
 const scope=(!document.hidden&&profile?.id===session?.user?.id)?currentDiscussionScope():null;
 if(!scope){resetDiscussionFeed();return}
 const key=[session.user.id,scope.feed_scope,scope.scope_id].join(':');
 if(discussionFeed?.key===key)return;
 resetDiscussionFeed();
 discussionFeed={key,scope,items:[],next:null,cursors:[null],loading:false,error:false};
 void readDiscussionPage(discussionFeed,{quiet:true,initial:true});
}
async function readDiscussionPage(page,{thread=false,quiet=false,focus=false,initial=false}={}){
 if(!page||page.loading)return;
 const isCurrent=()=>page===(thread?discussionThread:discussionFeed);
 page.loading=true;
 if(!quiet){page.error=false;page.items=[];page.next=null;render()}
 const cursor=page.cursors.at(-1);
 let changed=initial||!quiet||page.error;
 try{
  const args={...page.scope,...cursor};
  if(args.feed_scope==='saved')args.saved_ids=bookmarks;
  const result=await call(client.rpc('discussion_feed_v1',args,{get:false}));
  if(!isCurrent())return;
  changed ||= JSON.stringify(page.items)!==JSON.stringify(result.items)||
   JSON.stringify(page.next)!==JSON.stringify(result.next);
  page.items=result.items;
  page.next=result.next;
  page.error=false;
  if(!thread&&discussionThread&&!page.items.some(post=>post.id===discussionThread.scope.scope_id)){
   discussionThread=null;state.comments=null;
  }
 }catch{
  if(!isCurrent())return;
  changed ||= !page.error;
  page.items=[];page.next=null;page.error=true;
  if(!thread){discussionThread=null;state.comments=null}
 }finally{
  if(isCurrent()){
   page.loading=false;if(changed)render();
   if(focus)document.getElementById(thread?'discussion-thread-items':'discussion-feed-items')?.focus();
  }
 }
}
function discussionPageMarkup(page,format,empty,thread=false){
 const name=thread?'discussion-thread':'discussion-feed';
 const id=name+'-items';
 if(!page||page.loading&&page.items.length===0)return '<div id="'+id+'" tabindex="-1" role="status">Loading '+(thread?'replies':'discussions')+'…</div>';
 if(page.error)return '<div id="'+id+'" tabindex="-1"><p role="alert">'+(navigator.onLine?'Discussions could not be loaded.':'You are offline.')+'</p>'+button(name+'-reload','Try again')+'</div>';
 return '<div id="'+id+'" tabindex="-1">'+(page.items.length?page.items.map(format).join(''):empty)+'</div>'+
 '<div class="discussion-page-controls" role="group" aria-label="'+(thread?'Reply pages':'Discussion pages')+'">'+
 (page.cursors.length>1?button(name+'-newer','Newer '+(thread?'replies':'discussions')):'')+
 (page.next?button(name+'-older','Older '+(thread?'replies':'discussions')):'')+
 button(name+'-reload','Refresh '+(thread?'replies':'discussions'))+'</div>';
}
function pageDiscussionAction(action){
 const match=/^discussion-(feed|thread)-(older|newer|reload)$/.exec(action);
 if(!match)return null;
 const thread=match[1]==='thread',page=thread?discussionThread:discussionFeed;
 if(!page||page.loading)return Promise.resolve();
 if(match[2]==='older'&&page.next)page.cursors.push(page.next);
 if(match[2]==='newer'&&page.cursors.length>1)page.cursors.pop();
 return readDiscussionPage(page,{thread,focus:true});
}
const countLabel=count=>count>=100?'99+':String(count);
function postCard(p){
 const mine=p.author_id===session.user.id,expanded=state.comments===p.id;
 return '<article class="surface post"><div class="post-head"><div class="avatar">'+e(p.author_name.slice(0,2).toUpperCase())+'</div><div class="post-meta"><button class="member-link" data-act="member-profile" data-id="'+p.author_id+'">'+e(p.author_name)+'</button><p>'+e(p.community_name)+' · '+new Date(p.created_at).toLocaleString()+'</p></div>'+safetyLabel('discussion',p.id)+((mine||own(p.community_id))?button('report-post','Report / moderation','ghost','data-id="'+p.id+'"'):'')+'</div>'+
 (p.title?'<h3 class="post-title">'+e(p.title)+'</h3>':'')+'<p class="post-body">'+e(p.body)+'</p>'+
 '<div class="post-actions"><button data-act="like" data-id="'+p.id+'" class="'+(p.liked?'liked':'')+'" aria-label="Like discussion" aria-pressed="'+p.liked+'">♡ '+countLabel(p.likes_count)+'</button><button data-act="comments" data-id="'+p.id+'" aria-expanded="'+expanded+'">◉ '+countLabel(p.replies_count)+' replies</button><button data-act="bookmark" data-id="'+p.id+'" aria-pressed="'+bookmarks.includes(p.id)+'">'+(bookmarks.includes(p.id)?'Saved':'Save')+'</button><button data-act="report-post" data-id="'+p.id+'">Report</button>'+
 (view==='groups'&&selectedGroup===p.community_id&&joined(p.community_id)&&!contentFlag('discussion',p.id)?
   button('poll-from-discussion','Draft circle poll','secondary','data-id="'+e(p.id)+'"'):'')+'</div>'+
 (expanded?'<div class="comment-list">'+discussionPageMarkup(discussionThread,c=>'<div class="comment"><strong>'+e(c.author_name)+': </strong>'+e(c.body)+'</div>','<p>No visible replies.</p>',true)+'</div>'+
 (joined(p.community_id)?'<form class="comment-form" data-form="comment" data-parent="'+p.id+'" data-group="'+p.community_id+'"><input class="field" name="body" maxlength="2000" required aria-label="Reply" placeholder="Reply with something useful"><button type="submit" class="button small">Reply</button></form>':''):'')+'</article>';
}
function home(){
 const empty=state.feed==='following'?'<div class="empty"><h3>No research from members you follow</h3><p>Open a member profile from Discover or a circle and select Follow.</p>'+button('discover-feed','Discover research')+'</div>':state.feed==='saved'?'<div class="empty">No saved discussions are visible.</div>':'<div class="empty"><h3>No discussions yet</h3><p>Join a community and start the first research conversation.</p>'+button('open-groups','Find a community')+'</div>';
 return '<div class="columns"><div><div class="feature-hero"><span class="pill" style="background:#ffffff29;color:white;width:max-content">THE COMMONS</span><h2>Ideas become stronger together.</h2><p>Start conversations with real members and turn community research into meaningful, lawful action.</p>'+button('create-group','Create a community','primary')+'</div>'+
 '<div class="section-bar"><h3>Research feed</h3>'+button('compose','Share research')+'</div><div class="feed-tabs">'+[['mine','My circles'],['following','Following'],['discover','Discover'],['saved','Saved research']].map(([k,t])=>'<button class="feed-tab '+(state.feed===k?'active':'')+'" data-feed="'+k+'" aria-pressed="'+(state.feed===k)+'">'+t+'</button>').join('')+'</div>'+
 discussionPageMarkup(discussionFeed,postCard,empty)+
 '</div><aside class="rail"><div class="surface rail-box"><h3>Your communities</h3>'+memberships.map(m=>'<button class="rail-link" data-act="open-group" data-id="'+m.community_id+'"><span class="avatar">'+e(groupName(m.community_id).slice(0,1))+'</span><strong>'+e(groupName(m.community_id))+'</strong></button>').join('')+'</div><div class="surface rail-box education-prompt"><h3>Never invested before?</h3><p>Learn about stocks, ownership, funds and legal structures without the jargon.</p>'+button('learn','Explore lessons')+'</div></aside></div>';
}
function communities(){
 const results=groups.filter(g=>(state.directory==='all'||(state.directory==='mine'&&joined(g.id))||(state.directory==='private'&&joined(g.id)&&g.visibility==='private')||(state.directory==='public'&&g.visibility==='public'))).filter(g=>(g.name+' '+g.description+' '+researchCategoryLabel(g.category)).toLowerCase().includes(search.toLowerCase()));
 return head('Research desks','Join independent investors and analysts working from evidence, primary sources and defined coverage mandates.',button('create-group','＋ Create research desk','primary'))+
 '<div class="feed-tabs">'+[['mine','My circles'],['private','Private circles'],['public','Public discovery'],['all','All visible']].map(([k,t])=>'<button class="feed-tab '+(state.directory===k?'active':'')+'" data-directory="'+k+'">'+t+'</button>').join('')+'</div><label class="form-label" for="group-search">Explore coverage mandates</label><input id="group-search" class="field" style="max-width:520px" value="'+e(search)+'" placeholder="Search sector, strategy, mandate or issuer">'+
 '<div class="group-list">'+(results.length?results.map(g=>'<article class="surface group-card"><div class="space"><span class="group-symbol">'+e(g.name.slice(0,1))+'</span><span class="pill">'+e(researchCategoryLabel(g.category))+'</span></div><h3>'+e(g.name)+'</h3><p>'+e(g.description)+'</p><div class="bottom"><span class="small muted">'+e(g.visibility)+' · '+(joined(g.id)?'Member':'Explore')+'</span>'+button('open-group','Open','secondary','data-id="'+g.id+'"')+'</div></article>').join(''):'<p class="muted">No matching groups.</p>')+'</div>';
}
function groupDetail(){
 const g=groupById(selectedGroup);if(!g)return '<p>Group not found</p>';
 const joinedThis=joined(g.id);
 let page='';
 if(!joinedThis){page='<div class="surface" style="padding:25px"><h3>Join to participate</h3><p class="muted" style="margin:12px 0">Join this community to post, discuss, and participate in internal polls.</p>'+(g.visibility==='public'?button('join-group','Join community','primary','data-id="'+g.id+'"'):'<p class="small muted">This private community requires an invitation.</p>')+'</div>'}
 else{
 page='<div class="space" style="margin-bottom:14px"><h3>Community workspace</h3>'+button('compose','Start discussion','primary')+'</div>'+
 '<div class="feed-tabs">'+[['posts','Discussions'],['research','Research library'],['capital','Capital & treasury'],['chat','Group chat'],['decisions','Decisions'],['members','Members'],['invites','Invitations'],['about','Mandate & trust']].map(([v,t])=>'<button class="feed-tab '+((state.groupTab||'posts')===v?'active':'')+'" data-group-tab="'+v+'">'+t+'</button>').join('')+'</div>'+
 groupBody(g);
 }
 return '<button class="link-btn" data-act="open-groups">‹ All communities</button><div class="group-hero"><span class="pill">'+e(g.category.toUpperCase())+'</span><h1>'+e(g.name)+'</h1><p>'+e(g.description)+'</p><div class="space" style="margin-top:20px"><span class="small">'+e(g.visibility)+' group</span>'+(joinedThis?'<span class="pill">You are a member</span>':'')+'</div></div><div style="margin-top:23px">'+page+'</div>';
}
function capitalDesk(g){
 const C=window.CommonCapital;if(!C)return '<div class="empty">Capital planner unavailable.</div>';const draft=capitalDrafts.get(g.id),p=draft?.result;
 const nav='<nav class="feed-tabs" aria-label="Capital workspace">'+[['overview','Overview'],['plan','Capital model'],['review','Investment review'],['ledger','External journal'],['controls','Treasury controls']].map(([k,t])=>'<button class="feed-tab '+(capitalTab===k?'active':'')+'" data-capital-tab="'+k+'">'+t+'</button>').join('')+'</nav>';
 const input=(name,label,value,min,max,step='1')=>'<label><span class="form-label">'+e(label)+'</span><input class="field" name="'+name+'" type="number" min="'+min+'" max="'+max+'" step="'+step+'" required value="'+e(value)+'"></label>';
 const stat=(label,value)=>'<div><span>'+e(label)+'</span><strong>'+e(value)+'</strong></div>';
 const notice=capitalTab==='ledger'?'':'<div class="capital-disclosure"><strong>SIMULATION · NO REAL FUNDS</strong><p>Amounts are hypothetical, not balances, pledges or payment requests. No bank accounts, brokerage accounts or actual pooled assets are connected.</p></div>';
 let body='';
 if(capitalTab==='overview')body='<div class="capital-stats">'+stat('Modeled capital',p?C.money(p.total):'—')+stat('Acquisition budget',p?C.money(p.assets):'—')+stat('Cash reserve',p?C.money(p.reserveCents):'—')+'</div><section class="surface circle-tools"><h3>Capital planning</h3><p>Test how different contribution assumptions, expenses and risk limits affect the purchasing capacity of a circle.</p><button class="button primary" data-capital-tab="plan">'+(p?'Edit scenario':'Build a capital scenario')+'</button></section><section class="surface circle-tools"><h3>Investment governance</h3><p>Research proposals and nonbinding member opinions remain separate from any legal approval or authority to move funds.</p><button class="button secondary" data-group-tab="decisions">Open circle decisions</button></section>';
 if(capitalTab==='plan'){const d=draft?.input||{};body='<section class="surface circle-tools"><h3>Scenario assumptions</h3><p class="muted small">Equal hypothetical contributions; no assumptions about actual members or their income. No recurring payment will be created.</p><form data-form="capital-plan" class="stack"><div class="capital-form-grid">'+input('members','Hypothetical participants',d.members??10,2,1000)+input('initial','Initial amount per participant (USD)',d.initial??500,0,1000000,'.01')+input('monthly','Monthly amount per participant (USD)',d.monthly??100,0,1000000,'.01')+input('months','Model horizon (months)',d.months??12,1,120)+input('reserve','Cash reserve (%)',d.reserve??10,0,100)+input('cost','One-time acquisition costs (%)',d.cost??1,0,100)+input('shock','Invested-asset loss scenario (%)',d.shock??25,0,100)+input('quorum','Illustrative quorum (%)',d.quorum??60,1,100)+input('approval','Illustrative approval (%)',d.approval??75,51,100)+'</div><button class="button primary" type="submit">Calculate scenario</button></form></section>';}
 if(capitalTab==='review'){body=p?'<div class="capital-stats">'+stat('Total modeled contributions',C.money(p.total))+stat('One-time modeled costs',C.money(p.fees))+stat('Value under stress',C.money(p.stressed))+'</div><section class="surface circle-tools"><h3>Capital allocation and stress test</h3><div class="capital-bar" aria-label="Modeled capital allocation"><span style="width:'+p.assets/p.total*100+'%;background:#47775a"></span><span style="width:'+p.reserveCents/p.total*100+'%;background:#94a49a"></span><span style="width:'+p.fees/p.total*100+'%;background:#a87548"></span></div><dl class="circle-facts"><dt>Acquisition budget</dt><dd>'+C.money(p.assets)+'</dd><dt>Cash reserve</dt><dd>'+C.money(p.reserveCents)+'</dd><dt>Estimated costs</dt><dd>'+C.money(p.fees)+'</dd><dt>Modeled loss ('+p.shock+'%)</dt><dd>'+C.money(p.loss)+'</dd><dt>Equal-share stressed value</dt><dd>'+C.money(p.perMemberStress)+'</dd><dt>Illustrative quorum</dt><dd>'+p.quorumCount+' of '+p.members+' participants</dd><dt>Support at minimum quorum</dt><dd>'+p.minimumSupportAtQuorum+' participants</dd></dl><p class="muted small">This is a single loss scenario, not a forecast. Assumes no financing, taxes, distributions, withdrawals or investment returns before the shock. Cents are rounded down where division is required.</p></section><section class="surface circle-tools"><h3>Share for member research</h3>'+(g.visibility==='private'?'<form data-form="capital-share" class="stack"><label><span class="form-label">Research discussion title</span><input class="field" name="title" minlength="8" maxlength="120" required placeholder="Review a hypothetical capital structure"></label><label class="row"><input type="checkbox" name="confirm" required> I understand this is a nonbinding scenario, not an offer or request for money.</label><button class="button primary">Publish nonbinding research poll</button></form>':'<p>Capital scenarios may be reviewed privately; publishing them is limited to invitation-only circles.</p>')+'<button class="button secondary" data-act="export-capital">Export scenario</button></section>':'<div class="empty"><h3>No scenario calculated</h3><button class="button" data-capital-tab="plan">Open capital model</button></div>';}
 if(capitalTab==='ledger')body=externalLedger(g);
 if(capitalTab==='controls')body='<section class="surface circle-tools"><h3>Financial operations readiness</h3><dl class="circle-facts"><dt>Legal investment entity</dt><dd>Not established through COMMON</dd><dt>Member eligibility and onboarding</dt><dd>Not enabled</dd><dt>Banking and custody</dt><dd>Not connected</dd><dt>Deposits and withdrawals</dt><dd>Disabled</dd><dt>Trade execution and settlement</dt><dd>Disabled</dd><dt>Binding authorization</dt><dd>Disabled</dd><dt>Fund accounting and tax records</dt><dd>Not enabled</dd></dl><p>Live operations require approved legal structures, financial partners, reconciliation, permissions, disclosures and operational review. No circle moderator can override these gates.</p><a href="../COLLECTIVE_CAPITAL.md">Read capital architecture</a></section>';
 return '<div class="section-bar"><h3>Collective capital workspace</h3></div>'+notice+nav+body;
}
async function loadLedger(){const cid=selectedGroup,uid=session?.user?.id;ledgerRows=[];ledgerCircle=null;ledgerError='';if(config.externalLedgerEnabled!==true||!uid||!joined(cid)||groupById(cid)?.visibility!=='private')return;ledgerLoading=true;try{const rows=[];for(let offset=0;offset<10000;offset+=500){const page=await call(client.from('circle_external_journal').select('id,community_id,author_id,record_date,source_ref,lines,reverses_id,created_at').eq('community_id',cid).order('created_at',{ascending:true}).order('id',{ascending:true}).range(offset,offset+499));rows.push(...page);if(page.length<500)break;if(offset===9500)throw Error('Journal exceeds this reader limit. Export through the authorized administrator before further posting.');}if(session?.user?.id!==uid||selectedGroup!==cid)return;ledgerRows=rows;ledgerCircle=cid;}catch(err){if(session?.user?.id===uid&&selectedGroup===cid)ledgerError=err.message||'Unable to load journal';}finally{ledgerLoading=false;}}
function externalLedger(g){const L=window.CommonLedger,notice='<div class="capital-disclosure"><strong>EXTERNAL RECORDKEEPING · NO CUSTODY</strong><p>Records describe completed activity at an independently authorized financial institution. They are member-entered and not independently reconciled, verified balances or proof of ownership. Never enter account numbers, names, credentials or payment instructions. All current members of this private circle can read these aggregate records.</p></div>';
if(g.visibility!=='private')return notice+'<div class="empty">External recordkeeping is available only to eligible private circles.</div>';
if(config.externalLedgerEnabled!==true)return notice+'<div class="empty"><h3>External journal not activated</h3><p>Requires the reviewed database schema and approved recordkeeping pilot. No deposits, transfers or securities orders are available.</p></div>';
if(ledgerLoading||ledgerCircle!==g.id&&!ledgerError)return notice+'<div class="empty">Loading journal…</div>';
if(ledgerError)return notice+'<div class="empty">'+e(ledgerError)+'<button class="button" data-act="refresh-ledger">Retry</button></div>';
const totals=L.balances(ledgerRows),options=Object.entries(L.accounts).map(([k,v])=>'<option value="'+k+'">'+e(v)+'</option>').join(''),entries=ledgerRows.slice().reverse().map(r=>'<details class="surface circle-project"><summary><span><strong>'+e(r.source_ref)+'</strong><small>'+e(r.record_date)+' · '+e(person(r.author_id))+'</small></span><strong>'+L.money(L.validate(r.lines))+'</strong></summary><dl class="circle-facts">'+r.lines.map(l=>'<dt>'+e(L.accounts[l.account]+' / '+l.side)+'</dt><dd>'+L.money(l.cents)+'</dd>').join('')+'</dl>'+(r.reverses_id?'<p class="muted small">Reversal entry</p>':own(g.id)&&!ledgerRows.some(x=>x.reverses_id===r.id)?button('reverse-external','Reverse entry','secondary','data-id="'+r.id+'"'):'')+'</details>').join('');
return notice+'<section class="surface circle-tools"><h3>Recorded account totals</h3><dl class="circle-facts">'+Object.entries(totals).map(([k,v])=>'<dt>'+e(L.accounts[k])+'</dt><dd>'+L.money(v)+'</dd>').join('')+'</dl><p class="muted small">Aggregate USD book totals, not current market value or funds available to spend.</p>'+button('refresh-ledger','Refresh')+' '+button('export-ledger','Export journal')+'</section>'+
(own(g.id)?'<section class="surface circle-tools"><h3>Record a completed external event</h3><form data-form="external-entry" class="stack"><label><span class="form-label">Record date</span><input name="date" type="date" class="field" required></label><label><span class="form-label">Internal reference (not a bank reference)</span><input name="reference" class="field" minlength="3" maxlength="80" pattern="[A-Za-z0-9][A-Za-z0-9._\\-]{2,79}" required></label><p class="muted small">Enter balanced debit and credit lines. Leave unused amounts blank.</p>'+Array.from({length:6},(_,i)=>'<div class="ledger-line"><label><span class="form-label">Account '+(i+1)+'</span><select class="field" name="account'+i+'">'+options+'</select></label><label><span class="form-label">Side</span><select class="field" name="side'+i+'"><option value="debit">Debit</option><option value="credit" '+(i===1?'selected':'')+'>Credit</option></select></label><label><span class="form-label">USD</span><input class="field" name="amount'+i+'" type="number" min=".01" max="10000000" step=".01"></label></div>').join('')+'<label class="row"><input type="checkbox" name="ack" required> Completed external activity only; not an instruction to move money.</label><button class="button primary">Record journal entry</button></form></section>':'')+'<div class="section-bar"><h3>Append-only journal</h3></div>'+(entries||'<div class="empty">No external records.</div>');}
async function loadPoll(id){const p=proposals.find(x=>x.id===id),uid=session?.user?.id,cid=selectedGroup;if(!p||p.community_id!==cid||!joined(cid))throw Error('Circle membership required');const [counts,vote]=await Promise.all([call(client.rpc('proposal_tally',{pid:id})),call(client.from('proposal_votes').select('choice').eq('proposal_id',id).eq('user_id',uid).maybeSingle())]);if(session?.user?.id!==uid||selectedGroup!==cid)return;decisionDetail=id;pollRows=counts;pollOwn=vote?.choice||null;render();}
function decisionPage(g){const p=proposals.find(x=>x.id===decisionDetail&&x.community_id===g.id);if(!p)return '<div class="space"><h3>Community decisions</h3>'+button('new-proposal','Start poll','primary')+'</div><p class="muted small">Research and community opinions only; not legal authority to invest or move money.</p>'+(proposals.filter(x=>x.community_id===g.id).map(p=>'<article class="surface circle-tools"><div class="space"><h3>'+e(p.title)+'</h3><span class="pill">'+e(p.status)+'</span></div><p class="post-body">'+e(p.rationale)+'</p>'+button('poll-detail','View decision','secondary','data-id="'+p.id+'"')+'</article>').join('')||'<div class="empty">No community proposals yet.</div>');
const total=pollRows.reduce((n,x)=>n+Number(x.tally),0),open=p.status==='open'&&(!p.closes_at||new Date(p.closes_at)>new Date());
return button('poll-list','All decisions')+'<section class="surface circle-tools"><div class="space"><h3>'+e(p.title)+'</h3><span class="pill">'+(open?'Open':'Closed')+'</span></div><p class="muted small">'+e(p.closes_at?'Closes '+new Date(p.closes_at).toLocaleString():'No closing date set')+'</p><p class="post-body">'+e(p.rationale)+'</p><div class="capital-disclosure"><strong>NONBINDING MEMBER OPINION</strong><p>No money movement or securities transaction is authorized.</p></div>'+['support','oppose','abstain'].map(k=>{const n=Number(pollRows.find(x=>x.choice===k)?.tally||0);return '<div class="poll-result"><div class="space"><strong>'+titleCase(k)+'</strong><span>'+n+' / '+total+'</span></div><div class="capital-bar"><span style="width:'+(total?100*n/total:0)+'%;background:#47775a"></span></div></div>'}).join('')+'<p class="muted small">Your vote: '+e(pollOwn||'Not yet voted')+'</p>'+(open?'<div class="row">'+['support','oppose','abstain'].map(k=>button('poll-vote',titleCase(k),k===pollOwn?'primary':'secondary','data-id="'+p.id+'" data-choice="'+k+'"')).join('')+'</div>':'')+'</section>';}
function groupBody(g){
 if(state.groupTab==='capital')return capitalDesk(g);
 if(state.groupTab==='research')return '<div class="section-bar"><h3>Shared research library</h3>'+button('new-project','Create research project','primary')+'</div><p class="muted small circle-note">Member-authored research, not independently verified investment recommendations.</p>'+ (projects.filter(p=>p.community_id===g.id).map(p=>'<details class="surface circle-project"><summary><span><strong>'+e(p.title)+'</strong><small>'+e(p.stage)+' · '+e(person(p.author_id))+'</small></span><span class="pill">'+e(p.category)+'</span></summary><p class="post-body">'+e(p.thesis)+'</p><small class="muted">Created '+e(new Date(p.created_at).toLocaleDateString())+'</small></details>').join('')||'<div class="empty">No research projects have been published to this circle.</div>')+'<div class="surface circle-tools"><h3>Research tools</h3><p class="muted small">Run a model privately before sharing your assumptions and evidence.</p><a class="button" href="../workspace/#research">Open research workspace</a> <a class="button secondary" href="../terminal/">Market intelligence</a></div>';
 if(state.groupTab==='about')return '<div class="surface circle-tools"><h3>Coverage mandate</h3><p class="post-body">'+e(g.description)+'</p><dl class="circle-facts"><dt>Discipline</dt><dd>'+e(researchCategoryLabel(g.category))+'</dd><dt>Visibility</dt><dd>'+e(g.visibility)+'</dd><dt>Your role</dt><dd>'+e(memberships.find(m=>m.community_id===g.id)?.role||'Member')+'</dd><dt>Participation</dt><dd>Voluntary; no transfer of ownership or voting rights</dd></dl></div><div class="surface circle-tools"><h3>Trust and accountability</h3><p>Disclose financial interests and assumptions. Verify claims from primary sources. No guaranteed returns, coordinated price manipulation or requests for deposits.</p><a href="../OWNERSHIP_CHARTER.md">Read the ownership charter</a><button class="button secondary" data-tab="safety">Safety and appeals</button></div>';

 if(state.groupTab==='chat')return '<div class="surface" style="padding:20px"><h3>Group messages</h3><p class="small muted" style="margin:8px 0 15px">Visible only to group members; refreshes automatically.</p><div id="chat-window" class="chat-messages" style="min-height:240px">'+messages.filter(m=>m.community_id===g.id&&!isBlocked(m.author_id)).map(m=>'<div class="bubble '+(m.author_id===session.user.id?'mine':'')+'"><strong>'+e(person(m.author_id))+': </strong>'+e(m.body)+safetyLabel('community_message',m.id)+'</div>').join('')+'</div><form data-form="chat" class="chat-write"><input class="field" name="body" maxlength="2000" required aria-label="Group message" placeholder="Message your group"><button class="button" type="submit">Send</button></form></div>';
 if(state.groupTab==='decisions')return decisionPage(g);
 if(state.groupTab==='members')return '<div class="surface" style="padding:22px"><h3>Members</h3><p class="muted small">Member accounts; identity and financial holdings are not independently verified.</p><div class="stack" style="margin-top:15px">'+memberPoll.map(m=>'<div class="space"><div><button class="member-link" data-act="member-profile" data-id="'+m.user_id+'">'+e(person(m.user_id))+'</button> <span class="pill">'+e(m.role)+'</span></div>'+(m.user_id!==session.user.id?button('dm-user','Message','secondary','data-id="'+m.user_id+'"'):'')+'</div>').join('')+'</div></div>';
 if(state.groupTab==='invites')return '<div class="surface" style="padding:22px"><h3>Invite people</h3><p class="muted small" style="margin:10px 0 15px">Secure invitations expire and have limited uses. Community moderators control issuance.</p>'+(own(g.id)?button('make-invite','Create invitation link','primary'):'<p>Ask a moderator for an invitation.</p>')+(state.inviteToken?'<div class="preview-banner"><strong>Invite URL</strong><input class="field" id="invite-url" readonly value="'+e(location.origin+base+'#invite='+state.inviteToken)+'">'+button('copy-invite','Copy URL')+'</div>':'')+'</div>';
 return '<div class="space" style="margin:0 0 12px"><h3>Discussions</h3></div>'+
 discussionPageMarkup(discussionFeed,postCard,'<div class="empty">Be the first to share research here.</div>');
}
function chat(){
 const peers=memberDirectory.filter(x=>x.id!==session.user.id&&x.allow_direct_messages&&!isBlocked(x.id));
 return head('Messages','Private conversations are opt-in and limited to members sharing a group.')+
 '<div class="surface" style="padding:22px">'+(profile?.allow_direct_messages?'<p class="small muted">Direct messaging is enabled on your profile.</p>':'<p class="small muted">Direct messages are off by default. Enable them under Profile to receive messages from fellow group members.</p>')+
 '<div class="section-bar"><h3>Members accepting messages</h3></div><div class="stack">'+peers.map(p=>'<div class="space"><div><button class="member-link" data-act="member-profile" data-id="'+p.id+'">'+e(p.display_name)+'</button> <span class="tiny muted">@'+e(p.handle)+'</span></div>'+button('dm-user','Open chat','secondary','data-id="'+p.id+'"')+'</div>').join('')+'</div>'+
 (selectedPeer?'<div class="section-bar"><h3>Conversation with '+e(person(selectedPeer))+'</h3>'+button('refresh-dm','Refresh conversation','secondary')+'</div><div data-dm-refresh-status role="status"></div><div class="chat-messages">'+dm.filter(m=>(m.sender_id===selectedPeer&&m.recipient_id===session.user.id)||(m.sender_id===session.user.id&&m.recipient_id===selectedPeer)).map(m=>'<div class="bubble '+(m.sender_id===session.user.id?'mine':'')+'">'+e(m.body)+safetyLabel('direct_message',m.id)+'</div>').join('')+'</div><form data-form="dm" class="chat-write"><input class="field" name="body" required maxlength="2000" aria-label="Private message" placeholder="Write a private message"><button class="button">Send</button></form>':'')+'</div>';
}
function ownership(){
 return head('Private markets & ownership','Develop documented investment theses for real assets, operating businesses, startup capital and shareholder stewardship.',button('new-project','Propose research project','primary'))+
 '<div class="feature-hero" style="min-height:180px;background:#123c3f"><h2>Move from an idea to a researched plan.</h2><p>Members can gather sources and volunteer to research. No investment commitments or transactions happen here.</p></div>'+
 '<div class="project-grid">'+projects.map(p=>'<article class="surface project-card"><span class="pill">'+e(p.category)+' · '+e(p.stage)+'</span><h3>'+e(p.title)+'</h3><p>'+e(p.thesis)+'</p><div style="margin-top:auto" class="small muted">By '+e(person(p.author_id))+'</div></article>').join('')+'</div>';
}
function research(){
 return head('Equity & quantitative research','Use primary-source evidence, reproducible models and independent analysis. Trading remains with your licensed brokerage.')+
 '<div class="surface" style="padding:25px;margin-bottom:15px;background:#142335;color:#eef3f8;border:1px solid #314758"><span class="pill" style="background:#d0ee7f;color:#142015">FINANCIAL INTELLIGENCE</span><h3 style="margin-top:14px;color:#eef3f8">COMMON Quantitative Research Terminal</h3><p class="small" style="margin:10px 0 16px;color:#a9bdce">Official Treasury data, discounted cash flow valuation, options Greeks, interest-rate duration, historical strategy validation, and venture dilution models. Each output explains assumptions and sources.</p>'+button('open-terminal','Open Research Terminal','primary')+' '+button('open-studio','Private research workspace','secondary')+'</div>'+
 '<div class="surface" style="padding:25px"><h3>Your tracked symbols</h3><p class="muted small" style="margin:8px 0 16px">Watchlists are saved to your account. They are not brokerage positions or buy recommendations.</p>'+
 '<form class="row" data-form="watch"><input required name="symbol" class="field" maxlength="12" placeholder="Symbol e.g. TSLA" style="max-width:240px"><button class="button" type="submit">Track</button></form>'+
 watches.map(w=>'<div class="account-row"><strong>'+e(w.symbol)+'</strong><a class="button secondary" href="../lab/?symbol='+encodeURIComponent(w.symbol)+'">Research '+e(w.symbol)+'</a>'+button('remove-watch','Remove','secondary','data-symbol="'+e(w.symbol)+'"')+'</div>').join('')+
 '<p class="small muted" style="margin-top:16px">Use <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer" style="color:#275cfa;text-decoration:underline">SEC EDGAR</a> for dated official filings.</p></div>';
}
function agentDeskKey(){return session?.user?.id?'common.agent.desk.'+session.user.id:null;}
function loadAgentDesk(){const key=agentDeskKey();if(!key){agentDesk=CommonAgentDesk.initial();agentDeskOwner=null;return;}if(agentDeskOwner!==session.user.id){try{agentDesk=CommonAgentDesk.read(localStorage.getItem(key));}catch{agentDesk=CommonAgentDesk.initial();}agentDeskOwner=session.user.id;}}
function saveAgentDesk(next){const key=agentDeskKey();if(!key||agentDeskOwner!==session.user.id)throw Error('Sign in required.');localStorage.setItem(key,JSON.stringify(next));agentDesk=next;render();}
function agentDeskView(){const A=CommonAgentDesk,disclaimer='<div class="capital-disclosure"><strong>LOCAL RESEARCH ONLY</strong><p>Saved content stays in this browser under your account key, not encrypted or synced. Do not save private financial details or secrets. Nothing is sent to a model until you select it and consent.</p></div>';
 if(agentDeskTab==='commands')return disclaimer+'<section class="surface circle-tools"><h3>Create reusable command</h3><form class="stack" data-form="agent-command"><label><span class="form-label">Command name</span><input name="name" class="field" maxlength="40" required placeholder="audit-strategy"></label><label><span class="form-label">Analysis mode</span><select name="mode" class="field">'+Object.entries(A.modes).map(([k,v])=>'<option value="'+k+'">'+e(v)+'</option>').join('')+'</select></label><label><span class="form-label">Prompt template</span><textarea name="template" class="field" minlength="20" maxlength="5000" required></textarea></label><button class="button primary">Save command</button></form></section>'+agentDesk.commands.map(c=>'<details class="surface circle-project"><summary><strong>/'+e(c.name)+'</strong><span class="pill">'+e(A.modes[c.mode])+'</span></summary><pre class="agent-output">'+e(c.template)+'</pre>'+button('use-agent-command','Use command','primary','data-id="'+c.id+'"')+' '+button('delete-agent-command','Delete','secondary','data-id="'+c.id+'"')+'</details>').join('');
 if(agentDeskTab==='memory')return disclaimer+'<section class="surface circle-tools"><h3>Research context notes</h3><form class="stack" data-form="agent-memory"><label><span class="form-label">Note title</span><input name="title" class="field" maxlength="100" required></label><label><span class="form-label">Context to reuse</span><textarea name="body" class="field" maxlength="2000" required></textarea></label><button class="button primary">Save research note</button></form></section>'+agentDesk.memory.map(n=>'<details class="surface circle-project"><summary><strong>'+e(n.title)+'</strong></summary><p class="post-body">'+e(n.body)+'</p>'+button('delete-agent-memory','Delete note','secondary','data-id="'+n.id+'"')+'</details>').join('');
 return disclaimer+'<div class="section-bar"><h3>Saved research analyses</h3>'+button('export-agent-history','Export history','secondary')+'</div>'+(agentDesk.history.length?agentDesk.history.map(r=>'<details class="surface circle-project"><summary><span><strong>'+e(A.modes[r.mode])+'</strong><small>'+e(new Date(r.created).toLocaleString())+'</small></span><span class="pill">'+e(r.status)+'</span></summary><h4>Submitted evidence</h4><pre class="agent-output">'+e(r.input)+'</pre><h4>Unverified AI output</h4><pre class="agent-output">'+e(r.output)+'</pre>'+button('delete-agent-history','Delete analysis','secondary','data-id="'+r.id+'"')+'</details>').join(''):'<div class="empty">No saved analyses. Save a model result explicitly to preserve it here.</div>');}
function agentPage(){
 const A=CommonAgentDesk,nav='<nav class="feed-tabs" aria-label="Research assistant navigation">'+[['analysis','Research assistant'],['commands','Custom commands'],['memory','Research memory'],['history','Saved analyses']].map(([k,t])=>'<button class="feed-tab '+(agentDeskTab===k?'active':'')+'" data-agent-tab="'+k+'">'+t+'</button>').join('')+'</nav>';
 if(agentDeskTab!=='analysis')return head('Research assistant','Your local research workflow and explicitly selected context.')+nav+agentDeskView();
 return head('Research assistant','An evidence-first analysis workspace. You control exactly what is sent to the model.')+nav+
 '<div class="surface circle-tools"><div class="space"><h3>Analysis request</h3><span class="pill">'+(config.researchAgentEnabled===true?'CONFIGURED':'PROVIDER NOT CONNECTED')+'</span></div>'+
 '<p class="muted small">Paste a research thesis, filing excerpt or backtest summary. Do not include private account details, credentials or material you cannot share with a model provider. The assistant cannot access your circles or execute trades.</p>'+
 '<form data-form="research-agent" class="stack">'+(agentDesk.commands.length?'<label><span class="form-label">Apply saved command</span><select class="field" data-agent-command><option value="">Choose a command</option>'+agentDesk.commands.map(c=>'<option value="'+e(c.id)+'">/'+e(c.name)+'</option>').join('')+'</select></label>':'')+'<label><span class="form-label">Analysis type</span><select name="mode" class="field">'+Object.entries(A.modes).map(([k,v])=>'<option value="'+k+'" '+(k===agentMode?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label><span class="form-label">Evidence and question</span><textarea class="field" name="input" maxlength="10000" minlength="20" required rows="9">'+e(agentInput)+'</textarea></label>'+(agentDesk.memory.length?'<fieldset class="agent-memory-picker"><legend>Include selected research notes (optional, maximum five)</legend>'+agentDesk.memory.map(n=>'<label class="row"><input type="checkbox" name="memory" value="'+e(n.id)+'"> '+e(n.title)+'</label>').join('')+'</fieldset>':'')+'<label class="row"><input type="checkbox" name="consent" required> I agree to send this text and the selected research notes to the configured AI provider for analysis.</label><button class="button" '+(config.researchAgentEnabled!==true||agentSending?'disabled':'')+'>'+(agentSending?'Analyzing…':'Analyze evidence')+'</button></form>'+
 (config.researchAgentEnabled!==true?'<p class="muted small">The authenticated agent endpoint, provider and usage quotas must be configured before requests are enabled. No synthetic AI responses are shown.</p>':'')+'</div>'+
 (agentOutput?'<div class="surface circle-tools"><div class="space"><h3>Analysis draft</h3><button class="button secondary" data-act="copy-agent">Copy analysis</button><button class="button secondary" data-act="save-agent-output">Save analysis locally</button></div><p class="muted small">AI-generated · independently verify all claims and calculations.</p><pre class="agent-output">'+e(agentOutput)+'</pre></div>':'');
}
function money(){
 return head('Money','Future regulated wallet, card funding and trading tools.')+
 '<div class="money-card"><div class="space"><strong>COMMON Wallet</strong><span class="pill">NOT AVAILABLE</span></div><div><p>Available balance</p><div class="balance">—</div><p>No funds, deposits, or cards are accepted here.</p></div><div class="actions"><button disabled>Add funds</button><button disabled>Send money</button><button disabled>Withdraw</button></div></div>'+
 '<div class="preview-banner">Future wallet services will use licensed financial partners and separate onboarding. COMMON does not hold investment money or a group treasury today.</div>';
}
function learn(){return head('Understand ownership','Financial concepts explained in plain language.')+
 [['Can my friends buy the same stock?','Yes. Members can discuss and independently decide what to do through their own brokerages. Avoid agreements designed to artificially move prices.'],['What is a pooled investment club?','An actual pooled club needs a lawful structure and external financial accounts. A COMMON group is not automatically a legal fund.'],['Can our group buy housing?','An appropriately structured entity can research and potentially acquire properties using outside legal, banking and financing professionals. COMMON does not offer securities or collect investments.'],['Are community votes legally binding?','No. These opinion polls are not company shareholder votes or investment instructions.'],['What is AUM?','Assets under management is the value a manager oversees. Group size, hypothetical contributions and goal amounts do not count as real AUM.']].map(([q,a])=>'<details class="surface lesson"><summary>'+e(q)+'</summary><p>'+e(a)+'</p></details>').join('');}
let followProfile=null, followList=null;
const followPageSize=25;
const followSections={following:['follower_id','followed_id'],followers:['followed_id','follower_id']};

async function loadFollowProfile(member,quiet=false){
 if(member.requesting)return;
 member.requesting=true;
 const {available,following,error:hadError}=member;
 try{
  const [blocked,edges]=await Promise.all([
   call(client.rpc('dm_block_exists',{sender:member.owner,recipient:member.id})),
   call(client.from('member_follows').select('followed_id').eq('follower_id',member.owner).eq('followed_id',member.id))
  ]);
  if(followProfile!==member)return;
  member.available=!blocked;member.following=edges.length>0;member.error=false;
 }catch{member.error=true}
 member.requesting=false;
 member.loading=false;
 if(followProfile===member&&(!quiet||available!==member.available||following!==member.following||hadError!==member.error))render();
}
function followProfileControl(p){
 const member=followProfile;
 if(!member||member.loading)return '<span role="status">Loading follow status…</span>';
 if(member.error)return button('retry-follow-status','Retry follow status');
 if(!member.available||isBlocked(p.id))return '';
 return button('toggle-follow',member.following?'Unfollow':'Follow','secondary','data-id="'+p.id+'"');
}
function prepareFollowViews(){
 if(document.hidden){followProfile=followList=null;return}
 const owner=session.user.id;
 const member=view==='member'&&memberDetail?.id!==owner?memberDetail:null;
 if(!member)followProfile=null;
 else if(followProfile?.owner!==owner||followProfile.id!==member.id){
  followProfile={owner,id:member.id,loading:true};
  void loadFollowProfile(followProfile);
 }
 const section=view==='profile'&&Object.hasOwn(followSections,profileSection)?profileSection:null;
 if(!section)followList=null;
 else if(followList?.section!==section||followList.owner!==owner){
  followList={owner,section,cursors:[null],items:[]};
  void loadFollowList(followList);
 }
}
async function loadFollowList(list,{focus=false,quiet=false}={}){
 if(list.requesting)return;
 list.requesting=true;
 if(!quiet){list.loading=true;list.error=false;list.items=[];list.next=null}
 const previous=JSON.stringify([list.items,list.next,list.error]);
 const [ownerColumn,peerColumn]=followSections[list.section];
 try{
  let query=client.from('member_follows').select(peerColumn+',member:profiles!member_follows_'+peerColumn+'_fkey(id,display_name,handle)')
   .eq(ownerColumn,list.owner).order(peerColumn,{ascending:true}).limit(followPageSize+1);
  const cursor=list.cursors.at(-1);
  if(cursor)query=query.gt(peerColumn,cursor);
  const rows=await call(query);
  if(followList!==list)return;
  list.items=rows.slice(0,followPageSize).map(row=>row.member);
  list.next=rows.length>followPageSize?rows[followPageSize-1][peerColumn]:null;
  list.error=false;
 }catch{list.error=true;list.items=[];list.next=null}
 list.requesting=false;
 list.loading=false;
 if(followList===list&&(!quiet||previous!==JSON.stringify([list.items,list.next,list.error]))){
  render();
  if(focus)document.getElementById('member-follow-results')?.focus();
 }
}
function followListMarkup(){
 const list=followList;
 let content;
 if(!list||list.loading)content='<p role="status">Loading members…</p>';
 else if(list.error)content='<p role="alert">Could not load members.</p>'+button('follow-list-refresh','Try again');
 else content=list.items.length?list.items.map(p=>'<div class="space"><button class="member-link" data-act="member-profile" data-id="'+e(p.id)+'">'+e(p.display_name)+'</button><span class="muted small">@'+e(p.handle)+'</span></div>').join(''):'<p>'+ (list.section==='following'?'You have not followed any visible members.':'You have no visible followers.')+'</p>';
 return '<div class="stack" id="member-follow-results" tabindex="-1">'+content+'</div>'+
  (list&&!list.loading&&!list.error?'<div class="row" role="group" aria-label="Member list pages">'+
   (list.cursors.length>1?button('follow-list-previous','Previous members'):'')+
   (list.next?button('follow-list-next','More members'):'')+button('follow-list-refresh','Refresh members')+'</div>':'');
}
function memberPage(){const p=memberDetail;if(!p)return head('Member profile','Select a member from a circle.');const mine=p.id===session.user.id,shared=memberDirectory.some(x=>x.id===p.id);
return head(p.display_name,'@'+p.handle)+button('open-groups','Back to circles')+'<div class="surface circle-tools"><div class="space"><span class="avatar">'+e(p.display_name.slice(0,2).toUpperCase())+'</span><span class="pill">Member profile</span></div><p class="post-body">'+e(p.bio||'No public biography provided.')+'</p><p class="muted small">Member-provided profile; not an independently verified investment professional or shareholder.</p><div class="row">'+(mine?'<button class="button" data-tab="profile">Edit profile</button>':(shared&&p.allow_direct_messages&&!isBlocked(p.id)?button('dm-user','Message','primary','data-id="'+p.id+'"'):'')+followProfileControl(p)+button(isBlocked(p.id)?'unblock-member':'block-member',isBlocked(p.id)?'Unblock member':'Block member','secondary','data-id="'+p.id+'"'))+'</div></div><div class="section-bar"><h3>Visible recent research</h3></div>'+discussionPageMarkup(discussionFeed,postCard,'<div class="empty">No visible recent research.</div>');}
function profilePage(){const nav='<div class="feed-tabs">'+[['identity','Profile'],['privacy','Privacy & communication'],['blocked','Blocked members'],['saved','Saved research'],['following','Following'],['followers','Followers']].map(([id,label])=>'<button class="feed-tab '+(profileSection===id?'active':'')+'" data-profile-section="'+id+'" aria-pressed="'+(profileSection===id)+'">'+label+'</button>').join('')+'</div>';let c='';
if(profileSection==='identity')c='<form data-form="profile" class="stack"><label><span class="form-label">Display name</span><input class="field" name="name" required maxlength="80" minlength="2" value="'+e(profile?.display_name)+'"></label><label><span class="form-label">Biography (public)</span><textarea class="field" maxlength="600" name="bio">'+e(profile?.bio||'')+'</textarea></label><button type="submit" class="button">Save profile</button></form>';
if(profileSection==='privacy')c='<form data-form="privacy" class="stack"><label class="row"><input type="checkbox" name="allow_dm" '+(profile?.allow_direct_messages?'checked':'')+'> Allow direct messages from members of my communities</label><p class="muted small">Private messaging requires a shared circle and recipient consent. Blocking prevents direct messaging in both directions.</p><button type="submit" class="button">Save privacy preferences</button></form>';
if(profileSection==='blocked')c='<p class="muted small">Blocked profiles are hidden from your feed and cannot exchange direct messages with you. This does not remove their public content for other users.</p>'+ (blockedMembers.length?blockedMembers.map(id=>'<div class="space"><span>'+e(person(id))+'</span>'+button('unblock-member','Unblock','secondary','data-id="'+id+'"')+'</div>').join(''):'<p>No blocked members.</p>');
if(profileSection==='saved')c='<p class="muted small">Bookmarks are saved on this device and account only. Only research you still have permission to read is displayed.</p>'+button('saved-feed','Open saved research')+'<button class="button secondary" data-act="clear-bookmarks">Clear saved research</button>';
if(Object.hasOwn(followSections,profileSection))c=followListMarkup();
return head('Your account','Control your identity, communications and privacy.')+nav+'<div class="surface circle-tools"><h3>'+e(profile?.display_name)+'</h3><p class="muted small">@'+e(profile?.handle)+'</p>'+c+'</div><button class="button soft" data-act="signout">Sign out</button>';}

function researchDraftNotice(){
 if(view==='research-review'||!CommonResearchDraft.forMember(session.user.id))return '';
 return '<section class="preview-banner"><p>Unpublished research summary from this tab.</p>'+
  button('review-research','Review research draft')+'</section>';
}
function researchReviewPage(){
 const draft=researchReview;
 if(!draft||draft.owner!==session.user.id||!CommonResearchDraft.forMember(session.user.id)){
  return head('Research draft','This draft is unavailable. Return to Research or Research Studio to prepare a new one.');
 }
 const circles=groups.filter(group=>group.visibility==='private'&&joined(group.id));
 const destinations=circles.map(group=>'<option value="'+e(group.id)+'" '+(draft.circle===group.id?'selected':'')+'>'+e(group.name)+'</option>').join('');
 const fields='<label><span class="form-label">Discussion title</span><input name="title" class="field" required minlength="8" maxlength="160" value="'+e(draft.title)+'"></label>'+
  '<label><span class="form-label">Research summary</span><textarea name="body" class="field" rows="12" required minlength="3" maxlength="10000">'+e(draft.body)+'</textarea></label>';
 return head('Review research draft','Review exactly what will be shared. The underlying data and project stay in Research.')+
  '<form data-form="research-draft" class="surface circle-tools stack">'+fields+
  (circles.length?'<label><span class="form-label">Private circle</span><select required class="field" name="circle"><option value="">Choose a private circle</option>'+destinations+'</select></label>'+
    '<button type="submit" class="button">Publish to circle</button>':
    '<p>Join or create a private circle to publish this draft.</p>'+button('open-groups','Open circles'))+
  (config.researchAgentEnabled===true?button('review-with-agent','Open in research assistant','secondary'):'')+
  button('discard-research','Discard draft','secondary')+'</form>';
}

const postDraftKey=uid=>'common.posts.draft.v1.'+uid;
const draftText=(value,max)=>typeof value==='string'?value.slice(0,max):'';
function openPostDraft(uid){
 if(composerDraft?.owner===uid&&composerDraft.saveError)return;
 let savedRaw=null,stored=null,saveError='';
 try{
  savedRaw=localStorage.getItem(postDraftKey(uid));
  if(savedRaw!==null)stored=JSON.parse(savedRaw);
 }catch{
  saveError='This draft could not be read from device storage.';
 }
 composerDraft={
  owner:uid,savedRaw,saveError,publishError:'',publishing:false,
  group:typeof stored?.group==='string'?stored.group:(selectedGroup&&joined(selectedGroup)?selectedGroup:''),
  title:draftText(stored?.title,160),body:draftText(stored?.body,10000)
 };
}
function savePostDraft(draft){
 if(draft?.owner!==session?.user?.id)return false;
 const key=postDraftKey(draft.owner);
 const content=JSON.stringify({group:draft.group,title:draft.title,body:draft.body});
 try{
  if(localStorage.getItem(key)!==draft.savedRaw){
   draft.saveError='This draft changed in another tab. Copy your edits before closing.';
   return false;
  }
  if(content!==draft.savedRaw)localStorage.setItem(key,content);
  draft.savedRaw=content;
  draft.saveError='';
  return true;
 }catch{
  draft.saveError='Device storage is unavailable. Copy your draft before leaving this page.';
  return false;
 }
}
function clearPostDraft(draft){
 const key=postDraftKey(draft.owner);
 try{
  if(localStorage.getItem(key)!==draft.savedRaw)return false;
  localStorage.removeItem(key);
  return true;
 }catch{
  return false;
 }
}
function postComposerFields(){
 const draft=composerDraft;
 const destinations=memberships.map(m=>'<option value="'+e(m.community_id)+'"'+
  (m.community_id===draft.group?' selected':'')+'>'+e(groupName(m.community_id))+'</option>').join('');
 return '<p class="muted small">One unpublished draft is saved for your account on this device.</p>'+
  '<label><span class="form-label">Community</span><select required class="field" name="group">'+
  '<option value="">Choose a community</option>'+destinations+'</select></label>'+
  (destinations?'':'<p>Join a circle before publishing. You can save the draft meanwhile.</p>')+
  '<label><span class="form-label">Title</span><input required minlength="8" maxlength="160" class="field" name="title" value="'+e(draft.title)+'"></label>'+
  '<label><span class="form-label">Your research or question</span><textarea required minlength="3" maxlength="10000" class="field" name="body">'+e(draft.body)+'</textarea></label>'+
  '<p data-post-draft-status role="status">'+e(draft.saveError||(draft.savedRaw?'Draft saved on this device.':''))+'</p>'+
  (draft.publishError?'<p role="alert">'+e(draft.publishError)+'</p>':'')+
  '<div class="row"><button type="button" class="button secondary" data-act="keep-post-draft">Save draft</button>'+
  '<button type="button" class="button secondary" data-act="discard-post-draft">Discard draft</button></div>';
}
function dialog(){
 if(!state.composer&&!state.groupCreate&&!state.projectCreate&&!state.proposalCreate)return '';
 let title='',fields='',form='';
 if(state.composer){title='Share research';form='post';fields=postComposerFields();}
 else if(state.groupCreate){title='Establish a research desk';form='group';fields='<label><span class="form-label">Research desk name</span><input class="field" name="name" required minlength="4" maxlength="100" placeholder="e.g. Industrials Fundamental Research"></label><label><span class="form-label">Mandate and methodology</span><textarea class="field" name="description" maxlength="2500" required placeholder="Define your research universe, analytical method, sources and intended deliverables."></textarea></label><label><span class="form-label">Coverage discipline</span><select class="field" name="category">'+researchDisciplines.map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label><label><span class="form-label">Membership visibility</span><select name="visibility" class="field"><option value="private">Private, invitation only</option><option value="public">Public research desk</option></select></label><div class="preview-banner">Research collaboration and shareholder education only. Do not use a desk to coordinate market manipulation, solicit unregistered securities, or pool money without an authorized structure.</div>';}
 else if(state.projectCreate){title='Research a project';form='project';fields='<label><span class="form-label">Linked community</span><select name="community" class="field">'+memberships.map(m=>'<option value="'+m.community_id+'" '+(m.community_id===selectedGroup?'selected':'')+'>'+e(groupName(m.community_id))+'</option>').join('')+'</select></label><label><span class="form-label">Project title</span><input name="title" class="field" required minlength="8" maxlength="160"></label><label><span class="form-label">Rationale</span><textarea name="thesis" class="field" required minlength="30" maxlength="12000"></textarea></label><label><span class="form-label">Focus</span><select name="category" class="field"><option value="public_company">Public company</option><option value="housing">Housing</option><option value="local_business">Business</option><option value="community_land">Community land</option><option value="other">Other</option></select></label>';}
 else{title='Start a discussion poll';form='proposal';fields='<input type="hidden" name="community" value="'+e(selectedGroup)+'"><label><span class="form-label">Question</span><input class="field" name="title" required minlength="8" maxlength="160" value="'+e(pollDraft?.title||'')+'"></label><label><span class="form-label">What members should consider</span><textarea class="field" name="rationale" required minlength="30" maxlength="15000">'+e(pollDraft?.rationale||'')+'</textarea></label>';}
 return '<dialog class="modal common-member-dialog" aria-labelledby="member-dialog-title"><div class="space"><h2 id="member-dialog-title">'+title+'</h2><button type="button" class="icon-btn" aria-label="Close dialog" data-act="close-dialog">✕</button></div><p class="muted small" style="margin:10px 0 16px">This is a live community contribution, not a request to collect investment money.</p><form data-form="'+form+'" class="stack">'+fields+'<button type="submit" class="button full" '+
  (form==='post'&&(!memberships.length||composerDraft.publishing)?'disabled':'')+'>'+
  (form==='post'&&composerDraft.publishing?'Publishing…':'Publish')+'</button></form></dialog>';
}
function recoveryPage(){
 root.innerHTML='<main class="auth-shell"><section class="auth-left">'+logo()+'<div class="auth-feature"><h1>Secure your<br><em>account.</em></h1><p>Choose a new password to regain access to your community.</p></div></section><section class="auth-right"><div class="auth-form-wrap"><h2>Reset your password</h2>'+banner()+'<form id="password-change-form" class="stack"><label><span class="form-label">New password</span><input class="field" name="password" required type="password" minlength="8" autocomplete="new-password"></label><button type="submit" class="button full">Save new password</button></form></div></section></main>';
}
let modalTrigger=null;
function closeMemberDialog(){
 pollDraft=null;state.composer=state.groupCreate=state.projectCreate=state.proposalCreate=false;
 render();
 const trigger=modalTrigger&&root.querySelector('[data-act="'+CSS.escape(modalTrigger)+'"]');
 trigger?.focus();
 modalTrigger=null;
}
function render(){
 if(!client){setup();return}
 if(recovering){resetDiscussionFeed();recoveryPage();return}
 if(!session?.user){resetDiscussionFeed();auth();return}
 prepareFollowViews();
 prepareDiscussionFeed();
 const previous=root.querySelector('.common-member-dialog[open]');
 const previousForm=previous?.querySelector('form');
 const values=previousForm&&previousForm.dataset.form!=='post'?new FormData(previousForm):null;
 root.innerHTML=baseNav()+dialog();
 const modal=root.querySelector('.common-member-dialog');
 if(!modal)return;
 const form=modal.querySelector('form');
 if(form.dataset.form==='post'&&composerDraft.publishing){
  for(const control of form.elements)control.disabled=true;
 }
 if(values&&previousForm.dataset.form===form.dataset.form){
  for(const [name,value] of values){
   const control=form.elements.namedItem(name);
   if(control&&control.type!=='hidden')control.value=value;
  }
 }
 form.querySelector('input:not([type=hidden]), textarea, select')?.setAttribute('autofocus','');
 modal.addEventListener('cancel',event=>{event.preventDefault();if(!busy)closeMemberDialog();});
 modal.showModal();
}
async function init(){
 client=window.CommonSession.memberClient();
 if(!client){setup();return}
 checkGoogleProvider().catch(console.error);
 const r=await saved();if(r.error)throw r.error;session=r.data.session;
 client.auth.onAuthStateChange((evt,next)=>{
  if(session?.user?.id!==next?.user?.id){
   researchReview=pollDraft=composerDraft=null;view='home';error=info='';
   profile=null;ledgerRows=[];ledgerCircle=null;ledgerError='';decisionDetail=null;pollRows=[];pollOwn=null;
   capitalDrafts.clear();capitalTab='overview';blockedMembers=[];bookmarks=[];memberDetail=null;memberDirectory=[];
   profileSection='identity';state.feed='mine';followProfile=followList=null;mobileMore=false;agentOutput=null;agentInput='';agentMode='review';agentDeskTab='analysis';
   agentDesk=CommonAgentDesk.initial();agentDeskOwner=null;agentLastRequest=null;
   groups=[];memberships=[];proposals=[];projects=[];watches=[];people={};messages=[];dm=[];memberPoll=[];
   moderationCases=[];moderationAppeals=[];accountRestrictions=[];selectedGroup=selectedPeer=null;
   state.inviteToken=null;state.comments=null;state.composer=state.groupCreate=state.projectCreate=state.proposalCreate=false;
   recovering=false;resetDiscussionFeed();
  }
  session=next;
  if(evt==='PASSWORD_RECOVERY'){recovering=true;render();return}
  if(!next){render();return}
  if(!recovering&&evt!=='INITIAL_SESSION'&&evt!=='TOKEN_REFRESHED'){
   render();
   setTimeout(()=>refresh().catch(handleError),0);
  }
 });
 if(session)await refresh();else render();
 const fragment=location.hash.match(/^#invite=([a-f0-9]{48})$/);
 if(fragment)pendingInvite=fragment[1];
 if(!pendingInvite){try{const savedInvite=sessionStorage.getItem('common.pendingInvite');if(/^[a-f0-9]{48}$/.test(savedInvite||''))pendingInvite=savedInvite;}catch{}}
 if(pendingInvite&&session)await acceptInvite(pendingInvite);
 // Refresh only the current visible resource, never the full member bootstrap.
 let refreshingView=false;
 setInterval(async()=>{
  if(!session?.user||document.hidden||busy||refreshingView||document.activeElement?.matches('input,textarea,select'))return;
  refreshingView=true;
  try{
   if(view==='groups'&&state.groupTab==='chat'&&selectedGroup){await loadMessages();if(view==='groups'&&state.groupTab==='chat')render()}
   else if(discussionFeed){
    await readDiscussionPage(discussionFeed,{quiet:true});
    if(discussionThread)await readDiscussionPage(discussionThread,{thread:true,quiet:true});
   }
   if(followProfile&&!followProfile.loading)await loadFollowProfile(followProfile,true);
   if(followList&&!followList.loading)await loadFollowList(followList,{quiet:true});
  }catch(err){console.error(err)}finally{refreshingView=false}
 },25000);
 document.addEventListener('visibilitychange',()=>{
  if(!currentDiscussionScope()&&!(view==='profile'&&Object.hasOwn(followSections,profileSection)))return;
  resetDiscussionFeed();followProfile=followList=null;render();
 });
 window.addEventListener('online',()=>{
  if(discussionFeed?.error)void readDiscussionPage(discussionFeed);
  else if(discussionThread?.error)void readDiscussionPage(discussionThread,{thread:true});
  if(followProfile?.error)void loadFollowProfile(followProfile,true);
  if(followList?.error)void loadFollowList(followList,{quiet:true});
 });
}
async function refresh(){
 if(!session?.user)return;const uid=session.user.id;loadAgentDesk();
 const [p,c,m,q,o,w,mod,appeals,restrictions]=await Promise.all([
 call(client.from('profiles').select('*').eq('id',uid).single()),
 call(client.from('communities').select('*').order('created_at',{ascending:false}).limit(200)),
 call(client.from('memberships').select('community_id,user_id,role').eq('user_id',uid)),
 call(client.from('proposals').select('*').order('created_at',{ascending:false}).limit(80)),
 call(client.from('ownership_projects').select('*').order('created_at',{ascending:false}).limit(100)),
 call(client.from('watchlist_items').select('*').eq('user_id',uid)),
 call(client.from('moderation_cases').select('id,item_type,item_id,actor_id,community_id,review_status,matched_rules,content_preview,created_at,reviewed_by').order('created_at',{ascending:false}).limit(200)),
 call(client.from('moderation_appeals').select('id,case_id,appellant_id,statement,appeal_status,created_at').order('created_at',{ascending:false}).limit(100)),
 call(client.from('account_enforcement').select('restriction,reason,expires_at').eq('user_id',uid))
 ]);
 if(session?.user?.id!==uid)return;profile=p;groups=c;memberships=m;proposals=q;projects=o;watches=w;moderationCases=mod;moderationAppeals=appeals;accountRestrictions=restrictions;
 const memberRows=memberships.length?await call(client.from('memberships').select('user_id').in('community_id',memberships.map(m=>m.community_id)).limit(1000)):[];const blockRows=await call(client.from('member_blocks').select('blocked_id').eq('blocker_id',uid));if(session?.user?.id!==uid)return;blockedMembers=blockRows.map(b=>b.blocked_id);loadBookmarks();const memberIds=new Set(memberRows.map(m=>m.user_id));const ids=[...new Set([uid,...blockedMembers,...memberIds,...projects.map(x=>x.author_id)])];
 if(ids.length){const all=[];for(let i=0;i<ids.length;i+=100){all.push(...await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids.slice(i,i+100))));}if(session?.user?.id!==uid)return;people=Object.fromEntries(all.map(x=>[x.id,x]));memberDirectory=all.filter(x=>memberIds.has(x.id));}
 if(selectedGroup&&joined(selectedGroup)&&state.groupTab==='chat')await loadMessages();
 resetDiscussionFeed();render();
}
async function loadMessages(){const cid=selectedGroup,uid=session?.user?.id;if(!cid||!uid||!joined(cid))return;const rows=await call(client.from('community_messages').select('*').eq('community_id',cid).is('deleted_at',null).order('created_at',{ascending:false}).limit(100));if(selectedGroup!==cid||session?.user?.id!==uid)return;messages=rows.reverse();const ids=[...new Set(messages.map(x=>x.author_id).filter(id=>!people[id]))];if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));if(selectedGroup===cid&&session?.user?.id===uid)for(const x of p)people[x.id]=x;}}
async function loadGroupMembers(){const cid=selectedGroup,uid=session?.user?.id;if(!cid||!uid||!joined(cid))return;const rows=await call(client.from('memberships').select('user_id,role').eq('community_id',cid).limit(150));if(selectedGroup!==cid||session?.user?.id!==uid)return;memberPoll=rows;const ids=rows.map(x=>x.user_id).filter(id=>!people[id]);if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));if(selectedGroup===cid&&session?.user?.id===uid)for(const x of p)people[x.id]=x;}}
async function loadDM(){const peer=selectedPeer,uid=session?.user?.id;if(!peer||!uid)return;const [incoming,outgoing]=await Promise.all([call(client.from('direct_messages').select('*').eq('sender_id',peer).eq('recipient_id',uid).order('created_at',{ascending:false}).limit(100)),call(client.from('direct_messages').select('*').eq('sender_id',uid).eq('recipient_id',peer).order('created_at',{ascending:false}).limit(100))]);if(selectedPeer===peer&&session?.user?.id===uid)dm=[...incoming,...outgoing].sort((a,b)=>a.created_at.localeCompare(b.created_at));}
async function acceptInvite(token){await call(client.rpc('accept_private_invite',{token}));pendingInvite=null;try{sessionStorage.removeItem('common.pendingInvite')}catch{}history.replaceState(null,'',base);await refresh();status('Joined the private community.');}
async function dispatch(action,element){
 const id=element.dataset.id, choice=element.dataset.choice;
 if(action==='google-auth'){
   if(googleProviderStatus!=='enabled'){
     status('Google sign-in has not been activated in Supabase yet. An OAuth client ID and secret from Google Cloud are required.');
     return;
   }
   if(pendingInvite&&/^[a-f0-9]{48}$/.test(pendingInvite)){
     try{sessionStorage.setItem('common.pendingInvite',pendingInvite)}catch{}
   }
   const result=await client.auth.signInWithOAuth({
     provider:'google',
     options:{redirectTo:location.origin+base,queryParams:{prompt:'select_account'}}
   });
   if(result.error)throw result.error;
   return;
 }
 if(action==='export-capital'){const draft=capitalDrafts.get(selectedGroup);if(!draft||!joined(selectedGroup))throw Error('No scenario available');const url=URL.createObjectURL(new Blob([JSON.stringify({notice:'HYPOTHETICAL ONLY — NO FUNDS OR COMMITMENTS',...draft.result},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='common-capital-scenario.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);return}
 if(action==='mobile-more'){mobileMore=!mobileMore;render();return}
 const pageAction=pageDiscussionAction(action);if(pageAction)return pageAction;
 if(action==='bookmark'){if(!discussionFeed?.items.some(p=>p.id===id))throw Error('Research no longer visible');toggleBookmark(id);return}
 if(action==='saved-feed'){view='home';state.feed='saved';render();return}
 if(action==='clear-bookmarks'){if(confirm('Clear all saved research on this device?')){localStorage.removeItem(bookmarkKey());bookmarks=[];resetDiscussionFeed();render()}return}
 if(action==='discover-feed'){view='home';state.feed='discover';render();return}
 if(action==='retry-follow-status'&&followProfile&&!followProfile.requesting){
  followProfile.loading=true;render();return loadFollowProfile(followProfile);
 }
 if(action==='toggle-follow'){
  const member=followProfile;
  if(!member||member.id!==id||member.requesting||member.loading||!member.available)return;
  member.loading=true;render();
  try{
   const edge={follower_id:member.owner,followed_id:member.id};
   if(member.following)await call(client.from('member_follows').delete().eq('follower_id',edge.follower_id).eq('followed_id',edge.followed_id));
   else await call(client.from('member_follows').upsert(edge,{onConflict:'follower_id,followed_id',ignoreDuplicates:true}));
  }catch{
   if(followProfile!==member)return;
   member.loading=false;render();document.querySelector('[data-act="toggle-follow"]')?.focus();
   throw Error('Could not update follow status. Please try again.');
  }
  if(followProfile===member){
   await loadFollowProfile(member);
   document.querySelector('[data-act="toggle-follow"],[data-act="retry-follow-status"]')?.focus();
  }
  return;
 }
 if(action.startsWith('follow-list-')){
  const list=followList;
  if(!list||list.requesting)return;
  if(action==='follow-list-next'&&list.next)list.cursors.push(list.next);
  if(action==='follow-list-previous'&&list.cursors.length>1)list.cursors.pop();
  const loaded=loadFollowList(list,{focus:true});render();return loaded;
 }
 if(action==='member-profile'){const uid=session.user.id,p=await call(client.from('profiles').select('id,display_name,handle,bio,allow_direct_messages').eq('id',id).single());if(session?.user?.id!==uid)return;memberDetail=p;view='member';render();return}
 if(action==='block-member'||action==='unblock-member'){if(id===session.user.id)throw Error('Cannot block yourself');if(action==='block-member'){if(!confirm('Block this member? Direct messaging will be disabled.'))return;await call(client.from('member_blocks').insert({blocker_id:session.user.id,blocked_id:id}));if(selectedPeer===id){selectedPeer=null;dm=[]}}else await call(client.from('member_blocks').delete().eq('blocker_id',session.user.id).eq('blocked_id',id));followProfile=null;await refresh();return}
 if(action==='auth-mode'){lastAuthView=element.dataset.mode;info=error='';render();return}
 if(action==='signout'){await client.auth.signOut();return}
 if(action==='open-groups'){selectedGroup=null;messages=[];memberPoll=[];state.inviteToken=null;view='groups';state.groupTab='posts';render();return}
 if(action==='open-group'){capitalTab='overview';decisionDetail=null;pollRows=[];pollOwn=null;ledgerRows=[];ledgerCircle=null;ledgerError='';selectedGroup=id;messages=[];memberPoll=[];state.inviteToken=null;state.comments=null;view='groups';state.groupTab='posts';render();return}
 if(action==='join-group'){await call(client.rpc('join_public_community',{cid:id}));await refresh();return}
 if(action==='create-group'){state.groupCreate=true;render();return}
 if(action==='compose'){
  openPostDraft(session.user.id);
  state.composer=true;render();return;
 }
 if(action==='keep-post-draft'){
  if(savePostDraft(composerDraft))closeMemberDialog();
  else render();
  return;
 }
 if(action==='discard-post-draft'){
  if(!confirm('Discard this unpublished draft?'))return;
  if(!clearPostDraft(composerDraft)){
   composerDraft.saveError='This draft could not be removed from device storage.';
   render();return;
  }
  composerDraft=null;closeMemberDialog();return;
 }
 if(action==='review-research'){
  const draft=CommonResearchDraft.claim(session.user.id);
  if(!draft)throw Error('Research draft unavailable.');
  researchReview=researchReview?.id===draft.id?researchReview:{...draft,circle:''};
  view='research-review';error=info='';render();return;
 }
 if(action==='discard-research'){
  if(researchReview?.owner!==session.user.id)return;
  CommonResearchDraft.clear(researchReview.id);researchReview=null;view='home';error=info='';render();return;
 }
 if(action==='review-with-agent'){
  if(config.researchAgentEnabled!==true||researchReview?.owner!==session.user.id)return;
  agentMode='review';agentInput=researchReview.body;agentOutput=null;agentLastRequest=null;
  agentDeskTab='analysis';view='agent';error=info='';render();return;
 }
 if(action==='close-dialog'){closeMemberDialog();return}
 if(action==='use-agent-command'){const c=agentDesk.commands.find(x=>x.id===id);if(!c)throw Error('Command not found.');agentInput=c.template;agentMode=c.mode;agentDeskTab='analysis';render();return}
 if(action==='save-agent-output'){if(!agentLastRequest||!agentOutput)throw Error('No completed analysis.');if(agentDesk.history.length>=20)throw Error('Delete an old analysis before saving another.');if(confirm('Save the submitted evidence and AI output locally on this device?'))saveAgentDesk({...agentDesk,history:[CommonAgentDesk.record(agentLastRequest.mode,agentLastRequest.input,agentOutput,agentLastRequest.status),...agentDesk.history]});return}
 if(['delete-agent-command','delete-agent-memory','delete-agent-history'].includes(action)){const k=action==='delete-agent-command'?'commands':action==='delete-agent-memory'?'memory':'history';if(confirm('Delete this local research item?'))saveAgentDesk({...agentDesk,[k]:agentDesk[k].filter(x=>x.id!==id)});return}
 if(action==='export-agent-history'){const url=URL.createObjectURL(new Blob([JSON.stringify({notice:'Unverified research; private local export',history:agentDesk.history},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='common-agent-history.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);return}
 if(action==='copy-agent'){if(agentOutput)await navigator.clipboard.writeText(agentOutput);return}
 if(action==='open-terminal'){location.assign(new URL('../terminal/',location.href).href);return}
 if(action==='open-studio'){location.assign(new URL('../lab/',location.href).href);return}
 if(action==='learn'){view='learn';render();return}
 if(action==='comments'){
  if(state.comments===id){state.comments=null;discussionThread=null;render();return}
  if(!discussionFeed?.items.some(post=>post.id===id))return;
  state.comments=id;
  discussionThread={scope:{feed_scope:'replies',scope_id:id},items:[],next:null,cursors:[null],loading:false,error:false};
  await readDiscussionPage(discussionThread,{thread:true,focus:true});return;
 }
 if(action==='like'){
  const post=discussionFeed?.items.find(item=>item.id===id);if(!post)return;
  if(post.liked)await call(client.from('discussion_likes').delete().eq('discussion_id',id).eq('user_id',session.user.id));
  else await call(client.from('discussion_likes').upsert({discussion_id:id,user_id:session.user.id},{ignoreDuplicates:true,onConflict:'discussion_id,user_id'}));
  await readDiscussionPage(discussionFeed,{quiet:true});return;
 }
 if(action==='new-proposal'){pollDraft=null;state.proposalCreate=true;render();return}
 if(action==='poll-from-discussion'){
  const post=discussionFeed?.items.find(item=>item.id===id);
  if(!post||post.community_id!==selectedGroup||!joined(selectedGroup)||contentFlag('discussion',id)){
   throw Error('The discussion is unavailable in this circle.');
  }
  pollDraft={title:('Review: '+(post.title||'Circle discussion')).slice(0,160),
    rationale:'Evidence from circle discussion '+post.id+'\n\n'+post.body};
  state.proposalCreate=true;render();return;
 }
 if(action==='new-project'){state.projectCreate=true;render();return}
 if(action==='remove-watch'){await call(client.from('watchlist_items').delete().eq('symbol',element.dataset.symbol).eq('user_id',session.user.id));await refresh();return}
 if(action==='poll-detail'){await loadPoll(id);return}
 if(action==='poll-list'){decisionDetail=null;pollRows=[];pollOwn=null;render();return}
 if(action==='poll-vote'){const p=proposals.find(x=>x.id===id);if(!p||p.community_id!==selectedGroup||!joined(selectedGroup))throw Error('Circle membership required');await call(client.from('proposal_votes').upsert({proposal_id:id,user_id:session.user.id,choice},{onConflict:'proposal_id,user_id'}));await loadPoll(id);status('Your nonbinding member opinion was recorded. No transaction is authorized.');return}
 if(action==='refresh-ledger'){await loadLedger();render();return}
 if(action==='export-ledger'){if(config.externalLedgerEnabled!==true||ledgerCircle!==selectedGroup||!joined(selectedGroup))throw Error('Journal unavailable');const url=URL.createObjectURL(new Blob([JSON.stringify({mode:'manual_external_records_unverified',entries:ledgerRows},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='common-external-journal.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);return}
 if(action==='reverse-external'){const g=groupById(selectedGroup),original=ledgerRows.find(x=>x.id===id);if(config.externalLedgerEnabled!==true||!g||g.visibility!=='private'||!own(g.id)||ledgerCircle!==g.id||!original||original.reverses_id)throw Error('Reversal unavailable');if(!confirm('Append a reversing entry? Original records remain unchanged.'))return;await call(client.from('circle_external_journal').insert({community_id:g.id,record_date:new Date().toISOString().slice(0,10),source_ref:'rev-'+crypto.randomUUID(),lines:CommonLedger.reverse(original.lines),reverses_id:id}));await loadLedger();render();return}
 if(action==='make-invite'){const token=await call(client.rpc('create_private_invite',{cid:selectedGroup,permitted_uses:10}));state.inviteToken=token;render();return}
 if(action==='copy-invite'){const input=document.getElementById('invite-url');if(input){await navigator.clipboard.writeText(input.value);status('Invitation link copied.')}return}
 if(action==='refresh-dm'){
  const peer=selectedPeer,uid=session.user.id;
  const stillOpen=()=>view==='chat'&&selectedPeer===peer&&session?.user?.id===uid;
  try{await loadDM();}catch{
   const message=stillOpen()&&root.querySelector('[data-dm-refresh-status]');
   if(message)message.textContent='Conversation could not refresh. Try again.';
   return;
  }
  if(stillOpen()){
   const draft=root.querySelector('[data-form="dm"] input')?.value||'';
   render();
   const input=root.querySelector('[data-form="dm"] input');
   if(input)input.value=draft;
   root.querySelector('[data-act="refresh-dm"]')?.focus();
  }
  return;
 }
 if(action==='dm-user'){if(isBlocked(id)||!memberDirectory.some(x=>x.id===id&&x.allow_direct_messages))throw Error('This member is unavailable for direct messages.');selectedPeer=id;dm=[];view='chat';await loadDM();render();return}
 if(action==='appeal-case'){
   const c=moderationCases.find(x=>x.id===id);
   if(!c||c.actor_id!==session.user.id||c.review_status!=='rejected')
     throw new Error('Only the author may appeal rejected content');
   const explanation=window.prompt('Explain the context and why this should be independently reviewed (20-2000 characters):');
   if(!explanation?.trim())return;
   if(explanation.trim().length<20||explanation.length>2000)
     throw new Error('Appeal explanation must be 20–2000 characters');
   await call(client.from('moderation_appeals').insert({
     case_id:id,appellant_id:session.user.id,statement:explanation.trim()
   }));
   await refresh();status('Your appeal was submitted for independent review.');return;
 }
 if(action==='review-appeal-accept'||action==='review-appeal-deny'){
   const approval=action==='review-appeal-accept';
   const note=window.prompt(approval
     ?'Accept only a legitimate educational explanation without solicitation. Give the evidence:'
     :'Explain why this appeal is denied:');
   if(!note?.trim())return;
   if(note.trim().length<10||note.length>1200)
     throw new Error('A review explanation of 10–1200 characters is required');
   await call(client.rpc('review_moderation_appeal',{
     appeal_id:id,decision:approval?'accepted':'denied',rationale:note.trim()
   }));
   await refresh();status('Independent appeal decision recorded.');return;
 }
 if(action==='review-approve'||action==='review-reject'){
   const c=moderationCases.find(x=>x.id===id);
   if(!c||c.actor_id===session.user.id)throw new Error('Independent reviewer required');
   const approved=action==='review-approve';
   const rationale=window.prompt(approved
     ?'Only approve factual educational warnings or non-soliciting discussions. Explain why this is safe:'
     :'Why should this content remain hidden?');
   if(!rationale?.trim())return;
   if(rationale.length>1000)throw new Error('Review explanation is too long');
   await call(client.rpc('review_moderation_case',
     {case_id:id,decision:approved?'approved':'rejected',rationale:rationale.trim()}));
   await refresh();
   status(approved?'Educational content released after review.':'Content remains hidden. A review record was saved.');
   return;
 }
 if(action==='report-post'){const post=discussionFeed?.items.find(x=>x.id===id);if(!post)return;const reason=window.prompt('Report this discussion: spam, harassment, fraud, misinformation, other');if(!reason)return;const normalized=reason.toLowerCase().trim();if(!['spam','harassment','fraud','misinformation','other'].includes(normalized)){status('Choose one of the listed reasons.');return}await call(client.from('content_reports').insert({reporter_id:session.user.id,community_id:post.community_id,discussion_id:post.id,reason:normalized}));status('Report submitted for moderator review.');return}
}
async function submitted(form){
 const f=new FormData(form),type=form.getAttribute('data-form'),uid=session.user.id;
 if(type==='external-entry'){const g=groupById(selectedGroup);if(config.externalLedgerEnabled!==true||!g||g.visibility!=='private'||!own(g.id)||ledgerCircle!==g.id||f.get('ack')!=='on')throw Error('Authorized private recordkeeping required');const lines=[];for(let i=0;i<6;i++){const v=f.get('amount'+i);if(v!=='')lines.push({account:f.get('account'+i),side:f.get('side'+i),cents:CommonLedger.amount(v)});}CommonLedger.validate(lines);await call(client.from('circle_external_journal').insert({community_id:g.id,record_date:f.get('date'),source_ref:String(f.get('reference')).trim(),lines}));await loadLedger();render();return}
 if(type==='capital-plan'){const g=groupById(selectedGroup);if(!g||!joined(g.id))throw Error('Circle membership required.');const input=Object.fromEntries(f),result=CommonCapital.plan(input);capitalDrafts.set(g.id,{input,result});capitalTab='review';render();return}
 if(type==='capital-share'){const g=groupById(selectedGroup),draft=capitalDrafts.get(selectedGroup),title=String(f.get('title')||'').trim();if(!g||g.visibility!=='private'||!joined(g.id)||!draft||f.get('confirm')!=='on'||title.length<8||title.length>120)throw Error('Private circle membership, valid title and explicit confirmation required.');await call(client.from('proposals').insert({community_id:g.id,author_id:uid,title:'Scenario: '+title,rationale:CommonCapital.summary(draft.result)}));if(session?.user?.id===uid){state.groupTab='decisions';await refresh();status('Hypothetical research poll published. No funds or commitments were collected.');}return}
 if(type==='agent-command'){saveAgentDesk({...agentDesk,commands:[...agentDesk.commands,CommonAgentDesk.command(Object.fromEntries(f),agentDesk.commands)]});return}
 if(type==='agent-memory'){saveAgentDesk({...agentDesk,memory:[...agentDesk.memory,CommonAgentDesk.note(Object.fromEntries(f),agentDesk.memory)]});return}
 if(type==='research-agent'){if(config.researchAgentEnabled!==true||f.get('consent')!=='on')throw Error('Research assistant unavailable or consent missing.');agentInput=String(f.get('input')||'');agentMode=String(f.get('mode')||'review');const selected=f.getAll('memory'),requestInput=CommonAgentDesk.compose(agentInput,agentDesk.memory.filter(n=>selected.includes(n.id)));agentOutput=null;agentLastRequest=null;agentSending=true;render();try{const {data,error:failure}=await client.functions.invoke('common-research-agent',{body:{mode:agentMode,input:requestInput,consent:true}});if(failure)throw failure;if(session?.user?.id!==uid)return;if(typeof data?.text!=='string')throw Error('Invalid research response');agentOutput=data.text;agentLastRequest={mode:agentMode,input:requestInput,status:data.status};}finally{agentSending=false;render()}return}
 if(type==='research-draft'){
  const draft=researchReview,circle=f.get('circle'),title=String(f.get('title')||'').trim(),body=String(f.get('body')||'').trim();
  if(draft?.owner!==uid||CommonResearchDraft.forMember(uid)?.id!==draft.id||!joined(circle)||groupById(circle)?.visibility!=='private'){
   throw Error('An active research draft and current private circle membership are required.');
  }
  CommonResearchDraft.update(uid,draft.id,title,body);
  await call(client.rpc('publish_research_draft_v1',{draft_id:draft.id,circle_id:circle,discussion_title:title,discussion_body:body}));
  CommonResearchDraft.clear(draft.id);
  if(session?.user?.id!==uid)return;
  researchReview=null;selectedGroup=circle;decisionDetail=null;pollRows=[];pollOwn=null;capitalTab='overview';state.groupTab='posts';state.comments=null;view='groups';
  resetDiscussionFeed();status('Research submitted to your circle. Community moderation applies.');return;
 }
 if(type==='post'){
  const draft=composerDraft;
  if(draft?.owner!==uid)return;
  const group=f.get('group'),title=String(f.get('title')||'').trim(),body=String(f.get('body')||'').trim();
  if(!group||!joined(group)||title.length<8||title.length>160||body.length<3||body.length>10000){
   draft.publishError='Choose a current community and enter a title of 8–160 characters and a discussion of 3–10,000 characters.';
   render();return;
  }
  Object.assign(draft,{group,title,body,publishError:'',publishing:true});
  savePostDraft(draft);
  render();
  try{
   await call(client.from('discussions').insert({community_id:group,author_id:uid,title,body}));
  }catch{
   draft.publishing=false;
   if(session?.user?.id===uid&&composerDraft===draft){
    draft.publishError='The discussion could not be published. Check your connection or circle access and try again.';
    render();
   }
   return;
  }
  const cleared=clearPostDraft(draft);
  if(session?.user?.id!==uid||composerDraft!==draft)return;
  composerDraft=null;resetDiscussionFeed();
  info=cleared?'Discussion submitted. Community moderation applies.':'Discussion submitted. Device storage still contains a draft.';
  error='';closeMemberDialog();return;
 }
 if(type==='comment'){await call(client.from('discussions').insert({community_id:form.dataset.group,author_id:uid,parent_id:form.dataset.parent,body:short(f.get('body'),2000)}));if(discussionThread){discussionThread.cursors=[null];await readDiscussionPage(discussionThread,{thread:true,focus:true})}await readDiscussionPage(discussionFeed,{quiet:true});return}
 if(type==='group'){const name=String(f.get('name')).trim(),slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Math.random().toString(36).slice(2,10);const result=await call(client.from('communities').insert({name,slug,description:f.get('description'),visibility:f.get('visibility'),category:f.get('category'),created_by:uid}).select('id').single());selectedGroup=result.id;view='groups';state.groupCreate=false;await refresh();return}
 if(type==='proposal'){
  const circle=f.get('community');
  if(!joined(circle)||circle!==selectedGroup)throw Error('Current circle membership required.');
  await call(client.from('proposals').insert({community_id:circle,author_id:uid,title:f.get('title'),rationale:f.get('rationale')}));
  if(session?.user?.id!==uid)return;
  pollDraft=null;state.proposalCreate=false;state.groupTab='decisions';await refresh();
  status('Nonbinding research poll published. No transaction is authorized.');return;
 }
 if(type==='project'){await call(client.from('ownership_projects').insert({community_id:f.get('community'),author_id:uid,title:f.get('title'),thesis:f.get('thesis'),category:f.get('category')}));state.projectCreate=false;await refresh();return}
 if(type==='watch'){const symbol=String(f.get('symbol')).toUpperCase().trim();if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw new Error('Enter a valid stock symbol');await call(client.from('watchlist_items').upsert({user_id:uid,symbol}));await refresh();return}
 if(type==='chat'){await call(client.from('community_messages').insert({community_id:selectedGroup,author_id:uid,body:short(f.get('body'),2000)}));await loadMessages();render();return}
 if(type==='dm'){if(!selectedPeer)throw new Error('Choose a member');await call(client.from('direct_messages').insert({sender_id:uid,recipient_id:selectedPeer,body:short(f.get('body'),2000)}));await loadDM();render();return}
 if(type==='profile'){await call(client.from('profiles').update({display_name:String(f.get('name')).trim(),bio:String(f.get('bio')||'').trim().slice(0,600)}).eq('id',uid));await refresh();return}
 if(type==='privacy'){await call(client.from('profiles').update({allow_direct_messages:f.get('allow_dm')==='on'}).eq('id',uid));await refresh();return}
}
document.addEventListener('click',async ev=>{
 const agentTab=ev.target.closest('[data-agent-tab]');if(agentTab){agentDeskTab=agentTab.dataset.agentTab;render();return}const capital=ev.target.closest('[data-capital-tab]');if(capital){if(joined(selectedGroup)){capitalTab=capital.dataset.capitalTab;if(capitalTab==='ledger'){await loadLedger();}render()}return}const prof=ev.target.closest('[data-profile-section]');if(prof){profileSection=prof.dataset.profileSection;render();return}const nav=ev.target.closest('[data-tab]');if(nav){mobileMore=false;if(nav.dataset.tab==='studio'){location.assign(new URL('../lab/',location.href).href);return}view=nav.dataset.tab;selectedGroup=null;error=info='';render();return}
 const feed=ev.target.closest('[data-feed]');if(feed){state.feed=feed.dataset.feed;render();return}const dir=ev.target.closest('[data-directory]');if(dir){state.directory=dir.dataset.directory;render();return}const tab=ev.target.closest('[data-group-tab]');if(tab){state.groupTab=tab.dataset.groupTab;try{if(state.groupTab==='chat')await loadMessages();if(state.groupTab==='members'){memberPoll=[];await loadGroupMembers();}}catch(e){handleError(e);return}render();return}
 const btn=ev.target.closest('[data-act]');if(!btn)return;
 if(busy)return;
 if(['compose','create-group','new-project','new-proposal','poll-from-discussion'].includes(btn.dataset.act))modalTrigger=btn.dataset.act;
 busy=true;try{await dispatch(btn.dataset.act,btn)}catch(err){handleError(err)}finally{busy=false}
});
document.addEventListener('change',ev=>{const node=ev.target.closest('[data-agent-command]');if(node){const cmd=agentDesk.commands.find(x=>x.id===node.value);if(cmd){const form=node.closest('form');form.elements.mode.value=cmd.mode;form.elements.input.value=cmd.template;}}});
document.addEventListener('input',ev=>{
 const input=ev.target;
 const form=input.closest('[data-form="post"]');
 if(form&&composerDraft?.owner===session?.user?.id&&!composerDraft.publishing&&['group','title','body'].includes(input.name)){
  composerDraft[input.name]=input.value;
  savePostDraft(composerDraft);
  const statusNode=form.querySelector('[data-post-draft-status]');
  const message=composerDraft.saveError||'Draft saved on this device.';
  if(statusNode.textContent!==message)statusNode.textContent=message;
  return;
 }
 if(researchReview?.owner===session?.user?.id&&researchReview&&input.closest('[data-form="research-draft"]')&&['title','body','circle'].includes(input.name)){researchReview[input.name]=input.value;return}if(ev.target.id==='group-search'){search=ev.target.value;const active=document.activeElement;const start=active.selectionStart;render();const input=document.getElementById('group-search');input?.focus();if(start!==null)input?.setSelectionRange(start,start)}});
document.addEventListener('submit',async ev=>{
 const form=ev.target;if(form.id!=='auth-form'&&form.id!=='password-change-form'&&!form.dataset.form)return;ev.preventDefault();if(busy)return;busy=true;
 try{
 if(form.id==='password-change-form'){const password=String(new FormData(form).get('password')||'');const result=await client.auth.updateUser({password});if(result.error)throw result.error;recovering=false;await refresh();status('Your password was updated.');return;}
 if(form.id==='auth-form'){
 const f=new FormData(form),email=String(f.get('email')||'').trim(),password=String(f.get('password')||'');
 if(lastAuthView==='reset'){await call(client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+base}));status('Check your inbox for a recovery link.');return}
 if(lastAuthView==='signup'){const r=await client.auth.signUp({email,password,options:{data:{display_name:String(f.get('name')||'').trim()},emailRedirectTo:location.origin+base}});if(r.error)throw r.error;if(!r.data.session){status('Check your inbox for a confirmation email, then sign in.');return}session=r.data.session;}
 else{const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;session=r.data.session;}
 await refresh();if(pendingInvite)await acceptInvite(pendingInvite);return;
 }
 await submitted(form);
 }catch(err){handleError(err)}finally{busy=false}
});
window.addEventListener('hashchange',()=>{const m=location.hash.match(/^#invite=([a-f0-9]{48})$/);if(m){pendingInvite=m[1];if(session)acceptInvite(pendingInvite).catch(handleError);else{lastAuthView='signup';auth()}}});
init().catch(handleError);
})();
