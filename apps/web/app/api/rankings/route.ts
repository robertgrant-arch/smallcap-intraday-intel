import { NextResponse } from 'next/server';

const SMALL_CAP_SYMBOLS = [
  'RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB',
  'MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS',
  'CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'
];

interface QuoteData {
  symbol: string; name: string; price: number; changePercent: number;
  fiveDayReturn: number; relVolume: number; volume: number;
  annualizedReturn: number; annualizedVol: number; sharpe: number;
  rsi14: number; bbPosition: number; atrPercent: number;
  regime: string; ema8vsSma20: number;
}

async function fetchQuoteData(symbol: string): Promise<QuoteData> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('No data');
  const meta = result.meta;
  const q = result.indicators?.quote?.[0];
  const closes: number[] = (q?.close || []).filter((v: any) => v != null);
  const opens: number[] = (q?.open || []).filter((v: any) => v != null);
  const highs: number[] = (q?.high || []).filter((v: any) => v != null);
  const lows: number[] = (q?.low || []).filter((v: any) => v != null);
  const volumes: number[] = (q?.volume || []).filter((v: any) => v != null);
  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const price = meta.regularMarketPrice;
  const changePercent = ((price - prevClose) / prevClose) * 100;

  // Volume analysis
  const avgVol = volumes.length > 1 ? volumes.slice(0, -1).reduce((s: number, v: number) => s + v, 0) / (volumes.length - 1) : 1;
  const relVolume = avgVol > 0 ? (volumes[volumes.length - 1] || 0) / avgVol : 1;

  // Returns
  const fiveDayReturn = closes.length >= 6 ? ((closes[closes.length - 1] - closes[closes.length - 6]) / closes[closes.length - 6]) * 100 : 0;
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] && closes[i-1]) dailyReturns.push((closes[i] - closes[i-1]) / closes[i-1]);
  }
  const meanReturn = dailyReturns.length ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length ? dailyReturns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / dailyReturns.length : 0;
  const dailyVol = Math.sqrt(variance);
  const annualizedReturn = ((1 + meanReturn) ** 252 - 1) * 100;
  const annualizedVol = dailyVol * Math.sqrt(252) * 100;
  const sharpe = annualizedVol > 0 ? annualizedReturn / annualizedVol : 0;

  // RSI-14
  let gains = 0, losses = 0;
  const rsiPeriod = Math.min(14, dailyReturns.length);
  for (let i = dailyReturns.length - rsiPeriod; i < dailyReturns.length; i++) {
    if (dailyReturns[i] > 0) gains += dailyReturns[i]; else losses -= dailyReturns[i];
  }
  const rs = losses > 0 ? (gains / rsiPeriod) / (losses / rsiPeriod) : 100;
  const rsi14 = 100 - 100 / (1 + rs);

  // Bollinger Band position (0 = lower, 1 = upper)
  const bbPeriod = Math.min(20, closes.length);
  const bbSlice = closes.slice(-bbPeriod);
  const bbMean = bbSlice.reduce((s, v) => s + v, 0) / bbSlice.length;
  const bbStd = Math.sqrt(bbSlice.reduce((s, v) => s + (v - bbMean) ** 2, 0) / bbSlice.length);
  const bbPosition = bbStd > 0 ? (price - (bbMean - 2 * bbStd)) / (4 * bbStd) : 0.5;

  // ATR%
  let atrSum = 0;
  const atrPeriod = Math.min(14, closes.length - 1);
  for (let i = closes.length - atrPeriod; i < closes.length; i++) {
    const tr = Math.max(
      (highs[i] || closes[i]) - (lows[i] || closes[i]),
      Math.abs((highs[i] || closes[i]) - closes[i - 1]),
      Math.abs((lows[i] || closes[i]) - closes[i - 1])
    );
    atrSum += tr;
  }
  const atrPercent = price > 0 ? (atrSum / atrPeriod / price) * 100 : 0;

  // Regime & EMA/SMA
  const ema8 = closes.reduce((e, v, i) => i === 0 ? v : v * (2/9) + e * (7/9), closes[0]);
  const sma20 = closes.slice(-Math.min(20, closes.length)).reduce((s, v) => s + v, 0) / Math.min(20, closes.length);
  const ema8vsSma20 = sma20 > 0 ? ((ema8 - sma20) / sma20) * 100 : 0;
  const slope = closes.length >= 10 ? (closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10] : 0;
  let regime = 'Ranging';
  if (ema8 > sma20 * 1.02 && slope > 0.03) regime = 'Uptrend';
  else if (ema8 < sma20 * 0.98 && slope < -0.03) regime = 'Downtrend';

  return {
    symbol, name: meta.longName || meta.shortName || symbol,
    price, changePercent: +changePercent.toFixed(2),
    fiveDayReturn: +fiveDayReturn.toFixed(2), relVolume: +relVolume.toFixed(1),
    volume: volumes[volumes.length - 1] || 0,
    annualizedReturn: +annualizedReturn.toFixed(2), annualizedVol: +annualizedVol.toFixed(2),
    sharpe: +sharpe.toFixed(2), rsi14: +rsi14.toFixed(1),
    bbPosition: +bbPosition.toFixed(2), atrPercent: +atrPercent.toFixed(2),
    regime, ema8vsSma20: +ema8vsSma20.toFixed(2),
  };
}

async function fetchSentimentData() {
  try {
    const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/sentiment`, { next: { revalidate: 600 } });
    const data = await res.json();
    return data.sentiments || [];
  } catch { return []; }
}

// === IMPROVED MULTI-FACTOR SCORING ===
function calculateScore(stock: QuoteData, hype: any): number {
  let score = 0;
  const weights = { technical: 35, momentum: 20, volume: 15, hype: 20, risk: 10 };

  // TECHNICAL (35 pts): RSI + BB position for timing
  // Oversold with reversal potential = highest score
  if (stock.rsi14 < 30) score += 25; // Deep oversold = buy signal
  else if (stock.rsi14 < 40) score += 18;
  else if (stock.rsi14 > 70 && stock.bbPosition > 0.9) score += 5; // Overbought = low score
  else if (stock.rsi14 >= 45 && stock.rsi14 <= 55) score += 15; // Neutral
  else score += 10;

  // BB position: near lower band = opportunity
  if (stock.bbPosition < 0.1) score += 10;
  else if (stock.bbPosition < 0.3) score += 7;
  else if (stock.bbPosition > 0.9) score += 2;
  else score += 5;

  // MOMENTUM (20 pts): Trend alignment
  if (stock.regime === 'Uptrend' && stock.fiveDayReturn > 0) score += 18;
  else if (stock.regime === 'Ranging' && stock.rsi14 < 40) score += 15; // Mean reversion
  else if (stock.regime === 'Downtrend' && stock.rsi14 < 25) score += 12; // Extreme oversold in downtrend
  else if (stock.fiveDayReturn > 5) score += 10;
  else if (stock.fiveDayReturn < -10 && stock.rsi14 < 35) score += 14; // Capitulation bounce
  else score += 5;

  // VOLUME (15 pts): Confirmation
  if (stock.relVolume > 2 && stock.changePercent > 0) score += 15; // Bullish volume
  else if (stock.relVolume > 1.5) score += 10;
  else if (stock.relVolume > 1) score += 7;
  else score += 3;

  // HYPE (20 pts): Social sentiment integration
  if (hype) {
    const hs = hype.hypeScore || 0;
    // Moderate hype is ideal; extreme hype = fade risk
    if (hs >= 40 && hs <= 65) score += 18; // Sweet spot
    else if (hs > 75) score += 5; // Too much hype = dangerous
    else if (hs > 65) score += 12;
    else if (hs > 20) score += 10;
    else score += 3;

    // Sentiment alignment
    if (hype.sentiment === 'bullish' || hype.sentiment === 'very_bullish') score += 2;
  } else {
    score += 8; // Neutral if no hype data
  }

  // RISK ADJUSTMENT (10 pts): Lower vol = more predictable
  if (stock.atrPercent < 3) score += 10;
  else if (stock.atrPercent < 5) score += 7;
  else if (stock.atrPercent < 8) score += 4;
  else score += 1;

  return Math.min(100, Math.max(0, score));
}

function classifyCatalyst(stock: QuoteData, hype: any): string {
  if (hype?.hypeScore > 70) return 'Social Hype';
  if (stock.rsi14 < 30 && stock.bbPosition < 0.1) return 'Oversold Bounce';
  if (stock.regime === 'Uptrend' && stock.relVolume > 1.5) return 'Momentum Breakout';
  if (stock.relVolume > 2.5) return 'Volume Breakout';
  if (stock.fiveDayReturn > 10) return 'Momentum Surge';
  if (stock.regime === 'Ranging' && stock.rsi14 < 40) return 'Mean Reversion';
  return 'Technical Setup';
}

function classifyRisk(stock: QuoteData): string {
  if (stock.atrPercent > 8 || stock.annualizedVol > 100) return 'Very High';
  if (stock.atrPercent > 5 || stock.annualizedVol > 60) return 'High';
  if (stock.atrPercent > 3) return 'Medium';
  return 'Low';
}

function classifySentiment(stock: QuoteData, hype: any): string {
  if (hype) {
    if (hype.sentiment === 'very_bullish') return 'Bullish';
    if (hype.sentiment === 'bullish') return 'Positive';
    if (hype.sentiment === 'bearish') return 'Negative';
    if (hype.sentiment === 'very_bearish') return 'Bearish';
  }
  if (stock.rsi14 > 60 && stock.regime === 'Uptrend') return 'Bullish';
  if (stock.rsi14 < 40 && stock.regime === 'Downtrend') return 'Bearish';
  if (stock.changePercent > 2) return 'Positive';
  if (stock.changePercent < -2) return 'Negative';
  return 'Neutral';
}

function calculateUpside(stock: QuoteData, hype: any): number {
  // Based on distance to mean + momentum + hype
  const meanReversionUpside = stock.bbPosition < 0.3 ? (0.5 - stock.bbPosition) * 40 : 0;
  const momentumUpside = stock.regime === 'Uptrend' ? stock.fiveDayReturn * 0.5 : 0;
  const hypeUpside = hype ? Math.min(hype.hypeScore * 0.3, 20) : 0;
  const base = meanReversionUpside + momentumUpside + hypeUpside + 5;
  return +Math.max(2, Math.min(80, base)).toFixed(2);
}

export async function GET() {
  try {
    const [quoteResults, sentiments] = await Promise.all([
      Promise.allSettled(SMALL_CAP_SYMBOLS.map(s => fetchQuoteData(s))),
      fetchSentimentData(),
    ]);

    const stocks = quoteResults
      .filter((r): r is PromiseFulfilledResult<QuoteData> => r.status === 'fulfilled')
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
    }).sort((a, b) => b.score - a.score); // Sort by SCORE not just annualized return

    const stats = {
      totalTracked: ranked.length,
      avgScore: Math.round(ranked.reduce((sum, s) => sum + s.score, 0) / Math.max(ranked.length, 1)),
      avgAnnReturn: Math.round(ranked.reduce((sum, s) => sum + s.annualizedReturn, 0) / Math.max(ranked.length, 1)),
      highConfidence: ranked.filter(s => s.score >= 70).length,
      highRisk: ranked.filter(s => s.risk === 'High' || s.risk === 'Very High').length,
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
