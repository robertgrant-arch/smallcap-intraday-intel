'use client';

import { useState } from 'react';

const STRATEGIES = [
  { value: 'fade_lowquality_hype', label: 'Fade Low-Quality Hype' },
  { value: 'hype_fade_aggressive', label: 'Hype Fade Aggressive' },
  { value: 'momentum_breakout', label: 'Momentum Breakout' },
  { value: 'mean_reversion', label: 'Mean Reversion' },
  { value: 'volume_spike', label: 'Volume Spike' },
];

const DELAYS = [
  { value: '5', label: '5 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '60 seconds' },
];

export default function BacktestPage() {
  const [strategy, setStrategy] = useState('fade_lowquality_hype');
  const [entryDelay, setEntryDelay] = useState('15');
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-12-31');
  const [hypeWeight, setHypeWeight] = useState(0.5);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const isFadeStrategy = strategy.includes('fade') || strategy.includes('hype');

  const runBacktest = async () => {
    setLoading(true); setError(''); setHasRun(true);
    try {
      const params = new URLSearchParams({ strategy, entryDelay, startDate, endDate, hypeWeight: hypeWeight.toString() });
      const res = await fetch(`/api/backtest?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setResults(null); }
      else setResults(data);
    } catch (e: any) { setError(e.message || 'Failed'); setResults(null); }
    finally { setLoading(false); }
  };

  const metrics = results ? [
    { label: 'Sharpe Ratio', value: results.sharpeRatio },
    { label: 'Sortino Ratio', value: results.sortinoRatio },
    { label: 'Profit Factor', value: results.profitFactor },
    { label: 'Max Drawdown', value: results.maxDrawdown },
    { label: 'Win Rate', value: results.winRate },
    { label: 'Fill Ratio', value: results.fillRatio },
    { label: 'Avg Edge Decay', value: results.avgEdgeDecay },
    { label: 'Net Return (after costs)', value: results.netReturn },
  ] : [];

  const maxEq = results?.equity ? Math.max(...results.equity.map((e: any) => e.value)) : 0;
  const minEq = results?.equity ? Math.min(...results.equity.map((e: any) => e.value)) : 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Backtest Engine</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="text-zinc-500 block mb-1 text-sm">Strategy</label>
              <select value={strategy} onChange={e => setStrategy(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500">
                {STRATEGIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-zinc-500 block mb-1 text-sm">Entry Delay</label>
              <select value={entryDelay} onChange={e => setEntryDelay(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500">
                {DELAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            {isFadeStrategy && (
              <div className="bg-orange-500/10 border border-orange-800/50 rounded-lg p-3">
                <label className="text-orange-400 block mb-1 text-sm font-semibold">Hype Weight: {(hypeWeight * 100).toFixed(0)}%</label>
                <input type="range" min="0" max="1" step="0.1" value={hypeWeight} onChange={e => setHypeWeight(parseFloat(e.target.value))} className="w-full accent-orange-500" />
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Price Only</span><span>Balanced</span><span>Hype Heavy</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">Controls how much Reddit/social hype data influences trade signals. Higher = more trades triggered by social sentiment.</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-500 block mb-1 text-sm">Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-zinc-500 block mb-1 text-sm">End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
            <button onClick={runBacktest} disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-800 disabled:text-zinc-400 text-zinc-950 font-semibold rounded-lg transition-colors">
              {loading ? 'Running Backtest...' : 'Run Backtest'}
            </button>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Results</h2>
          {!hasRun && <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">Configure parameters and click Run Backtest</div>}
          {loading && <div className="flex items-center justify-center h-64"><div className="text-emerald-400 text-sm animate-pulse">Running backtest with hype signals...</div></div>}
          {error && <div className="flex items-center justify-center h-64 text-red-400 text-sm">{error}</div>}
          {results && !loading && (
            <div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {metrics.map(m => (
                  <div key={m.label} className="bg-zinc-800/50 rounded p-3">
                    <div className="text-zinc-500 text-xs">{m.label}</div>
                    <div className="text-zinc-100 font-semibold mt-1">{m.value}</div>
                  </div>
                ))}
              </div>
              {isFadeStrategy && results.hypeTrades > 0 && (
                <div className="bg-orange-500/10 border border-orange-800/50 rounded-lg p-3 mt-3">
                  <div className="text-orange-400 text-xs font-semibold mb-2">Hype Signal Analysis</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div><div className="text-zinc-500 text-xs">Hype Trades</div><div className="text-orange-400 font-bold">{results.hypeTrades}</div></div>
                    <div><div className="text-zinc-500 text-xs">Hype Win Rate</div><div className="text-orange-400 font-bold">{results.hypeWinRate}</div></div>
                    <div><div className="text-zinc-500 text-xs">Hype Triggered</div><div className="text-orange-400 font-bold">{results.hypeTriggeredTrades}</div></div>
                  </div>
                </div>
              )}
              <div className="text-zinc-500 text-xs mt-2">Total trades: {results.totalTrades}</div>
            </div>
          )}
        </div>
      </div>

      {results?.equity && !loading && (
        <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Equity Curve</h2>
          <div className="h-48 flex items-end gap-px">
            {results.equity.map((pt: any, i: number) => {
              const range = maxEq - minEq || 1;
              const h = ((pt.value - minEq) / range) * 100;
              return <div key={i} className={`flex-1 rounded-t-sm ${pt.value >= 10000 ? 'bg-emerald-500/60' : 'bg-red-500/60'}`} style={{ height: `${Math.max(2, h)}%` }} title={`Day ${pt.day}: $${pt.value.toLocaleString()}`} />;
            })}
          </div>
          <div className="flex justify-between text-zinc-500 text-xs mt-2"><span>Day 0</span><span>Day {results.equity.length - 1}</span></div>
        </div>
      )}
    </div>
  );
}