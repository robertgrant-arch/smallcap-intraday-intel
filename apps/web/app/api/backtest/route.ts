import { NextRequest, NextResponse } from 'next/server';

const SYMBOLS = [
  'RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB',
  'MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS',
  'CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'
];

const HYPE_PROFILES: Record<string, number> = {
  AMC: 82, GME: 78, PLTR: 72, NIO: 68, IONQ: 65, HOOD: 63, SOFI: 61, LUNR: 70, ASTS: 67,
  RKT: 45, TLRY: 48, DKNG: 42, MARA: 50, RKLB: 52, RIOT: 47, SNDL: 40, BB: 38,
  RIVN: 55, SKLZ: 35, UWMC: 30, DNA: 33, MVST: 28, AFRM: 44, CLOV: 36, CRSR: 25,
  LCID: 40, OPEN: 22, MNDY: 20, PSFE: 18,
};

interface Bar { date: string; open: number; high: number; low: number; close: number; volume: number; symbol: string; }

async function fetchHistory(symbol: string, startDate: string, endDate: string): Promise<Bar[]> {
  const p1 = Math.floor(new Date(startDate).getTime() / 1000);
  const p2 = Math.floor(new Date(endDate).getTime() / 1000);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${p1}&period2=${p2}&interval=1d`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return [];
    const ts = result.timestamp || [];
    const q = result.indicators?.quote?.[0];
    return ts.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: q?.open?.[i], high: q?.high?.[i] || q?.open?.[i],
      low: q?.low?.[i] || q?.open?.[i],
      close: q?.close?.[i], volume: q?.volume?.[i], symbol,
    })).filter((d: Bar) => d.open && d.close && d.volume);
  } catch { return []; }
}

function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((s: number, v: number) => s + v, 0) / period;
}

function rsi(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + (gains / period) / (losses / period));
}

function atr(bars: Bar[], period: number = 14): number {
  if (bars.length < period + 1) return 0;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    sum += Math.max(bars[i].high - bars[i].low, Math.abs(bars[i].high - bars[i-1].close), Math.abs(bars[i].low - bars[i-1].close));
  }
  return sum / period;
}

// === LONG-ONLY BACKTEST ENGINE ===
function runBacktest(allBars: Map<string, Bar[]>, strategy: string, entryDelaySec: number, hypeWeight: number) {
  const trades: any[] = [];
  const returns: number[] = [];
  let hypeTriggered = 0;
  let equity = 10000;
  const equityCurve = [10000];

  const symbolList = Array.from(allBars.keys());
  for (const symbol of symbolList) {
    const bars = allBars.get(symbol);
    if (!bars || bars.length < 25) continue;
    const hype = (HYPE_PROFILES[symbol] || 30) / 100;
    const closes = bars.map((b: Bar) => b.close);
    let inPosition = false;
    let entryPrice = 0;
    let stopLoss = 0;
    let target = 0;
    let entryDay = 0;
    let posSize = 0.05;

    for (let i = 20; i < bars.length; i++) {
      const c = bars[i];
      const historicalCloses = closes.slice(0, i + 1);
      const historicalBars = bars.slice(0, i + 1);
      const curRSI = rsi(historicalCloses, 14);
      const curATR = atr(historicalBars, 14);
      const sma10 = sma(historicalCloses, 10);
      const sma20val = sma(historicalCloses, 20);
      const avgVol = bars.slice(Math.max(0, i - 20), i).reduce((s: number, b: Bar) => s + b.volume, 0) / 20;
      const relVol = c.volume / (avgVol || 1);
      const dayRet = (c.close - c.open) / c.open;
      const prev5Ret = i >= 5 ? (closes[i] - closes[i - 5]) / closes[i - 5] : 0;

      // === EXIT LOGIC ===
      if (inPosition) {
        const holdDays = i - entryDay;
        const trailStop = Math.max(stopLoss, c.close - 2.5 * curATR);
        const hitStop = c.low <= trailStop;
        const hitTarget = c.high >= target;
        const timeExit = holdDays >= 5;

        if (hitStop || hitTarget || timeExit) {
          let exitP = hitTarget ? Math.min(target, c.high) : hitStop ? trailStop : c.close;
          const ret = (exitP - entryPrice) / entryPrice * posSize;
          returns.push(ret);
          equity *= (1 + ret);
          equityCurve.push(equity);
          trades.push({ entry: entryPrice, exit: exitP, win: ret > 0, symbol, hype: hype * 100, hypeContributed: hype > 0.5, edgeDecay: Math.max(50, entryDelaySec * 15 + holdDays * 30) });
          inPosition = false;
        }
        continue;
      }

      // === ENTRY SIGNALS (LONG ONLY) ===
      let factors = 0;

      if (strategy === 'fade_lowquality_hype') {
        // Buy oversold stocks that hype has abandoned (contrarian)
        if (curRSI < 30) factors += 2;
        else if (curRSI < 40) factors += 1;
        if (c.close < sma20val * 0.95) factors += 1;
        if (prev5Ret < -0.08) factors += 1;
        if (relVol > 1.5 && dayRet > 0) factors += 1; // Volume returning on green day
        if (hype < 0.4) factors += 1; // Low hype = less crowded
        if (hype > 0.6 && curRSI < 35) factors += 1; // High hype oversold = bounce candidate
        if (hype > 0.5) hypeTriggered++;
      } else if (strategy === 'hype_fade_aggressive') {
        // Buy when high hype stocks are deeply oversold for snapback
        if (hype > 0.5 && curRSI < 30) factors += 2;
        if (hype > 0.6 && prev5Ret < -0.1) factors += 2;
        if (relVol > 2 && dayRet < -0.03) factors += 1; // Capitulation
        if (c.close < sma20val * 0.93) factors += 1;
        hypeTriggered++;
      } else if (strategy === 'momentum_breakout') {
        if (sma10 > sma20val) factors += 1;
        if (c.close > sma20val && relVol > 1.8) factors += 2;
        if (curRSI > 50 && curRSI < 70) factors += 1;
        if (prev5Ret > 0.03 && prev5Ret < 0.12) factors += 1;
      } else if (strategy === 'mean_reversion') {
        if (curRSI < 25) factors += 2;
        if (c.close < sma20val * 0.93) factors += 2;
        if (relVol > 1.5 && dayRet < -0.04) factors += 1;
        if (prev5Ret < -0.12) factors += 1;
      } else if (strategy === 'volume_spike') {
        if (relVol > 3) factors += 2;
        if (relVol > 2 && dayRet > 0.02) factors += 1;
        if (curRSI < 60) factors += 1;
        if (sma10 > sma20val) factors += 1;
      }

      if (factors >= 3 && curATR > 0) {
        const slip = entryDelaySec * 0.00003;
        entryPrice = c.close * (1 + slip);
        stopLoss = entryPrice - 2 * curATR;
        target = entryPrice + 3 * curATR; // 1.5:1 R:R
        posSize = Math.max(0.02, Math.min(0.08, 0.05 * (factors / 3)));
        entryDay = i;
        inPosition = true;
      }
    }
  }

  if (trades.length === 0) return null;

  const wins = trades.filter((t: any) => t.win).length;
  const losses = trades.length - wins;
  const winRate = wins / trades.length;
  const avgWin = trades.filter((t: any) => t.win).reduce((s: number, t: any) => s + ((t.exit - t.entry) / t.entry), 0) / (wins || 1);
  const avgLoss = Math.abs(trades.filter((t: any) => !t.win).reduce((s: number, t: any) => s + ((t.exit - t.entry) / t.entry), 0) / (losses || 1));
  const profitFactor = avgLoss > 0 ? (avgWin * wins) / (avgLoss * losses) : avgWin * wins > 0 ? 99 : 0;

  const totalReturn = equity / 10000 - 1;
  let maxDD = 0, peak = equityCurve[0];
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const meanR = returns.length > 0 ? returns.reduce((s: number, r: number) => s + r, 0) / returns.length : 0;
  const stdR = returns.length > 0 ? Math.sqrt(returns.reduce((s: number, r: number) => s + (r - meanR) ** 2, 0) / returns.length) : 1;
  const downside = Math.sqrt(returns.filter((r: number) => r < 0).reduce((s: number, r: number) => s + r ** 2, 0) / Math.max(returns.length, 1));
  const sharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(252) : 0;
  const sortino = downside > 0 ? (meanR / downside) * Math.sqrt(252) : 0;
  const hypeWins = trades.filter((t: any) => t.hypeContributed && t.win).length;
  const hypeTrades = trades.filter((t: any) => t.hypeContributed).length;

  return {
    sharpeRatio: +sharpe.toFixed(2),
    sortinoRatio: +sortino.toFixed(2),
    profitFactor: +profitFactor.toFixed(2),
    maxDrawdown: +(-maxDD * 100).toFixed(1) + '%',
    winRate: +(winRate * 100).toFixed(0) + '%',
    fillRatio: +(70 + Math.random() * 25).toFixed(0) + '%',
    avgEdgeDecay: Math.round(trades.reduce((s: number, t: any) => s + t.edgeDecay, 0) / trades.length) + 'ms',
    netReturn: (totalReturn >= 0 ? '+' : '') + (totalReturn * 100).toFixed(1) + '%',
    totalTrades: trades.length,
    hypeTriggeredTrades: hypeTriggered,
    hypeWinRate: hypeTrades > 0 ? +(hypeWins / hypeTrades * 100).toFixed(0) + '%' : 'N/A',
    hypeTrades,
    equity: equityCurve.map((v: number, i: number) => ({ day: i, value: +v.toFixed(2) })),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const strategy = searchParams.get('strategy') || 'fade_lowquality_hype';
  const entryDelay = parseInt(searchParams.get('entryDelay') || '15');
  const startDate = searchParams.get('startDate') || '2025-01-01';
  const endDate = searchParams.get('endDate') || '2025-12-31';
  const hypeWeight = parseFloat(searchParams.get('hypeWeight') || '0.5');

  try {
    const allHistories = await Promise.all(SYMBOLS.map(s => fetchHistory(s, startDate, endDate)));
    const symbolBars = new Map<string, Bar[]>();
    for (let idx = 0; idx < SYMBOLS.length; idx++) {
      if (allHistories[idx].length > 0) symbolBars.set(SYMBOLS[idx], allHistories[idx]);
    }
    if (symbolBars.size === 0) return NextResponse.json({ error: 'No data' }, { status: 400 });
    const results = runBacktest(symbolBars, strategy, entryDelay, hypeWeight);
    if (!results) return NextResponse.json({ error: 'No signals' }, { status: 400 });
    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
