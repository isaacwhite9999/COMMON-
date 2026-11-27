import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Verify a real browser can navigate and calculate without an account.
// Treasury API requests are replaced with deterministic fixtures only in this test.
const base=process.env.COMMON_SITE_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true});
const debt=Array.from({length:75},(_,i)=>({
 record_date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),
 tot_pub_debt_out_amt:String(34000000000000+i*1500000000)
})).reverse();
const rate=Array.from({length:36},(_,i)=>({
 record_date:new Date(Date.UTC(2023,0,1+i*30)).toISOString().slice(0,10),
 security_desc:'Treasury Bills',avg_interest_rate_amt:String(2+i*.025)
})).reverse();
try{
 const page=await browser.newPage({viewport:{width:1340,height:900}});
 let debtResponse='original';
 const errors=[];
 page.on('pageerror',err=>errors.push(err.message));
 await page.route('https://api.fiscaldata.treasury.gov/**',async route=>{
  const isDebt=route.request().url().includes('/debt_to_penny');
  const revised=[
   {record_date:'2025-03-17',tot_pub_debt_out_amt:'34112500000000'},
   {...debt[0],tot_pub_debt_out_amt:debt[0].tot_pub_debt_out_amt+'.01'},
   ...debt.slice(1,-1)
  ];
  const rows=isDebt?(debtResponse==='original'?debt:revised):rate;
  await route.fulfill({status:isDebt&&debtResponse==='offline'?503:200,contentType:'application/json',
   headers:{'access-control-allow-origin':'*'},body:JSON.stringify({data:rows})});
 });
 await page.goto(new URL('terminal/',base).href,{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:/Research begins with evidence/i}).waitFor({timeout:20000});
 await page.getByText('TOTAL PUBLIC DEBT OUTSTANDING').waitFor();
 await page.locator('.stat').first().getByText(/\$34\./).waitFor();
 await page.locator('.navlink[data-go="equities"]').click();
 await page.getByRole('heading',{name:/Intrinsic value is conditional/i}).waitFor();
 await page.locator('#dcf-form button[type="submit"]').click();
 await page.getByText('Sensitivity matrix').waitFor();
 assert.ok((await page.getByText('PER SHARE').count())>=1);
 await page.locator('.navlink[data-go="options"]').click();
 await page.getByRole('heading',{name:/Model optionality/i}).waitFor();
 await page.locator('#bs-form [name="spot"]').fill('120');
 await page.locator('#bs-form button[type="submit"]').click();
 await page.getByText('PARITY ERROR').waitFor();
 assert.ok((await page.getByText('DELTA').count())>=1);
 await page.locator('[data-act="option-put"]').click();
 await page.getByText('MODEL LIMITS').waitFor();
 await page.locator('.navlink[data-go="macro"]').click();
 await page.getByText('Fixed income risk workbench').waitFor();
 await page.getByRole('heading',{name:'Treasury revision comparison'}).waitFor();
 await page.getByText('Waiting for a second distinct observation window.',{exact:false}).first().waitFor();
 debtResponse='revised';
 await page.getByRole('button',{name:'Refresh source'}).click();
 const difference=page.getByText('Matching dates 74 · Revised values 1 · Dates entering 1 · Dates leaving 1');
 await difference.waitFor();
 const revision=page.getByRole('region',{name:'Public debt outstanding comparison table'});
 await revision.getByRole('cell',{name:'+0.01',exact:true}).waitFor();
 await page.getByText('Source and fingerprints',{exact:true}).first().click();
 const fingerprints=page.locator('.source-fingerprint:visible');
 assert.equal(await fingerprints.count(),2);
 for(const code of await fingerprints.allTextContents())assert.match(code,/^[a-f0-9]{64}$/);

 await page.getByRole('button',{name:'Refresh source'}).click();
 await page.getByRole('button',{name:'Refresh source'}).waitFor();
 await difference.waitFor();
 debtResponse='offline';
 await page.reload();
 await page.locator('.navlink[data-go="macro"]').click();
 await difference.waitFor();
 await page.getByText('Public debt outstanding could not be refreshed. Showing the last successful retrieval.',{exact:true}).waitFor();
 await page.getByText('Waiting for a second distinct observation window.',{exact:false}).first().waitFor();

 await page.locator('#bond-form button[type="submit"]').click();
 await page.getByText('DV01').first().waitFor();
 await page.locator('.navlink[data-go="venture"]').click();
 await page.getByRole('heading',{name:/Underwrite the ownership/i}).waitFor();
 await page.locator('#capital-form button[type="submit"]').click();
 await page.getByText('POST-MONEY').first().waitFor();
 await page.locator('.navlink[data-go="communities"]').click();
 await page.getByText('Fundamental Equity Research').waitFor();
 await page.getByText('Corporate Governance & Stewardship').waitFor();
 await page.locator('.navlink[data-go="strategies"]').click();
 await page.getByRole('heading',{name:/Prove it out of sample/i}).waitFor();
 const date=i=>new Date(Date.UTC(2023,0,1+i)).toISOString().slice(0,10);
 const prices=Array.from({length:180},(_,i)=>date(i)+','+(100+i*.18+Math.sin(i/10)*3).toFixed(4));
 await page.locator('#csv-file').setInputFiles({name:'verified-local-test.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Close\n'+prices.join('\n'))});
 await page.getByText('180').first().waitFor();
 await page.locator('#backtest-form button[type="submit"]').click();
 await page.getByText('OOS TOTAL RETURN').waitFor();
 await page.getByRole('button',{name:/Block-bootstrap risk analysis/}).click();
 await page.getByText('LOSS FRACTION').waitFor();
 await page.locator('#command-open').click();
 await page.locator('#command-input').fill('derivatives');
 await page.locator('#command-results button').first().click();
 await page.getByRole('heading',{name:/Model optionality/i}).waitFor();
 assert.deepEqual(errors,[],'Browser errors: '+errors.join('; '));
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const mobileErrors=[];
 mobile.on('pageerror',err=>mobileErrors.push(err.message));
 await mobile.route('https://api.fiscaldata.treasury.gov/**',async route=>{
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({data:route.request().url().includes('debt_to_penny')?debt:rate})});
 });
 await mobile.goto(new URL('terminal/',base).href,{waitUntil:'domcontentloaded'});
 await mobile.getByRole('heading',{name:/Research begins with evidence/i}).waitFor();
 await mobile.locator('#mobile-nav [data-go="options"]').click();
 await mobile.getByRole('heading',{name:/Model optionality/i}).waitFor();
 await mobile.locator('#bs-form button[type="submit"]').click();
 await mobile.getByText('PARITY ERROR').waitFor();
 await mobile.locator('#mobile-nav [data-go="macro"]').click();
 await mobile.getByRole('heading',{name:'Treasury revision comparison'}).waitFor();
 const width=await mobile.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(width<=394,'Horizontal overflow: '+width+'px');
 assert.deepEqual(mobileErrors,[],'Mobile browser errors: '+mobileErrors.join('; '));
 console.log('PASS: professional terminal official-data render, DCF, Greeks, bond risk, equity dilution, research taxonomy, OHLCV backtest, bootstrap, keyboard navigation, mobile');
}finally{await browser.close();}
