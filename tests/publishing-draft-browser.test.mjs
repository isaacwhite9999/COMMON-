import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const accountA = '71000000-0000-4000-8000-000000000001';
const accountB = '71000002-0000-4000-8000-000000000002';
const circleId = '72000000-0000-4000-8000-000000000001';
const sdk = `
(() => {
  const idA = '${accountA}';
  const idB = '${accountB}';
  const circle = {id:'${circleId}',name:'Fixture Circle',
    description:'Synthetic fixture',visibility:'private',category:'markets'};
  const profile = (id,display_name) => ({id,display_name,handle:display_name.replace(/ /g,'_')});
  const profiles = [profile(idA,'Fixture Member A'),profile(idB,'Fixture Member B')];
  const state = window.draftFixture = {fail:false,hold:false,created:[],attempts:0};
  const tables = {profiles, communities:[circle], memberships:[{community_id:circle.id,user_id:idA,role:'member'}]};
  let changed;
  const selection = () => ({user:{id:sessionStorage.getItem('fixture-active-account')||idA}});
  state.switchAccount = id => {
    sessionStorage.setItem('fixture-active-account',id);
    changed('SIGNED_IN',selection());
  };
  function from(table) {
    let filters=[], single=false;
    const query = {
      select(){return query},
      order(){return query},
      limit(){return query},
      single(){single=true;return query},
      eq(key,value){filters.push([key,[value]]);return query},
      in(key,values){filters.push([key,values]);return query},
      insert(values) {
        if(table!=='discussions')return Promise.resolve({error:new Error('Unexpected insert')});
        state.attempts++;
        if(state.fail)return Promise.resolve({error:new Error('Temporary failure')});
        const finish = () => {
          state.created.push(values);
          return {data:null,error:null};
        };
        if(state.hold)return new Promise(resolve=>{state.complete=()=>resolve(finish())});
        return Promise.resolve(finish());
      },
      then(resolve,reject) {
        const rows=(tables[table]||[]).filter(row=>filters.every(([key,values])=>values.includes(row[key])));
        return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve,reject);
      }
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session:selection()}}),onAuthStateChange(fn){changed=fn}},
    from,
    rpc:async()=>({data:{items:[],next:null},error:null})
  })};
})();
`;

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/supabase.min.js')) {
      return route.fulfill({contentType:'text/javascript',body:sdk});
    }
    if (url.pathname === '/auth/v1/settings') return route.fulfill({json:{external:{}}});
    if (url.origin === new URL(base).origin) return route.continue();
    return route.abort();
  });

  await page.goto(new URL('live/',base).href);
  const open = () => page.getByRole('button',{name:'Share research'}).click();
  const modal = page.getByRole('dialog',{name:'Share research'});
  const title = modal.getByLabel('Title',{exact:true});
  const body = modal.getByLabel('Your research or question');
  const select = modal.getByLabel('Community');
  const close = () => modal.getByRole('button',{name:'Close dialog'}).click();
  const publish = () => modal.getByRole('button',{name:'Publish',exact:true}).click();

  await page.waitForFunction(()=>document.querySelector('.nav-person strong')?.textContent==='Fixture Member A');
  await open();
  await title.fill('A short first draft');
  await modal.getByRole('button',{name:'Save draft'}).click();
  await modal.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>draftFixture.attempts),0);
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.nav-person strong')?.textContent==='Fixture Member A');
  await open();
  assert.equal(await title.inputValue(),'A short first draft');
  assert.equal(await body.inputValue(),'');
  assert.equal(await select.inputValue(),'');

  await select.selectOption(circleId);
  await body.fill('A member-authored discussion with sources to add later.');
  await modal.getByText('Draft saved on this device.').waitFor();
  await page.keyboard.press('Escape');
  await modal.waitFor({state:'hidden'});
  await open();
  assert.equal(await select.inputValue(),circleId);
  assert.equal(await body.inputValue(),'A member-authored discussion with sources to add later.');

  await title.fill('        ');
  await publish();
  await modal.getByRole('alert').filter({hasText:/enter a title/}).waitFor();
  assert.equal(await page.evaluate(()=>draftFixture.attempts),0);
  await title.fill('Evidence-based discussion');
  await page.evaluate(()=>{draftFixture.fail=true});
  await publish();
  await modal.getByRole('alert').filter({hasText:/could not be published/}).waitFor();
  assert.equal(await title.inputValue(),'Evidence-based discussion');
  assert.equal(await page.evaluate(()=>draftFixture.created.length),0);

  // A different authenticated account can compose, but cannot resume this draft.
  await page.evaluate(uid=>draftFixture.switchAccount(uid),accountB);
  await modal.waitFor({state:'hidden'});
  await open();
  assert.equal(await title.inputValue(),'');
  assert.equal(await body.inputValue(),'');
  assert.ok(await modal.getByRole('button',{name:'Publish',exact:true}).isDisabled());
  await close();
  await page.evaluate(uid=>draftFixture.switchAccount(uid),accountA);
  await page.waitForFunction(()=>document.querySelector('.nav-person strong')?.textContent==='Fixture Member A');
  await open();
  assert.equal(await title.inputValue(),'Evidence-based discussion');
  assert.equal(await select.inputValue(),circleId);

  await page.evaluate(()=>{draftFixture.fail=false;draftFixture.hold=true});
  await publish();
  await modal.getByRole('button',{name:'Publishing…',exact:true}).waitFor();
  assert.ok(await title.isDisabled());
  assert.ok(await body.isDisabled());
  assert.ok(await modal.getByRole('button',{name:'Discard draft'}).isDisabled());
  await page.waitForFunction(()=>typeof draftFixture.complete==='function');
  await page.evaluate(()=>draftFixture.complete());
  await page.getByText('Discussion submitted. Community moderation applies.').waitFor();
  assert.deepEqual(await page.evaluate(()=>draftFixture.created),[{
    community_id:circleId,author_id:accountA,title:'Evidence-based discussion',
    body:'A member-authored discussion with sources to add later.'
  }]);
  await open();
  assert.equal(await title.inputValue(),'');
  await title.fill('Unpublished scratch');
  page.once('dialog', dialog => dialog.dismiss());
  await modal.getByRole('button',{name:'Discard draft'}).click();
  assert.equal(await title.inputValue(),'Unpublished scratch');
  page.once('dialog', dialog => dialog.accept());
  await modal.getByRole('button',{name:'Discard draft'}).click();
  await modal.waitFor({state:'hidden'});
  await open();
  assert.equal(await title.inputValue(),'');
  const key = 'common.posts.draft.v1.' + accountA;
  await page.evaluate(draftKey=>localStorage.setItem(draftKey,JSON.stringify({title:'Other tab draft'})),key);
  await title.fill('Unsaved conflicting edit');
  await modal.getByRole('status').filter({hasText:'changed in another tab'}).waitFor();
  assert.equal(await page.evaluate(draftKey=>JSON.parse(localStorage.getItem(draftKey)).title,key),'Other tab draft');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('.nav-person strong')?.textContent==='Fixture Member A');
  await open();
  assert.equal(await title.inputValue(),'Other tab draft');

  await page.evaluate(draftKey=>{
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if(key===draftKey)throw new DOMException('Fixture quota limit','QuotaExceededError');
      return original.call(this,key,value);
    };
  },key);
  await title.fill('Edit when storage is unavailable');
  await modal.getByRole('status').filter({hasText:'Device storage is unavailable'}).waitFor();
  await modal.getByRole('button',{name:'Save draft'}).click();
  assert.equal(await title.inputValue(),'Edit when storage is unavailable');
  assert.deepEqual(errors,[]);
  console.log('PASS member discussion drafts: reload, account isolation, publish retry, discard and storage recovery');
} finally {
  await browser.close();
}
