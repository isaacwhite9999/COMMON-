/* Chromium integration smoke for the production Research Studio UI.
 * This test uses an in-memory Supabase mock to verify browser interactions;
 * Postgres CI and live transactional SQL separately verify real persistence/RLS.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.COMMON_SITE_URL||'http://127.0.0.1:8765/';
const browser=await chromium.launch({headless:true});
const stub=String.raw`
(() => {
 const userId='11111111-1111-4111-8111-111111111111';
 const data={research_workspaces:[],research_experiments:[],research_learning_progress:[]};
 let index=0;
 function make(table){
  let op='read',value=null,filters=[],max=Infinity,one=false;
  const b={
   select(){return b;},
   eq(col,val){filters.push([col,val]);return b;},
   order(){return b;},
   limit(n){max=n;return b;},
   single(){one=true;return b;},
   insert(row){op='insert';value=row;return b;},
   upsert(row){op='upsert';value=row;return b;},
   update(row){op='update';value=row;return b;},
   delete(){op='delete';return b;},
   then(resolve,reject){
    let rows=data[table]||[];
    const allowed=r=>filters.every(([k,v])=>r[k]===v);
    let result=null;
    if(op==='insert'){
      const fresh={...value,id:value.id||'00000000-0000-4000-8000-'+String(++index).padStart(12,'0'),
       updated_at:new Date().toISOString(),created_at:new Date().toISOString()};
      rows.push(fresh);result=fresh;
    }else if(op==='upsert'){
      const i=rows.findIndex(r=>r.user_id===value.user_id&&r.lesson_key===value.lesson_key);
      if(i<0)rows.push(value);else rows[i]={...rows[i],...value};result=value;
    }else if(op==='update'){
      rows=rows.map(r=>allowed(r)?{...r,...value,updated_at:new Date().toISOString()}:r);
      data[table]=rows;result=rows.filter(allowed);
    }else if(op==='delete'){
      const deleted=rows.filter(allowed);data[table]=rows.filter(r=>!allowed(r));result=deleted;
    }else{
      result=rows.filter(allowed).slice(0,max);
      if(one)result=result[0]||null;
    }
    return Promise.resolve({data:result,error:null}).then(resolve,reject);
   }
  };
  return b;
 }
 window.supabase={createClient:()=>({
  auth:{getSession:async()=>({data:{session:{user:{id:userId,email:'ci@example.test'}}},error:null}),
   onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},
  from:make
 })};
})();
`;
try {
 const page=await browser.newPage({viewport:{width:1365,height:900}});
 const jsErrors=[];
 page.on('pageerror',err=>jsErrors.push(err.message));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:stub}));
 await page.goto(new URL('lab/',base).href,{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Think rigorously. Invest independently.'}).waitFor({timeout:25000});
 await page.getByRole('button',{name:'New research project'}).click();
 await page.locator('#create-form [name=title]').fill('Independent SMA research');
 await page.locator('#create-form [name=hypothesis]').fill('A lagged trend rule may improve holdout outcomes after costs.');
 await page.locator('#create-form button[type=submit]').click();
 await page.getByRole('heading',{name:'Workspace notes'}).waitFor();
 await page.getByRole('button',{name:/Data desk/}).first().click();
 const date=(i)=>new Date(Date.UTC(2023,0,1+i)).toISOString().slice(0,10);
 const lines=Array.from({length:180},(_,i)=>date(i)+','+(100+i*.2+Math.sin(i/8)*2).toFixed(4));
 await page.locator('#price-file').setInputFiles({name:'observed-prices.csv',mimeType:'text/csv',buffer:Buffer.from('Date,Close\n'+lines.join('\n'))});
 await page.getByRole('heading',{name:'Import diagnostics'}).waitFor({timeout:15000});
 assert.match(await page.locator('#lab-root').innerText(),/180/);
 await page.getByRole('button',{name:/Strategy lab/}).click();
 await page.locator('#run-form button[type=submit]').click();
 await page.getByRole('heading',{name:'Computed result'}).waitFor();
 await page.getByRole('button',{name:'Inspect validation'}).click();
 await page.getByRole('button',{name:'Compute 300 scenarios'}).click();
 await page.getByText('Fraction with loss').waitFor();
 await page.getByRole('button',{name:'Save this experiment'}).click();
 await page.getByText('Experiment saved as a private').waitFor();
 await page.getByText('observed-prices.csv').waitFor();
 await page.getByRole('button',{name:/Instructor/}).first().click();
 await page.getByRole('heading',{name:'Research instructor'}).waitFor();
 await page.getByRole('button',{name:/Avoid lookahead bias/}).click();
 await page.getByText(/Signals from bar/).waitFor();
 assert.deepEqual(jsErrors,[],'JavaScript exceptions in Research Studio: '+jsErrors.join('; '));
 await page.setViewportSize({width:390,height:844});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Think rigorously. Invest independently.'}).waitFor();
 const w=await page.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(w<=394,'Mobile horizontal overflow '+w+'px');
 assert.deepEqual(jsErrors,[],'Research Studio mobile JavaScript errors');
 console.log('PASS research browser flow: projects, real CSV import, backtest, Monte Carlo, save, instructor, mobile');
} finally {await browser.close();}
