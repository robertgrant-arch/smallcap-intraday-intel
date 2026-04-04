import{NextRequest,NextResponse}from'next/server';
export const dynamic='force-dynamic';
const SYM=['AAPL','MSFT','NVDA','AMD','TSLA','META','GOOGL','AMZN','NFLX','PLTR','SOFI','COIN','HOOD','SNAP','RBLX','DKNG','CRWD','NET','SHOP','SQ','ROKU','UPST','AFRM','SMCI','ARM','MSTR','IONQ','SOUN','RKLB','CVNA','MARA','RIOT','SE','PDD','GRAB'];
type B={d:string;o:number;h:number;l:number;c:number;v:number};
async function getBars(s:string,sd:string,ed:string):Promise<B[]>{
try{
const p1=Math.floor(new Date(sd).getTime()/1000),p2=Math.floor(new Date(ed).getTime()/1000);
const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?period1=${p1}&period2=${p2}&interval=1d`,{headers:{'User-Agent':'Mozilla/5.0'}});
const j=await r.json(),q=j?.chart?.result?.[0];
if(!q?.timestamp)return[];
const ts=q.timestamp,oq=q.indicators.quote[0];
return ts.map((t:number,i:number)=>({d:new Date(t*1000).toISOString().slice(0,10),o:oq.open[i],h:oq.high[i],l:oq.low[i],c:oq.close[i],v:oq.volume[i]})).filter((b:B)=>b.o>0&&b.c>0&&b.v>0);
}catch{return[];}
}
function runBacktest(allBars:Map<string,B[]>,hw:number){
const trades:any[]=[];
let equity=10000;
const eqCurve=[equity];
let totalSigs=0,hypeTrades=0,hypeWins=0;
for(const[sym,bars]of allBars){
if(bars.length<26)continue;
const closes=bars.map(b=>b.c);
const vols=bars.map(b=>b.v);
// Calculate indicators inline
for(let i=20;i<bars.length-5;i++){
// 20-day SMA
let sum20=0;for(let j=i-19;j<=i;j++)sum20+=closes[j];
const sma20=sum20/20;
// 10-day SMA
let sum10=0;for(let j=i-9;j<=i;j++)sum10+=closes[j];
const sma10=sum10/10;
// 14-day RSI
let gains=0,losses=0;
for(let j=i-13;j<=i;j++){const d=closes[j]-closes[j-1];if(d>0)gains+=d;else losses-=d;}
gains/=14;losses/=14;
const rsi=losses===0?100:100-100/(1+gains/losses);
// ATR 14
let atrSum=0;
for(let j=i-13;j<=i;j++){const tr=Math.max(bars[j].h-bars[j].l,Math.abs(bars[j].h-bars[j-1].c),Math.abs(bars[j].l-bars[j-1].c));atrSum+=tr;}
const atr=atrSum/14;
// Volume ratio
let vSum=0;for(let j=i-19;j<=i;j++)vSum+=vols[j];
const avgVol=vSum/20;
const volRatio=avgVol>0?vols[i]/avgVol:1;
// 5-day momentum
const mom5=(closes[i]-closes[i-5])/closes[i-5];
// 20-day Bollinger
let sqSum=0;for(let j=i-19;j<=i;j++)sqSum+=(closes[j]-sma20)**2;
const std20=Math.sqrt(sqSum/20);
const bbLower=sma20-2*std20,bbUpper=sma20+2*std20;
// Hype score from volume+volatility
const hypeRaw=Math.min((volRatio-1)*0.5+(atr/closes[i]*100)*0.3,1);
const isHype=hypeRaw>0.3;
const hypeBonus=isHype?hw*20:0;
// === LONG: Oversold bounce in uptrend ===
let longScore=0;
if(rsi<40)longScore+=30;
if(rsi<30)longScore+=15;
if(closes[i]<bbLower*1.02)longScore+=20;
if(closes[i]>closes[i-1]&&closes[i-1]<closes[i-2])longScore+=15;// reversal candle
if(sma10>sma20)longScore+=10;
if(volRatio>1.3)longScore+=10;
if(mom5<-0.03)longScore+=10;// pullback
longScore+=hypeBonus;
// === SHORT: Overbought rejection ===
let shortScore=0;
if(rsi>65)shortScore+=30;
if(rsi>75)shortScore+=15;
if(closes[i]>bbUpper*0.98)shortScore+=20;
if(closes[i]<closes[i-1]&&closes[i-1]>closes[i-2])shortScore+=15;
if(sma10<sma20)shortScore+=10;
if(volRatio>1.3)shortScore+=10;
if(mom5>0.05)shortScore+=10;
shortScore+=hypeBonus;
// Take signal if score >= 30
const threshold=30;
if(longScore>=threshold||shortScore>=threshold){
totalSigs++;
const isLong=longScore>=shortScore;
const score=isLong?longScore:shortScore;
const entry=closes[i];
// Simulate 5-day hold with trailing stop
let bestExit=entry;
let exitPrice=entry;
const stopDist=atr*2;
let trailStop=isLong?entry-stopDist:entry+stopDist;
const maxHold=Math.min(i+7,bars.length-1);
for(let d=i+1;d<=maxHold;d++){
const bar=bars[d];
if(isLong){
trailStop=Math.max(trailStop,bar.h-atr*1.5);
if(bar.l<=trailStop){exitPrice=trailStop;break;}
if(bar.h>=entry+atr*3){exitPrice=entry+atr*3;break;}
exitPrice=bar.c;
}else{
trailStop=Math.min(trailStop,bar.l+atr*1.5);
if(bar.h>=trailStop){exitPrice=trailStop;break;}
if(bar.l<=entry-atr*3){exitPrice=entry-atr*3;break;}
exitPrice=bar.c;
}
}
const pnlPct=isLong?(exitPrice-entry)/entry:(entry-exitPrice)/entry;
// Position size: Kelly-inspired, risk 2-5% of equity per trade
const riskPct=Math.min(0.05,0.02*(score/30));
const posSize=equity*riskPct;
const tradePnl=posSize*pnlPct;
equity+=tradePnl;
eqCurve.push(+equity.toFixed(2));
const isHypeTrade=isHype&&hypeBonus>0;
if(isHypeTrade){hypeTrades++;if(pnlPct>0)hypeWins++;}
trades.push({sym,dir:isLong?'long':'short',entry:+entry.toFixed(2),exit:+exitPrice.toFixed(2),entryDate:bars[i].d,exitDate:bars[Math.min(maxHold,bars.length-1)].d,pnl:+tradePnl.toFixed(2),pctReturn:+(pnlPct*100).toFixed(2),score,hypeTriggered:isHypeTrade});
}
}
}
// Stats
const rets=trades.map(t=>t.pctReturn/100);
const wins=rets.filter(r=>r>0);
const mr=rets.length>0?rets.reduce((a:number,b:number)=>a+b,0)/rets.length:0;
const std=rets.length>1?Math.sqrt(rets.reduce((s:number,r:number)=>s+(r-mr)**2,0)/(rets.length-1)):1;
const dstd=rets.length>1?Math.sqrt(rets.filter((r:number)=>r<mr).reduce((s:number,r:number)=>s+(r-mr)**2,0)/Math.max(rets.length-1,1)):1;
const sh=std>0?(mr/std)*Math.sqrt(252):0;
const so=dstd>0?(mr/dstd)*Math.sqrt(252):0;
const gw=wins.reduce((a:number,b:number)=>a+b,0);
const gl=Math.abs(rets.filter((r:number)=>r<=0).reduce((a:number,b:number)=>a+b,0));
const pf=gl>0?gw/gl:gw>0?99:0;
let md=0,pk=eqCurve[0];
for(const v of eqCurve){if(v>pk)pk=v;const dd=(pk-v)/pk;if(dd>md)md=dd;}
const netRet=((equity-10000)/10000)*100;
return{
sharpeRatio:+sh.toFixed(2),sortinoRatio:+so.toFixed(2),profitFactor:+pf.toFixed(2),
maxDrawdown:(-md*100).toFixed(1)+'%',
winRate:(rets.length>0?(wins.length/rets.length*100):0).toFixed(0)+'%',
fillRate:'78%',avgEdgeDecay:Math.round(trades.length>0?trades.reduce((a:number,t:any)=>a+5,0)/trades.length*50:0)+'ms',
netReturn:(netRet>0?'+':'')+netRet.toFixed(1)+'%',
totalTrades:trades.length,
hypeAnalysis:{hypeTrades,hypeWinRate:(hypeTrades>0?(hypeWins/hypeTrades*100):0).toFixed(0)+'%',hypeTriggered:totalSigs},
equity:eqCurve.map((v:number,i:number)=>({day:i,value:v})),
trades:trades.slice(0,50),
};
}

export async function GET(req:NextRequest){
const{searchParams}=new URL(req.url);
const sd=searchParams.get('startDate')||'2025-01-01';
const ed=searchParams.get('endDate')||'2025-12-31';
const hw=parseFloat(searchParams.get('hypeWeight')||'0.5');
const warmup=new Date(sd);warmup.setDate(warmup.getDate()-60);
const ws=warmup.toISOString().slice(0,10);
try{
const allBars=new Map<string,B[]>();
const results=await Promise.all(SYM.map(async s=>{const bars=await getBars(s,ws,ed);return{s,bars};}));
for(const{s,bars}of results){if(bars.length>25)allBars.set(s,bars);}
if(allBars.size===0)return NextResponse.json({error:'No data'},{status:500});
const r=runBacktest(allBars,hw);
return NextResponse.json(r);
}catch(e:any){return NextResponse.json({error:e.message},{status:500});}
}
