import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const stub = `
(() => {
  const uid = '71000002-0000-4000-8000-000000000002';
  const circle = {id:'72000000-0000-4000-8000-000000000002',name:'Fixture Circle',
    description:'Synthetic test fixture',visibility:'private',category:'markets'};
  const date = '2024-06-01T00:00:00.123456+00:00';
  const makePost = (id,title) => ({
    id:'73000000-0000-4000-8000-'+id.padStart(12,'0'), title, body:'Fixture post body',
    author_id:uid, author_name:'Fixture Member', community_id:circle.id,
    community_name:circle.name, created_at:date, liked:false, likes_count:0, replies_count:1
  });
  const recent = makePost('2','Recent fixture post');
  const older = makePost('1','Older fixture post');
  const cursor = {before_time:date,before_id:recent.id};
  const empty = {items:[],next:null};
  const profile = {id:uid,display_name:'Fixture Member',handle:'fixture_member',allow_direct_messages:false};
  const clientCalls = window.feedFixture = {tables:[],pages:[],fail:false,revoked:false};
  const tables = {profiles:[profile],communities:[circle],
    memberships:[{community_id:circle.id,user_id:uid,role:'member'}]};
  let authChanged;
  function from(table){
    clientCalls.tables.push(table);
    let filters=[], single=false;
    const query = {
      select(){return query},order(){return query},limit(){return query},
      single(){single=true;return query},
      eq(key,value){filters.push([key,[value]]);return query},
      in(key,values){filters.push([key,values]);return query},
      then(resolve,reject){
        const rows=(tables[table]||[]).filter(row=>filters.every(([key,values])=>values.includes(row[key])));
        return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve,reject);
      }
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session:{user:{id:uid}}}}),
      onAuthStateChange(listener){authChanged=listener},
      signOut:async()=>{authChanged('SIGNED_OUT',null)}},
    from,
    async rpc(name,args){
      if(name!=='discussion_feed_v1')return {data:null,error:new Error('Unexpected RPC')};
      clientCalls.pages.push(args);
      if(clientCalls.fail)return {data:null,error:new Error('Fixture network failure')};
      let data=empty;
      if(!clientCalls.revoked){
        if(args.feed_scope==='mine'||args.feed_scope==='circle')
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
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
  assert.deepEqual(errors,[]);
  console.log('PASS mobile discussion pagination, timestamp precision, older bookmarks, replies, retry and scope isolation');
} finally {
  await browser.close();
}
