import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

const WATCHLIST = ['AAPL','TSLA','AMC','GME','SOFI','PLTR','NIO','BB','CLOV','WISH','MARA','RIOT','SNDL','TLRY','LCID'];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',') || WATCHLIST;

  try {
    const quotes = await Promise.allSettled(
      symbols.map(async (symbol) => {
        const q = await yahooFinance.quote(symbol);
        return {
          symbol: q.symbol,
          name: q.shortName || q.longName || symbol,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
          avgVolume: q.averageDailyVolume3Month ?? 0,
          marketCap: q.marketCap ?? 0,
          high: q.regularMarketDayHigh ?? 0,
          low: q.regularMarketDayLow ?? 0,
          open: q.regularMarketOpen ?? 0,
          prevClose: q.regularMarketPreviousClose ?? 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
        };
      })
    );

    const results = quotes
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map((r) => r.value);

    return NextResponse.json({ quotes: results, updated: new Date().toISOString() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
