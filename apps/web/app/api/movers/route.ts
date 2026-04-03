import { NextResponse } from 'next/server';

const SMALL_CAP_SYMBOLS = [
  'AMC','GME','SOFI','PLTR','NIO','BB','CLOV','WISH','MARA','RIOT',
  'SNDL','TLRY','LCID','OPEN','SKLZ','DKNG','CRSR','RKT','PSFE','UWMC',
  'MVST','ASTS','IONQ','RKLB','LUNR','DNA','MNDY','AFRM','HOOD','RIVN'
];

async function fetchQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Failed ${symbol}`);
  const data = await res.json();
  const meta = data.chart?.result?.[0]?.meta;
  const ind = data.chart?.result?.[0]?.indicators?.quote?.[0];
  const volumes = ind?.volume || [];
  const price = meta?.regularMarketPrice ?? 0;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? 0;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;
  const volume = volumes[volumes.length - 1] ?? 0;
  const avgVolume = volumes.length > 1
    ? volumes.slice(0, -1).reduce((a: number, b: number) => a + (b || 0), 0) / Math.max(volumes.length - 1, 1)
    : 1;
  return {
    symbol: meta?.symbol || symbol,
    name: meta?.shortName || meta?.longName || symbol,
    price, change, changePercent, volume, avgVolume,
    marketCap: meta?.marketCap ?? 0,
  };
}

export async function GET() {
  try {
    const quotes = await Promise.allSettled(SMALL_CAP_SYMBOLS.map((s) => fetchQuote(s)));
    const results = quotes
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const gainers = [...results].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    const losers = [...results].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    const volumeSpikes = [...results]
      .map((r) => ({ ...r, relVolume: r.avgVolume > 0 ? r.volume / r.avgVolume : 0 }))
      .sort((a, b) => b.relVolume - a.relVolume)
      .slice(0, 10);

    return NextResponse.json({ gainers, losers, volumeSpikes, updated: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const revalidate = 60;