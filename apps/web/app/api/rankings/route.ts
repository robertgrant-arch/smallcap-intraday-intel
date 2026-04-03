import { NextResponse } from 'next/server';

const SMALL_CAP_SYMBOLS = [
  'AMC','GME','SOFI','PLTR','NIO','BB','CLOV','WISH','MARA','RIOT',
  'SNDL','TLRY','LCID','OPEN','SKLZ','DKNG','CRSR','RKT','PSFE','UWMC',
  'MVST','ASTS','IONQ','RKLB','LUNR','DNA','MNDY','AFRM','HOOD','RIVN'
];

async function fetchQuoteData(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed ${symbol}`);
  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  const ind = data.chart?.result?.[0]?.indicators?.quote?.[0];
  const closes = ind?.close?.filter((c: any) => c !== null) || [];
  const volumes = ind?.volume?.filter((v: any) => v !== null) || [];
  const highs = ind?.high?.filter((h: any) => h !== null) || [];
  const lows = ind?.low?.filter((l: any) => l !== null) || [];
  const price = meta?.regularMarketPrice ?? 0;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const currentVol = volumes[volumes.length - 1] ?? 0;
  const avgVol = volumes.length > 1
    ? volumes.slice(0, -1).reduce((a: number, b: number) => a + b, 0) / (volumes.length - 1)
    : currentVol;
  const relVolume = avgVol > 0 ? currentVol / avgVol : 0;

  // Calculate daily returns for statistics
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const meanDailyReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, r) => sum + (r - meanDailyReturn) ** 2, 0) / (dailyReturns.length - 1) : 0;
  const dailyVol = Math.sqrt(variance);
  const volatility = dailyVol * 100;

  // Annualized expected return: compound mean daily return over 252 trading days
  const annualizedReturn = dailyReturns.length > 0
    ? (Math.pow(1 + meanDailyReturn, 252) - 1) * 100
    : 0;
  // Annualized volatility
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;
  // Sharpe-like ratio (assume 5% risk-free)
  const sharpe = annualizedVol > 0 ? (annualizedReturn - 5) / annualizedVol : 0;

  // 5-day return
  const fiveDayReturn = closes.length >= 6
    ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
    : changePercent;

  const fiftyTwoLow = meta?.fiftyTwoWeekLow ?? price;
  const fiftyTwoHigh = meta?.fiftyTwoWeekHigh ?? price;
  const distFromHigh = fiftyTwoHigh > 0 ? ((fiftyTwoHigh - price) / price) * 100 : 0;

  const todayHigh = highs[highs.length - 1] ?? price;
  const todayLow = lows[lows.length - 1] ?? price;
  const spread = price > 0 ? ((todayHigh - todayLow) / price) * 100 : 0;

  return {
    symbol: meta?.symbol || symbol,
    name: meta?.shortName || meta?.longName || symbol,
    price, change, changePercent,
    volume: currentVol, avgVolume: avgVol, relVolume,
    marketCap: meta?.marketCap ?? 0,
    fiveDayReturn, volatility, distFromHigh, spread,
    fiftyTwoWeekHigh: fiftyTwoHigh, fiftyTwoWeekLow: fiftyTwoLow,
    meanDailyReturn: meanDailyReturn * 100,
    annualizedReturn,
    annualizedVol,
    sharpe,
  };
}

function calculateScore(stock: any): number {
  let score = 50;
  const momentumScore = Math.max(-25, Math.min(25, stock.fiveDayReturn * 2.5));
  score += momentumScore;
  const volScore = Math.min(20, (stock.relVolume - 1) * 10);
  score += volScore > 0 ? volScore : volScore * 0.5;
  const upsideScore = Math.min(20, stock.distFromHigh * 0.4);
  score += upsideScore;
  if (stock.changePercent < -3) score += Math.min(15, Math.abs(stock.changePercent) * 1.5);
  if (stock.changePercent > 5) score -= 5;
  const riskPenalty = Math.min(20, stock.volatility * 1.5 + stock.spread * 5);
  score -= riskPenalty * 0.3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyCatalyst(s: any): string {
  if (s.relVolume > 3) return 'Volume Breakout';
  if (s.changePercent > 5) return 'Momentum Surge';
  if (s.changePercent < -5) return 'Oversold Bounce';
  if (s.distFromHigh > 50) return 'Deep Value';
  if (s.fiveDayReturn > 10) return 'Trending Up';
  if (s.fiveDayReturn < -10) return 'Reversal Setup';
  if (s.relVolume > 1.5) return 'Unusual Volume';
  return 'Sector Momentum';
}
function classifyRisk(s: any): string {
  if (s.volatility > 8 || s.spread > 3) return 'High';
  if (s.volatility > 4 || s.spread > 1.5) return 'Medium';
  return 'Low';
}
function classifySentiment(s: any): string {
  if (s.changePercent > 3 && s.relVolume > 1.5) return 'Bullish';
  if (s.changePercent < -3 && s.relVolume > 1.5) return 'Bearish';
  if (s.changePercent > 1) return 'Positive';
  if (s.changePercent < -1) return 'Negative';
  return 'Neutral';
}

export async function GET() {
  try {
    const results = await Promise.allSettled(
      SMALL_CAP_SYMBOLS.map((s) => fetchQuoteData(s))
    );
    const stocks = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const ranked = stocks.map((stock) => ({
      ...stock,
      score: calculateScore(stock),
      catalyst: classifyCatalyst(stock),
      risk: classifyRisk(stock),
      sentiment: classifySentiment(stock),
    })).sort((a, b) => b.annualizedReturn - a.annualizedReturn);

    const stats = {
      totalTracked: ranked.length,
      avgScore: Math.round(ranked.reduce((sum, s) => sum + s.score, 0) / Math.max(ranked.length, 1)),
      avgAnnReturn: Math.round(ranked.reduce((sum, s) => sum + s.annualizedReturn, 0) / Math.max(ranked.length, 1)),
      highConfidence: ranked.filter((s) => s.score >= 70).length,
      highRisk: ranked.filter((s) => s.risk === 'High').length,
    };

    return NextResponse.json({ rankings: ranked, stats, updated: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const revalidate = 60;