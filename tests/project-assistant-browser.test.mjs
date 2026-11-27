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
          return {data:{text:${JSON.stringify(draft)},status:'partial'}};
        }
      };
      const read=()=>JSON.parse(sessionStorage.getItem('fixture-history')||'[]');
      const persist=rows=>sessionStorage.setItem('fixture-history',JSON.stringify(rows));
      const client={
        auth:{getSession:async()=>({data:{session:{user:{id:user}}}}),onAuthStateChange(fn){authChanged=fn}},
        functions:{invoke(name,{body}){
          if(name!=='common-research-agent')throw Error('Unexpected function '+name);
          return fixture.model(body);
        }},
        from(table){
          const filters=[];
          let removing=false;
          const query={
            select(){return query}, order(){return query}, limit(){return query},
            eq(key,value){filters.push(row=>row[key]===value);return query},
            delete(){removing=true;return query},
            insert(value){
              if(table!=='research_assistant_drafts')throw Error('Unexpected write to '+table);
              persist([...read(),{...value,id:crypto.randomUUID(),created_at:'2025-01-01T00:00:00Z'}]);
              return Promise.resolve({error:null});
            },
            then(resolve,reject){
              const all=table==='research_workspaces'?projects:table==='research_assistant_drafts'?read():[];
              const rows=all.filter(row=>filters.every(matches=>matches(row)));
              if(removing)persist(all.filter(row=>!rows.includes(row)));
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
  await dialog.getByText('No drafts saved in this project.').waitFor();
  assert.equal(await page.evaluate(()=>fixture.calls.length),0);
  await dialog.getByLabel('Research goal').fill(goal);
  await dialog.getByLabel('Evidence and constraints').fill(evidence);
  const submit = dialog.getByRole('button',{name:'Draft research plan'});
  const consent = dialog.getByRole('checkbox');
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

  await page.getByText('Independent second project',{exact:true}).locator('xpath=../..').getByRole('button',{name:'Open',exact:true}).click();
  await page.getByRole('button',{name:'Project research assistant'}).click();
  dialog = page.getByRole('dialog');
  await dialog.getByText('No drafts saved in this project.').waitFor();
  await dialog.getByLabel('Research goal').fill(goal);
  await dialog.getByLabel('Evidence and constraints').fill(evidence);
  await dialog.getByRole('checkbox').check();
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
  await dialog.locator('summary').filter({hasText:goal}).click();
  await dialog.getByText(draft,{exact:true}).waitFor();
  page.once('dialog', confirm=>confirm.accept());
  await dialog.getByRole('button',{name:'Delete saved draft'}).click();
  await dialog.getByText('No drafts saved in this project.').waitFor();
  assert.deepEqual(errors,[]);
  console.log('PASS mobile project research workflow, opt-in, provider failure, private save, isolation, sign-out and disabled-provider history');
} finally {
  await browser.close();
}
