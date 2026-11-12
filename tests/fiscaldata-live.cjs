'use strict';
const endpoint='https://api.fiscaldata.treasury.gov/services/api/fiscal_service';
const requests={
 debt:'/v2/accounting/od/debt_to_penny?fields=record_date,tot_pub_debt_out_amt&sort=-record_date&page%5Bsize%5D=80',
 rates:'/v2/accounting/od/avg_interest_rates?fields=record_date,security_desc,avg_interest_rate_amt&filter=security_desc:eq:Treasury%20Bills&sort=-record_date&page%5Bsize%5D=72'
};
(async()=>{
 for(const [name,url] of Object.entries(requests)){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{
   const res=await fetch(endpoint+url,{signal:controller.signal,headers:{Accept:'application/json'}});
   if(!res.ok)throw Error(name+' endpoint returned '+res.status);
   const j=await res.json(),row=j.data?.[0];
   if(!row?.record_date||!j.data?.length)throw Error(name+' missing dated observations');
   if(name==='debt'&&!Number.isFinite(Number(row.tot_pub_debt_out_amt)))throw Error('Invalid debt data');
   if(name==='rates'&&!Number.isFinite(Number(row.avg_interest_rate_amt)))throw Error('Invalid rate data');
   console.log(JSON.stringify({source:'US Treasury Fiscal Data',dataset:name,records:j.data.length,latestDate:row.record_date,latestType:row.security_desc||null,latestValue:name==='rates'?row.avg_interest_rate_amt:row.tot_pub_debt_out_amt,corsAllowedOrigin:res.headers.get('access-control-allow-origin')||null}));
  }finally{clearTimeout(timer)}
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
