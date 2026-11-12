/* COMMON Analytical Methods v1. Mathematical implementations are independent.
   Educational models only. No quotes or recommendations are implied. */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.COMMON_FINANCE=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const sq=Math.sqrt, exp=Math.exp,ln=Math.log,PI=Math.PI;
 const phi=x=>exp(-x*x/2)/sq(2*PI);
 function cdf(x){
   // Standard normal CDF: 5th-order Abramowitz-Stegun approximation.
   const z=Math.abs(x),k=1/(1+0.2316419*z);
   const tail=phi(z)*(0.319381530*k-0.356563782*k*k+
    1.781477937*k**3-1.821255978*k**4+1.330274429*k**5);
   return x>=0?1-tail:tail;
 }
 function num(name,value,min,max){
   const n=Number(value);
   if(!Number.isFinite(n)||n<min||n>max)throw Error(name+' must be between '+min+' and '+max+'.');
   return n;
 }
 function blackScholes(input={}){
   const S=num('Underlying price',input.spot,0.01,1e9);
   const K=num('Strike price',input.strike,0.01,1e9);
   const days=num('Days to expiration',input.days,1,3650);
   const sigma=num('Implied volatility (%)',input.ivPct,0.01,500)/100;
   const r=num('Risk-free rate (%)',input.ratePct,-20,100)/100;
   const q=num('Dividend yield (%)',input.divPct??0,0,100)/100;
   const T=days/365,rootT=sq(T),d1=(ln(S/K)+(r-q+sigma*sigma/2)*T)/(sigma*rootT),
     d2=d1-sigma*rootT;
   const discountR=exp(-r*T),discountQ=exp(-q*T);
   const call=S*discountQ*cdf(d1)-K*discountR*cdf(d2);
   const put=K*discountR*cdf(-d2)-S*discountQ*cdf(-d1);
   const gamma=discountQ*phi(d1)/(S*sigma*rootT),vega=S*discountQ*phi(d1)*rootT/100;
   const thetaCommon=-S*phi(d1)*sigma*discountQ/(2*rootT);
   const thetaCall=(thetaCommon-r*K*discountR*cdf(d2)+q*S*discountQ*cdf(d1))/365;
   const thetaPut=(thetaCommon+r*K*discountR*cdf(-d2)-q*S*discountQ*cdf(-d1))/365;
   return {call:{price:call,delta:discountQ*cdf(d1),gamma,vega,theta:thetaCall,
     rho:K*T*discountR*cdf(d2)/100,breakeven:K+call},
    put:{price:put,delta:discountQ*(cdf(d1)-1),gamma,vega,theta:thetaPut,
      rho:-K*T*discountR*cdf(-d2)/100,breakeven:K-put},
    assumptions:{spot:S,strike:K,days,ivPct:sigma*100,ratePct:r*100,divPct:q*100},
    parityError:(call-put)-(S*discountQ-K*discountR),
    note:'European option, constant volatility/rates and continuous dividend yield. No American exercise, bid-ask spreads, fees, market microstructure, skew, or stochastic volatility. Prices are theoretical scenarios, not quotes.'};
 }
 function dcf(input={}){
   const fcf=num('Base annual free cash flow (billions)',input.fcf,-10000,10000);
   const growth=num('Annual cash flow growth (%)',input.growthPct,-95,300)/100;
   const wacc=num('WACC (%)',input.waccPct,0.1,100)/100;
   const terminal=num('Terminal growth (%)',input.terminalPct,-20,50)/100;
   const netDebt=num('Net debt (billions)',input.netDebt,-1e6,1e6);
   const shares=num('Diluted shares (billions)',input.shares,0.000001,1e5);
   if(wacc<=terminal)throw Error('WACC must exceed terminal growth for a finite Gordon terminal value.');
   const projections=[];
   let pv=0;
   for(let year=1;year<=5;year++){
     const flow=fcf*Math.pow(1+growth,year),discount=flow/Math.pow(1+wacc,year);
     pv+=discount;projections.push({year,fcf:flow,pv:discount});
   }
   const terminalValue=projections[4].fcf*(1+terminal)/(wacc-terminal);
   const pvTerminal=terminalValue/Math.pow(1+wacc,5),enterprise=pv+pvTerminal,
     equity=enterprise-netDebt,perShare=equity/shares;
   const matrix=[];
   for(const w of [wacc-.01,wacc,wacc+.01]){
     for(const t of [terminal-.005,terminal,terminal+.005]){
       let value=null;
       if(w>0&&w>t){
         const pvFive=projections.reduce((s,p)=>s+p.fcf/Math.pow(1+w,p.year),0);
         const terminalCash=projections[4].fcf*(1+t)/(w-t);
         value=(pvFive+terminalCash/Math.pow(1+w,5)-netDebt)/shares;
       }
       matrix.push({waccPct:w*100,terminalPct:t*100,perShare:value});
     }
   }
   return {projections,pvFiveYears:pv,pvTerminal,enterpriseValue:enterprise,
     equityValue:equity,intrinsicPerShare:perShare,terminalWeight:pvTerminal/enterprise,matrix,
     warnings:['User-supplied assumptions; no financial statements are automatically retrieved.',
     'Discounted cash flow is sensitive to WACC, terminal growth and cyclicality.',
     'Use enterprise free cash flow with WACC and subtract net debt; do not substitute earnings or sales.']};
 }
 function capTable(input={}){
   const pre=num('Pre-money valuation',input.pre,0.01,1e12);
   const invested=num('New investment',input.invested,0.001,1e12);
   const founderPct=num('Existing shareholder ownership (%)',input.holdingPct??100,0,100);
   const post=pre+invested;
   return {preMoney:pre,newCapital:invested,postMoney:post,newInvestorOwnership:invested/post,
     existingHoldersOwnership:pre/post,existingShareholderAfter:founderPct/100*pre/post,
     founderDilutionPctPoints:founderPct-(founderPct*pre/post),
     note:'Simplified priced equity round with no employee-option pool expansion, convertible notes, SAFE conversion, preference rights, fees or follow-on investments.'};
 }
 function bondRisk(input={}){
   const face=num('Face value',input.face??1000,1,1e9);
   const coupon=num('Annual coupon rate (%)',input.couponPct,0,100)/100;
   const yieldAnnual=num('Yield to maturity (%)',input.yieldPct,-50,100)/100;
   const maturity=num('Years to maturity',input.years,0.5,100);
   const freq=Number(input.frequency??2);
   if(![1,2,4,12].includes(freq))throw Error('Frequency must be 1, 2, 4 or 12 payments per year.');
   const n=maturity*freq;if(!Number.isInteger(n))throw Error('Maturity must align with the coupon frequency.');
   if(1+yieldAnnual/freq<=0)throw Error('Yield is too negative for the compounding convention.');
   const c=face*coupon/freq;
   let price=0,weighted=0,convex=0;
   const cashflows=[];
   for(let i=1;i<=n;i++){
     const time=i/freq,cash=c+(i===n?face:0),
       pv=cash/Math.pow(1+yieldAnnual/freq,i);
     price+=pv;weighted+=time*pv;
     convex+=i*(i+1)*pv/(freq*freq*Math.pow(1+yieldAnnual/freq,2));
     cashflows.push({time,cash,pv});
   }
   const macaulay=weighted/price,modified=macaulay/(1+yieldAnnual/freq);
   return {price,macaulayDuration:macaulay,modifiedDuration:modified,
     dollarDuration:modified*price,dv01:modified*price/10000,
     convexity:convex/price,cashflows,
     caveat:'Fixed-rate bullet bond, flat yield and reinvestment assumptions. Excludes accrued interest, credit spread, optionality, floating rates and taxes.'};
 }
 return {cdf,blackScholes,dcf,capTable,bondRisk,VERSION:'common-finance-v1'};
});
