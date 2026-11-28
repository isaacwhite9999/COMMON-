import assert from 'node:assert/strict';
import { launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.setDefaultTimeout(12_000);
  const seen = [];
  page.on('pageerror', error => seen.push(error.message));
  await page.route('**/config.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: 'window.COMMON_CONFIG={communityBackendReady:true,supabaseUrl:"https://canvas-test.example",supabaseAnonKey:"fixture"};'
  }));
  await page.route(url => url.hostname === 'cdn.jsdelivr.net' && url.pathname.endsWith('/supabase.min.js'), route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.supabase={createClient(){
      let account='member-a', listener;
      const docs=[];
      const session=()=>account?{user:{id:account}}:null;
      window.switchCanvasAccount=id=>{account=id;listener('SIGNED_IN',session());};
      window.canvasRequests=[];
      window.bumpCanvasRevision=()=>{docs[0].revision++;};
      return {
        auth:{getSession:async()=>({data:{session:session()}}),onAuthStateChange(fn){listener=fn;}},
        from(table){
          const filters={};
          return {select(){return this;},eq(field,value){filters[field]=value;return this;},order(){return this;},
            async limit(max){return {data:structuredClone((table==='canvas_documents'
              ?docs.filter(doc=>doc.owner===account&&filters.owner_id===account)
              :docs.find(doc=>doc.owner===account&&doc.id===filters.document_id)?.history.slice().reverse()||[]).slice(0,max))};}
          };
        },
        async rpc(name,args){
          window.canvasRequests.push(args);
          if(name==='delete_canvas_document_v1'){
            const i=docs.findIndex(doc=>doc.owner===account&&doc.id===args.target&&doc.revision===args.expected);
            if(i<0)return {data:false};
            docs.splice(i,1);return {data:true};
          }
          let doc=docs.find(doc=>doc.id===args.target&&doc.owner===account);
          if(args.target&&(!doc||doc.revision!==args.expected))return {error:{code:'40001'}};
          if(!doc){doc={id:crypto.randomUUID(),owner:account,revision:0,history:[]};docs.push(doc);}
          doc.revision++;doc.title=args.payload.title;
          doc.history.push({revision:doc.revision,spec:args.payload,source_digest:args.digest,created_at:new Date().toISOString()});
          return {data:doc.id};
        }
      };
    }};`
  }));
  if (process.env.COMMON_PLOTLY_FILE) {
    await page.route('https://cdn.plot.ly/plotly-3.3.1.min.js', route => route.fulfill({
      path: process.env.COMMON_PLOTLY_FILE, contentType: 'application/javascript',
      headers: { 'Access-Control-Allow-Origin': '*' }
    }));
  }
  const base = process.env.COMMON_SITE_URL || 'http://127.0.0.1:8765/';
  await page.goto(new URL('workspace/canvas/', base).href);
  const status = page.locator('#account-status');
  await status.filter({ hasText: 'Private account library' }).waitFor().catch(async error => {
    console.error('Account initialization:', await status.textContent(), seen);
    throw error;
  });
  const data = 'Date,Close\n2025-01-01,3\n2025-01-02,4';
  async function upload(source) {
    await page.getByLabel('Upload CSV').setInputFiles({ name: 'private-test.csv', mimeType: 'text/csv', buffer: Buffer.from(source) });
    await page.locator('#status').filter({ hasText: 'Map the fields' }).waitFor();
  }
  await upload(data);
  await page.getByLabel('Chart title').fill('Private test chart');
  await page.getByLabel('X column', { exact: true }).selectOption('Date');
  await page.getByLabel('Y column', { exact: true }).selectOption('Close');
  await page.getByRole('button', { name: 'Render chart', exact: true }).click();
  await page.locator('#status').filter({ hasText: 'Rendered line' }).waitFor();
  const save = page.getByRole('button', { name: 'Save new account document' });
  const consent = page.locator('#account-consent');
  await save.click();
  await status.filter({ hasText: /Confirm that/ }).waitFor();
  assert.deepEqual(await page.evaluate(() => window.canvasRequests), []);
  await consent.check();
  await save.click();
  await status.filter({ hasText: /Account revision saved/ }).waitFor();
  const [payload] = await page.evaluate(() => window.canvasRequests);
  assert.deepEqual(Object.keys(payload).sort(), ['digest', 'expected', 'payload', 'target']);
  assert.equal(payload.payload.title, 'Private test chart');
  assert.ok(!JSON.stringify(payload).includes('2025-01-01'));
  assert.ok(!JSON.stringify(payload).includes('private-test.csv'));

  const view = page.getByRole('button', { name: 'View account revisions' });
  await view.click();
  await page.getByRole('button', { name: 'Open account revision 1' }).click();
  await status.filter({ hasText: 'Opened an account revision' }).waitFor();
  await consent.check();
  await page.getByRole('button', { name: 'Append account revision' }).click();
  await status.filter({ hasText: 'Account revision saved' }).waitFor();
  await upload(data.replace(',4', ',9'));
  await view.click();
  await page.getByRole('button', { name: 'Open account revision 2' }).click();
  await status.filter({ hasText: 'Load the matching source CSV' }).waitFor();

  await upload(data);
  await page.getByRole('button', { name: 'Open account revision 2' }).click();
  await status.filter({ hasText: 'Opened an account revision' }).waitFor();
  await page.evaluate(() => window.bumpCanvasRevision());
  await consent.check();
  await page.getByRole('button', { name: 'Append account revision' }).click();
  await status.filter({ hasText: 'The account copy changed' }).waitFor();

  await page.evaluate(() => window.switchCanvasAccount('member-b'));
  await page.getByText('No account documents saved.').waitFor();
  assert.equal(await page.getByLabel('Chart title').inputValue(), '');
  assert.equal(await page.getByRole('button', { name: 'View account revisions' }).count(), 0);
  await page.evaluate(() => window.switchCanvasAccount('member-a'));
  await view.waitFor();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Delete account document' }).click();
  await status.filter({ hasText: 'Account document deleted' }).waitFor();
  await page.evaluate(() => window.switchCanvasAccount(null));
  await status.filter({ hasText: 'Sign in through Community' }).waitFor();
  assert.ok(await save.isDisabled());
  assert.deepEqual(seen, []);
  console.log('Canvas private account lifecycle, consent, no source rows, revisions, conflict, identity change and deletion passed.');
} finally {
  await browser.close();
}
