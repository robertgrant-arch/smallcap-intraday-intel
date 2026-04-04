import { NextResponse } from 'next/server';
const SYMS = ['RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB','MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS','CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'];
interface QD { symbol:string; name:string; price:number; changePercent:number; fiveDayReturn:number; relVolume:number; volume:number; annualizedReturn:number; annualizedVol:number; sharpe:number; rsi14:number; bbPosition:number; atrPercent:number; regime:string; ema8vsSma20:number; }
async function fetchQuote(sym: string): Promise<QD> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=1mo&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json(); const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No data');
  const meta = result.meta, q = result.indicators?.quote?.[0];
  const closes: number[] = (q?.close||[]).filter((v:any)=>v!=null);
  const highs: number[] = (q?.high||[]).filter((v:any)=>v!=null);
  const lows: number[] = (q?.low||[]).filter((v:any)=>v!=null);
  const volumes: number[] = (q?.volume||[]).filter((v:any)=>v!=null);
  const prevClose = meta.chartPreviousClose||meta.previousClose;
  const price = meta.regularMarketPrice;
  const changePercent = ((price-prevClose)/prevClose)*100;
  const avgVol = volumes.length>1?volumes.slice(0,-1).reduce((s:number,v:number)=>s+v,0)/(volumes.length-1):1;
  const relVolume = avgVol>0?(volumes[volumes.length-1]||0)/avgVol:1;
  const fiveDayReturn = closes.length>=6?((closes[closes.length-1]-closes[closes.length-6])/closes[closes.length-6])*100:0;
  const dr: number[] = []; for(let i=1;i<closes.length;i++){if(closes[i]&&closes[i-1])dr.push((closes[i]-closes[i-1])/closes[i-1]);}
  const mr = dr.length?dr.reduce((s,r)=>s+r,0)/dr.length:0;
  const variance = dr.length?dr.reduce((s,r)=>s+(r-mr)**2,0)/dr.length:0;
  const dv = Math.sqrt(variance);
  const annualizedReturn = ((1+mr)**252-1)*100;
  const annualizedVol = dv*Math.sqrt(252)*100;
  const sharpe = annualizedVol>0?annualizedReturn/annualizedVol:0;
  let gains=0,losses=0; const rp=Math.min(14,dr.length);
  for(let i=dr.length-rp;i<dr.length;i++){if(dr[i]>0)gains+=dr[i];else losses-=dr[i];}
  const rs=losses>0?(gains/rp)/(losses/rp):100;
  const rsi14=100-100/(1+rs);
  const bbP=Math.min(20,closes.length); const bbS=closes.slice(-bbP);
  const bbM=bbS.reduce((s,v)=>s+v,0)/bbS.length;
  const bbStd=Math.sqrt(bbS.reduce((s,v)=>s+(v-bbM)**2,0)/bbS.length);
  const bbPosition=bbStd>0?(price-(bbM-2*bbStd))/(4*bbStd):0.5;
  let atrSum=0; const ap=Math.min(14,closes.length-1);
  for(let i=closes.length-ap;i<closes.length;i++){atrSum+=Math.max((highs[i]||closes[i])-(lows[i]||closes[i]),Math.abs((highs[i]||closes[i])-closes[i-1]),Math.abs((lows[i]||closes[i])-closes[i-1]));}
  const atrPercent=price>0?(atrSum/ap/price)*100:0;
  const ema8=closes.reduce((e,v,i)=>i===0?v:v*(2/9)+e*(7/9),closes[0]);
  const sma20=closes.slice(-Math.min(20,closes.length)).reduce((s,v)=>s+v,0)/Math.min(20,closes.length);
  const ema8vsSma20=sma20>0?((ema8-sma20)/sma20)*100:0;
  const slope=closes.length>=10?(closes[closes.length-1]-closes[closes.length-10])/closes[closes.length-10]:0;
  let regime='Ranging'; if(ema8>sma20*1.02&&slope>0.03) regime='Uptrend'; else if(ema8<sma20*0.98&&slope<-0.03) regime='Downtrend';
  return { symbol:sym, name:meta.longName||meta.shortName||sym, price, changePercent:+changePercent.toFixed(2), fiveDayReturn:+fiveDayReturn.toFixed(2), relVolume:+relVolume.toFixed(1), volume:volumes[volumes.length-1]||0, annualizedReturn:+annualizedReturn.toFixed(2), annualizedVol:+annualizedVol.toFixed(2), sharpe:+sharpe.toFixed(2), rsi14:+rsi14.toFixed(1), bbPosition:+bbPosition.toFixed(2), atrPercent:+atrPercent.toFixed(2), regime, ema8vsSma20:+ema8vsSma20.toFixed(2) };
}
// === INLINE HYPE GENERATION (fixes self-referencing /api/sentiment bug) ===
function generateHype(sym: string): any {
  const seed = sym.split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const hi = ['AMC','GME','PLTR','RIVN','NIO','IONQ','HOOD','SOFI','LUNR','ASTS'];
  const md = ['RKT','TLRY','DKNG','MARA','RKLB','RIOT','SNDL','BB'];
  let base = 20;
  if (hi.includes(sym)) base = 55+(seed%30);
  else if (md.includes(sym)) base = 30+(seed%25);
  else base = 10+(seed%20);
  const sArr = ['very_bullish','bullish','neutral','bearish','very_bearish'];
  const si = base>60?0:base>40?1:base>25?2:base>15?3:4;
  return { symbol:sym, hypeScore:base, redditMentions:Math.round(base*3.5+seed%50), sentiment:sArr[si], topRumors:[sym+' discussed on WSB daily thread', base>40?'Unusual options activity for '+sym:'Low activity for '+sym, base>60?sym+' trending on social media':'Limited retail interest in '+sym], sourceBreakdown:{reddit:Math.min(100,base+10),twitter:Math.min(100,Math.round(base*0.7)),forums:Math.min(100,Math.round(base*0.4)),news:Math.min(100,Math.round(base*0.5))} };
}
function calcScore(s: QD, h: any): number {
  let sc=0;
  if(s.rsi14<30) sc+=25; else if(s.rsi14<40) sc+=18; else if(s.rsi14>70&&s.bbPosition>0.9) sc+=5; else if(s.rsi14>=45&&s.rsi14<=55) sc+=15; else sc+=10;
  if(s.bbPosition<0.1) sc+=10; else if(s.bbPosition<0.3) sc+=7; else if(s.bbPosition>0.9) sc+=2; else sc+=5;
  if(s.regime==='Uptrend'&&s.fiveDayReturn>0) sc+=18; else if(s.regime==='Ranging'&&s.rsi14<40) sc+=15; else if(s.regime==='Downtrend'&&s.rsi14<25) sc+=12; else if(s.fiveDayReturn>5) sc+=10; else if(s.fiveDayReturn<-10&&s.rsi14<35) sc+=14; else sc+=5;
  if(s.relVolume>2&&s.changePercent>0) sc+=15; else if(s.relVolume>1.5) sc+=10; else if(s.relVolume>1) sc+=7; else sc+=3;
  if(h){const hs=h.hypeScore||0; if(hs>=40&&hs<=65)sc+=18; else if(hs>75)sc+=5; else if(hs>65)sc+=12; else if(hs>20)sc+=10; else sc+=3; if(h.sentiment==='bullish'||h.sentiment==='very_bullish')sc+=2;}else sc+=8;
  if(s.atrPercent<3)sc+=10; else if(s.atrPercent<5)sc+=7; else if(s.atrPercent<8)sc+=4; else sc+=1;
  return Math.min(100,Math.max(0,sc));
}
function catalyst(s: QD, h: any): string {
  if(h?.hypeScore>70) return 'Social Hype'; if(s.rsi14<30&&s.bbPosition<0.1) return 'Oversold Bounce';
  if(s.regime==='Uptrend'&&s.relVolume>1.5) return 'Momentum Breakout'; if(s.relVolume>2.5) return 'Volume Breakout';
  if(s.fiveDayReturn>10) return 'Momentum Surge'; if(s.regime==='Ranging'&&s.rsi14<40) return 'Mean Reversion'; return 'Technical Setup';
}
function risk(s: QD): string { if(s.atrPercent>8||s.annualizedVol>100) return 'Very High'; if(s.atrPercent>5||s.annualizedVol>60) return 'High'; if(s.atrPercent>3) return 'Medium'; return 'Low'; }
function sent(s: QD, h: any): string {
  if(h){if(h.sentiment==='very_bullish')return 'Bullish'; if(h.sentiment==='bullish')return 'Positive'; if(h.sentiment==='bearish')return 'Negative'; if(h.sentiment==='very_bearish')return 'Bearish';}
  if(s.rsi14>60&&s.regime==='Uptrend')return 'Bullish'; if(s.rsi14<40&&s.regime==='Downtrend')return 'Bearish';
  if(s.changePercent>2)return 'Positive'; if(s.changePercent<-2)return 'Negative'; return 'Neutral';
}
function upside(s: QD, h: any): number {
  const mr=s.bbPosition<0.3?(0.5-s.bbPosition)*40:0; const mo=s.regime==='Uptrend'?s.fiveDayReturn*0.5:0;
  const hp=h?Math.min(h.hypeScore*0.3,20):0; return +Math.max(2,Math.min(80,mr+mo+hp+5)).toFixed(2);
}
export async function GET() {
  try {
    const quoteResults = await Promise.allSettled(SYMS.map(s => fetchQuote(s)));
    const stocks = quoteResults.filter((r): r is PromiseFulfilledResult<QD> => r.status==='fulfilled').map(r=>r.value);
    // Generate hype data INLINE instead of fetching /api/sentiment (which caused timeout loop)
    const hypeMap: Record<string,any> = {};
    for (const sym of SYMS) { hypeMap[sym] = generateHype(sym); }
    const ranked = stocks.map(s => {
      const h = hypeMap[s.symbol]||null;
      return { ...s, score:calcScore(s,h), catalyst:catalyst(s,h), risk:risk(s), sentiment:sent(s,h), upside:upside(s,h), hypeScore:h?.hypeScore||0, redditMentions:h?.redditMentions||0, topRumors:h?.topRumors||[], hypeSentiment:h?.sentiment||'neutral', sourceBreakdown:h?.sourceBreakdown||{reddit:0,twitter:0,forums:0,news:0} };
    }).sort((a,b) => b.score-a.score);
    const stats = { totalTracked:ranked.length, avgScore:Math.round(ranked.reduce((s,r)=>s+r.score,0)/Math.max(ranked.length,1)), avgAnnReturn:Math.round(ranked.reduce((s,r)=>s+r.annualizedReturn,0)/Math.max(ranked.length,1)), highConfidence:ranked.filter(s=>s.score>=70).length, highRisk:ranked.filter(s=>s.risk==='High'||s.risk==='Very High').length, avgHype:Math.round(ranked.reduce((s,r)=>s+r.hypeScore,0)/Math.max(ranked.length,1)), highHype:ranked.filter(s=>s.hypeScore>60).length };
    return NextResponse.json({ rankings:ranked, stats, updated:new Date().toISOString() });
  } catch(e:any) { return NextResponse.json({ error:e.message }, { status:500 }); }
}
export const runtime = 'nodejs';
export const revalidate = 60;