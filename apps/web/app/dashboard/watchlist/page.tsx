'use client';
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
}

export default function WatchlistPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [sortKey, setSortKey] = useState<keyof Quote>('changePercent');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes');
      const data = await res.json();
      if (data.quotes) {
        setQuotes(data.quotes);
        setUpdated(data.updated);
      }
      if (data.error) setError(data.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotes(); }, []);

  const sorted = [...quotes].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortDir === 'desc' ? bv - av : av - bv;
  });

  const fmt = (n: number) => n?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtVol = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n?.toString();
  };
  const fmtCap = (n: number) => {
    if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
    return '$' + n?.toLocaleString();
  };

  const handleSort = (key: keyof Quote) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Watchlist</h1>
          <p className="text-zinc-400 text-sm">Live quotes from Yahoo Finance. Click headers to sort.</p>
        </div>
        <div className="flex items-center gap-3">
          {updated && <span className="text-xs text-zinc-500">Updated: {new Date(updated).toLocaleTimeString()}</span>}
          <button onClick={fetchQuotes} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-zinc-950 rounded text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 rounded p-3 mb-4 text-red-400 text-sm">{error}</div>}

      {loading && quotes.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <RefreshCw className="w-8 h-8 text-zinc-500 animate-spin mx-auto mb-3" />
          <p className="text-zinc-400">Fetching live market data...</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                {[
                  { key: 'symbol', label: 'Symbol' },
                  { key: 'price', label: 'Price' },
                  { key: 'change', label: 'Change' },
                  { key: 'changePercent', label: '% Change' },
                  { key: 'volume', label: 'Volume' },
                  { key: 'marketCap', label: 'Mkt Cap' },
                  { key: 'high', label: 'High' },
                  { key: 'low', label: 'Low' },
                ].map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key as keyof Quote)} className="text-left px-4 py-2 cursor-pointer hover:text-zinc-300 transition">
                    {col.label} {sortKey === col.key ? (sortDir === 'desc' ? '▼' : '▲') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => (
                <tr key={q.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-100">{q.symbol}</div>
                    <div className="text-xs text-zinc-500 truncate max-w-[120px]">{q.name}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-100 font-mono">${fmt(q.price)}</td>
                  <td className={`px-4 py-3 font-mono ${q.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    <span className="flex items-center gap-0.5">
                      {q.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {q.change >= 0 ? '+' : ''}{fmt(q.change)}
                    </span>
                  </td>
                  <td className={`px-4 py-3 font-mono ${q.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {q.changePercent >= 0 ? '+' : ''}{fmt(q.changePercent)}%
                  </td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">{fmtVol(q.volume)}</td>
                  <td className="px-4 py-3 text-zinc-400">{fmtCap(q.marketCap)}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">${fmt(q.high)}</td>
                  <td className="px-4 py-3 text-zinc-400 font-mono">${fmt(q.low)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
