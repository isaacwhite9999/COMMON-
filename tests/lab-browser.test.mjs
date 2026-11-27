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
 const data={research_workspaces:[],research_experiments:[],
  research_learning_progress:JSON.parse(sessionStorage.getItem('test-learning-progress')||'[]')};
 window.failExerciseSave=false;
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
      if(table==='research_learning_progress'&&value.lesson_key.startsWith('exercise-')&&window.failExerciseSave) {
       window.failExerciseSave=false;
       return Promise.resolve({data:null,error:{message:'Test connection failure'}}).then(resolve,reject);
      }
      const i=rows.findIndex(r=>r.user_id===value.user_id&&r.lesson_key===value.lesson_key);
      if(i<0)rows.push(value);else rows[i]={...rows[i],...value};result=value;
      if(table==='research_learning_progress')sessionStorage.setItem('test-learning-progress',JSON.stringify(rows));
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
 await page.route('**/config.js',route=>route.fulfill({
  contentType:'text/javascript',
  body:'window.COMMON_CONFIG = {communityBackendReady:true,supabaseUrl:"https://example.invalid",supabaseAnonKey:"test-key"};'
 }));
 await page.route('**/supabase.min.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:stub}));
 await page.goto(new URL('lab/',base).href,{waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Think rigorously. Invest independently.'}).waitFor({timeout:25000});
 await page.getByRole('button',{name:'Create project'}).click();
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
 await page.getByRole('button',{name:'Mark lesson complete'}).click();
 await page.getByRole('button',{name:'Mark incomplete'}).waitFor();

 // SOCIAL-195: enforce a selection, score both outcomes, and retry a failed save.
 const exercise=page.locator('#exercise-form');
 const feedback=exercise.getByRole('status');
 await exercise.getByRole('button',{name:'Check answer'}).click();
 assert.equal(await feedback.textContent(),'');
 await exercise.getByRole('radio',{name:'Monday close to Tuesday close'}).check();
 await exercise.getByRole('button',{name:'Check answer'}).click();
 await feedback.getByText('Score: 0 / 1.',{exact:false}).waitFor();
 assert.ok(await exercise.getByRole('radio',{name:'Monday close to Tuesday close'}).isChecked());
 await page.evaluate(()=>window.failExerciseSave=true);
 await exercise.getByRole('radio',{name:'Tuesday close to Wednesday close'}).check();
 await exercise.getByRole('button',{name:'Check answer'}).click();
 await feedback.getByText('Progress could not be saved.',{exact:false}).waitFor();
 await exercise.getByRole('button',{name:'Check answer'}).click();
 await feedback.getByText('Exercise completion saved.',{exact:false}).waitFor();
 assert.match(await feedback.textContent(),/Score: 1 \/ 1.*Tuesday-to-Wednesday/);
 await page.getByRole('button',{name:/Include trading costs/}).click();
 assert.equal(await feedback.textContent(),'');
 await exercise.getByRole('radio',{name:'0.70%',exact:true}).check();
 await exercise.getByRole('button',{name:'Check answer'}).click();
 await feedback.getByText('Exercise completion saved.',{exact:false}).waitFor();
 assert.match(await feedback.textContent(),/Score: 1 \/ 1.*0\.70%/);
 assert.deepEqual(jsErrors,[],'JavaScript exceptions in Research Studio: '+jsErrors.join('; '));
 await page.setViewportSize({width:390,height:844});
 await page.reload({waitUntil:'domcontentloaded'});
 await page.getByRole('heading',{name:'Think rigorously. Invest independently.'}).waitFor();
 const lessons=page.locator('.lab-stat').filter({hasText:'Lessons completed'});
 assert.equal(await lessons.locator('strong').textContent(),'1 / 8');
 await page.getByRole('button',{name:/Instructor/}).first().click();
 await page.getByRole('button',{name:/Avoid lookahead bias/}).click();
 assert.equal(await feedback.textContent(),'Exercise completion saved.');
 const w=await page.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(w<=394,'Mobile instructor horizontal overflow '+w+'px');
 assert.deepEqual(jsErrors,[],'Research Studio mobile JavaScript errors');
 console.log('PASS research browser flow: projects, real CSV import, backtest, Monte Carlo, save, instructor, scored exercises, mobile');
} finally {await browser.close();}
