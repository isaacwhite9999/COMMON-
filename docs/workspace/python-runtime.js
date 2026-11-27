(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.CommonPython=api;})(globalThis,function(){'use strict';
const VERSION='0.27.7',BASE='https://cdn.jsdelivr.net/pyodide/v'+VERSION+'/full/';
const packages=Object.freeze(['numpy','pandas','scipy','statsmodels']);
// Selected package records and their dependencies from the pinned release lockfile.
const lockSha256='9c45b916001a750f4102fc287494f3eab215909c7535c626a20db80fd6333e2c';
const packagePins={
  "numpy":{"version":"2.0.2","sha256":"ebb61241d962b98b21597d7ce43b67668a6d5bab3acec4fbe958657320d7cd08","dependencies":[]},
  "openblas":{"version":"0.3.26","sha256":"787ea9a8a5cd160204388d03324b3b7ce5c9aea14b5680cec987f837e76c5198","dependencies":[]},
  "packaging":{"version":"24.2","sha256":"fbf6a5ace596eb8e28fe0089ecfc0bca2eb3930563e9ca06acb98ea5302b99f7","dependencies":[]},
  "pandas":{"version":"2.2.3","sha256":"5502f0f94f93a482b851d0b8ca43be692c1b8d20215a168313656847ff74d63a","dependencies":["numpy","python-dateutil","pytz"]},
  "patsy":{"version":"0.5.6","sha256":"e52b38b82b8e67a78d8f7b0e38a3a9a22ee16e029e853434e700e7acb617b67b","dependencies":["numpy","six"]},
  "python-dateutil":{"version":"2.9.0.post0","sha256":"02811ea3714f6697d639c07dc5ec63f5774dc7a688e4e1cbbe9beb2f33c3e6c9","dependencies":["six"]},
  "pytz":{"version":"2024.1","sha256":"fcfc168155da8d19057b17bee735fef71dc3a39f1dccd83514e16ecc6abaddc4","dependencies":[]},
  "scipy":{"version":"1.14.1","sha256":"997c50a61564a8ce6a56ea98a42e7f4427e5eb98475a73233e83df6a184f415c","dependencies":["numpy","openblas"]},
  "six":{"version":"1.16.0","sha256":"f61235bc3a15086f0369585e5071ae9ba0bd244a111d12b37f683862e6850c0a","dependencies":[]},
  "statsmodels":{"version":"0.14.4","sha256":"4c89f4c9146b142216126042af0eb3927d5912485a50bfd333def06c5ad5fd8d","dependencies":["numpy","scipy","pandas","patsy","packaging"]},
};
function validatePackages(libs){
  if(!Array.isArray(libs)||libs.some(name=>!packages.includes(name)))throw Error('Unsupported package.');
  return [...new Set(libs)];
}
function environment(libs){
  const requested=validatePackages(libs).sort();
  const resolved=new Set();
  function visit(name){
    if(resolved.has(name))return;
    resolved.add(name);
    for(const dependency of packagePins[name].dependencies)visit(dependency);
  }
  for(const name of requested)visit(name);
  return {
    schemaVersion:1,
    runtime:{name:'Pyodide',version:VERSION,python:'3.12.7',architecture:'wasm32',platform:'emscripten_3_1_58'},
    lock:{url:BASE+'pyodide-lock.json',sha256:lockSha256},
    requested,
    dependencies:[...resolved].sort().map(name=>{
      const pin=packagePins[name];
      return {name,version:pin.version,sha256:pin.sha256,dependencies:[...pin.dependencies]};
    }),
  };
}
function packageVersion(name){
  return packages.includes(name)?packagePins[name].version:undefined;
}
function input(code,libs){if(typeof code!=='string'||!code.trim()||code.length>40000)throw Error('Provide 1–40,000 characters of Python source.');return {code,libs:validatePackages(libs)};}
function workerMain(){let started=false;self.onmessage=async e=>{if(started)return;started=true;const {code,libs,base}=e.data;let output='',truncated=false;const append=(prefix,t)=>{const s=prefix+String(t)+'\n';if(output.length+s.length>24000){output+=(s.slice(0,Math.max(0,24000-output.length)));truncated=true;}else output+=s;};try{importScripts(base+'pyodide.js');const py=await loadPyodide({indexURL:base});py.setStdout({batched:t=>append('',t)});py.setStderr({batched:t=>append('[stderr] ',t)});if(libs.length)await py.loadPackage(libs);self.postMessage({type:'running'});const result=await py.runPythonAsync(code);if(result!==undefined&&result!==null){append('[result] ',String(result));if(typeof result.destroy==='function')result.destroy();}self.postMessage({type:'result',ok:true,output,truncated});}catch(err){append('[error] ',err?.message||String(err));self.postMessage({type:'result',ok:false,output,truncated});}};}
function frameMain(){let worker=null,used=false;window.addEventListener('message',e=>{if(e.source!==parent||used||e.data?.type!=='common-python-start')return;used=true;const {nonce,code,libs,workerSource,base}=e.data;try{const blob=new Blob([workerSource],{type:'text/javascript'}),url=URL.createObjectURL(blob);worker=new Worker(url);URL.revokeObjectURL(url);worker.onmessage=x=>{const v=x.data;if(v?.type==='running')parent.postMessage({nonce,type:'running'},'*');if(v?.type==='result'){worker.terminate();parent.postMessage({nonce,type:'result',ok:v.ok===true,output:String(v.output??'').slice(0,24000),truncated:v.truncated===true},'*');}};worker.onerror=()=>{worker?.terminate();parent.postMessage({nonce,type:'result',ok:false,output:'Python worker failed to start.',truncated:false},'*');};worker.postMessage({code,libs,base});}catch(err){parent.postMessage({nonce,type:'result',ok:false,output:'Sandbox initialization failed: '+String(err.message||err),truncated:false},'*');}});parent.postMessage({type:'common-python-ready'},'*');}
function frameDocument(){const csp="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net/pyodide/v"+VERSION+"/full/; connect-src https://cdn.jsdelivr.net/pyodide/v"+VERSION+"/full/; worker-src blob:; child-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; img-src 'none'; media-src 'none'";return '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+csp+'"></head><body><script>('+frameMain.toString()+')();<'+ '/script></body></html>';}
function execute(code,libs,onState=()=>{}){const request=input(code,libs),manifest=environment(request.libs),nonce=crypto.randomUUID(),frame=document.createElement('iframe');frame.setAttribute('sandbox','allow-scripts');frame.referrerPolicy='no-referrer';frame.hidden=true;frame.title='Isolated local Python execution';let stop;const promise=new Promise(resolve=>{let timer,done=false,prepared=false;const finish=(out)=>{if(done)return;done=true;clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();resolve({...out,version:VERSION,at:new Date().toISOString(),environment:{...manifest,prepared}});};stop=()=>finish({ok:false,output:'Execution cancelled.',truncated:false});function receive(e){if(e.source!==frame.contentWindow||e.origin!=='null')return;const m=e.data;if(m?.type==='common-python-ready'){frame.contentWindow.postMessage({type:'common-python-start',nonce,...request,base:BASE,workerSource:'('+workerMain.toString()+')();'},'*');return;}if(m?.nonce!==nonce)return;if(m.type==='running'){prepared=true;onState('Executing Python…');return;}if(m.type==='result')finish({ok:m.ok===true,output:String(m.output??'').slice(0,24000),truncated:m.truncated===true});}window.addEventListener('message',receive);timer=setTimeout(()=>finish({ok:false,output:'Execution exceeded the 90-second limit (including runtime download).',truncated:false}),90000);onState('Loading isolated Python runtime…');frame.srcdoc=frameDocument();document.body.appendChild(frame);});return {promise,cancel:()=>stop?.()};}
return {VERSION,BASE,packages,packageVersion,input,environment,frameDocument,execute};});
