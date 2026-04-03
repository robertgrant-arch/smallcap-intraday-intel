import { NextResponse } from 'next/server';

const SMALL_CAP_SYMBOLS = [
  'SOFI','PLTR','NIO','BB','CLOV','WISH','MARA','RIOT',
  'SNDL','TLRY','LCID','OPEN','SKLZ','DKNG','CRSR','RKT','PSFE','UWMC',
  'MVST','ASTS','IONQ','RKLB','LUNR','DNA','MNDY','AFRM','HOOD','RIVN',
  'AMC','GME'
];

async function fetchYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${symbol}`);
  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  const indicators = data.chart?.result?.[0]?.indicators;
  const closes = indicators?.quote?.[0]?.close || [];
  const volumes = indicators?.quote?.[0]?.volume || [];
  const price = meta?.regularMarketPrice ?? 0;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const volume = volumes[volumes.length - 1] ?? 0;
  const avgVolume = volumes.length > 1
    ? volumes.slice(0, -1).reduce((a: number, b: number) => a + (b || 0), 0) / Math.max(volumes.length - 1, 1)
    : volume;
  const highs = indicators?.quote?.[0]?.high || [];
  const lows = indicators?.quote?.[0]?.low || [];
  return {
    symbol: meta?.symbol || symbol,
    name: meta?.shortName || meta?.longName || symbol,
    price,
    change,
    changePercent,
    volume,
    avgVolume,
    relVolume: avgVolume > 0 ? volume / avgVolume : 0,
    marketCap: meta?.marketCap ?? 0,
    high: highs[highs.length - 1] ?? 0,
    low: lows[lows.length - 1] ?? 0,
    prevClose,
    fiftyTwoWeekHigh: meta?.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: meta?.fiftyTwoWeekLow ?? 0,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || SMALL_CAP_SYMBOLS;

  try {
    const results = await Promise.allSettled(
      symbols.map((s) => fetchYahooQuote(s.trim().toUpperCase()))
    );
    const quotes = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    return NextResponse.json({ quotes, updated: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const revalidate = 60;