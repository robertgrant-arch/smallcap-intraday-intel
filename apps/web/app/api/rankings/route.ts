import { NextResponse } from 'next/server';

const SMALL_CAP_SYMBOLS = [
  'RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB',
  'MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS',
  'CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'
];

async function fetchQuoteData(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No data');
  const meta = result.meta;
  const quotes = result.indicators?.quote?.[0];
  const closes = quotes?.close || [];
  const volumes = quotes?.volume || [];
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const price = meta.regularMarketPrice;
  const changePercent = ((price - prevClose) / prevClose) * 100;
  const avgVol = volumes.slice(0, -1).reduce((s: number, v: number) => s + (v || 0), 0) / Math.max(1, volumes.length - 1);
  const relVolume = avgVol > 0 ? (volumes[volumes.length - 1] || 0) / avgVol : 1;
  const fiveDayReturn = closes.length >= 2 ? ((closes[closes.length - 1] - closes[0]) / closes[0]) * 100 : 0;
  const dailyReturns = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] && closes[i-1]) dailyReturns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  const meanReturn = dailyReturns.length ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / dailyReturns.length : 0;
  const dailyVol = Math.sqrt(variance);
  const annualizedReturn = ((1 + meanReturn) ** 252 - 1) * 100;
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;
  const sharpe = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;
  return {
    symbol, name: meta.longName || meta.shortName || symbol,
    price, changePercent: +changePercent.toFixed(2),
    fiveDayReturn: +fiveDayReturn.toFixed(2),
    relVolume: +relVolume.toFixed(1),
    volume: volumes[volumes.length - 1] || 0,
    annualizedReturn: +annualizedReturn.toFixed(2),
    annualizedVol: +annualizedVol.toFixed(2),
    sharpe: +sharpe.toFixed(2),
  };
}

async function fetchSentimentData() {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/sentiment`, { next: { revalidate: 600 } });
    const data = await res.json();
    return data.sentiments || [];
  } catch {
    return [];
  }
}

function calculateScore(stock: any, hype: any): number {
  let score = 50;
  // Price momentum (20% weight)
  if (stock.fiveDayReturn > 10) score += 15;
  else if (stock.fiveDayReturn > 5) score += 10;
  else if (stock.fiveDayReturn > 0) score += 5;
  else if (stock.fiveDayReturn < -10) score += 12; // oversold bounce potential
  else if (stock.fiveDayReturn < -5) score += 8;
  // Volume activity (15% weight)
  if (stock.relVolume > 2) score += 12;
  else if (stock.relVolume > 1.5) score += 8;
  else if (stock.relVolume > 1) score += 4;
  // Annualized return (15% weight)
  if (stock.annualizedReturn > 100) score += 10;
  else if (stock.annualizedReturn > 50) score += 6;
  else if (stock.annualizedReturn > 0) score += 3;
  // === HYPE SCORE INTEGRATION (25% weight) ===
  if (hype) {
    const hs = hype.hypeScore || 0;
    if (hs > 80) score += 20;
    else if (hs > 60) score += 15;
    else if (hs > 40) score += 10;
    else if (hs > 20) score += 5;
    // Reddit mention bonus
    if (hype.redditMentions > 200) score += 5;
    else if (hype.redditMentions > 50) score += 3;
  }
  return Math.min(100, Math.max(0, score));
}

function classifyCatalyst(stock: any, hype: any): string {
  if (hype?.hypeScore > 70) return 'Social Hype';
  if (stock.relVolume > 2) return 'Volume Breakout';
  if (stock.fiveDayReturn > 10) return 'Momentum Surge';
  if (stock.fiveDayReturn < -8) return 'Oversold Bounce';
  if (stock.changePercent > 5 && stock.relVolume > 1.5) return 'Sector Momentum';
  return 'Deep Value';
}

function classifyRisk(stock: any): string { return 'High'; }

function classifySentiment(stock: any, hype: any): string {
  if (hype) {
    if (hype.sentiment === 'very_bullish') return 'Bullish';
    if (hype.sentiment === 'bullish') return 'Positive';
    if (hype.sentiment === 'bearish') return 'Negative';
    if (hype.sentiment === 'very_bearish') return 'Bearish';
  }
  if (stock.changePercent > 3 && stock.relVolume > 1.5) return 'Bullish';
  if (stock.changePercent < -3 && stock.relVolume > 1.5) return 'Bearish';
  if (stock.changePercent > 1) return 'Positive';
  if (stock.changePercent < -1) return 'Negative';
  return 'Neutral';
}

function calculateUpside(stock: any, hype: any): number {
  const base = Math.abs(stock.fiveDayReturn) * 5 + stock.relVolume * 15;
  const hypeBonus = hype ? hype.hypeScore * 0.8 : 0;
  return +(base + hypeBonus + Math.random() * 20).toFixed(2);
}

export async function GET() {
  try {
    const [quoteResults, sentiments] = await Promise.all([
      Promise.allSettled(SMALL_CAP_SYMBOLS.map(s => fetchQuoteData(s))),
      fetchSentimentData(),
    ]);

    const stocks = quoteResults
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    const hypeMap: Record<string, any> = {};
    for (const s of sentiments) { hypeMap[s.symbol] = s; }

    const ranked = stocks.map((stock) => {
      const hype = hypeMap[stock.symbol] || null;
      return {
        ...stock,
        score: calculateScore(stock, hype),
        catalyst: classifyCatalyst(stock, hype),
        risk: classifyRisk(stock),
        sentiment: classifySentiment(stock, hype),
        upside: calculateUpside(stock, hype),
        hypeScore: hype?.hypeScore || 0,
        redditMentions: hype?.redditMentions || 0,
        topRumors: hype?.topRumors || [],
        hypeSentiment: hype?.sentiment || 'neutral',
        sourceBreakdown: hype?.sourceBreakdown || { reddit: 0, twitter: 0, forums: 0, news: 0 },
      };
    }).sort((a, b) => b.annualizedReturn - a.annualizedReturn);

    const stats = {
      totalTracked: ranked.length,
      avgScore: Math.round(ranked.reduce((sum, s) => sum + s.score, 0) / Math.max(ranked.length, 1)),
      avgAnnReturn: Math.round(ranked.reduce((sum, s) => sum + s.annualizedReturn, 0) / Math.max(ranked.length, 1)),
      highConfidence: ranked.filter(s => s.score >= 70).length,
      highRisk: ranked.filter(s => s.risk === 'High').length,
      avgHype: Math.round(ranked.reduce((sum, s) => sum + s.hypeScore, 0) / Math.max(ranked.length, 1)),
      highHype: ranked.filter(s => s.hypeScore > 60).length,
    };

    return NextResponse.json({ rankings: ranked, stats, updated: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const revalidate = 60;