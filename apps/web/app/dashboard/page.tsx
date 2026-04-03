'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, BarChart3, RefreshCw, Zap } from 'lucide-react';

interface RankedStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  relVolume: number;
  score: number;
  catalyst: string;
  risk: string;
  sentiment: string;
  fiveDayReturn: number;
  distFromHigh: number;
  annualizedReturn: number;
  annualizedVol: number;
  sharpe: number;
}

export default function DashboardPage() {
  const [rankings, setRankings] = useState<RankedStock[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rankings');
      const json = await res.json();
      setRankings(json.rankings || []);
      setStats(json.stats);
      setUpdated(json.updated);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n: number) => {
    if (n === undefined || n === null || isNaN(n)) return '0.00%';
    const abs = Math.abs(n);
    if (abs >= 1000) return (n > 0 ? '+' : '') + Math.round(n).toLocaleString() + '%';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  };
  const fmtVol = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n?.toString();
  };
  const sc = (s: number) =>
    s >= 75 ? 'text-emerald-400' : s >= 60 ? 'text-emerald-300' : s >= 45 ? 'text-amber-400' : 'text-red-400';
  const retColor = (r: number) =>
    r >= 50 ? 'text-emerald-400' : r >= 0 ? 'text-emerald-300' : r >= -50 ? 'text-red-300' : 'text-red-400';
  const rb = (r: string) => ({
    Low: 'bg-emerald-900/50 text-emerald-400 border-emerald-800',
    Medium: 'bg-amber-900/50 text-amber-400 border-amber-800',
    High: 'bg-red-900/50 text-red-400 border-red-800',
  }[r] || 'bg-amber-900/50 text-amber-400 border-amber-800');
  const sb = (s: string) => ({
    Bullish: 'text-emerald-400', Positive: 'text-emerald-300',
    Neutral: 'text-zinc-400', Negative: 'text-red-300', Bearish: 'text-red-400',
  }[s] || 'text-zinc-400');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Expected Return Rankings</h1>
        <div className="flex items-center gap-3">
          {updated && <span className="text-xs text-zinc-500">Updated: {new Date(updated).toLocaleTimeString()}</span>}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-zinc-950 rounded text-sm font-medium hover:bg-emerald-500 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>
      {loading && !rankings.length ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-3" />
          <p className="text-zinc-400">Analyzing 30 small-cap stocks...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Tracked', value: stats?.totalTracked || 0, sub: 'Live Data', color: 'text-emerald-400' },
              { label: 'Avg Ann. Return', value: fmtPct(stats?.avgAnnReturn || 0), sub: 'annualized', color: stats?.avgAnnReturn >= 0 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'High Confidence', value: stats?.highConfidence || 0, sub: 'score >= 70', color: 'text-emerald-400' },
              { label: 'High Risk', value: stats?.highRisk || 0, sub: 'elevated vol', color: 'text-red-400' },
            ].map((k) => (
              <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-zinc-500 text-xs mb-1">{k.label}</div>
                <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
                <div className="text-zinc-400 text-sm mt-1">{k.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden mb-6">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" /> Ranked by Annualized Expected Return
              </h2>
              <p className="text-xs text-zinc-500 mt-1">Based on trailing 1-month mean daily return compounded over 252 trading days</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Ticker</th>
                    <th className="text-right p-3">Ann. Return</th>
                    <th className="text-right p-3">Ann. Vol</th>
                    <th className="text-right p-3">Sharpe</th>
                    <th className="text-right p-3">Score</th>
                    <th className="text-left p-3">Catalyst</th>
                    <th className="text-left p-3">Risk</th>
                    <th className="text-left p-3">Sentiment</th>
                    <th className="text-right p-3">Price</th>
                    <th className="text-right p-3">Today</th>
                    <th className="text-right p-3">5D</th>
                    <th className="text-right p-3">Rel Vol</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((s, i) => (
                    <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="p-3 text-zinc-500 font-mono">{i + 1}</td>
                      <td className="p-3"><div className="text-zinc-100 font-medium">{s.symbol}</div><div className="text-zinc-500 text-xs truncate max-w-[120px]">{s.name}</div></td>
                      <td className={`p-3 text-right font-bold font-mono ${retColor(s.annualizedReturn)}`}>{fmtPct(s.annualizedReturn)}</td>
                      <td className="p-3 text-right font-mono text-zinc-400">{fmt(s.annualizedVol)}%</td>
                      <td className={`p-3 text-right font-mono ${s.sharpe >= 1 ? 'text-emerald-400' : s.sharpe >= 0 ? 'text-zinc-300' : 'text-red-400'}`}>{s.sharpe?.toFixed(2)}</td>
                      <td className={`p-3 text-right font-mono ${sc(s.score)}`}>{s.score}</td>
                      <td className="p-3"><span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{s.catalyst}</span></td>
                      <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded border ${rb(s.risk)}`}>{s.risk}</span></td>
                      <td className={`p-3 text-xs ${sb(s.sentiment)}`}>{s.sentiment}</td>
                      <td className="p-3 text-right text-zinc-100 font-mono">${fmt(s.price)}</td>
                      <td className={`p-3 text-right font-mono ${s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(s.changePercent)}</td>
                      <td className={`p-3 text-right font-mono ${s.fiveDayReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmtPct(s.fiveDayReturn)}</td>
                      <td className="p-3 text-right font-mono text-amber-400">{s.relVolume?.toFixed(1)}x</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Top 5 Annualized Returns
              </h2>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((s) => (
                  <div key={s.symbol} className="flex justify-between items-center text-sm">
                    <div><span className="text-zinc-100 font-medium">{s.symbol}</span><span className="text-zinc-500 text-xs ml-2">{s.catalyst}</span></div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold ${retColor(s.annualizedReturn)}`}>{fmtPct(s.annualizedReturn)}</span>
                      <span className="font-mono text-xs text-zinc-500">Sharpe {s.sharpe?.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Highest Volume Activity
              </h2>
              <div className="space-y-2">
                {[...rankings].sort((a, b) => b.relVolume - a.relVolume).slice(0, 5).map((s) => (
                  <div key={s.symbol} className="flex justify-between items-center text-sm">
                    <div><span className="text-zinc-100 font-medium">{s.symbol}</span><span className="text-zinc-500 text-xs ml-2">{fmtVol(s.volume)}</span></div>
                    <span className="text-amber-400 font-mono">{s.relVolume?.toFixed(1)}x avg</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}