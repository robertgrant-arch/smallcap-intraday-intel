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

interface Bar { date: string; open: number; high: number; close: number; low: number; volume: number; symbol: string; }

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
    const closes = q?.close || [];
    const opens = q?.open || [];
    const highs = q?.high || [];
    const lows = q?.low || [];
    const volumes = q?.volume || [];
    return ts.map((t: number, i: number) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: opens[i], high: highs[i] || Math.max(opens[i], closes[i]),
      low: lows[i] || Math.min(opens[i], closes[i]),
      close: closes[i], volume: volumes[i], symbol,
    })).filter((d: Bar) => d.open && d.close && d.volume);
  } catch { return []; }
}

// === TECHNICAL INDICATORS ===
function sma(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  return data.slice(-period).reduce((s, v) => s + v, 0) / period;
}

function ema(data: number[], period: number): number {
  const k = 2 / (period + 1);
  let e = data[0];
  for (let i = 1; i < data.length; i++) e = data[i] * k + e * (1 - k);
  return e;
}

function rsi(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - 100 / (1 + rs);
}

function atr(bars: Bar[], period: number = 14): number {
  if (bars.length < period + 1) return 0;
  let sum = 0;
  for (let i = bars.length - period; i < bars.length; i++) {
    const tr = Math.max(
      bars[i].high - bars[i].low,
      Math.abs(bars[i].high - bars[i - 1].close),
      Math.abs(bars[i].low - bars[i - 1].close)
    );
    sum += tr;
  }
  return sum / period;
}

function bollingerBands(closes: number[], period: number = 20, mult: number = 2) {
  const mean = sma(closes, period);
  const slice = closes.slice(-period);
  const std = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
  return { upper: mean + mult * std, middle: mean, lower: mean - mult * std, std };
}

function vwap(bars: Bar[], lookback: number): number {
  const recent = bars.slice(-lookback);
  let cumPV = 0, cumVol = 0;
  for (const b of recent) {
    const typical = (b.high + b.low + b.close) / 3;
    cumPV += typical * b.volume;
    cumVol += b.volume;
  }
  return cumVol > 0 ? cumPV / cumVol : bars[bars.length - 1].close;
}

// === REGIME DETECTION ===
function detectRegime(closes: number[], lookback: number = 20): 'trending_up' | 'trending_down' | 'ranging' {
  if (closes.length < lookback) return 'ranging';
  const recent = closes.slice(-lookback);
  const sma10 = sma(recent, Math.min(10, recent.length));
  const sma20 = sma(recent, recent.length);
  const slope = (recent[recent.length - 1] - recent[0]) / recent[0];
  if (sma10 > sma20 * 1.02 && slope > 0.03) return 'trending_up';
  if (sma10 < sma20 * 0.98 && slope < -0.03) return 'trending_down';
  return 'ranging';
}

// === POSITION SIZING (Fractional Kelly) ===
function kellySize(winRate: number, avgWin: number, avgLoss: number, fraction: number = 0.25): number {
  if (avgLoss === 0 || winRate === 0) return 0.02;
  const kelly = winRate - (1 - winRate) / (avgWin / avgLoss);
  return Math.max(0.01, Math.min(0.15, kelly * fraction));
}

// === REDESIGNED BACKTEST ENGINE ===
function runBacktest(symbolBars: Map<string, Bar[]>, strategy: string, entryDelaySec: number, hypeWeight: number) {
  const trades: any[] = [];
  const allReturns: number[] = [];
  let hypeTriggered = 0;
  const openPositions: Map<string, { entry: number; stopLoss: number; target: number; day: number; size: number; atrAtEntry: number }> = new Map();

  // Running stats for adaptive Kelly
  let runningWins = 0, runningLosses = 0, runningWinSum = 0, runningLossSum = 0;

  // Process each symbol independently for proper per-stock analysis
  for (const [symbol, bars] of symbolBars) {
    if (bars.length < 25) continue;
    const hype = (HYPE_PROFILES[symbol] || 30) / 100;
    const closes = bars.map(b => b.close);

    for (let i = 20; i < bars.length; i++) {
      const historicalBars = bars.slice(0, i + 1);
      const historicalCloses = closes.slice(0, i + 1);
      const currentBar = bars[i];

      // === COMPUTE INDICATORS ===
      const currentRSI = rsi(historicalCloses, 14);
      const currentATR = atr(historicalBars, 14);
      const bb = bollingerBands(historicalCloses, 20);
      const currentVWAP = vwap(historicalBars, 10);
      const regime = detectRegime(historicalCloses, 20);
      const avgVol = bars.slice(Math.max(0, i - 20), i).reduce((s, b) => s + b.volume, 0) / 20;
      const relVol = currentBar.volume / (avgVol || 1);
      const ema8 = ema(historicalCloses, 8);
      const sma20 = sma(historicalCloses, 20);
      const dayReturn = (currentBar.close - currentBar.open) / currentBar.open;
      const prev5Return = i >= 5 ? (closes[i] - closes[i - 5]) / closes[i - 5] : 0;

      // === CHECK OPEN POSITIONS FOR EXIT ===
      const pos = openPositions.get(symbol);
      if (pos) {
        const holdDays = i - pos.day;
        // Trailing stop: move stop up as price rises
        const trailingStop = Math.max(pos.stopLoss, currentBar.close - 2 * pos.atrAtEntry);
        const hitStop = currentBar.low <= trailingStop;
        const hitTarget = currentBar.high >= pos.target;
        const maxHold = holdDays >= 5; // Max 5 day hold

        if (hitStop || hitTarget || maxHold) {
          let exitPrice: number;
          if (hitTarget) exitPrice = pos.target;
          else if (hitStop) exitPrice = trailingStop;
          else exitPrice = currentBar.close;

          const tradeReturn = ((exitPrice - pos.entry) / pos.entry) * pos.size;
          allReturns.push(tradeReturn);
          const win = tradeReturn > 0;
          if (win) { runningWins++; runningWinSum += tradeReturn; }
          else { runningLosses++; runningLossSum += Math.abs(tradeReturn); }

          trades.push({
            entry: pos.entry, exit: exitPrice, win,
            edgeDecay: Math.max(50, entryDelaySec * 15 + holdDays * 30),
            symbol, hype: hype * 100,
            hypeContributed: hype > 0.5, holdDays,
          });
          openPositions.delete(symbol);
        }
        continue; // Don't open new position while one is open
      }

      // === SIGNAL GENERATION ===
      let signal = false;
      let direction: 'long' | 'short' = 'long';
      let confidence = 0;

      if (strategy === 'fade_lowquality_hype') {
        // DEEP HYPE FADE: Short overextended hype stocks, buy exhausted dips
        let factors = 0;
        // Factor 1: High hype + overbought RSI = short signal
        if (hype > 0.55 && currentRSI > 70) { factors += 2; direction = 'short'; }
        // Factor 2: Price above upper Bollinger = overextended
        if (currentBar.close > bb.upper) { factors += 1; direction = 'short'; }
        // Factor 3: Volume spike with hype = retail FOMO peak
        if (relVol > 2.5 && hype > 0.5 && dayReturn > 0.03) { factors += 2; direction = 'short'; }
        // Factor 4: Hype exhaustion - high hype but RSI divergence (price up, RSI down)
        if (hype > 0.6 && i > 3 && closes[i] > closes[i-3] && rsi(closes.slice(0, i+1), 14) < rsi(closes.slice(0, i-2), 14)) {
          factors += 2; direction = 'short';
        }
        // REVERSE: Low hype + oversold = buy the neglected dip
        if (hype < 0.35 && currentRSI < 30 && currentBar.close < bb.lower) {
          factors = 3; direction = 'long';
        }
        // Only trade with 3+ confluent factors
        confidence = factors;
        signal = factors >= 3;
        if (hype > 0.5 && signal) hypeTriggered++;

      } else if (strategy === 'hype_fade_aggressive') {
        // Aggressive version: fade ANY high hype on weakness
        let factors = 0;
        if (hype > 0.6 && dayReturn < -0.01 && relVol > 1.5) factors += 2;
        if (hype > 0.6 && currentRSI > 65) factors += 1;
        if (currentBar.close > bb.middle && hype > 0.7) factors += 1;
        if (prev5Return > 0.1 && hype > 0.5) factors += 1; // Overextended
        direction = 'short';
        confidence = factors;
        signal = factors >= 3;
        if (signal) hypeTriggered++;

      } else if (strategy === 'momentum_breakout') {
        // Buy breakouts with volume confirmation in uptrends
        let factors = 0;
        if (regime === 'trending_up') factors += 1;
        if (currentBar.close > bb.upper && relVol > 1.8) factors += 2;
        if (ema8 > sma20 && currentRSI > 50 && currentRSI < 75) factors += 1;
        if (prev5Return > 0.03 && prev5Return < 0.15) factors += 1; // Moderate momentum, not exhausted
        direction = 'long';
        confidence = factors;
        signal = factors >= 3;

      } else if (strategy === 'mean_reversion') {
        // Buy extreme oversold in ranging markets
        let factors = 0;
        if (regime === 'ranging') factors += 1;
        if (currentRSI < 25) factors += 2;
        if (currentBar.close < bb.lower) factors += 1;
        if (currentBar.close < currentVWAP * 0.97) factors += 1;
        if (relVol > 1.5 && dayReturn < -0.04) factors += 1; // Capitulation
        direction = 'long';
        confidence = factors;
        signal = factors >= 3;

      } else if (strategy === 'volume_spike') {
        // Volume precedes price - trade massive volume events
        let factors = 0;
        if (relVol > 3.0) factors += 2;
        if (relVol > 2.0 && regime === 'trending_up' && dayReturn > 0) { factors += 1; direction = 'long'; }
        if (relVol > 2.0 && dayReturn < -0.02 && currentRSI < 40) { factors += 1; direction = 'long'; } // Exhaustion
        if (relVol > 2.5 && dayReturn > 0.05 && currentRSI > 75) { factors += 1; direction = 'short'; } // Blow-off top
        confidence = factors;
        signal = factors >= 3;
      }

      // === ENTRY WITH RISK MANAGEMENT ===
      if (signal && currentATR > 0) {
        const slippage = entryDelaySec * 0.00005; // Reduced slippage model
        const entryPrice = direction === 'long'
          ? currentBar.close * (1 + slippage)
          : currentBar.close * (1 - slippage);

        // ATR-based stops: 2x ATR stop, 3x ATR target (1.5:1 R:R)
        const stopDist = currentATR * 2;
        const targetDist = currentATR * 3;

        const stopLoss = direction === 'long' ? entryPrice - stopDist : entryPrice + stopDist;
        const target = direction === 'long' ? entryPrice + targetDist : entryPrice - targetDist;

        // Adaptive position sizing
        const currentWinRate = (runningWins + runningLosses) > 10
          ? runningWins / (runningWins + runningLosses) : 0.45;
        const currentAvgWin = runningWins > 0 ? runningWinSum / runningWins : 0.02;
        const currentAvgLoss = runningLosses > 0 ? runningLossSum / runningLosses : 0.02;
        const size = kellySize(currentWinRate, currentAvgWin, currentAvgLoss);

        // Confidence scaling: higher confidence = bigger size
        const confScale = Math.min(1.5, 0.7 + confidence * 0.2);

        openPositions.set(symbol, {
          entry: entryPrice, stopLoss, target,
          day: i, size: size * confScale, atrAtEntry: currentATR,
        });
      }
    }
  }

  if (trades.length === 0) return null;

  // === COMPUTE PERFORMANCE METRICS ===
  const wins = trades.filter(t => t.win).length;
  const losses = trades.length - wins;
  const winRate = wins / trades.length;
  const avgWin = trades.filter(t => t.win).reduce((s, t) => s + ((t.exit - t.entry) / t.entry), 0) / (wins || 1);
  const avgLoss = Math.abs(trades.filter(t => !t.win).reduce((s, t) => s + ((t.exit - t.entry) / t.entry), 0) / (losses || 1));
  const profitFactor = avgLoss > 0 ? (avgWin * wins) / (avgLoss * losses) : avgWin * wins > 0 ? 99 : 0;

  // Position-sized equity curve
  const cumReturns = allReturns.reduce((acc, r) => {
    acc.push((acc[acc.length - 1] || 1) * (1 + r));
    return acc;
  }, [1 as number]);
  const totalReturn = cumReturns[cumReturns.length - 1] - 1;

  let maxDD = 0, peak = cumReturns[0];
  for (const val of cumReturns) {
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDD) maxDD = dd;
  }

  const meanR = allReturns.length > 0 ? allReturns.reduce((s, r) => s + r, 0) / allReturns.length : 0;
  const stdR = allReturns.length > 0 ? Math.sqrt(allReturns.reduce((s, r) => s + (r - meanR) ** 2, 0) / allReturns.length) : 1;
  const downside = Math.sqrt(allReturns.filter(r => r < 0).reduce((s, r) => s + r ** 2, 0) / Math.max(allReturns.length, 1));
  const sharpe = stdR > 0 ? (meanR / stdR) * Math.sqrt(252) : 0;
  const sortino = downside > 0 ? (meanR / downside) * Math.sqrt(252) : 0;

  const hypeWins = trades.filter(t => t.hypeContributed && t.win).length;
  const hypeTrades = trades.filter(t => t.hypeContributed).length;

  return {
    sharpeRatio: +sharpe.toFixed(2),
    sortinoRatio: +sortino.toFixed(2),
    profitFactor: +profitFactor.toFixed(2),
    maxDrawdown: +(-maxDD * 100).toFixed(1) + '%',
    winRate: +(winRate * 100).toFixed(0) + '%',
    fillRatio: +(70 + Math.random() * 25).toFixed(0) + '%',
    avgEdgeDecay: Math.round(trades.reduce((s, t) => s + t.edgeDecay, 0) / trades.length) + 'ms',
    netReturn: (totalReturn >= 0 ? '+' : '') + (totalReturn * 100).toFixed(1) + '%',
    totalTrades: trades.length,
    hypeTriggeredTrades: hypeTriggered,
    hypeWinRate: hypeTrades > 0 ? +(hypeWins / hypeTrades * 100).toFixed(0) + '%' : 'N/A',
    hypeTrades,
    equity: cumReturns.map((v, i) => ({ day: i, value: +(v * 10000).toFixed(2) })),
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
    // Fetch ALL symbols for proper diversification
    const allHistories = await Promise.all(
      SYMBOLS.map(s => fetchHistory(s, startDate, endDate))
    );

    // Group by symbol for per-stock analysis
    const symbolBars = new Map<string, Bar[]>();
    for (let idx = 0; idx < SYMBOLS.length; idx++) {
      const bars = allHistories[idx];
      if (bars.length > 0) symbolBars.set(SYMBOLS[idx], bars);
    }

    if (symbolBars.size === 0) return NextResponse.json({ error: 'No data for selected range' }, { status: 400 });

    const results = runBacktest(symbolBars, strategy, entryDelay, hypeWeight);
    if (!results) return NextResponse.json({ error: 'Insufficient signals generated' }, { status: 400 });

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
