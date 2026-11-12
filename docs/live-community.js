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
 home:'⌂',groups:'◎',chat:'◉',ownership:'◇',invest:'↗',studio:'⌇',money:'\u0024',learn:'?',profile:'◍',add:'＋',safety:'⚑'
};
let client=null,session=null,profile=null,groups=[],memberships=[],posts=[],proposals=[],projects=[],watches=[],people={},likes=[],messages=[],dm=[],selectedGroup=null,selectedPeer=null,view='home',busy=false,search='',error='',info='',pendingInvite=null,memberPoll=[],pollSelection=null,lastAuthView='signin',pollTimer,recovering=false,moderationCases=[],moderationAppeals=[],accountRestrictions=[],googleProviderStatus='checking';
const state={comments:null,composer:false,groupCreate:false,projectCreate:false,proposalCreate:false,inviteToken:null,showMembers:false};
const base=location.pathname.replace(/\/live\/?(?:index.html)?$/,'/live/');
const groupById=id=>groups.find(x=>x.id===id);
const joined=id=>memberships.some(x=>x.community_id===id);
const own=id=>memberships.some(x=>x.community_id===id&&['owner','moderator'].includes(x.role));
const person=id=>people[id]?.display_name||'COMMON member';
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
const navs=[['home','Home'],['groups','Research Desks'],['chat','Messages'],['ownership','Ownership'],['invest','Research'],['studio','Studio'],['money','Money'],['learn','Learn'],['safety','Safety'],['profile','Profile']];
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
 const items=navs.map(([id,label])=>'<button class="nav-item '+(view===id?'active':'')+'" data-tab="'+id+'"><span style="font-size:20px;width:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('');
 return '<div class="app-shell"><aside class="navbar">'+logo()+'<div class="nav-links" style="margin-top:25px">'+items+'</div><div class="nav-spacer"></div><div class="nav-person"><button data-tab="profile"><span class="avatar">'+e((profile?.display_name||'?').slice(0,2).toUpperCase())+'</span><span class="details"><strong>'+e(profile?.display_name||'Member')+'</strong><span class="tiny muted">@'+e(profile?.handle||'member')+'</span></span></button></div></aside><div class="main-wrap"><header class="mobile-head">'+logo()+'<button class="icon-btn" data-tab="profile" aria-label="Profile">◍</button></header><header class="topbar"><h2>'+e(titleCase(view))+'</h2><div style="margin-left:auto"><span class="pill lime">LIVE COMMUNITY</span></div></header><main class="content">'+banner()+page()+'</main></div><nav class="mobile-nav">'+navs.slice(0,5).map(([id,label])=>'<button data-tab="'+id+'" class="'+(view===id?'active':'')+'"><span style="font-size:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('')+'</nav></div>';
}
function page(){if(view==='home')return home();if(view==='groups')return selectedGroup?groupDetail():communities();if(view==='chat')return chat();if(view==='ownership')return ownership();if(view==='invest')return research();if(view==='money')return money();if(view==='learn')return learn();if(view==='safety')return safety();return profilePage();}
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
function postCard(p){
 const mine=p.author_id===session.user.id,community=groupName(p.community_id);
 const postLikes=likes.filter(l=>l.discussion_id===p.id);
 const comments=posts.filter(x=>x.parent_id===p.id);
 return '<article class="surface post"><div class="post-head"><div class="avatar">'+e(person(p.author_id).slice(0,2).toUpperCase())+'</div><div class="post-meta"><strong>'+e(person(p.author_id))+'</strong><p>'+e(community)+' · '+new Date(p.created_at).toLocaleString()+'</p></div>'+safetyLabel('discussion',p.id)+((mine||own(p.community_id))?button('report-post','Report / moderation','ghost','data-id="'+p.id+'"'):'')+'</div>'+
 (p.title?'<h3 class="post-title">'+e(p.title)+'</h3>':'')+'<p class="post-body">'+e(p.body)+'</p>'+
 '<div class="post-actions"><button data-act="like" data-id="'+p.id+'" class="'+(postLikes.some(l=>l.user_id===session.user.id)?'liked':'')+'">♡ '+postLikes.length+'</button><button data-act="comments" data-id="'+p.id+'">◉ '+comments.length+' replies</button><button data-act="report-post" data-id="'+p.id+'">Report</button></div>'+
 (state.comments===p.id?'<div class="comment-list">'+comments.map(c=>'<div class="comment"><strong>'+e(person(c.author_id))+': </strong>'+e(c.body)+'</div>').join('')+'</div><form class="comment-form" data-form="comment" data-parent="'+p.id+'" data-group="'+p.community_id+'"><input class="field" name="body" maxlength="2000" required placeholder="Reply with something useful"><button type="submit" class="button small">Reply</button></form>':'')+'</article>';
}
function home(){
 const visible=posts.filter(x=>!x.parent_id).slice(0,70);
 return '<div class="columns"><div><div class="feature-hero"><span class="pill" style="background:#ffffff29;color:white;width:max-content">THE COMMONS</span><h2>Ideas become stronger together.</h2><p>Start conversations with real members and turn community research into meaningful, lawful action.</p>'+button('create-group','Create a community','primary')+'</div>'+
 '<div class="section-bar"><h3>Community feed</h3>'+button('compose','Share research')+'</div>'+
 (visible.length?visible.map(postCard).join(''):'<div class="empty"><h3>No discussions yet</h3><p>Join a community and start the first research conversation.</p>'+button('open-groups','Find a community')+'</div>')+
 '</div><aside class="rail"><div class="surface rail-box"><h3>Your communities</h3>'+memberships.map(m=>'<div class="rail-link" data-group="'+m.community_id+'"><span class="avatar">'+e(groupName(m.community_id).slice(0,1))+'</span><strong>'+e(groupName(m.community_id))+'</strong></div>').join('')+'</div><div class="surface rail-box education-prompt"><h3>Never invested before?</h3><p>Learn about stocks, ownership, funds and legal structures without the jargon.</p>'+button('learn','Explore lessons')+'</div></aside></div>';
}
function communities(){
 const results=groups.filter(g=>(g.name+' '+g.description+' '+researchCategoryLabel(g.category)).toLowerCase().includes(search.toLowerCase()));
 return head('Research desks','Join independent investors and analysts working from evidence, primary sources and defined coverage mandates.',button('create-group','＋ Create research desk','primary'))+
 '<label class="form-label" for="group-search">Explore coverage mandates</label><input id="group-search" class="field" style="max-width:520px" value="'+e(search)+'" placeholder="Search sector, strategy, mandate or issuer">'+
 '<div class="group-list">'+(results.length?results.map(g=>'<article class="surface group-card"><div class="space"><span class="group-symbol">'+e(g.name.slice(0,1))+'</span><span class="pill">'+e(researchCategoryLabel(g.category))+'</span></div><h3>'+e(g.name)+'</h3><p>'+e(g.description)+'</p><div class="bottom"><span class="small muted">'+e(g.visibility)+' · '+(joined(g.id)?'Member':'Explore')+'</span>'+button('open-group','Open','secondary','data-id="'+g.id+'"')+'</div></article>').join(''):'<p class="muted">No matching groups.</p>')+'</div>';
}
function groupDetail(){
 const g=groupById(selectedGroup);if(!g)return '<p>Group not found</p>';
 const joinedThis=joined(g.id);
 let page='';
 if(!joinedThis){page='<div class="surface" style="padding:25px"><h3>Join to participate</h3><p class="muted" style="margin:12px 0">Join this community to post, discuss, and participate in internal polls.</p>'+(g.visibility==='public'?button('join-group','Join community','primary','data-id="'+g.id+'"'):'<p class="small muted">This private community requires an invitation.</p>')+'</div>'}
 else{
 page='<div class="space" style="margin-bottom:14px"><h3>Community workspace</h3>'+button('compose','Start discussion','primary')+'</div>'+
 '<div class="feed-tabs">'+[['posts','Discussions'],['chat','Group chat'],['decisions','Decisions'],['members','Members'],['invites','Invitations']].map(([v,t])=>'<button class="feed-tab '+((state.groupTab||'posts')===v?'active':'')+'" data-group-tab="'+v+'">'+t+'</button>').join('')+'</div>'+
 groupBody(g);
 }
 return '<button class="link-btn" data-act="open-groups">‹ All communities</button><div class="group-hero"><span class="pill">'+e(g.category.toUpperCase())+'</span><h1>'+e(g.name)+'</h1><p>'+e(g.description)+'</p><div class="space" style="margin-top:20px"><span class="small">'+e(g.visibility)+' group</span>'+(joinedThis?'<span class="pill">You are a member</span>':'')+'</div></div><div style="margin-top:23px">'+page+'</div>';
}
function groupBody(g){
 if(state.groupTab==='chat')return '<div class="surface" style="padding:20px"><h3>Group messages</h3><p class="small muted" style="margin:8px 0 15px">Visible only to group members; refreshes automatically.</p><div id="chat-window" class="chat-messages" style="min-height:240px">'+messages.map(m=>'<div class="bubble '+(m.author_id===session.user.id?'mine':'')+'"><strong>'+e(person(m.author_id))+': </strong>'+e(m.body)+safetyLabel('community_message',m.id)+'</div>').join('')+'</div><form data-form="chat" class="chat-write"><input class="field" name="body" maxlength="2000" required placeholder="Message your group"><button class="button" type="submit">Send</button></form></div>';
 if(state.groupTab==='decisions')return '<div class="space" style="margin-bottom:10px"><h3>Nonbinding community polls</h3>'+button('new-proposal','Start poll','primary')+'</div>'+
 (proposals.filter(x=>x.community_id===g.id).map(p=>'<div class="surface" style="padding:21px;margin-bottom:10px"><span class="pill orange">MEMBER OPINION POLL — NOT A SHAREHOLDER PROXY VOTE</span><h3 style="margin:12px 0">'+e(p.title)+'</h3><p class="small muted">'+e(p.rationale)+'</p><div class="row" style="margin-top:16px;flex-wrap:wrap">'+['support','oppose','abstain'].map(k=>button('poll-vote',titleCase(k),'secondary','data-id="'+p.id+'" data-choice="'+k+'"')).join('')+'</div></div>').join('')||'<div class="empty">No community proposals yet.</div>');
 if(state.groupTab==='members')return '<div class="surface" style="padding:22px"><h3>Members</h3><p class="muted small">Verified accounts in this community.</p><div class="stack" style="margin-top:15px">'+memberPoll.map(m=>'<div class="space"><div>'+e(person(m.user_id))+' <span class="pill">'+e(m.role)+'</span></div>'+(m.user_id!==session.user.id?button('dm-user','Message','secondary','data-id="'+m.user_id+'"'):'')+'</div>').join('')+'</div></div>';
 if(state.groupTab==='invites')return '<div class="surface" style="padding:22px"><h3>Invite people</h3><p class="muted small" style="margin:10px 0 15px">Secure invitations expire and have limited uses. Community moderators control issuance.</p>'+(own(g.id)?button('make-invite','Create invitation link','primary'):'<p>Ask a moderator for an invitation.</p>')+(state.inviteToken?'<div class="preview-banner"><strong>Invite URL</strong><input class="field" id="invite-url" readonly value="'+e(location.origin+base+'#invite='+state.inviteToken)+'">'+button('copy-invite','Copy URL')+'</div>':'')+'</div>';
 return '<div class="space" style="margin:0 0 12px"><h3>Discussions</h3></div>'+
 (posts.filter(p=>p.community_id===g.id&&!p.parent_id).map(postCard).join('')||'<div class="empty">Be the first to share research here.</div>');
}
function chat(){
 const peers=Object.values(people).filter(x=>x.id!==session.user.id&&x.allow_direct_messages);
 return head('Messages','Private conversations are opt-in and limited to members sharing a group.')+
 '<div class="surface" style="padding:22px">'+(profile?.allow_direct_messages?'<p class="small muted">Direct messaging is enabled on your profile.</p>':'<p class="small muted">Direct messages are off by default. Enable them under Profile to receive messages from fellow group members.</p>')+
 '<div class="section-bar"><h3>Members accepting messages</h3></div><div class="stack">'+peers.map(p=>'<div class="space"><div>'+e(p.display_name)+' <span class="tiny muted">@'+e(p.handle)+'</span></div>'+button('dm-user','Open chat','secondary','data-id="'+p.id+'"')+'</div>').join('')+'</div>'+
 (selectedPeer?'<div class="section-bar"><h3>Conversation with '+e(person(selectedPeer))+'</h3></div><div class="chat-messages">'+dm.filter(m=>(m.sender_id===selectedPeer&&m.recipient_id===session.user.id)||(m.sender_id===session.user.id&&m.recipient_id===selectedPeer)).map(m=>'<div class="bubble '+(m.sender_id===session.user.id?'mine':'')+'">'+e(m.body)+safetyLabel('direct_message',m.id)+'</div>').join('')+'</div><form data-form="dm" class="chat-write"><input class="field" name="body" required maxlength="2000" placeholder="Write a private message"><button class="button">Send</button></form>':'')+'</div>';
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
 watches.map(w=>'<div class="account-row"><strong>'+e(w.symbol)+'</strong>'+button('remove-watch','Remove','secondary','data-symbol="'+e(w.symbol)+'"')+'</div>').join('')+
 '<p class="small muted" style="margin-top:16px">Use <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer" style="color:#275cfa;text-decoration:underline">SEC EDGAR</a> for dated official filings.</p></div>';
}
function money(){
 return head('Money','Future regulated wallet, card funding and trading tools.')+
 '<div class="money-card"><div class="space"><strong>COMMON Wallet</strong><span class="pill">NOT AVAILABLE</span></div><div><p>Available balance</p><div class="balance">—</div><p>No funds, deposits, or cards are accepted here.</p></div><div class="actions"><button disabled>Add funds</button><button disabled>Send money</button><button disabled>Withdraw</button></div></div>'+
 '<div class="preview-banner">Future wallet services will use licensed financial partners and separate onboarding. COMMON does not hold investment money or a group treasury today.</div>';
}
function learn(){return head('Understand ownership','Financial concepts explained in plain language.')+
 [['Can my friends buy the same stock?','Yes. Members can discuss and independently decide what to do through their own brokerages. Avoid agreements designed to artificially move prices.'],['What is a pooled investment club?','An actual pooled club needs a lawful structure and external financial accounts. A COMMON group is not automatically a legal fund.'],['Can our group buy housing?','An appropriately structured entity can research and potentially acquire properties using outside legal, banking and financing professionals. COMMON does not offer securities or collect investments.'],['Are community votes legally binding?','No. These opinion polls are not company shareholder votes or investment instructions.'],['What is AUM?','Assets under management is the value a manager oversees. Group size, hypothetical contributions and goal amounts do not count as real AUM.']].map(([q,a])=>'<details class="surface lesson"><summary>'+e(q)+'</summary><p>'+e(a)+'</p></details>').join('');}
function profilePage(){return head('Your account','Control your identity, communications and privacy.')+
 '<div class="surface" style="padding:24px"><h3>'+e(profile?.display_name)+'</h3><p class="muted small">@'+e(profile?.handle)+'</p><form data-form="profile" class="stack" style="margin-top:18px"><label><span class="form-label">Display name</span><input class="field" name="name" required maxlength="80" minlength="2" value="'+e(profile?.display_name)+'"></label><label class="row"><input type="checkbox" name="allow_dm" '+(profile?.allow_direct_messages?'checked':'')+'> Allow direct messages from members of my communities</label><button type="submit" class="button">Save account preferences</button></form><button class="button soft" style="margin-top:13px" data-act="signout">Sign out</button></div>';
}
function dialog(){
 if(!state.composer&&!state.groupCreate&&!state.projectCreate&&!state.proposalCreate)return '';
 let title='',fields='',form='';
 if(state.composer){title='Share research';form='post';fields='<label><span class="form-label">Community</span><select required class="field" name="group">'+memberships.map(m=>'<option value="'+m.community_id+'" '+(m.community_id===selectedGroup?'selected':'')+'>'+e(groupName(m.community_id))+'</option>').join('')+'</select></label><label><span class="form-label">Title</span><input required minlength="8" maxlength="160" class="field" name="title"></label><label><span class="form-label">Your research or question</span><textarea required minlength="3" maxlength="10000" class="field" name="body"></textarea></label>';}
 else if(state.groupCreate){title='Establish a research desk';form='group';fields='<label><span class="form-label">Research desk name</span><input class="field" name="name" required minlength="4" maxlength="100" placeholder="e.g. Industrials Fundamental Research"></label><label><span class="form-label">Mandate and methodology</span><textarea class="field" name="description" maxlength="2500" required placeholder="Define your research universe, analytical method, sources and intended deliverables."></textarea></label><label><span class="form-label">Coverage discipline</span><select class="field" name="category">'+researchDisciplines.map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label><label><span class="form-label">Membership visibility</span><select name="visibility" class="field"><option value="public">Public research desk</option><option value="private">Private, invitation only</option></select></label><div class="preview-banner">Research collaboration and shareholder education only. Do not use a desk to coordinate market manipulation, solicit unregistered securities, or pool money without an authorized structure.</div>';}
 else if(state.projectCreate){title='Research a project';form='project';fields='<label><span class="form-label">Linked community</span><select name="community" class="field">'+memberships.map(m=>'<option value="'+m.community_id+'">'+e(groupName(m.community_id))+'</option>').join('')+'</select></label><label><span class="form-label">Project title</span><input name="title" class="field" required minlength="8" maxlength="160"></label><label><span class="form-label">Rationale</span><textarea name="thesis" class="field" required minlength="30" maxlength="12000"></textarea></label><label><span class="form-label">Focus</span><select name="category" class="field"><option value="public_company">Public company</option><option value="housing">Housing</option><option value="local_business">Business</option><option value="community_land">Community land</option><option value="other">Other</option></select></label>';}
 else{title='Start a discussion poll';form='proposal';fields='<input type="hidden" name="community" value="'+e(selectedGroup)+'"><label><span class="form-label">Question</span><input class="field" name="title" required minlength="8" maxlength="160"></label><label><span class="form-label">What members should consider</span><textarea class="field" name="rationale" required minlength="30" maxlength="15000"></textarea></label>';}
 return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="space"><h2>'+title+'</h2><button class="icon-btn" data-act="close-dialog">✕</button></div><p class="muted small" style="margin:10px 0 16px">This is a live community contribution, not a request to collect investment money.</p><form data-form="'+form+'" class="stack">'+fields+'<button type="submit" class="button full">Publish</button></form></div></div>';
}
function recoveryPage(){
 root.innerHTML='<main class="auth-shell"><section class="auth-left">'+logo()+'<div class="auth-feature"><h1>Secure your<br><em>account.</em></h1><p>Choose a new password to regain access to your community.</p></div></section><section class="auth-right"><div class="auth-form-wrap"><h2>Reset your password</h2>'+banner()+'<form id="password-change-form" class="stack"><label><span class="form-label">New password</span><input class="field" name="password" required type="password" minlength="8" autocomplete="new-password"></label><button type="submit" class="button full">Save new password</button></form></div></section></main>';
}
function render(){if(!client){setup();return}if(recovering){recoveryPage();return}if(!session?.user){auth();return}root.innerHTML=baseNav()+dialog()}
async function init(){
 if(!config.supabaseUrl||!config.supabaseAnonKey||config.communityBackendReady!==true||!window.supabase?.createClient){setup();return}
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 checkGoogleProvider().catch(console.error);
 const r=await saved();if(r.error)throw r.error;session=r.data.session;
 client.auth.onAuthStateChange((evt,next)=>{session=next;if(evt==='PASSWORD_RECOVERY'){recovering=true;render();return}if(next&&!recovering){setTimeout(()=>refresh().catch(handleError),0)}else if(!next){profile=null;recovering=false;render()}});
 if(session)await refresh();else render();
 const fragment=location.hash.match(/^#invite=([a-f0-9]{48})$/);
 if(fragment)pendingInvite=fragment[1];
 if(!pendingInvite){try{const savedInvite=sessionStorage.getItem('common.pendingInvite');if(/^[a-f0-9]{48}$/.test(savedInvite||''))pendingInvite=savedInvite;}catch{}}
 if(pendingInvite&&session)await acceptInvite(pendingInvite);
 pollTimer=setInterval(()=>{if(session&&!busy)refresh(false).then(()=>{if(view==='groups'&&state.groupTab==='chat'&&!document.activeElement?.matches('input,textarea'))render()}).catch(console.error)},25000);
}
async function refresh(redraw=true){
 if(!session?.user)return;const uid=session.user.id;
 const [p,c,m,d,q,o,w,mod,appeals,restrictions]=await Promise.all([
 call(client.from('profiles').select('*').eq('id',uid).single()),
 call(client.from('communities').select('*').order('created_at',{ascending:false}).limit(200)),
 call(client.from('memberships').select('community_id,user_id,role').eq('user_id',uid)),
 call(client.from('discussions').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(200)),
 call(client.from('proposals').select('*').order('created_at',{ascending:false}).limit(80)),
 call(client.from('ownership_projects').select('*').order('created_at',{ascending:false}).limit(100)),
 call(client.from('watchlist_items').select('*').eq('user_id',uid)),
 call(client.from('moderation_cases').select('id,item_type,item_id,actor_id,community_id,review_status,matched_rules,content_preview,created_at,reviewed_by').order('created_at',{ascending:false}).limit(200)),
 call(client.from('moderation_appeals').select('id,case_id,appellant_id,statement,appeal_status,created_at').order('created_at',{ascending:false}).limit(100)),
 call(client.from('account_enforcement').select('restriction,reason,expires_at').eq('user_id',uid))
 ]);
 profile=p;groups=c;memberships=m;posts=d;proposals=q;projects=o;watches=w;moderationCases=mod;moderationAppeals=appeals;accountRestrictions=restrictions;
 const ids=[...new Set([uid,...posts.map(x=>x.author_id),...projects.map(x=>x.author_id)])];
 if(ids.length){const all=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));people=Object.fromEntries(all.map(x=>[x.id,x]));}
 const postIds=posts.map(x=>x.id);
 likes=postIds.length?await call(client.from('discussion_likes').select('discussion_id,user_id').in('discussion_id',postIds)):[];
 if(selectedGroup&&joined(selectedGroup)&&state.groupTab==='chat')await loadMessages();
 if(redraw)render();
}
async function loadMessages(){messages=await call(client.from('community_messages').select('*').eq('community_id',selectedGroup).is('deleted_at',null).order('created_at',{ascending:true}).limit(100));const ids=[...new Set(messages.map(x=>x.author_id).filter(id=>!people[id]))];if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));for(const x of p)people[x.id]=x;}}
async function loadGroupMembers(){memberPoll=await call(client.from('memberships').select('user_id,role').eq('community_id',selectedGroup).limit(150));const ids=memberPoll.map(x=>x.user_id).filter(id=>!people[id]);if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));for(const x of p)people[x.id]=x;}}
async function loadDM(){if(!selectedPeer)return;const uid=session.user.id;const incoming=await call(client.from('direct_messages').select('*').eq('sender_id',selectedPeer).eq('recipient_id',uid).order('created_at',{ascending:true}).limit(100));const outgoing=await call(client.from('direct_messages').select('*').eq('sender_id',uid).eq('recipient_id',selectedPeer).order('created_at',{ascending:true}).limit(100));dm=[...incoming,...outgoing].sort((a,b)=>a.created_at.localeCompare(b.created_at));}
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
 if(action==='auth-mode'){lastAuthView=element.dataset.mode;info=error='';render();return}
 if(action==='signout'){await client.auth.signOut();return}
 if(action==='open-groups'){selectedGroup=null;view='groups';state.groupTab='posts';render();return}
 if(action==='open-group'){selectedGroup=id;view='groups';state.groupTab='posts';render();return}
 if(action==='join-group'){await call(client.rpc('join_public_community',{cid:id}));await refresh();return}
 if(action==='create-group'){state.groupCreate=true;render();return}
 if(action==='compose'){state.composer=true;render();return}
 if(action==='close-dialog'){state.composer=state.groupCreate=state.projectCreate=state.proposalCreate=false;render();return}
 if(action==='open-terminal'){location.assign(new URL('../terminal/',location.href).href);return}
 if(action==='open-studio'){location.assign(new URL('../lab/',location.href).href);return}
 if(action==='learn'){view='learn';render();return}
 if(action==='comments'){state.comments=state.comments===id?null:id;render();return}
 if(action==='like'){const target=likes.find(x=>x.discussion_id===id&&x.user_id===session.user.id);if(target)await call(client.from('discussion_likes').delete().eq('discussion_id',id).eq('user_id',session.user.id));else await call(client.from('discussion_likes').insert({discussion_id:id,user_id:session.user.id}));await refresh();return}
 if(action==='new-proposal'){state.proposalCreate=true;render();return}
 if(action==='new-project'){state.projectCreate=true;render();return}
 if(action==='remove-watch'){await call(client.from('watchlist_items').delete().eq('symbol',element.dataset.symbol).eq('user_id',session.user.id));await refresh();return}
 if(action==='poll-vote'){await call(client.from('proposal_votes').upsert({proposal_id:id,user_id:session.user.id,choice},{onConflict:'proposal_id,user_id'}));status('Your nonbinding member opinion was recorded. This is not a corporate shareholder proxy vote.');return}
 if(action==='make-invite'){const token=await call(client.rpc('create_private_invite',{cid:selectedGroup,permitted_uses:10}));state.inviteToken=token;render();return}
 if(action==='copy-invite'){const input=document.getElementById('invite-url');if(input){await navigator.clipboard.writeText(input.value);status('Invitation link copied.')}return}
 if(action==='dm-user'){selectedPeer=id;view='chat';await loadDM();render();return}
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
 if(action==='report-post'){const post=posts.find(x=>x.id===id);if(!post)return;const reason=window.prompt('Report this discussion: spam, harassment, fraud, misinformation, other');if(!reason)return;const normalized=reason.toLowerCase().trim();if(!['spam','harassment','fraud','misinformation','other'].includes(normalized)){status('Choose one of the listed reasons.');return}await call(client.from('content_reports').insert({reporter_id:session.user.id,community_id:post.community_id,discussion_id:post.id,reason:normalized}));status('Report submitted for moderator review.');return}
}
async function submitted(form){
 const f=new FormData(form),type=form.dataset.form,uid=session.user.id;
 if(type==='post'){await call(client.from('discussions').insert({community_id:f.get('group'),author_id:uid,title:short(f.get('title'),160),body:short(f.get('body'),10000)}));state.composer=false;await refresh();return}
 if(type==='comment'){await call(client.from('discussions').insert({community_id:form.dataset.group,author_id:uid,parent_id:form.dataset.parent,body:short(f.get('body'),2000)}));await refresh();return}
 if(type==='group'){const name=String(f.get('name')).trim(),slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Math.random().toString(36).slice(2,10);const result=await call(client.from('communities').insert({name,slug,description:f.get('description'),visibility:f.get('visibility'),category:f.get('category'),created_by:uid}).select('id').single());selectedGroup=result.id;view='groups';state.groupCreate=false;await refresh();return}
 if(type==='proposal'){await call(client.from('proposals').insert({community_id:f.get('community'),author_id:uid,title:f.get('title'),rationale:f.get('rationale')}));state.proposalCreate=false;await refresh();return}
 if(type==='project'){await call(client.from('ownership_projects').insert({community_id:f.get('community'),author_id:uid,title:f.get('title'),thesis:f.get('thesis'),category:f.get('category')}));state.projectCreate=false;await refresh();return}
 if(type==='watch'){const symbol=String(f.get('symbol')).toUpperCase().trim();if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw new Error('Enter a valid stock symbol');await call(client.from('watchlist_items').upsert({user_id:uid,symbol}));await refresh();return}
 if(type==='chat'){await call(client.from('community_messages').insert({community_id:selectedGroup,author_id:uid,body:short(f.get('body'),2000)}));await loadMessages();render();return}
 if(type==='dm'){if(!selectedPeer)throw new Error('Choose a member');await call(client.from('direct_messages').insert({sender_id:uid,recipient_id:selectedPeer,body:short(f.get('body'),2000)}));await loadDM();render();return}
 if(type==='profile'){await call(client.from('profiles').update({display_name:String(f.get('name')).trim(),allow_direct_messages:f.get('allow_dm')==='on'}).eq('id',uid));await refresh();return}
}
document.addEventListener('click',async ev=>{
 const nav=ev.target.closest('[data-tab]');if(nav){if(nav.dataset.tab==='studio'){location.assign(new URL('../lab/',location.href).href);return}view=nav.dataset.tab;selectedGroup=null;error=info='';render();return}
 const tab=ev.target.closest('[data-group-tab]');if(tab){state.groupTab=tab.dataset.groupTab;try{if(state.groupTab==='chat')await loadMessages();if(state.groupTab==='members')await loadGroupMembers();}catch(e){handleError(e);return}render();return}
 const btn=ev.target.closest('[data-act]');if(!btn)return;
 if(busy)return;busy=true;try{await dispatch(btn.dataset.act,btn)}catch(err){handleError(err)}finally{busy=false}
});
document.addEventListener('input',ev=>{if(ev.target.id==='group-search'){search=ev.target.value;const active=document.activeElement;const start=active.selectionStart;render();const input=document.getElementById('group-search');input?.focus();if(start!==null)input?.setSelectionRange(start,start)}});
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
})();,learn:'?',profile:'◍',add:'＋',safety:'⚑'
};
let client=null,session=null,profile=null,groups=[],memberships=[],posts=[],proposals=[],projects=[],watches=[],people={},likes=[],messages=[],dm=[],selectedGroup=null,selectedPeer=null,view='home',busy=false,search='',error='',info='',pendingInvite=null,memberPoll=[],pollSelection=null,lastAuthView='signin',pollTimer,recovering=false,moderationCases=[],moderationAppeals=[],accountRestrictions=[],googleProviderStatus='checking';
const state={comments:null,composer:false,groupCreate:false,projectCreate:false,proposalCreate:false,inviteToken:null,showMembers:false};
const base=location.pathname.replace(/\/live\/?(?:index.html)?$/,'/live/');
const groupById=id=>groups.find(x=>x.id===id);
const joined=id=>memberships.some(x=>x.community_id===id);
const own=id=>memberships.some(x=>x.community_id===id&&['owner','moderator'].includes(x.role));
const person=id=>people[id]?.display_name||'COMMON member';
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
const navs=[['home','Home'],['groups','Research Desks'],['chat','Messages'],['ownership','Ownership'],['invest','Research'],['studio','Studio'],['money','Money'],['learn','Learn'],['safety','Safety'],['profile','Profile']];
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
 const items=navs.map(([id,label])=>'<button class="nav-item '+(view===id?'active':'')+'" data-tab="'+id+'"><span style="font-size:20px;width:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('');
 return '<div class="app-shell"><aside class="navbar">'+logo()+'<div class="nav-links" style="margin-top:25px">'+items+'</div><div class="nav-spacer"></div><div class="nav-person"><button data-tab="profile"><span class="avatar">'+e((profile?.display_name||'?').slice(0,2).toUpperCase())+'</span><span class="details"><strong>'+e(profile?.display_name||'Member')+'</strong><span class="tiny muted">@'+e(profile?.handle||'member')+'</span></span></button></div></aside><div class="main-wrap"><header class="mobile-head">'+logo()+'<button class="icon-btn" data-tab="profile" aria-label="Profile">◍</button></header><header class="topbar"><h2>'+e(titleCase(view))+'</h2><div style="margin-left:auto"><span class="pill lime">LIVE COMMUNITY</span></div></header><main class="content">'+banner()+page()+'</main></div><nav class="mobile-nav">'+navs.slice(0,5).map(([id,label])=>'<button data-tab="'+id+'" class="'+(view===id?'active':'')+'"><span style="font-size:21px">'+icons[id]+'</span><span>'+label+'</span></button>').join('')+'</nav></div>';
}
function page(){if(view==='home')return home();if(view==='groups')return selectedGroup?groupDetail():communities();if(view==='chat')return chat();if(view==='ownership')return ownership();if(view==='invest')return research();if(view==='money')return money();if(view==='learn')return learn();if(view==='safety')return safety();return profilePage();}
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
function postCard(p){
 const mine=p.author_id===session.user.id,community=groupName(p.community_id);
 const postLikes=likes.filter(l=>l.discussion_id===p.id);
 const comments=posts.filter(x=>x.parent_id===p.id);
 return '<article class="surface post"><div class="post-head"><div class="avatar">'+e(person(p.author_id).slice(0,2).toUpperCase())+'</div><div class="post-meta"><strong>'+e(person(p.author_id))+'</strong><p>'+e(community)+' · '+new Date(p.created_at).toLocaleString()+'</p></div>'+safetyLabel('discussion',p.id)+((mine||own(p.community_id))?button('report-post','Report / moderation','ghost','data-id="'+p.id+'"'):'')+'</div>'+
 (p.title?'<h3 class="post-title">'+e(p.title)+'</h3>':'')+'<p class="post-body">'+e(p.body)+'</p>'+
 '<div class="post-actions"><button data-act="like" data-id="'+p.id+'" class="'+(postLikes.some(l=>l.user_id===session.user.id)?'liked':'')+'">♡ '+postLikes.length+'</button><button data-act="comments" data-id="'+p.id+'">◉ '+comments.length+' replies</button><button data-act="report-post" data-id="'+p.id+'">Report</button></div>'+
 (state.comments===p.id?'<div class="comment-list">'+comments.map(c=>'<div class="comment"><strong>'+e(person(c.author_id))+': </strong>'+e(c.body)+'</div>').join('')+'</div><form class="comment-form" data-form="comment" data-parent="'+p.id+'" data-group="'+p.community_id+'"><input class="field" name="body" maxlength="2000" required placeholder="Reply with something useful"><button type="submit" class="button small">Reply</button></form>':'')+'</article>';
}
function home(){
 const visible=posts.filter(x=>!x.parent_id).slice(0,70);
 return '<div class="columns"><div><div class="feature-hero"><span class="pill" style="background:#ffffff29;color:white;width:max-content">THE COMMONS</span><h2>Ideas become stronger together.</h2><p>Start conversations with real members and turn community research into meaningful, lawful action.</p>'+button('create-group','Create a community','primary')+'</div>'+
 '<div class="section-bar"><h3>Community feed</h3>'+button('compose','Share research')+'</div>'+
 (visible.length?visible.map(postCard).join(''):'<div class="empty"><h3>No discussions yet</h3><p>Join a community and start the first research conversation.</p>'+button('open-groups','Find a community')+'</div>')+
 '</div><aside class="rail"><div class="surface rail-box"><h3>Your communities</h3>'+memberships.map(m=>'<div class="rail-link" data-group="'+m.community_id+'"><span class="avatar">'+e(groupName(m.community_id).slice(0,1))+'</span><strong>'+e(groupName(m.community_id))+'</strong></div>').join('')+'</div><div class="surface rail-box education-prompt"><h3>Never invested before?</h3><p>Learn about stocks, ownership, funds and legal structures without the jargon.</p>'+button('learn','Explore lessons')+'</div></aside></div>';
}
function communities(){
 const results=groups.filter(g=>(g.name+' '+g.description+' '+researchCategoryLabel(g.category)).toLowerCase().includes(search.toLowerCase()));
 return head('Research desks','Join independent investors and analysts working from evidence, primary sources and defined coverage mandates.',button('create-group','＋ Create research desk','primary'))+
 '<label class="form-label" for="group-search">Explore coverage mandates</label><input id="group-search" class="field" style="max-width:520px" value="'+e(search)+'" placeholder="Search sector, strategy, mandate or issuer">'+
 '<div class="group-list">'+(results.length?results.map(g=>'<article class="surface group-card"><div class="space"><span class="group-symbol">'+e(g.name.slice(0,1))+'</span><span class="pill">'+e(researchCategoryLabel(g.category))+'</span></div><h3>'+e(g.name)+'</h3><p>'+e(g.description)+'</p><div class="bottom"><span class="small muted">'+e(g.visibility)+' · '+(joined(g.id)?'Member':'Explore')+'</span>'+button('open-group','Open','secondary','data-id="'+g.id+'"')+'</div></article>').join(''):'<p class="muted">No matching groups.</p>')+'</div>';
}
function groupDetail(){
 const g=groupById(selectedGroup);if(!g)return '<p>Group not found</p>';
 const joinedThis=joined(g.id);
 let page='';
 if(!joinedThis){page='<div class="surface" style="padding:25px"><h3>Join to participate</h3><p class="muted" style="margin:12px 0">Join this community to post, discuss, and participate in internal polls.</p>'+(g.visibility==='public'?button('join-group','Join community','primary','data-id="'+g.id+'"'):'<p class="small muted">This private community requires an invitation.</p>')+'</div>'}
 else{
 page='<div class="space" style="margin-bottom:14px"><h3>Community workspace</h3>'+button('compose','Start discussion','primary')+'</div>'+
 '<div class="feed-tabs">'+[['posts','Discussions'],['chat','Group chat'],['decisions','Decisions'],['members','Members'],['invites','Invitations']].map(([v,t])=>'<button class="feed-tab '+((state.groupTab||'posts')===v?'active':'')+'" data-group-tab="'+v+'">'+t+'</button>').join('')+'</div>'+
 groupBody(g);
 }
 return '<button class="link-btn" data-act="open-groups">‹ All communities</button><div class="group-hero"><span class="pill">'+e(g.category.toUpperCase())+'</span><h1>'+e(g.name)+'</h1><p>'+e(g.description)+'</p><div class="space" style="margin-top:20px"><span class="small">'+e(g.visibility)+' group</span>'+(joinedThis?'<span class="pill">You are a member</span>':'')+'</div></div><div style="margin-top:23px">'+page+'</div>';
}
function groupBody(g){
 if(state.groupTab==='chat')return '<div class="surface" style="padding:20px"><h3>Group messages</h3><p class="small muted" style="margin:8px 0 15px">Visible only to group members; refreshes automatically.</p><div id="chat-window" class="chat-messages" style="min-height:240px">'+messages.map(m=>'<div class="bubble '+(m.author_id===session.user.id?'mine':'')+'"><strong>'+e(person(m.author_id))+': </strong>'+e(m.body)+safetyLabel('community_message',m.id)+'</div>').join('')+'</div><form data-form="chat" class="chat-write"><input class="field" name="body" maxlength="2000" required placeholder="Message your group"><button class="button" type="submit">Send</button></form></div>';
 if(state.groupTab==='decisions')return '<div class="space" style="margin-bottom:10px"><h3>Nonbinding community polls</h3>'+button('new-proposal','Start poll','primary')+'</div>'+
 (proposals.filter(x=>x.community_id===g.id).map(p=>'<div class="surface" style="padding:21px;margin-bottom:10px"><span class="pill orange">MEMBER OPINION POLL — NOT A SHAREHOLDER PROXY VOTE</span><h3 style="margin:12px 0">'+e(p.title)+'</h3><p class="small muted">'+e(p.rationale)+'</p><div class="row" style="margin-top:16px;flex-wrap:wrap">'+['support','oppose','abstain'].map(k=>button('poll-vote',titleCase(k),'secondary','data-id="'+p.id+'" data-choice="'+k+'"')).join('')+'</div></div>').join('')||'<div class="empty">No community proposals yet.</div>');
 if(state.groupTab==='members')return '<div class="surface" style="padding:22px"><h3>Members</h3><p class="muted small">Verified accounts in this community.</p><div class="stack" style="margin-top:15px">'+memberPoll.map(m=>'<div class="space"><div>'+e(person(m.user_id))+' <span class="pill">'+e(m.role)+'</span></div>'+(m.user_id!==session.user.id?button('dm-user','Message','secondary','data-id="'+m.user_id+'"'):'')+'</div>').join('')+'</div></div>';
 if(state.groupTab==='invites')return '<div class="surface" style="padding:22px"><h3>Invite people</h3><p class="muted small" style="margin:10px 0 15px">Secure invitations expire and have limited uses. Community moderators control issuance.</p>'+(own(g.id)?button('make-invite','Create invitation link','primary'):'<p>Ask a moderator for an invitation.</p>')+(state.inviteToken?'<div class="preview-banner"><strong>Invite URL</strong><input class="field" id="invite-url" readonly value="'+e(location.origin+base+'#invite='+state.inviteToken)+'">'+button('copy-invite','Copy URL')+'</div>':'')+'</div>';
 return '<div class="space" style="margin:0 0 12px"><h3>Discussions</h3></div>'+
 (posts.filter(p=>p.community_id===g.id&&!p.parent_id).map(postCard).join('')||'<div class="empty">Be the first to share research here.</div>');
}
function chat(){
 const peers=Object.values(people).filter(x=>x.id!==session.user.id&&x.allow_direct_messages);
 return head('Messages','Private conversations are opt-in and limited to members sharing a group.')+
 '<div class="surface" style="padding:22px">'+(profile?.allow_direct_messages?'<p class="small muted">Direct messaging is enabled on your profile.</p>':'<p class="small muted">Direct messages are off by default. Enable them under Profile to receive messages from fellow group members.</p>')+
 '<div class="section-bar"><h3>Members accepting messages</h3></div><div class="stack">'+peers.map(p=>'<div class="space"><div>'+e(p.display_name)+' <span class="tiny muted">@'+e(p.handle)+'</span></div>'+button('dm-user','Open chat','secondary','data-id="'+p.id+'"')+'</div>').join('')+'</div>'+
 (selectedPeer?'<div class="section-bar"><h3>Conversation with '+e(person(selectedPeer))+'</h3></div><div class="chat-messages">'+dm.filter(m=>(m.sender_id===selectedPeer&&m.recipient_id===session.user.id)||(m.sender_id===session.user.id&&m.recipient_id===selectedPeer)).map(m=>'<div class="bubble '+(m.sender_id===session.user.id?'mine':'')+'">'+e(m.body)+safetyLabel('direct_message',m.id)+'</div>').join('')+'</div><form data-form="dm" class="chat-write"><input class="field" name="body" required maxlength="2000" placeholder="Write a private message"><button class="button">Send</button></form>':'')+'</div>';
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
 watches.map(w=>'<div class="account-row"><strong>'+e(w.symbol)+'</strong>'+button('remove-watch','Remove','secondary','data-symbol="'+e(w.symbol)+'"')+'</div>').join('')+
 '<p class="small muted" style="margin-top:16px">Use <a href="https://www.sec.gov/edgar/search/" target="_blank" rel="noopener noreferrer" style="color:#275cfa;text-decoration:underline">SEC EDGAR</a> for dated official filings.</p></div>';
}
function money(){
 return head('Money','Future regulated wallet, card funding and trading tools.')+
 '<div class="money-card"><div class="space"><strong>COMMON Wallet</strong><span class="pill">NOT AVAILABLE</span></div><div><p>Available balance</p><div class="balance">—</div><p>No funds, deposits, or cards are accepted here.</p></div><div class="actions"><button disabled>Add funds</button><button disabled>Send money</button><button disabled>Withdraw</button></div></div>'+
 '<div class="preview-banner">Future wallet services will use licensed financial partners and separate onboarding. COMMON does not hold investment money or a group treasury today.</div>';
}
function learn(){return head('Understand ownership','Financial concepts explained in plain language.')+
 [['Can my friends buy the same stock?','Yes. Members can discuss and independently decide what to do through their own brokerages. Avoid agreements designed to artificially move prices.'],['What is a pooled investment club?','An actual pooled club needs a lawful structure and external financial accounts. A COMMON group is not automatically a legal fund.'],['Can our group buy housing?','An appropriately structured entity can research and potentially acquire properties using outside legal, banking and financing professionals. COMMON does not offer securities or collect investments.'],['Are community votes legally binding?','No. These opinion polls are not company shareholder votes or investment instructions.'],['What is AUM?','Assets under management is the value a manager oversees. Group size, hypothetical contributions and goal amounts do not count as real AUM.']].map(([q,a])=>'<details class="surface lesson"><summary>'+e(q)+'</summary><p>'+e(a)+'</p></details>').join('');}
function profilePage(){return head('Your account','Control your identity, communications and privacy.')+
 '<div class="surface" style="padding:24px"><h3>'+e(profile?.display_name)+'</h3><p class="muted small">@'+e(profile?.handle)+'</p><form data-form="profile" class="stack" style="margin-top:18px"><label><span class="form-label">Display name</span><input class="field" name="name" required maxlength="80" minlength="2" value="'+e(profile?.display_name)+'"></label><label class="row"><input type="checkbox" name="allow_dm" '+(profile?.allow_direct_messages?'checked':'')+'> Allow direct messages from members of my communities</label><button type="submit" class="button">Save account preferences</button></form><button class="button soft" style="margin-top:13px" data-act="signout">Sign out</button></div>';
}
function dialog(){
 if(!state.composer&&!state.groupCreate&&!state.projectCreate&&!state.proposalCreate)return '';
 let title='',fields='',form='';
 if(state.composer){title='Share research';form='post';fields='<label><span class="form-label">Community</span><select required class="field" name="group">'+memberships.map(m=>'<option value="'+m.community_id+'" '+(m.community_id===selectedGroup?'selected':'')+'>'+e(groupName(m.community_id))+'</option>').join('')+'</select></label><label><span class="form-label">Title</span><input required minlength="8" maxlength="160" class="field" name="title"></label><label><span class="form-label">Your research or question</span><textarea required minlength="3" maxlength="10000" class="field" name="body"></textarea></label>';}
 else if(state.groupCreate){title='Establish a research desk';form='group';fields='<label><span class="form-label">Research desk name</span><input class="field" name="name" required minlength="4" maxlength="100" placeholder="e.g. Industrials Fundamental Research"></label><label><span class="form-label">Mandate and methodology</span><textarea class="field" name="description" maxlength="2500" required placeholder="Define your research universe, analytical method, sources and intended deliverables."></textarea></label><label><span class="form-label">Coverage discipline</span><select class="field" name="category">'+researchDisciplines.map(([key,label])=>'<option value="'+key+'">'+e(label)+'</option>').join('')+'</select></label><label><span class="form-label">Membership visibility</span><select name="visibility" class="field"><option value="public">Public research desk</option><option value="private">Private, invitation only</option></select></label><div class="preview-banner">Research collaboration and shareholder education only. Do not use a desk to coordinate market manipulation, solicit unregistered securities, or pool money without an authorized structure.</div>';}
 else if(state.projectCreate){title='Research a project';form='project';fields='<label><span class="form-label">Linked community</span><select name="community" class="field">'+memberships.map(m=>'<option value="'+m.community_id+'">'+e(groupName(m.community_id))+'</option>').join('')+'</select></label><label><span class="form-label">Project title</span><input name="title" class="field" required minlength="8" maxlength="160"></label><label><span class="form-label">Rationale</span><textarea name="thesis" class="field" required minlength="30" maxlength="12000"></textarea></label><label><span class="form-label">Focus</span><select name="category" class="field"><option value="public_company">Public company</option><option value="housing">Housing</option><option value="local_business">Business</option><option value="community_land">Community land</option><option value="other">Other</option></select></label>';}
 else{title='Start a discussion poll';form='proposal';fields='<input type="hidden" name="community" value="'+e(selectedGroup)+'"><label><span class="form-label">Question</span><input class="field" name="title" required minlength="8" maxlength="160"></label><label><span class="form-label">What members should consider</span><textarea class="field" name="rationale" required minlength="30" maxlength="15000"></textarea></label>';}
 return '<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><div class="space"><h2>'+title+'</h2><button class="icon-btn" data-act="close-dialog">✕</button></div><p class="muted small" style="margin:10px 0 16px">This is a live community contribution, not a request to collect investment money.</p><form data-form="'+form+'" class="stack">'+fields+'<button type="submit" class="button full">Publish</button></form></div></div>';
}
function recoveryPage(){
 root.innerHTML='<main class="auth-shell"><section class="auth-left">'+logo()+'<div class="auth-feature"><h1>Secure your<br><em>account.</em></h1><p>Choose a new password to regain access to your community.</p></div></section><section class="auth-right"><div class="auth-form-wrap"><h2>Reset your password</h2>'+banner()+'<form id="password-change-form" class="stack"><label><span class="form-label">New password</span><input class="field" name="password" required type="password" minlength="8" autocomplete="new-password"></label><button type="submit" class="button full">Save new password</button></form></div></section></main>';
}
function render(){if(!client){setup();return}if(recovering){recoveryPage();return}if(!session?.user){auth();return}root.innerHTML=baseNav()+dialog()}
async function init(){
 if(!config.supabaseUrl||!config.supabaseAnonKey||config.communityBackendReady!==true||!window.supabase?.createClient){setup();return}
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 checkGoogleProvider().catch(console.error);
 const r=await saved();if(r.error)throw r.error;session=r.data.session;
 client.auth.onAuthStateChange((evt,next)=>{session=next;if(evt==='PASSWORD_RECOVERY'){recovering=true;render();return}if(next&&!recovering){setTimeout(()=>refresh().catch(handleError),0)}else if(!next){profile=null;recovering=false;render()}});
 if(session)await refresh();else render();
 const fragment=location.hash.match(/^#invite=([a-f0-9]{48})$/);
 if(fragment)pendingInvite=fragment[1];
 if(!pendingInvite){try{const savedInvite=sessionStorage.getItem('common.pendingInvite');if(/^[a-f0-9]{48}$/.test(savedInvite||''))pendingInvite=savedInvite;}catch{}}
 if(pendingInvite&&session)await acceptInvite(pendingInvite);
 pollTimer=setInterval(()=>{if(session&&!busy)refresh(false).then(()=>{if(view==='groups'&&state.groupTab==='chat'&&!document.activeElement?.matches('input,textarea'))render()}).catch(console.error)},25000);
}
async function refresh(redraw=true){
 if(!session?.user)return;const uid=session.user.id;
 const [p,c,m,d,q,o,w,mod,appeals,restrictions]=await Promise.all([
 call(client.from('profiles').select('*').eq('id',uid).single()),
 call(client.from('communities').select('*').order('created_at',{ascending:false}).limit(200)),
 call(client.from('memberships').select('community_id,user_id,role').eq('user_id',uid)),
 call(client.from('discussions').select('*').is('deleted_at',null).order('created_at',{ascending:false}).limit(200)),
 call(client.from('proposals').select('*').order('created_at',{ascending:false}).limit(80)),
 call(client.from('ownership_projects').select('*').order('created_at',{ascending:false}).limit(100)),
 call(client.from('watchlist_items').select('*').eq('user_id',uid)),
 call(client.from('moderation_cases').select('id,item_type,item_id,actor_id,community_id,review_status,matched_rules,content_preview,created_at,reviewed_by').order('created_at',{ascending:false}).limit(200)),
 call(client.from('moderation_appeals').select('id,case_id,appellant_id,statement,appeal_status,created_at').order('created_at',{ascending:false}).limit(100)),
 call(client.from('account_enforcement').select('restriction,reason,expires_at').eq('user_id',uid))
 ]);
 profile=p;groups=c;memberships=m;posts=d;proposals=q;projects=o;watches=w;moderationCases=mod;moderationAppeals=appeals;accountRestrictions=restrictions;
 const ids=[...new Set([uid,...posts.map(x=>x.author_id),...projects.map(x=>x.author_id)])];
 if(ids.length){const all=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));people=Object.fromEntries(all.map(x=>[x.id,x]));}
 const postIds=posts.map(x=>x.id);
 likes=postIds.length?await call(client.from('discussion_likes').select('discussion_id,user_id').in('discussion_id',postIds)):[];
 if(selectedGroup&&joined(selectedGroup)&&state.groupTab==='chat')await loadMessages();
 if(redraw)render();
}
async function loadMessages(){messages=await call(client.from('community_messages').select('*').eq('community_id',selectedGroup).is('deleted_at',null).order('created_at',{ascending:true}).limit(100));const ids=[...new Set(messages.map(x=>x.author_id).filter(id=>!people[id]))];if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));for(const x of p)people[x.id]=x;}}
async function loadGroupMembers(){memberPoll=await call(client.from('memberships').select('user_id,role').eq('community_id',selectedGroup).limit(150));const ids=memberPoll.map(x=>x.user_id).filter(id=>!people[id]);if(ids.length){const p=await call(client.from('profiles').select('id,display_name,handle,allow_direct_messages').in('id',ids));for(const x of p)people[x.id]=x;}}
async function loadDM(){if(!selectedPeer)return;const uid=session.user.id;const incoming=await call(client.from('direct_messages').select('*').eq('sender_id',selectedPeer).eq('recipient_id',uid).order('created_at',{ascending:true}).limit(100));const outgoing=await call(client.from('direct_messages').select('*').eq('sender_id',uid).eq('recipient_id',selectedPeer).order('created_at',{ascending:true}).limit(100));dm=[...incoming,...outgoing].sort((a,b)=>a.created_at.localeCompare(b.created_at));}
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
 if(action==='auth-mode'){lastAuthView=element.dataset.mode;info=error='';render();return}
 if(action==='signout'){await client.auth.signOut();return}
 if(action==='open-groups'){selectedGroup=null;view='groups';state.groupTab='posts';render();return}
 if(action==='open-group'){selectedGroup=id;view='groups';state.groupTab='posts';render();return}
 if(action==='join-group'){await call(client.rpc('join_public_community',{cid:id}));await refresh();return}
 if(action==='create-group'){state.groupCreate=true;render();return}
 if(action==='compose'){state.composer=true;render();return}
 if(action==='close-dialog'){state.composer=state.groupCreate=state.projectCreate=state.proposalCreate=false;render();return}
 if(action==='open-terminal'){location.assign(new URL('../terminal/',location.href).href);return}
 if(action==='open-studio'){location.assign(new URL('../lab/',location.href).href);return}
 if(action==='learn'){view='learn';render();return}
 if(action==='comments'){state.comments=state.comments===id?null:id;render();return}
 if(action==='like'){const target=likes.find(x=>x.discussion_id===id&&x.user_id===session.user.id);if(target)await call(client.from('discussion_likes').delete().eq('discussion_id',id).eq('user_id',session.user.id));else await call(client.from('discussion_likes').insert({discussion_id:id,user_id:session.user.id}));await refresh();return}
 if(action==='new-proposal'){state.proposalCreate=true;render();return}
 if(action==='new-project'){state.projectCreate=true;render();return}
 if(action==='remove-watch'){await call(client.from('watchlist_items').delete().eq('symbol',element.dataset.symbol).eq('user_id',session.user.id));await refresh();return}
 if(action==='poll-vote'){await call(client.from('proposal_votes').upsert({proposal_id:id,user_id:session.user.id,choice},{onConflict:'proposal_id,user_id'}));status('Your nonbinding member opinion was recorded. This is not a corporate shareholder proxy vote.');return}
 if(action==='make-invite'){const token=await call(client.rpc('create_private_invite',{cid:selectedGroup,permitted_uses:10}));state.inviteToken=token;render();return}
 if(action==='copy-invite'){const input=document.getElementById('invite-url');if(input){await navigator.clipboard.writeText(input.value);status('Invitation link copied.')}return}
 if(action==='dm-user'){selectedPeer=id;view='chat';await loadDM();render();return}
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
 if(action==='report-post'){const post=posts.find(x=>x.id===id);if(!post)return;const reason=window.prompt('Report this discussion: spam, harassment, fraud, misinformation, other');if(!reason)return;const normalized=reason.toLowerCase().trim();if(!['spam','harassment','fraud','misinformation','other'].includes(normalized)){status('Choose one of the listed reasons.');return}await call(client.from('content_reports').insert({reporter_id:session.user.id,community_id:post.community_id,discussion_id:post.id,reason:normalized}));status('Report submitted for moderator review.');return}
}
async function submitted(form){
 const f=new FormData(form),type=form.dataset.form,uid=session.user.id;
 if(type==='post'){await call(client.from('discussions').insert({community_id:f.get('group'),author_id:uid,title:short(f.get('title'),160),body:short(f.get('body'),10000)}));state.composer=false;await refresh();return}
 if(type==='comment'){await call(client.from('discussions').insert({community_id:form.dataset.group,author_id:uid,parent_id:form.dataset.parent,body:short(f.get('body'),2000)}));await refresh();return}
 if(type==='group'){const name=String(f.get('name')).trim(),slug=name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)+'-'+Math.random().toString(36).slice(2,10);const result=await call(client.from('communities').insert({name,slug,description:f.get('description'),visibility:f.get('visibility'),category:f.get('category'),created_by:uid}).select('id').single());selectedGroup=result.id;view='groups';state.groupCreate=false;await refresh();return}
 if(type==='proposal'){await call(client.from('proposals').insert({community_id:f.get('community'),author_id:uid,title:f.get('title'),rationale:f.get('rationale')}));state.proposalCreate=false;await refresh();return}
 if(type==='project'){await call(client.from('ownership_projects').insert({community_id:f.get('community'),author_id:uid,title:f.get('title'),thesis:f.get('thesis'),category:f.get('category')}));state.projectCreate=false;await refresh();return}
 if(type==='watch'){const symbol=String(f.get('symbol')).toUpperCase().trim();if(!/^[A-Z][A-Z0-9.-]{0,11}$/.test(symbol))throw new Error('Enter a valid stock symbol');await call(client.from('watchlist_items').upsert({user_id:uid,symbol}));await refresh();return}
 if(type==='chat'){await call(client.from('community_messages').insert({community_id:selectedGroup,author_id:uid,body:short(f.get('body'),2000)}));await loadMessages();render();return}
 if(type==='dm'){if(!selectedPeer)throw new Error('Choose a member');await call(client.from('direct_messages').insert({sender_id:uid,recipient_id:selectedPeer,body:short(f.get('body'),2000)}));await loadDM();render();return}
 if(type==='profile'){await call(client.from('profiles').update({display_name:String(f.get('name')).trim(),allow_direct_messages:f.get('allow_dm')==='on'}).eq('id',uid));await refresh();return}
}
document.addEventListener('click',async ev=>{
 const nav=ev.target.closest('[data-tab]');if(nav){if(nav.dataset.tab==='studio'){location.assign(new URL('../lab/',location.href).href);return}view=nav.dataset.tab;selectedGroup=null;error=info='';render();return}
 const tab=ev.target.closest('[data-group-tab]');if(tab){state.groupTab=tab.dataset.groupTab;try{if(state.groupTab==='chat')await loadMessages();if(state.groupTab==='members')await loadGroupMembers();}catch(e){handleError(e);return}render();return}
 const btn=ev.target.closest('[data-act]');if(!btn)return;
 if(busy)return;busy=true;try{await dispatch(btn.dataset.act,btn)}catch(err){handleError(err)}finally{busy=false}
});
document.addEventListener('input',ev=>{if(ev.target.id==='group-search'){search=ev.target.value;const active=document.activeElement;const start=active.selectionStart;render();const input=document.getElementById('group-search');input?.focus();if(start!==null)input?.setSelectionRange(start,start)}});
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