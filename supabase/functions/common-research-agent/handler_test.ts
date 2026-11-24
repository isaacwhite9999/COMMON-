import {handleResearch} from "./handler.ts";
const vars:Record<string,string>={COMMON_AGENT_ENABLED:"true",COMMON_AGENT_ORIGIN:"https://common.example",COMMON_AGENT_MODEL:"test-model",SUPABASE_URL:"https://supabase.example",SUPABASE_ANON_KEY:"test",OPENAI_API_KEY:"test",UPSTASH_REDIS_REST_URL:"https://redis.example",UPSTASH_REDIS_REST_TOKEN:"test",COMMON_AGENT_PILOT_USERS:"pilot"};
const assert=(condition:unknown)=>{if(!condition)throw Error("Assertion failed")};
function request(body:unknown,auth=true){return new Request("https://function.example",{method:"POST",headers:{"Content-Type":"application/json",Origin:vars.COMMON_AGENT_ORIGIN,...(auth?{Authorization:"Bearer test.jwt"}:{})},body:JSON.stringify(body)})}
Deno.test("authentication, opt-in, quota and provider isolation",async()=>{
 let providerCalls=0,quota=1;
 const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.includes("/auth/v1/user"))return Response.json({id:"pilot"});if(url===vars.UPSTASH_REDIS_REST_URL)return Response.json({result:quota});if(url==="https://api.openai.com/v1/responses"){providerCalls++;const p=JSON.parse(String(init?.body));assert(p.store===false&&p.max_output_tokens===1800);return Response.json({status:"completed",output:[{type:"message",content:[{type:"output_text",text:"Evidence needs verification."}]}]})}throw Error("Unexpected URL")}) as typeof fetch;
 const deps={env:(k:string)=>vars[k],fetch:fetcher},input={mode:"review",input:"Review the supplied test evidence and assumptions.",consent:true};
 assert((await handleResearch(request(input,false),deps)).status===401);
 assert((await handleResearch(request({...input,consent:false}),deps)).status===400);
 quota=0;assert((await handleResearch(request(input),deps)).status===429);assert(providerCalls===0);
 quota=1;const result=await handleResearch(request(input),deps);assert(result.status===200);assert((await result.json()).text==="Evidence needs verification.");assert(providerCalls===1);
 const disabled={...deps,env:(k:string)=>k==="COMMON_AGENT_ENABLED"?"false":vars[k]};assert((await handleResearch(request(input),disabled)).status===503);
});
