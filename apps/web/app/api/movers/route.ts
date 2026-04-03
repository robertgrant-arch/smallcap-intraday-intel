import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const SMALL_CAP_SYMBOLS = [
  'AMC','GME','SOFI','PLTR','NIO','BB','CLOV','WISH','MARA','RIOT',
  'SNDL','TLRY','LCID','OPEN','SKLZ','DKNG','CRSR','RKT','PSFE','UWMC',
  'MVST','ASTS','IONQ','RKLB','LUNR','DNA','MNDY','AFRM','HOOD','RIVN'
];

export async function GET() {
  try {
    const quotes = await Promise.allSettled(
      SMALL_CAP_SYMBOLS.map(async (symbol) => {
        const q = await yahooFinance.quote(symbol);
        return {
          symbol: q.symbol,
          name: q.shortName || q.longName || symbol,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
          avgVolume: q.averageDailyVolume3Month ?? 1,
          marketCap: q.marketCap ?? 0,
        };
      })
    );

    const results = quotes
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    const gainers = [...results].sort((a, b) => b.changePercent - a.changePercent).slice(0, 10);
    const losers = [...results].sort((a, b) => a.changePercent - b.changePercent).slice(0, 10);
    const volumeSpikes = [...results]
      .map((r) => ({ ...r, relVolume: r.avgVolume > 0 ? r.volume / r.avgVolume : 0 }))
      .sort((a, b) => b.relVolume - a.relVolume)
      .slice(0, 10);

    return NextResponse.json({
      gainers,
      losers,
      volumeSpikes,
      updated: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
