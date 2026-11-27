import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const stub = `
(() => {
  const uid = '71000002-0000-4000-8000-000000000002';
  const author = {id:'71000000-0000-4000-8000-000000000001',display_name:'Research Author',
    handle:'research_author',allow_direct_messages:false};
  const circle = {id:'72000000-0000-4000-8000-000000000002',name:'Fixture Circle',
    description:'Synthetic test fixture',visibility:'private',category:'markets'};
  const date = '2024-06-01T00:00:00.123456+00:00';
  const makePost = (id,title) => ({
    id:'73000000-0000-4000-8000-'+id.padStart(12,'0'), title, body:'Fixture post body',
    author_id:author.id, author_name:author.display_name, community_id:circle.id,
    community_name:circle.name, created_at:date, liked:false, likes_count:0, replies_count:1
  });
  const recent = makePost('2','Recent fixture post');
  const older = makePost('1','Older fixture post');
  const cursor = {before_time:date,before_id:recent.id};
  const empty = {items:[],next:null};
  const profile = {id:uid,display_name:'Fixture Member',handle:'fixture_member',allow_direct_messages:false};
  const clientCalls = window.feedFixture = {tables:[],pages:[],fail:false,revoked:false,blocked:false};
  const readRelationships = () => JSON.parse(sessionStorage.getItem('fixture.follows')||'[]');
  const writeRelationships = rows => sessionStorage.setItem('fixture.follows',JSON.stringify(rows));
  const tables = {profiles:[profile,author],communities:[circle],
    memberships:[{community_id:circle.id,user_id:uid,role:'member'}]};
  const connectionKey='fixture.connection';
  let current=uid, authChanged;
  clientCalls.switchAccount = () => {
    current=current===uid?author.id:uid;
    authChanged('SIGNED_IN',{user:{id:current}});
  };
  function connectionState(peer){
    const edge=JSON.parse(sessionStorage.getItem(connectionKey)||'null');
    if(clientCalls.blocked)return 'blocked';
    if(!edge||!([edge.sender,edge.receiver].includes(current)&&[edge.sender,edge.receiver].includes(peer)))return 'available';
    return edge.accepted?'accepted':edge.sender===current?'outgoing':'incoming';
  }
  function from(table){
    clientCalls.tables.push(table);
    let filters=[], single=false, operation='read', projection='';
    const query = {
      select(columns){projection=columns;return query},order(){return query},limit(){return query},
      upsert(edge){operation='insert';writeRelationships([edge]);return query},
      delete(){operation='delete';return query},
      single(){single=true;return query},
      eq(key,value){filters.push([key,[value]]);return query},
      in(key,values){filters.push([key,values]);return query},
      then(resolve,reject){
        const matches = row => filters.every(([key,values])=>values.includes(row[key]));
        const source = table==='member_follows' ? readRelationships() : (tables[table]||[]);
        if(operation==='delete')writeRelationships(source.filter(row=>!matches(row)));
        let rows = source.filter(matches);
        if(table==='member_follows'&&projection.includes('member:'))rows=rows.map(row=>({...row,member:author}));
        return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve,reject);
      }
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session:{user:{id:current}}}}),
      onAuthStateChange(listener){authChanged=listener},
      signOut:async()=>{authChanged('SIGNED_OUT',null)}},
    from,
    async rpc(name,args){
      if(name==='dm_block_exists')return {data:clientCalls.blocked,error:null};
      if(name==='request_member_connection_v1'){
        sessionStorage.setItem(connectionKey,JSON.stringify({sender:current,receiver:args.peer_id}));
        return {data:null,error:null};
      }
      if(name==='member_connection_state_v1')return {data:connectionState(args.peer_id),error:null};
      if(name==='member_connection_page_v1'){
        const peer=current===uid?author:profile;
        return {data:connectionState(peer.id)===args.connection_scope?[peer]:[],error:null};
      }
      if(name==='respond_member_connection_v1'){
        if(args.decision==='accept'){
          const edge=JSON.parse(sessionStorage.getItem(connectionKey));
          sessionStorage.setItem(connectionKey,JSON.stringify({...edge,accepted:true}));
        }else sessionStorage.removeItem(connectionKey);
        return {data:true,error:null};
      }
      if(name!=='discussion_feed_v1')return {data:null,error:new Error('Unexpected RPC')};
      clientCalls.pages.push(args);
      if(clientCalls.fail)return {data:null,error:new Error('Fixture network failure')};
      let data=empty;
      if(!clientCalls.revoked){
        if(['mine','circle','member','discover'].includes(args.feed_scope)||
            args.feed_scope==='following'&&readRelationships().length&&!clientCalls.blocked)
          data=args.before_id?{items:[older],next:null}:{items:[recent],next:cursor};
        if(args.feed_scope==='saved')
          data={items:[recent,older].filter(item=>args.saved_ids.includes(item.id)),next:null};
        if(args.feed_scope==='replies')
          data={items:[{...recent,body:'Thread reply fixture'}],next:null};
      }
      return {data,error:null};
    }
  })};
})();
`;

const browser = await chromium.launch();
try {
  const desktop = process.env.COMMON_DESKTOP === '1';
  const page = await browser.newPage({ viewport: desktop ? { width: 1440, height: 960 } : { width: 390, height: 844 }, isMobile: !desktop });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/supabase.min.js')) {
      return route.fulfill({contentType:'text/javascript',body:stub});
    }
    if (url.pathname === '/auth/v1/settings') return route.fulfill({json:{external:{}}});
    if (url.origin === new URL(base).origin) return route.continue();
    return route.abort();
  });
  await page.goto(new URL('live/',base).href);
  const recent = page.getByRole('heading',{name:'Recent fixture post'});
  const older = page.getByRole('heading',{name:'Older fixture post'});
  await recent.waitFor();
  const olderButton = page.getByRole('button',{name:'Older discussions'});
  await olderButton.click();
  await older.waitFor();
  assert.equal(await recent.count(),0);
  assert.equal(await page.evaluate(()=>feedFixture.pages.at(-1).before_time),'2024-06-01T00:00:00.123456+00:00');

  // Bookmark an older post and verify that Saved requests the exact ID.
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Saved research'}).click();
  await older.waitFor();
  assert.deepEqual(await page.evaluate(()=>feedFixture.pages.at(-1).saved_ids),
    ['73000000-0000-4000-8000-000000000001']);

  await page.getByRole('button',{name:'My circles'}).click();
  await recent.waitFor();
  await page.getByRole('button',{name:/1 replies/}).click();
  await page.getByText('Thread reply fixture',{exact:false}).waitFor();

  // Force one read failure and verify that retry does not reuse old page content.
  await page.evaluate(()=>{feedFixture.fail=true});
  await page.getByRole('button',{name:'Refresh discussions'}).click();
  await page.getByText('Discussions could not be loaded.').waitFor();
  assert.equal(await recent.count(),0);
  await page.evaluate(()=>{feedFixture.fail=false});
  await page.getByRole('button',{name:'Try again'}).first().click();
  await recent.waitFor();

  // Simulate a scoped refresh after revocation. Database tests verify the actual policy.
  const bootQueries = await page.evaluate(()=>feedFixture.tables.length);
  await page.evaluate(()=>{feedFixture.revoked=true});
  await page.getByRole('button',{name:'Refresh discussions'}).click();
  await page.getByRole('heading',{name:'No discussions yet'}).waitFor();
  assert.equal(await recent.count(),0);
  assert.equal(await page.evaluate(()=>feedFixture.tables.length),bootQueries);
  assert.ok(await page.evaluate(()=>!feedFixture.tables.includes('discussions')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.evaluate(()=>{feedFixture.revoked=false});
  await page.getByRole('button',{name:'Following',exact:true}).click();
  await page.getByRole('heading',{name:'No research from members you follow'}).waitFor();
  await page.getByRole('button',{name:'Discover research'}).click();
  await recent.waitFor();
  await page.getByRole('button',{name:'Research Author',exact:true}).click();
  await page.getByRole('button',{name:'Request connection',exact:true}).click();
  await page.getByRole('button',{name:'Withdraw request',exact:true}).waitFor();
  await page.getByRole('button',{name:'Follow',exact:true}).click();
  await page.getByRole('button',{name:'Unfollow',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Unfollow');

  // The fixture represents account storage outside the application. Reload
  // clears application state and the member list and feed must query it again.
  await page.reload();
  await recent.waitFor();
  await page.getByRole('button',{name:'Following',exact:true}).click();
  await recent.waitFor();
  const openProfile = async () => {
    if(desktop)await page.locator('.navbar .nav-links [data-tab="profile"]').click();
    else{
      await page.getByRole('button',{name:'More navigation'}).click();
      await page.getByRole('navigation',{name:'More sections'}).getByRole('button',{name:'Profile',exact:true}).click();
    }
  };
  await openProfile();
  await page.getByRole('button',{name:'Connections',exact:true}).click();
  await page.getByText('No received requests.').waitFor();
  await page.getByRole('button',{name:'Sent',exact:true}).click();
  await page.getByRole('button',{name:'Withdraw request',exact:true}).waitFor();
  await page.getByRole('button',{name:'Followers',exact:true}).click();
  await page.getByText('You have no visible followers.').waitFor();
  await page.getByRole('button',{name:'Following',exact:true}).click();
  await page.getByRole('button',{name:'Research Author',exact:true}).click();
  await page.getByRole('button',{name:'Unfollow',exact:true}).click();
  await page.getByRole('button',{name:'Follow',exact:true}).waitFor();
  if(desktop)await page.getByRole('button',{name:'Home',exact:true}).click();
  else await page.locator('.mobile-nav [data-tab=home]').click();
  await page.getByRole('heading',{name:'No research from members you follow'}).waitFor();
  await page.evaluate(()=>feedFixture.switchAccount());
  // The recipient must reload from their own account after the session changes.
  await recent.waitFor();
  await openProfile();
  await page.getByRole('button',{name:'Connections',exact:true}).click();
  await page.getByRole('button',{name:'Accept request',exact:true}).click();
  await page.getByText('No received requests.').waitFor();
  await page.getByRole('button',{name:'Accepted',exact:true}).click();
  await page.getByRole('button',{name:'Fixture Member',exact:true}).waitFor();
  await page.evaluate(()=>feedFixture.switchAccount());
  await recent.waitFor();
  await openProfile();
  await page.getByRole('button',{name:'Connections',exact:true}).click();
  await page.getByRole('button',{name:'Accepted',exact:true}).click();
  await page.getByRole('button',{name:'Research Author',exact:true}).waitFor();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button',{name:'Remove connection',exact:true}).click();
  await page.getByText('No accepted connections.').waitFor();
  await page.evaluate(()=>{
    sessionStorage.setItem('fixture.connection',JSON.stringify({
      sender:'71000000-0000-4000-8000-000000000001',receiver:'71000002-0000-4000-8000-000000000002'
    }));
  });
  await page.getByRole('button',{name:'Received',exact:true}).click();
  await page.getByRole('button',{name:'Decline request',exact:true}).click();
  await page.getByText('No received requests.').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS '+(desktop?'desktop':'mobile')+' discussion pagination, timestamp precision, older bookmarks, replies, retry, scope isolation, following, member lists and consent-based connection requests');
} finally {
  await browser.close();
}
