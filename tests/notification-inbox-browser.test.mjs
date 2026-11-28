import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const stub = `(() => {
  const recipient={id:'85300002-0000-4000-8000-000000000002',display_name:'Notice Bob',handle:'notice_bob',allow_direct_messages:true};
  const actor={id:'85300001-0000-4000-8000-000000000001',display_name:'Notice Alice',handle:'notice_alice',allow_direct_messages:true};
  const circle={id:'85301000-0000-4000-8000-000000000001',name:'Fixture Circle',visibility:'private',category:'markets'};
  const timestamp='2024-07-01T12:00:00.123456Z';
  const makeNotice=(id,kind)=>({id,kind,actor_id:actor.id,actor_name:actor.display_name,recipient_id:recipient.id,
    created_at:timestamp,is_read:false,is_archived:false});
  let user=recipient, authChanged;
  const notices=[makeNotice('two','direct_message'),makeNotice('one','connection_request')];
  const tables={profiles:[recipient,actor],communities:[circle],
    memberships:[recipient,actor].map(profile=>({community_id:circle.id,user_id:profile.id,role:'member'})),
    direct_messages:[{id:'fixture-message',sender_id:actor.id,recipient_id:recipient.id,created_at:timestamp,
      body:'Only visible inside the conversation'}]};
  const accountNotices=()=>notices.filter(row=>row.recipient_id===user.id);
  const fixture=window.noticeFixture={rpc:[],switchAccount(){user=actor;authChanged('SIGNED_IN',{user:{id:actor.id}})}};
  function from(table){
    const conditions=[];
    let mutation=null, single=false;
    const query={
      select(){return query},order(){return query},limit(){return query},
      eq(key,value){conditions.push(row=>row[key]===value);return query},
      in(key,values){conditions.push(row=>values.includes(row[key]));return query},
      single(){single=true;return query},maybeSingle(){single=true;return query},
      update(values){mutation=values;return query},
      then(resolve,reject){
        let source=tables[table]||[];
        if(table==='member_notifications')source=accountNotices();
        if(table==='member_notification_preferences'){
          const saved=localStorage.getItem('test.notification-preference.'+user.id);
          source=saved?[{member_id:user.id,...JSON.parse(saved)}]:[];
        }
        const rows=source.filter(row=>conditions.every(condition=>condition(row)));
        if(mutation)for(const row of rows)Object.assign(row,mutation);
        return Promise.resolve({data:single?(rows[0]||null):rows,error:null}).then(resolve,reject);
      }
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session:{user:{id:user.id}}}}),
      onAuthStateChange(listener){authChanged=listener}},
    from,
    async rpc(name,args){
      if(name==='discussion_feed_v1')return {data:{items:[],next:null}};
      if(name==='member_connection_state_v1')return {data:'incoming'};
      if(name==='dm_block_exists')return {data:false};
      fixture.rpc.push({name,args});
      if(name==='set_member_notification_preferences_v1'){
        localStorage.setItem('test.notification-preference.'+user.id,
          JSON.stringify({direct_messages:args.show_messages,connections:args.show_connections}));
        return {data:null};
      }
      if(name!=='member_notification_page_v1')return {error:{message:'Unexpected RPC '+name}};
      if(fixture.fail)return {error:{message:'Fixture offline'}};
      const rows=accountNotices();
      const unread=rows.filter(row=>!row.is_archived&&!row.is_read).length;
      const filtered=rows.filter(row=>row.is_archived===(args.inbox_scope==='archived')&&
        (args.inbox_scope!=='unread'||!row.is_read));
      const start=args.before_id?filtered.findIndex(row=>row.id===args.before_id)+1:0;
      const items=filtered.slice(start,start+1);
      const next=filtered.length>start+1?{before_id:items[0].id,before_time:items[0].created_at}:null;
      return {data:{items,next,unread}};
    }
  })};
})();`;

const browser=await chromium.launch();
try {
  for(const width of [390,1440]){
    const page=await browser.newPage({viewport:{width,height:850},isMobile:width<500});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith('/supabase.min.js'))return route.fulfill({contentType:'text/javascript',body:stub});
      if(url.pathname==='/auth/v1/settings')return route.fulfill({json:{external:{}}});
      if(url.origin===new URL(base).origin)return route.continue();
      return route.abort();
    });
    const inboxURL=new URL('live/#notifications',base).href;
    await page.goto(inboxURL);
    await page.getByRole('heading',{name:'Notifications',exact:true}).last().waitFor();
    const message=page.getByText('sent you a message',{exact:false});
    await message.waitFor();
    assert.equal(await page.getByText('Only visible inside the conversation').count(),0);
    await page.getByRole('button',{name:'Unread (2)'}).waitFor();
    await page.getByRole('button',{name:'Older notifications'}).click();
    await page.getByText('requested a connection',{exact:false}).waitFor();
    assert.equal(await page.evaluate(()=>noticeFixture.rpc.at(-1).args.before_time),'2024-07-01T12:00:00.123456Z');
    await page.getByRole('button',{name:'Newer notifications'}).click();
    await message.waitFor();
    await page.getByRole('button',{name:'Mark read'}).click();
    await page.getByRole('button',{name:'Unread (1)'}).waitFor();
    await page.getByRole('button',{name:'Archive',exact:true}).click();
    await message.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Archived',exact:true}).click();
    await message.waitFor();
    await page.getByRole('button',{name:'Restore',exact:true}).click();
    await page.getByText('You have no archived notifications.').waitFor();

    await page.getByRole('button',{name:'Preferences',exact:true}).click();
    const preference=page.getByRole('checkbox',{name:'Direct messages',exact:true});
    assert.equal(await preference.isChecked(),true);
    await preference.uncheck();
    await page.getByRole('button',{name:'Save preferences'}).click();
    await page.getByText('Notification preferences saved.').waitFor();
    await page.reload();
    await page.getByRole('button',{name:'Preferences',exact:true}).click();
    assert.equal(await preference.isChecked(),false);
    await page.getByRole('button',{name:'Inbox',exact:true}).click();
    await page.getByRole('button',{name:'Open conversation'}).click();
    await page.getByRole('heading',{name:'Conversation with Notice Alice'}).waitFor();
    await page.getByText('Only visible inside the conversation').waitFor();

    if(width<500){
      await page.getByRole('button',{name:'More navigation'}).click();
      await page.getByRole('navigation',{name:'More sections'}).getByRole('button',{name:'Notifications',exact:true}).click();
    }else await page.locator('.navbar').getByRole('button',{name:'Notifications',exact:true}).click();
    await message.waitFor();
    await page.getByRole('button',{name:'Older notifications'}).click();
    await page.getByRole('button',{name:'View member'}).click();
    await page.getByRole('heading',{name:'Notice Alice',exact:true}).waitFor();
    await page.getByRole('button',{name:'Accept request'}).waitFor();
    await page.evaluate(()=>{location.hash='#notifications'});
    await message.waitFor();
    await page.evaluate(()=>{noticeFixture.fail=true});
    await page.getByRole('button',{name:'Refresh notifications'}).click();
    await page.getByText('Notifications could not be loaded.').waitFor();
    await page.evaluate(()=>{noticeFixture.fail=false});
    await page.getByRole('button',{name:'Try again'}).click();
    await message.waitFor();
    await page.evaluate(()=>noticeFixture.switchAccount());
    await page.getByText('You have no notifications.').waitFor();
    assert.equal(await message.count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log('PASS notification inbox at '+width+' px, paging, unread, archive, preferences, deep links, retry and account isolation');
  }
} finally {
  await browser.close();
}
