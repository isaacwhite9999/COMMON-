import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const uid = '84000002-0000-4000-8000-000000000002';
const circle = '84100000-0000-4000-8000-000000000001';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.route('**/config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: 'window.COMMON_CONFIG={communityBackendReady:true,supabaseUrl:"https://fixture.invalid",supabaseAnonKey:"fixture",researchAgentEnabled:true,externalLedgerEnabled:false};'
  }));
  await page.route('https://fixture.invalid/**', route => route.fulfill({json:{external:{}}}));
  await page.route('**/supabase.min.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `(() => {
      const uid=${JSON.stringify(uid)}, circle=${JSON.stringify(circle)};
      const profile={id:uid,display_name:'Researcher Fixture',handle:'researcher'};
      const groups=[{id:circle,name:'Private Review Circle',visibility:'private',category:'markets',description:'Fixture circle'},
        {id:'84100000-0000-4000-8000-000000000002',name:'Public Circle',visibility:'public',category:'markets'}];
      const tables={profiles:[profile],communities:groups,proposals:[],community_messages:[],watchlist_items:[{user_id:uid,symbol:'SPY'}],memberships:groups.map(group=>({community_id:group.id,user_id:uid,role:'member'}))};
      let session=sessionStorage.getItem('fixture-session')?{user:{id:uid}}:null, posted=null;
      window.journey={calls:[],reject:true};
      const api={
        functions:{invoke(){throw Error('The draft must never invoke a model automatically')}},
        auth:{getSession:async()=>({data:{session}}),onAuthStateChange(){},
          signInWithPassword:async()=>{sessionStorage.setItem('fixture-session','1');return {data:{session:session={user:{id:uid}}}}}},
        from(table){
          const predicates=[];let single=false;
          const query={insert(value){
            if(!['proposals','community_messages'].includes(table))throw Error('Unexpected write to '+table);
            tables[table].push({...value,id:'84300000-0000-4000-8000-000000000001',status:'open',deleted_at:null});
            return Promise.resolve({data:null});
          },select(){return query},eq(key,value){predicates.push(row=>row[key]===value);return query},
            is(key,value){predicates.push(row=>row[key]===value);return query},in(key,values){predicates.push(row=>values.includes(row[key]));return query},
            order(){return query},limit(){return query},single(){single=true;return query},
            then(resolve,reject){const rows=(tables[table]||[]).filter(row=>predicates.every(predicate=>predicate(row)));
              return Promise.resolve({data:single?rows[0]:rows}).then(resolve,reject)}};
          return query;
        },
        async rpc(name,args){
          if(name==='discussion_feed_v1')return {data:{items:posted&&args.scope_id===circle?[posted]:[],next:null}};
          if(name!=='publish_research_draft_v1')throw Error('Unexpected RPC '+name);
          window.journey.calls.push(args);
          if(window.journey.reject)return {error:{message:'Current private circle membership required'}};
          posted={id:args.draft_id,title:args.discussion_title,body:args.discussion_body,author_id:uid,
            author_name:profile.display_name,community_id:circle,community_name:groups[0].name,
            created_at:'2024-01-01T00:00:00Z',liked:false,likes_count:0,replies_count:0};
          return {data:posted.id};
        }
      };
      window.supabase={createClient:()=>api};
    })();`
  }));

  await page.goto(new URL('workspace/#research',base).href);
  await page.getByLabel('Project name').fill('Private backtest');
  await page.getByRole('button',{name:'Create project'}).click();
  await page.getByRole('link',{name:'Backtest',exact:true}).click();
  const rows = Array.from({length:180},(_,i)=>new Date(Date.UTC(2023,0,i+1)).toISOString().slice(0,10)+','+(100+i/5));
  await page.locator('input[type=file]').setInputFiles({
    name:'unshared-private-source.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Close\n'+rows.join('\n'))
  });
  await page.getByRole('button',{name:'Run backtest'}).click();
  await page.getByRole('button',{name:'Inspect',exact:true}).click();
  await page.getByRole('button',{name:'Prepare to share'}).click();
  const summary = await page.getByLabel('Research summary').inputValue();
  assert.match(summary,/Source fingerprint \(SHA-256\): [a-f0-9]{64}/);
  assert.doesNotMatch(summary,/unshared-private-source|Date,Close/);
  await page.getByRole('button',{name:'Continue to Community'}).click();
  await page.getByRole('heading',{name:'Welcome back'}).waitFor();
  assert.equal(await page.evaluate(()=>journey.calls.length),0);
  await page.locator('#auth-form [name=email]').fill('fixture@example.test');
  await page.locator('#auth-form [name=password]').fill('fixture-password');
  await page.locator('#auth-form button[type=submit]').click();
  await page.getByRole('button',{name:'Review research draft'}).click();
  assert.equal(await page.getByRole('option',{name:'Public Circle'}).count(),0);
  assert.equal(await page.evaluate(()=>CommonResearchDraft.forMember('84000003-0000-4000-8000-000000000003')),null);
  await page.getByRole('button',{name:'Open in research assistant'}).click();
  assert.equal(await page.locator('[data-form="research-agent"] [name=input]').inputValue(),summary);
  assert.equal(await page.locator('[data-form="research-agent"] [name=consent]').isChecked(),false);
  await page.getByRole('button',{name:'Review research draft'}).click();
  await page.getByLabel('Private circle').selectOption(circle);
  await page.getByLabel('Discussion title').fill('Reviewed backtest');
  await page.getByRole('button',{name:'Publish to circle'}).click();
  await page.getByText('Current private circle membership required').waitFor();
  assert.equal(await page.getByLabel('Discussion title').inputValue(),'Reviewed backtest');
  await page.evaluate(()=>{journey.reject=false});
  await page.getByRole('button',{name:'Publish to circle'}).click();
  await page.getByRole('heading',{name:'Reviewed backtest'}).waitFor();
  const calls=await page.evaluate(()=>journey.calls);
  assert.deepEqual(calls[0],calls[1]);
  assert.equal(calls[1].circle_id,circle);
  assert.equal(calls[1].discussion_body,summary);
  assert.equal(await page.evaluate(()=>CommonResearchDraft.forMember('84000002-0000-4000-8000-000000000002')),null);
  await page.setViewportSize({width:820,height:900});
  const openPoll = page.getByRole('button',{name:'Draft circle poll'});
  await openPoll.click();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await openPoll.evaluate(node=>node===document.activeElement),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('button',{name:'Draft circle poll'}).click();
  const poll = page.getByRole('dialog');
  assert.equal(await poll.getByLabel('Question').inputValue(),'Review: Reviewed backtest');
  assert.match(await poll.getByLabel('What members should consider').inputValue(),new RegExp(calls[1].draft_id));
  await poll.getByRole('button',{name:'Publish',exact:true}).click();
  await page.getByRole('heading',{name:'Review: Reviewed backtest'}).waitFor();
  await page.getByText('Nonbinding research poll published. No transaction is authorized.').waitFor();
  await page.getByRole('button',{name:'Group chat'}).click();
  await page.getByPlaceholder('Message your group').fill('Please review the historical sample assumptions.');
  await page.getByRole('button',{name:'Send',exact:true}).click();
  await page.getByText('Please review the historical sample assumptions.').waitFor();
  await page.getByRole('button',{name:'Capital & treasury'}).click();
  await page.getByRole('button',{name:'External journal'}).click();
  await page.getByRole('heading',{name:'External journal not activated'}).waitFor();
  await page.locator('.navbar').getByRole('button',{name:'Research',exact:true}).click();
  await page.getByRole('link',{name:'Research SPY'}).click();
  assert.equal(await page.getByLabel('Instrument (optional)').inputValue(),'SPY');
  assert.deepEqual(failures,[]);
  console.log('PASS real backtest, signed-out reviewer, explicit private recipient, retry, publication, nonbinding poll and gated accounting');
} finally {
  await browser.close();
}
