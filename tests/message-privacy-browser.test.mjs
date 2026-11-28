import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const stub = `
(() => {
  const id='77000001-0000-4000-8000-000000000001', peer='77000001-0000-4000-8000-000000000002';
  const circle='77000002-0000-4000-8000-000000000001';
  const key='fixture.message-audience';
  let accepted=false, fail=false;
  const audience=()=>sessionStorage.getItem(key)||'off';
  const members=[
    {id,display_name:'Fixture Member',handle:'owner'},
    {id:peer,display_name:'Fixture Peer',handle:'peer',allow_direct_messages:true}
  ];
  window.messagePrivacyFixture={accept(){accepted=true;},failSave(){fail=true;}};
  function from(table){
    const owner={...members[0],allow_direct_messages:audience()!=='off'};
    const tables={
      profiles:[owner,members[1]],
      communities:[{id:circle,name:'Fixture Circle',visibility:'private'}],
      memberships:members.map(member=>({community_id:circle,user_id:member.id,role:'member'})),
      member_message_privacy:sessionStorage.getItem(key)?[{user_id:id,connections_only:audience()==='connections'}]:[]
    };
    let results=tables[table]||[], single=false;
    const query={
      select(){return query;},order(){return query;},limit(){return query;},
      single(){single=true;return query;},maybeSingle(){return query.single();},
      eq(name,value){results=results.filter(row=>row[name]===value);return query;},
      in(name,values){results=results.filter(row=>values.includes(row[name]));return query;},
      then(resolve,reject){return Promise.resolve({data:single?results[0]||null:results,error:null}).then(resolve,reject);}
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session:{user:{id}}}}),onAuthStateChange(){}},
    from,
    async rpc(name,args){
      if(name==='set_message_audience_v1'){
        if(fail){fail=false;return {data:null,error:{message:'Fixture connection failure'}};}
        sessionStorage.setItem(key,args.audience);
        return {data:args.audience,error:null};
      }
      if(name==='available_message_recipients_v1')return {data:accepted?[peer]:[],error:null};
      if(name==='discussion_feed_v1')return {data:{items:[],next:null},error:null};
      return {data:null,error:new Error('Unexpected RPC '+name)};
    }
  })};
})();
`;
const browser=await chromium.launch();
try {
  const desktop=process.env.COMMON_DESKTOP==='1';
  const page=await browser.newPage({viewport:desktop?{width:1440,height:960}:{width:390,height:844},isMobile:!desktop});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/supabase.min.js'))return route.fulfill({contentType:'text/javascript',body:stub});
    if(url.pathname==='/auth/v1/settings')return route.fulfill({json:{external:{}}});
    if(url.origin===new URL(base).origin)return route.continue();
    return route.abort();
  });
  await page.goto(new URL('settings/appearance/',base).href);
  const departments=page.getByRole('navigation',{name:'COMMON departments'});
  await departments.getByRole('link',{name:'Privacy',exact:true}).click();
  await page.waitForURL('**/live/?settings=privacy');
  assert.equal(await departments.getByRole('link',{name:'Privacy',exact:true}).getAttribute('aria-current'),'location');
  const audience=page.getByRole('combobox',{name:'Who can send you direct messages?'});
  await audience.waitFor();
  assert.equal(await audience.inputValue(),'off');
  await audience.selectOption('connections');
  await page.evaluate(()=>window.messagePrivacyFixture.failSave());
  const submit=page.getByRole('button',{name:'Save privacy preferences'});
  await submit.click();
  await page.getByRole('alert').getByText('Fixture connection failure').waitFor();
  assert.equal(await audience.inputValue(),'connections');
  await submit.click();
  await page.getByRole('status').getByText('Message audience saved to your account.').waitFor();
  await page.reload();
  await audience.waitFor();
  assert.equal(await audience.inputValue(),'connections');

  await page.locator('button[data-tab="chat"]:visible').first().click();
  await page.getByText('No shared-circle members are currently available to message.').waitFor();
  assert.equal(await departments.getByRole('link',{name:'Community',exact:true}).getAttribute('aria-current'),'location');
  assert.equal(await page.getByRole('button',{name:'Open chat'}).count(),0);
  await page.evaluate(()=>window.messagePrivacyFixture.accept());
  await page.locator('button[data-tab="chat"]:visible').first().click();
  await page.getByRole('button',{name:'Open chat'}).waitFor();
  await page.getByRole('link',{name:'Privacy settings',exact:true}).click();
  await audience.waitFor();
  assert.equal(await audience.inputValue(),'connections');
  await audience.selectOption('off');
  await submit.click();
  await page.getByRole('status').getByText('Message audience saved to your account.').waitFor();
  await page.reload();
  await audience.waitFor();
  assert.equal(await audience.inputValue(),'off');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS message privacy shell navigation, save retry, persistence, eligible chat directory, and '+(desktop?'desktop':'mobile')+' layout');
} finally { await browser.close(); }
