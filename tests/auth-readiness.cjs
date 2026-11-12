/* Read-only COMMON Auth readiness check. Never prints API keys or user data. */
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('docs/config.js','utf8'),sandbox,{timeout:2000});
const config=sandbox.window.COMMON_CONFIG;
if(!config?.supabaseUrl||!config?.supabaseAnonKey)throw Error('Public Supabase client not configured');
(async()=>{
 const controller=new AbortController();const abort=setTimeout(()=>controller.abort(),12000);
 try{
  const url=new URL('/auth/v1/settings',config.supabaseUrl);
  const response=await fetch(url,{headers:{apikey:config.supabaseAnonKey,Accept:'application/json'},
    signal:controller.signal,redirect:'error'});
  let json=null;
  try{json=await response.json()}catch{}
  const summary={httpStatus:response.status,authServiceResponded:response.ok,
    googleProviderEnabled:json?.external?.google===true,
    externalProvidersDetected:json?.external?Object.entries(json.external).filter(([,v])=>v===true).map(([k])=>k):[],
    emailProviderEnabled:json?.external?.email===true,
    providerCheckedAt:new Date().toISOString(),
    signupDisabled:json?.disable_signup??null,
    expectedSupabaseCallback:new URL('/auth/v1/callback',config.supabaseUrl).href,
    appRedirect:'https://isaacwhite9999.github.io/COMMON-/live/'
  };
  console.log(JSON.stringify(summary,null,2));
  if(!response.ok)process.exitCode=1;
 }catch(err){console.error('Unable to check public Auth settings:',String(err.message).slice(0,250));process.exitCode=1;}
 finally{clearTimeout(abort);}
})();
