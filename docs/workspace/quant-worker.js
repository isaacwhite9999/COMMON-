importScripts('../lab/research-engine.js','quant.js','risk.js');

function parseSource(source){
 if(typeof source!=='string'||source.length>16_000_000)throw Error('Dataset is too large.');
 return COMMON_RESEARCH_ENGINE.parseCsv(source);
}

self.onmessage=async event=>{
 try{
  const {source,name,config,operation,assets}=event.data;
  if(operation==='allocation'){
   if(!Array.isArray(assets)||assets.length<2||assets.length>8)throw Error('Choose two to eight distinct datasets.');
   const inputs=assets.map(({id,label,weight,source})=>{
    const {bars,diagnostics}=parseSource(source);
    return {id,label,weight,bars,adjustedClose:diagnostics.hasAdjustedClose};
   });
   self.postMessage({ok:true,result:CommonRisk.optimize(inputs,config)});
   return;
  }
  const parsed=parseSource(source);
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
  const sha256=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const result=CommonQuant.walkForward(parsed.bars,config);
  self.postMessage({ok:true,result:{
   id:crypto.randomUUID(),at:new Date().toISOString(),dataset:{name,sha256,diagnostics:parsed.diagnostics},...result,
  }});
 }catch(error){
  self.postMessage({ok:false,error:String(error.message||error)});
 }
};
