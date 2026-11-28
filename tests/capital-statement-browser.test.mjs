import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { launchBrowser } from './browser.mjs';

const base=process.env.COMMON_SITE_URL||'http://127.0.0.1:8765/';
const uid='42000000-0000-4000-8000-000000000001';
const circle='42000000-0000-4000-8000-000000000002';
const sdk=`
(() => {
 const profile={id:'${uid}',display_name:'Fixture member',handle:'fixture-member'};
 const community={id:'${circle}',name:'Ledger fixture circle',description:'Disposable fixture',visibility:'private',category:'markets'};
 const fixture=window.ledgerFixture={requests:[],revoked:false,changed:false};
 const tables={profiles:[profile],communities:[community],memberships:[{community_id:community.id,user_id:profile.id,role:'member'}]};
 function from(table){
  let single=false;
  const filters=[];
  const query={
   select(){return query},order(){return query},limit(){return query},range(){return query},
   eq(k,v){filters.push([k,[v]]);return query},in(k,v){filters.push([k,v]);return query},
   single(){single=true;return query},
   then(resolve,reject){
    const rows=(tables[table]||[]).filter(row=>filters.every(([k,values])=>values.includes(row[k])));
    return Promise.resolve({data:single?rows[0]:rows,error:null}).then(resolve,reject);
   }
  };
  return query;
 }
 window.supabase={createClient:()=>({
  auth:{getSession:async()=>({data:{session:{user:{id:profile.id}}}}),onAuthStateChange(){}},from,
  async rpc(name,args){
   if(name!=='read_external_journal_statement')return {data:{items:[],next:null},error:null};
   fixture.requests.push(args);
   if(fixture.revoked)return {error:{message:'Private journal membership required',code:'42501'}};
   return {data:{
    schema:'common.external-journal-statement.v1',currency:'USD',circleId:args.p_circle_id,
    startDate:args.p_start_date,endDate:args.p_end_date,generatedAt:'2026-07-01T00:00:00+00:00',
    evidenceCount:1,periodEntryCount:1,evidenceSha256:(fixture.changed?'b':'a').repeat(64),
    debitsCents:'10001',creditsCents:'10001',
    accounts:Object.keys(window.CommonLedger.accounts).map(account=>({
      account,normalSide:['payables','capital','income','realized_gain'].includes(account)?'credit':'debit',
      openingCents:'0',debitsCents:account==='cash'?'10001':'0',
      creditsCents:account==='capital'?'10001':'0',closingCents:['cash','capital'].includes(account)?'10001':'0'
    }))
   },error:null};
  }
 })};
})();
`;
const browser=await launchBrowser();

async function fixturePage(enabled,viewport){
 const page=await browser.newPage({viewport});
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname.endsWith('/supabase.min.js'))return route.fulfill({contentType:'text/javascript',body:sdk});
  if(url.pathname.endsWith('/config.js'))return route.fulfill({contentType:'text/javascript',body:
   `window.COMMON_CONFIG={supabaseUrl:'https://fixture.invalid',supabaseAnonKey:'fixture',communityBackendReady:true,externalLedgerEnabled:${enabled}};`
  });
  if(url.pathname==='/auth/v1/settings')return route.fulfill({json:{external:{}}});
  if(url.origin===new URL(base).origin)return route.continue();
  return route.abort();
 });
 await page.goto(new URL('live/',base).href);
 const circles=page.locator('button[data-tab="groups"]:visible').first();
 await circles.click();
 const group=page.locator(`button[data-act="open-group"][data-id="${circle}"]:visible`).first();
 await group.click();
 await page.getByRole('button',{name:'Capital & treasury'}).click();
 await page.getByRole('button',{name:'External journal'}).click();
 return page;
}

try{
 const disabled=await fixturePage(false,{width:1200,height:840});
 await disabled.getByRole('heading',{name:'External journal not activated'}).waitFor();
 assert.equal(await disabled.getByRole('button',{name:'Prepare statement'}).count(),0);
 assert.equal(await disabled.evaluate(()=>ledgerFixture.requests.length),0);
 await disabled.close();

 const page=await fixturePage(true,{width:390,height:844});
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 const prepare=page.getByRole('button',{name:'Prepare statement'});
 await page.getByLabel('Period start').fill('2026-06-01');
 await page.getByLabel('Period end').fill('2026-06-30');
 await prepare.click();
 await page.getByRole('heading',{name:'Statement for 2026-06-01 through 2026-06-30'}).waitFor();
 const table=page.getByRole('table');
 const cash=table.getByRole('row',{name:/External cash/});
 assert.equal(await cash.getByRole('cell').last().textContent(),'$100.01');
 const observed=page.getByLabel('Observed closing cash (USD)');
 await observed.fill('100.00');
 await page.getByRole('button',{name:'Compare closing cash'}).click();
 const reconciliation=page.getByRole('status',{name:'Cash reconciliation result'});
 await reconciliation.getByText('Difference to investigate').waitFor();
 await reconciliation.getByText('$0.01',{exact:true}).waitFor();
 await observed.fill('100.01');
 await page.getByRole('button',{name:'Compare closing cash'}).click();
 await reconciliation.getByText('Figures match').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),true);
 const downloadPending=page.waitForEvent('download');
 const exportButton=page.getByRole('button',{name:'Export statement'});
 await exportButton.click();
 const download=await downloadPending;
 const exported=JSON.parse(await readFile(await download.path(),'utf8'));
 assert.equal(exported.statement.circleId,circle);
 assert.equal(exported.mode,'manual_external_records_unverified');
 assert.equal(exported.cashComparison.differenceCents,'0');
 assert.equal(download.suggestedFilename(),'common-journal-statement-2026-06-30.json');
 assert.equal(await page.evaluate(()=>ledgerFixture.requests.length),2);
 await page.evaluate(()=>{ledgerFixture.changed=true;});
 await exportButton.click();
 await page.getByText('Journal evidence changed. Prepare the statement again before exporting.').waitFor();
 await page.evaluate(()=>{ledgerFixture.revoked=true;});
 await exportButton.click();
 await page.getByText('Private journal membership required').waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS gated journal statement, exact comparison, mobile export and reauthorization');
}finally{await browser.close();}
