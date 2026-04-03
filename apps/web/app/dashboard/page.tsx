'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, RefreshCw } from 'lucide-react';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  relVolume?: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<{ gainers: Mover[]; losers: Mover[]; volumeSpikes: Mover[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState('');

  const fetchMovers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/movers');
      const json = await res.json();
      setData(json);
      setUpdated(json.updated);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMovers(); }, []);

  const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtVol = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n?.toString();
  };

  const kpis = data ? [
    { label: 'Tracked Symbols', value: '30', change: 'Live', positive: true },
    { label: 'Top Gainer', value: data.gainers[0]?.symbol || '-', change: `+${fmt(data.gainers[0]?.changePercent || 0)}%`, positive: true },
    { label: 'Top Loser', value: data.losers[0]?.symbol || '-', change: `${fmt(data.losers[0]?.changePercent || 0)}%`, positive: false },
    { label: 'Vol Spike Leader', value: data.volumeSpikes[0]?.symbol || '-', change: `${(data.volumeSpikes[0]?.relVolume || 0).toFixed(1)}x avg`, positive: true },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-100">Dashboard</h1>
        <div className="flex items-center gap-3">
          {updated && <span className="text-xs text-zinc-500">Updated: {new Date(updated).toLocaleTimeString()}</span>}
          <button onClick={fetchMovers} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-zinc-950 rounded text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-3" />
          <p className="text-zinc-400">Loading market data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {kpis.map((k) => (
              <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
                <div className="text-zinc-500 text-xs mb-1">{k.label}</div>
                <div className="text-zinc-100 text-2xl font-bold">{k.value}</div>
                <div className={`text-sm mt-1 ${k.positive ? 'text-emerald-400' : 'text-red-400'}`}>{k.change}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Top Gainers</h2>
              <div className="space-y-2">
                {data?.gainers.slice(0, 8).map((m) => (
                  <div key={m.symbol} className="flex justify-between items-center text-sm">
                    <div><span className="text-zinc-100 font-medium">{m.symbol}</span> <span className="text-zinc-500 text-xs">${fmt(m.price)}</span></div>
                    <span className="text-emerald-400 font-mono">+{fmt(m.changePercent)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> Top Losers</h2>
              <div className="space-y-2">
                {data?.losers.slice(0, 8).map((m) => (
                  <div key={m.symbol} className="flex justify-between items-center text-sm">
                    <div><span className="text-zinc-100 font-medium">{m.symbol}</span> <span className="text-zinc-500 text-xs">${fmt(m.price)}</span></div>
                    <span className="text-red-400 font-mono">{fmt(m.changePercent)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> Volume Spikes</h2>
              <div className="space-y-2">
                {data?.volumeSpikes.slice(0, 8).map((m) => (
                  <div key={m.symbol} className="flex justify-between items-center text-sm">
                    <div><span className="text-zinc-100 font-medium">{m.symbol}</span> <span className="text-zinc-500 text-xs">{fmtVol(m.volume)}</span></div>
                    <span className="text-amber-400 font-mono">{(m.relVolume || 0).toFixed(1)}x</span>
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
