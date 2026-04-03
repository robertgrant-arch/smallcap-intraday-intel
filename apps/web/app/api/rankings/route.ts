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

  // Calculate momentum (5-day return)
  const fiveDayReturn = closes.length >= 6
    ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100
    : changePercent;

  // Calculate volatility (std dev of daily returns)
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }
  const meanReturn = dailyReturns.length > 0
    ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / (dailyReturns.length - 1) : 0;
  const volatility = Math.sqrt(variance) * 100;

  // Distance from 52-week low (upside potential proxy)
  const fiftyTwoLow = meta?.fiftyTwoWeekLow ?? price;
  const fiftyTwoHigh = meta?.fiftyTwoWeekHigh ?? price;
  const distFromLow = fiftyTwoLow > 0 ? ((price - fiftyTwoLow) / fiftyTwoLow) * 100 : 0;
  const distFromHigh = fiftyTwoHigh > 0 ? ((fiftyTwoHigh - price) / price) * 100 : 0;

  // Spread proxy (high-low range as % of price)
  const todayHigh = highs[highs.length - 1] ?? price;
  const todayLow = lows[lows.length - 1] ?? price;
  const spread = price > 0 ? ((todayHigh - todayLow) / price) * 100 : 0;

  return {
    symbol: meta?.symbol || symbol,
    name: meta?.shortName || meta?.longName || symbol,
    price,
    change,
    changePercent,
    volume: currentVol,
    avgVolume: avgVol,
    relVolume,
    marketCap: meta?.marketCap ?? 0,
    fiveDayReturn,
    volatility,
    distFromLow,
    distFromHigh,
    spread,
    fiftyTwoWeekHigh: fiftyTwoHigh,
    fiftyTwoWeekLow: fiftyTwoLow,
    meanDailyReturn: meanReturn * 100,
  };
}

function calculateExpectedReturnScore(stock: any): number {
  // Multi-factor scoring model (0-100)
  let score = 50; // baseline

  // Factor 1: Momentum (weight: 25%) - recent price trend
  const momentumScore = Math.max(-25, Math.min(25, stock.fiveDayReturn * 2.5));
  score += momentumScore;

  // Factor 2: Volume confirmation (weight: 20%) - higher volume = stronger signal
  const volScore = Math.min(20, (stock.relVolume - 1) * 10);
  score += volScore > 0 ? volScore : volScore * 0.5;

  // Factor 3: Upside potential (weight: 20%) - distance from 52-week high
  const upsideScore = Math.min(20, stock.distFromHigh * 0.4);
  score += upsideScore;

  // Factor 4: Mean reversion opportunity (weight: 15%)
  if (stock.changePercent < -3) score += Math.min(15, Math.abs(stock.changePercent) * 1.5);
  if (stock.changePercent > 5) score -= 5; // overbought penalty

  // Factor 5: Risk adjustment (weight: 20%) - lower spread & volatility = better
  const riskPenalty = Math.min(20, stock.volatility * 1.5 + stock.spread * 5);
  score -= riskPenalty * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function classifyCatalyst(stock: any): string {
  if (stock.relVolume > 3) return 'Volume Breakout';
  if (stock.changePercent > 5) return 'Momentum Surge';
  if (stock.changePercent < -5) return 'Oversold Bounce';
  if (stock.distFromHigh > 50) return 'Deep Value';
  if (stock.fiveDayReturn > 10) return 'Trending Up';
  if (stock.fiveDayReturn < -10) return 'Reversal Setup';
  if (stock.relVolume > 1.5) return 'Unusual Volume';
  return 'Sector Momentum';
}

function classifyRisk(stock: any): string {
  if (stock.volatility > 8 || stock.spread > 3) return 'High';
  if (stock.volatility > 4 || stock.spread > 1.5) return 'Medium';
  return 'Low';
}

function classifySentiment(stock: any): string {
  if (stock.changePercent > 3 && stock.relVolume > 1.5) return 'Bullish';
  if (stock.changePercent < -3 && stock.relVolume > 1.5) return 'Bearish';
  if (stock.changePercent > 1) return 'Positive';
  if (stock.changePercent < -1) return 'Negative';
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
      score: calculateExpectedReturnScore(stock),
      catalyst: classifyCatalyst(stock),
      risk: classifyRisk(stock),
      sentiment: classifySentiment(stock),
    })).sort((a, b) => b.score - a.score);

    const stats = {
      totalTracked: ranked.length,
      avgScore: Math.round(ranked.reduce((sum, s) => sum + s.score, 0) / ranked.length),
      highConfidence: ranked.filter((s) => s.score >= 70).length,
      highRisk: ranked.filter((s) => s.risk === 'High').length,
    };

    return NextResponse.json({
      rankings: ranked,
      stats,
      updated: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const revalidate = 60;