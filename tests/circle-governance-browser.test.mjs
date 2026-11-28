import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
const ids = {
  author: 'a2100002-0000-4000-8000-000000000002',
  reviewer: 'a2100000-0000-4000-8000-000000000001',
  member: 'a2100003-0000-4000-8000-000000000003',
  circle: 'a2110000-0000-4000-8000-000000000001',
  proposal: 'a2120000-0000-4000-8000-000000000001'
};
const sdk = `
(() => {
  const ids = ${JSON.stringify(ids)};
  const profiles = ['author','reviewer','member'].map(role=>({
    id:ids[role],display_name:'Fixture '+role,handle:'fixture_'+role
  }));
  const groups = [{id:ids.circle,name:'Private Memo Circle',category:'markets',
    description:'A fixture circle for accounting research.',visibility:'private'}];
  const tables = {
    profiles,communities:groups,
    memberships:[['author','moderator'],['reviewer','owner'],['member','member']].map(([key,role])=>({
      user_id:ids[key],role,community_id:ids.circle
    })),
    proposals:[{id:ids.proposal,author_id:ids.author,community_id:ids.circle,
      title:'Comparative accounting review',rationale:'Review line items and supporting filings.',
      status:'open',created_at:'2024-01-01T00:00:00Z'}],
    circle_governance_memos:[],circle_governance_reviews:[],proposal_votes:[]
  };
  let session = {user:{id:ids.author}}, authChanged;
  const fixture = window.governanceFixture = {failMemo:true,writes:[],switchTo(key){
    session={user:{id:ids[key]}};authChanged('SIGNED_IN',session);
  }};
  function from(table){
    let single=false;
    const filters=[];
    const query={
      select(){return query},order(){return query},limit(){return query},
      eq(key,value){filters.push(row=>row[key]===value);return query},
      in(key,values){filters.push(row=>values.includes(row[key]));return query},
      maybeSingle(){single=true;return query},single(){single=true;return query},
      insert(value){
        if(table==='circle_governance_memos'&&fixture.failMemo){
          return Promise.resolve({error:{code:'fixture_failure'}});
        }
        if(!['circle_governance_memos','circle_governance_reviews'].includes(table)){
          return Promise.resolve({error:{message:'Unexpected mutation'}});
        }
        fixture.writes.push({...value,table});
        tables[table].push({...value,author:profiles.find(profile=>profile.id===value.author_id),
          created_at:'2024-01-01T00:00:01Z'});
        return Promise.resolve({data:null});
      },
      upsert(value){
        if(table!=='proposal_votes')return Promise.resolve({error:{message:'Unexpected upsert'}});
        tables[table].push(value);
        return Promise.resolve({data:null});
      },
      then(resolve,reject){
        const rows=(tables[table]||[]).filter(row=>filters.every(fn=>fn(row)));
        return Promise.resolve({data:single?rows[0]||null:rows}).then(resolve,reject);
      }
    };
    return query;
  }
  window.supabase={createClient:()=>({
    auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){authChanged=fn}},
    from,
    async rpc(name){
      if(name==='proposal_tally')return {data:tables.proposal_votes.map(vote=>({choice:vote.choice,tally:1}))};
      if(name==='discussion_feed_v1')return {data:{items:[],next:null}};
      return {data:[]};
    }
  })};
})();
`;

const browser = await launchBrowser();
try {
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/supabase.min.js'))return route.fulfill({contentType:'text/javascript',body:sdk});
    if(url.pathname==='/auth/v1/settings')return route.fulfill({json:{external:{}}});
    return url.origin===new URL(base).origin?route.continue():route.abort();
  });
  await page.goto(new URL('live/',base).href);
  const memo=page.getByRole('region',{name:'Investment memo and review'});
  async function openDecision(role) {
    await page.waitForFunction(label=>document.querySelector('.nav-person strong')?.textContent===label,'Fixture '+role);
    await page.locator('.mobile-nav').getByRole('button',{name:/Research Desks/}).click();
    await page.getByRole('heading',{name:'Private Memo Circle'}).waitFor();
    await page.getByRole('button',{name:'Open',exact:true}).click();
    await page.getByRole('button',{name:'Decisions',exact:true}).click();
    await page.getByRole('button',{name:'View decision'}).click();
    await memo.getByRole('heading',{name:'Investment memo',exact:true}).waitFor();
  }

  await openDecision('author');
  await memo.getByLabel('Investment thesis').fill('Compare cash-flow classifications across the reporting periods.');
  await memo.getByLabel('Due diligence and sources').fill('Review annual SEC filings and accompanying disclosure notes.');
  await memo.getByLabel('Risks and unresolved questions').fill('Presentation and timing may differ across issuers.');
  await memo.getByLabel('Conflict disclosures').fill('None declared.');
  await memo.getByRole('button',{name:'Record research memo'}).click();
  await memo.getByRole('alert').waitFor();
  assert.equal(await memo.getByLabel('Conflict disclosures').inputValue(),'None declared.');
  await page.evaluate(()=>{governanceFixture.failMemo=false});
  await memo.getByRole('button',{name:'Record research memo'}).click();
  await memo.getByText('Compare cash-flow classifications across the reporting periods.',{exact:true}).waitFor();
  assert.equal(await memo.getByRole('button',{name:'Record independent review'}).count(),0);
  assert.equal(await page.evaluate(()=>governanceFixture.writes.length),1);

  await page.evaluate(()=>governanceFixture.switchTo('reviewer'));
  await openDecision('reviewer');
  await memo.getByLabel('Review outcome').selectOption('changes_requested');
  await memo.getByLabel('Review reasoning').fill('Explain any accounting policy changes affecting comparability.');
  await memo.getByLabel(/I did not author/).check();
  await memo.getByRole('button',{name:'Record independent review'}).click();
  await memo.getByRole('heading',{name:'Changes requested'}).waitFor();
  await memo.getByText(/Fixture reviewer ·/).waitFor();
  assert.equal(await memo.getByRole('button',{name:'Record independent review'}).count(),0);
  await page.getByText('NONBINDING MEMBER OPINION').waitFor();
  await page.getByRole('button',{name:'Abstain',exact:true}).click();
  await page.getByText('Your vote: abstain').waitFor();

  await page.evaluate(()=>governanceFixture.switchTo('member'));
  await openDecision('member');
  await memo.getByText('Explain any accounting policy changes affecting comparability.',{exact:true}).waitFor();
  assert.equal(await memo.getByRole('button',{name:'Record independent review'}).count(),0);
  assert.equal(await page.evaluate(()=>governanceFixture.writes.length),2);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);
  console.log('PASS circle governance: memo, independent review, failure recovery and nonbinding poll');
} finally {
  await browser.close();
}
