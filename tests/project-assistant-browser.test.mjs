import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const origin = 'https://assistant-fixture.invalid';
const user = '85000001-0000-4000-8000-000000000001';
const project = '85100001-0000-4000-8000-000000000001';
const otherProject = '85100001-0000-4000-8000-000000000002';
const goal = 'Test a chronological momentum signal';
const evidence = 'Use historical evidence with documented transaction costs.';
const draft = '<model-text>Verify holdout assumptions before interpreting the test.</model-text>';
const nextEvidence = 'Add slippage sensitivity in the chronological test plan.';
const nextDraft = 'Measure holdout sensitivity to three explicit slippage scenarios.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const errors = [];

try {
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/config.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `window.COMMON_CONFIG={communityBackendReady:true,supabaseUrl:${JSON.stringify(origin)},supabaseAnonKey:"fixture",researchAgentEnabled:!location.search.includes("disabled")};`
  }));
  await page.route('**/supabase.min.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `(() => {
      const user=${JSON.stringify(user)}, project=${JSON.stringify(project)}, otherProject=${JSON.stringify(otherProject)};
      const projects=[{id:project,title:'Private model review',research_notes:'Unshared project notes'},
        {id:otherProject,title:'Independent second project'}];
      let authChanged;
      window.fixture={
        calls:[], deny:true, defer:false,
        signOut(){authChanged('SIGNED_OUT',null)},
        async model(body){
          this.calls.push(body);
          if(this.deny)return {error:new Error('Fixture provider unavailable')};
          if(this.defer)await new Promise(resolve=>{this.release=resolve});
          const followUp=Boolean(body.previous_draft_id);
          return {data:{text:followUp?${JSON.stringify(nextDraft)}:${JSON.stringify(draft)},status:'partial',step_number:followUp?2:1}};
        }
      };
      const key=table=>table==='research_assistant_commands'?'fixture-commands':
        table==='research_assistant_runs'?'fixture-runs':'fixture-history';
      const read=table=>JSON.parse(sessionStorage.getItem(key(table))||'[]');
      const persist=(table,rows)=>sessionStorage.setItem(key(table),JSON.stringify(rows));
      const client={
        auth:{getSession:async()=>({data:{session:{user:{id:user}}}}),onAuthStateChange(fn){authChanged=fn}},
        async rpc(name,args){
          if(name!=='cancel_research_assistant_run')throw Error('Unexpected RPC '+name);
          const table='research_assistant_runs',rows=read(table);
          const row=rows.find(item=>item.id===args.p_id&&item.version===args.p_version);
          if(!row)return {data:false};
          row.state='cancelled';row.version++;
          persist(table,rows);
          return {data:true};
        },
        functions:{async invoke(name,{body}){
          if(name!=='common-research-agent')throw Error('Unexpected function '+name);
          if(body.run_id){
            const table='research_assistant_runs',rows=read(table);
            const row=rows.find(item=>item.id===body.run_id&&item.version===body.run_version);
            if(!row||!body.consent)return {error:new Error('Stale approval')};
            row.state='running';row.version++;row.attempts++;
            row.lease_expires_at=new Date(Date.now()+120000).toISOString();
            persist(table,rows);
            const upstream=await fixture.model(body);
            const latest=read(table),current=latest.find(item=>item.id===body.run_id);
            if(current.state==='cancelled')return {error:new Error('Cancelled')};
            current.state=upstream.error?'failed':'succeeded';current.version++;
            if(upstream.data){current.draft=upstream.data.text;current.result_status=upstream.data.status;}
            persist(table,latest);
            return upstream;
          }
          return fixture.model(body);
        }},
        from(table){
          const filters=[];
          let removing=false, command=null, updates=null;
          const query={
            select(){return query}, order(){return query}, limit(){return query},
            eq(key,value){filters.push(row=>row[key]===value);return query},
            delete(){removing=true;return query}, update(value){updates=value;return query},
            insert(value){
              if(table==='research_assistant_commands'){command=value;return query}
              if(table==='research_assistant_runs'){
                persist(table,[...read(table),{...value,id:crypto.randomUUID(),created_at:'2025-01-01T00:00:00Z',
                  state:'awaiting_approval',version:1,attempts:0}]);
                return Promise.resolve({error:null});
              }
              if(table!=='research_assistant_drafts')throw Error('Unexpected write to '+table);
              persist(table,[...read(table),{step_number:1,...value,id:crypto.randomUUID(),created_at:'2025-01-01T00:00:00Z'}]);
              return Promise.resolve({error:null});
            },
            then(resolve,reject){
              const all=table==='research_workspaces'?projects:table.startsWith('research_assistant_')?read(table):[];
              const rows=all.filter(row=>filters.every(matches=>matches(row)));
              if(command){
                const row={...command,id:crypto.randomUUID(),created_at:'2025-01-01T00:00:00Z'};
                persist(table,[...all,row]);
                return Promise.resolve({data:[row]}).then(resolve,reject);
              }
              if(updates)persist(table,all.map(row=>rows.includes(row)?{...row,...updates}:row));
              if(removing){
                if(all.some(row=>rows.some(parent=>parent.id===row.parent_draft_id)))return Promise.resolve({error:{code:'23503'}}).then(resolve,reject);
                persist(table,all.filter(row=>!rows.includes(row)));
              }
              return Promise.resolve({data:rows}).then(resolve,reject);
            }
          };
          return query;
        }
      };
      window.supabase={createClient:()=>client};
    })();`
  }));
  const open = async () => {
    await page.getByRole('button',{name:'Projects',exact:true}).click();
    await page.getByRole('button',{name:'Project research assistant'}).click();
    return page.getByRole('dialog',{name:'Project research assistant'});
  };
  await page.goto(new URL('lab/',base).href);
  let dialog = await open();
  const projectCommands = () => dialog.getByRole('region',{name:'Project commands'});
  await projectCommands().getByText('Reusable project commands').click();
  await projectCommands().getByText('No reusable project commands yet.').waitFor();
  await projectCommands().getByLabel('Command name').fill('Momentum holdout');
  await projectCommands().getByLabel('Command goal').fill(goal);
  await projectCommands().getByLabel('Command evidence').fill(evidence);
  await projectCommands().getByRole('button',{name:'Save command'}).click();
  await projectCommands().getByText('Command saved.').waitFor();
  await projectCommands().getByText('Momentum holdout').click();
  await projectCommands().getByRole('button',{name:'Edit command'}).click();
  await projectCommands().getByLabel('Command name').fill('Holdout methodology');
  await projectCommands().getByRole('button',{name:'Update command'}).click();
  await projectCommands().getByText('Command updated.').waitFor();
  await page.reload();
  dialog = await open();
  await projectCommands().getByText('Reusable project commands').click();
  await projectCommands().getByText('Holdout methodology').click();
  await dialog.getByLabel('Send this goal and evidence',{exact:false}).check();
  await projectCommands().getByRole('button',{name:'Apply command'}).click();
  assert.equal(await dialog.getByLabel('Send this goal and evidence',{exact:false}).isChecked(),false);
  assert.equal(await dialog.getByLabel('Research goal').inputValue(),goal);
  assert.equal(await dialog.getByLabel('Evidence and constraints').inputValue(),evidence);
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await dialog.getByText('No drafts saved in this project.').waitFor();
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await dialog.getByLabel('Research goal').fill(goal);
  await dialog.getByLabel('Evidence and constraints').fill(evidence);
  const submit = dialog.getByRole('button',{name:'Draft research plan'});
  const consent = dialog.getByLabel('Send this goal and evidence',{exact:false});
  await submit.click();
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await consent.check();
  await submit.click();
  await dialog.getByRole('alert').waitFor();
  assert.equal(await consent.isChecked(),false);
  assert.equal(await dialog.getByRole('button',{name:'Save to this project'}).count(),0);

  await page.evaluate(()=>{fixture.deny=false;});
  await consent.check();
  await submit.click();
  await dialog.getByText(draft,{exact:true}).waitFor();
  assert.equal(await page.locator('model-text').count(),0);
  assert.deepEqual(await page.evaluate(()=>fixture.calls.at(-1)), {
    workspace_id:project, mode:'plan', goal, input:evidence, consent:true
  });
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('fixture-history')),null);
  await dialog.getByRole('button',{name:'Save to this project'}).click();
  await dialog.getByText('Draft saved privately to this project.').waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await dialog.getByRole('button',{name:'Close',exact:true}).click();
  await page.getByRole('button',{name:'Project research assistant'}).evaluate(button=>{
    if(button!==document.activeElement)throw Error('Closing the dialog did not restore focus');
  });

  await page.reload();
  dialog = await open();
  const root = dialog.locator('details').filter({has:page.locator('summary').filter({hasText:'Turn 1'})});
  await root.locator('summary').click();
  await root.getByRole('button',{name:'Continue from this draft'}).click();
  await dialog.getByRole('heading',{name:'Continue with turn 2'}).waitFor();
  assert.equal(await dialog.getByLabel('Research goal').inputValue(),goal);
  assert.equal(await dialog.getByLabel('Evidence and constraints').inputValue(),'');
  assert.equal(await dialog.locator('[data-context]').textContent(),draft);
  await projectCommands().getByText('Reusable project commands').click();
  await projectCommands().getByText('Holdout methodology').click();
  await projectCommands().getByRole('button',{name:'Edit command'}).click();
  await projectCommands().getByLabel('Command goal').fill('A different goal reserved for new research plans');
  await projectCommands().getByLabel('Command evidence').fill(nextEvidence);
  await projectCommands().getByRole('button',{name:'Update command'}).click();
  await projectCommands().getByText('Command updated.').waitFor();
  await projectCommands().getByText('Holdout methodology').click();
  await projectCommands().getByRole('button',{name:'Apply command'}).click();
  assert.equal(await dialog.getByLabel('Research goal').inputValue(),goal);
  assert.equal(await dialog.getByLabel('Evidence and constraints').inputValue(),nextEvidence);
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await dialog.getByLabel('Send this goal and evidence',{exact:false}).check();
  await dialog.getByRole('button',{name:'Draft follow-up'}).click();
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await page.evaluate(()=>{fixture.deny=false;});
  await dialog.getByLabel('Include this previous response excerpt',{exact:false}).check();
  await dialog.getByRole('button',{name:'Draft follow-up'}).click();
  await dialog.getByText(nextDraft,{exact:true}).waitFor();
  const savedRoot = await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fixture-history'))[0]);
  assert.deepEqual(await page.evaluate(()=>fixture.calls.at(-1)), {
    workspace_id:project, mode:'plan', goal, input:nextEvidence, consent:true,
    previous_draft_id:savedRoot.id, previous_context_consent:true
  });
  await dialog.getByRole('button',{name:'Save to this project'}).click();
  await dialog.locator('summary').filter({hasText:'Turn 2'}).waitFor();
  const savedFollowUp = await page.evaluate(()=>JSON.parse(sessionStorage.getItem('fixture-history'))[1]);
  assert.equal(savedFollowUp.parent_draft_id,savedRoot.id);
  assert.equal(savedFollowUp.step_number,2);
  await dialog.getByRole('button',{name:'Close',exact:true}).click();

  await page.getByText('Independent second project',{exact:true}).locator('xpath=../..').getByRole('button',{name:'Open',exact:true}).click();
  await page.getByRole('button',{name:'Project research assistant'}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('No drafts saved in this project.').waitFor();
  await projectCommands().getByText('Reusable project commands').click();
  await projectCommands().getByText('No reusable project commands yet.').waitFor();
  await dialog.getByLabel('Research goal').fill(goal);
  await dialog.getByLabel('Evidence and constraints').fill(evidence);
  await dialog.getByLabel('Send this goal and evidence',{exact:false}).check();
  await page.evaluate(()=>{fixture.defer=true;});
  await dialog.getByRole('button',{name:'Draft research plan'}).click();
  await page.waitForFunction(()=>typeof fixture.release==='function');
  await page.evaluate(()=>{fixture.signOut();fixture.release();});
  await dialog.waitFor({state:'hidden'});
  await page.getByRole('link',{name:'Sign in to COMMON',exact:true}).waitFor();

  await page.goto(new URL('lab/?disabled',base).href);
  dialog = await open();
  await dialog.getByText('The model provider is disabled. Saved project drafts remain available.').waitFor();
  assert.equal(await dialog.getByRole('button',{name:'Draft research plan'}).count(),0);
  await projectCommands().getByText('Reusable project commands').click();
  await projectCommands().getByText('Holdout methodology').click();
  assert.equal(await projectCommands().getByRole('button',{name:'Apply command'}).count(),0);
  page.once('dialog', confirm=>confirm.accept());
  await projectCommands().getByRole('button',{name:'Delete command'}).click();
  await projectCommands().getByText('Command deleted.').waitFor();
  const initialTurn = dialog.locator('details').filter({has:page.locator('summary').filter({hasText:'Turn 1'})});
  const followUpTurn = dialog.locator('details').filter({has:page.locator('summary').filter({hasText:'Turn 2'})});
  await initialTurn.locator('summary').click();
  await initialTurn.getByText(draft,{exact:true}).waitFor();
  await followUpTurn.locator('summary').click();
  await followUpTurn.getByText(nextDraft,{exact:true}).waitFor();
  const deleteTurn = async turn => {
    page.once('dialog', confirm=>confirm.accept());
    await turn.getByRole('button',{name:'Delete saved draft'}).click();
  };
  await deleteTurn(initialTurn);
  await dialog.getByText('Delete the follow-up turns before deleting this draft.').waitFor();
  await deleteTurn(followUpTurn);
  await followUpTurn.waitFor({state:'detached'});
  await initialTurn.locator('summary').click();
  await deleteTurn(initialTurn);
  await dialog.getByText('No drafts saved in this project.').waitFor();
  await page.goto(new URL('lab/',base).href);
  dialog = await open();
  const runs = dialog.getByRole('region',{name:'Planning runs'});
  await runs.getByText('Planning runs and approvals').click();
  await runs.getByText('No planning runs yet.').waitFor();
  const prepareRun = async runGoal => {
    await runs.getByLabel('Run goal').fill(runGoal);
    await runs.getByLabel('Run evidence').fill(evidence);
    await runs.getByRole('button',{name:'Prepare run'}).click();
    const item = runs.locator('details[data-run]').filter({hasText:runGoal});
    await item.locator('summary').click();
    return item;
  };
  const run = await prepareRun('Investigate the future holdout window');
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  assert.equal(await run.getByRole('button',{name:'Approve and run'}).isDisabled(),true);
  await run.getByRole('checkbox').check();
  await run.getByRole('button',{name:'Approve and run'}).click();
  await run.locator('summary').filter({hasText:'Failed'}).waitFor();
  assert.equal(await run.getByRole('button',{name:'Approve retry'}).isDisabled(),true);
  await page.evaluate(()=>{fixture.deny=false});
  await run.getByRole('checkbox').check();
  await run.getByRole('button',{name:'Approve retry'}).click();
  await run.getByText('Version 5 · 2 of 2 attempts').waitFor();
  await run.getByText(draft,{exact:true}).waitFor();

  const pending = await prepareRun('Cancel a running planning request');
  await page.evaluate(()=>{fixture.defer=true});
  await pending.getByRole('checkbox').check();
  await pending.getByRole('button',{name:'Approve and run'}).click();
  await page.waitForFunction(()=>typeof fixture.release==='function');
  await runs.getByRole('button',{name:'Refresh runs'}).click();
  await pending.locator('summary').filter({hasText:'Running'}).waitFor();
  page.once('dialog', confirm=>confirm.accept());
  await pending.getByRole('button',{name:'Cancel run'}).click();
  await pending.locator('summary').filter({hasText:'Cancelled'}).waitFor();
  await page.evaluate(()=>fixture.release());
  assert.equal(await pending.getByText(draft,{exact:true}).count(),0);
  await page.reload();
  dialog = await open();
  await dialog.getByText('Planning runs and approvals').click();
  await dialog.getByText('Cancel a running planning request · Cancelled').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS mobile project research workflow, opt-in, provider failure, private save, reusable commands, resumed follow-up, isolation, sign-out disabled-provider history and durable approvals');
} finally {
  await browser.close();
}
