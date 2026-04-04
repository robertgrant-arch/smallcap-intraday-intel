'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Flame, RefreshCw } from 'lucide-react';
const retColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-zinc-400';
const hypeColor = (v: number) => v > 70 ? 'text-orange-400' : v > 40 ? 'text-amber-400' : 'text-zinc-500';
export default function DashboardPage() {
  const [data, setData] = useState<any>({ rankings: [], stats: {} });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      fetch('/api/rankings').then(r => r.json()).catch(() => ({ rankings: [], stats: {} })),
      fetch('/api/sentiment').then(r => r.json()).catch(() => ({ source: 'unavailable' })),
    ]).then(([rankData, sentData]) => {
      const hypeMap: Record<string, any> = {};
      for (const s of (sentData.sentiments || [])) { hypeMap[s.symbol] = s; }
      const merged = (rankData.rankings || []).map((stock: any) => ({
        ...stock,
        hypeScore: hypeMap[stock.symbol]?.hypeScore || stock.hypeScore || 0,
        redditMentions: hypeMap[stock.symbol]?.redditMentions || stock.redditMentions || 0,
        topRumors: hypeMap[stock.symbol]?.topRumors || stock.topRumors || [],
      }));
      setData({ ...rankData, rankings: merged, sentSource: sentData.source || 'model' });
      setLoading(false);
    });
  }, []);
  const { rankings = [], stats = {} as any, updated = '', sentSource = 'model' } = data;
  if (loading) return <div className="text-zinc-500 p-8">Loading live data...</div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Expected Return Rankings</h1>
          <p className="text-zinc-500 text-sm mt-1">Updated: {new Date(updated).toLocaleTimeString()}</p>
        </div>
        <a href="/dashboard" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded text-sm font-medium"><RefreshCw size={14}/> Refresh</a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">Tracked</div><div className="text-xl font-bold text-zinc-100">{(stats as any).totalTracked}</div><div className="text-emerald-500 text-xs">Live Data</div></div>
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">Hype: {sentSource === 'perplexity_sonar' ? 'Perplexity Sonar' : 'Model'}</div></div>
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">Avg Score</div><div className="text-xl font-bold text-zinc-100">{(stats as any).avgScore}</div><div className="text-zinc-500 text-xs">out of 100</div></div>
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">High Confidence</div><div className="text-xl font-bold text-emerald-400">{(stats as any).highConfidence}</div><div className="text-zinc-500 text-xs">score &gt;= 70</div></div>
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">Avg Hype</div><div className="text-xl font-bold text-amber-400">{(stats as any).avgHype || 0}</div><div className="text-zinc-500 text-xs">social score</div></div>
        <div className="bg-zinc-900 rounded-lg p-3"><div className="text-zinc-500 text-xs">High Hype</div><div className="text-xl font-bold text-orange-400">{(stats as any).highHype || 0}</div><div className="text-zinc-500 text-xs">hype &gt; 60</div></div>
      </div>
      <h2 className="text-lg font-semibold text-zinc-200 mb-3">Stocks Ranked by Expected Return</h2>
      <div className="overflow-x-auto bg-zinc-900 rounded-lg">
        <table className="w-full text-sm">
          <thead><tr className="text-zinc-500 border-b border-zinc-800">
            <th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Ticker</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Catalyst</th><th className="px-3 py-2">Risk</th><th className="px-3 py-2">Sentiment</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Change</th><th className="px-3 py-2">5D Return</th><th className="px-3 py-2">Rel Vol</th><th className="px-3 py-2">Upside</th><th className="px-3 py-2">Hype</th><th className="px-3 py-2">Reddit</th>
          </tr></thead>
          <tbody>
            {rankings.map((s: any, i: number) => (
              <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/50">
                <td className="px-3 py-2 text-zinc-500">{i + 1}</td>
                <td className="px-3 py-2"><div className="font-bold text-zinc-100">{s.symbol}</div><div className="text-zinc-500 text-xs">{s.name}</div></td>
                <td className="px-3 py-2 text-center font-bold text-emerald-400">{s.score}</td>
                <td className="px-3 py-2 text-center text-xs text-zinc-400">{s.catalyst}</td>
                <td className="px-3 py-2 text-center text-xs">{s.risk}</td>
                <td className="px-3 py-2 text-center text-xs">{s.sentiment}</td>
                <td className="px-3 py-2 text-center text-zinc-100">${s.price?.toFixed(2)}</td>
                <td className={`px-3 py-2 text-center ${retColor(s.changePercent)}`}>{s.changePercent > 0 ? '+' : ''}{s.changePercent}%</td>
                <td className={`px-3 py-2 text-center ${retColor(s.fiveDayReturn)}`}>{s.fiveDayReturn > 0 ? '+' : ''}{s.fiveDayReturn}%</td>
                <td className="px-3 py-2 text-center text-zinc-300">{s.relVolume}x</td>
                <td className="px-3 py-2 text-center text-emerald-400">{s.upside}%</td>
                <td className={`px-3 py-2 text-center ${hypeColor(s.hypeScore)}`}>{s.hypeScore}</td>
                <td className="px-3 py-2 text-center text-zinc-400">{s.redditMentions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rankings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-zinc-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Top 5 Expected Returns</h3>
            {rankings.slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50">
                <div><span className="font-bold text-zinc-100">{s.symbol}</span> <span className="text-zinc-500 text-xs">{s.catalyst}</span></div>
                <div><span className={retColor(s.changePercent)}>{s.changePercent > 0 ? '+' : ''}{s.changePercent}%</span> <span className="text-emerald-400 ml-2 font-bold">{s.score}</span></div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Highest Social Hype</h3>
            {[...rankings].sort((a: any, b: any) => b.hypeScore - a.hypeScore).slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50">
                <div><span className="font-bold text-zinc-100">{s.symbol}</span> <span className="text-zinc-500 text-xs">{s.topRumors?.[0] || 'No rumors'}</span></div>
                <div><span className={hypeColor(s.hypeScore)}>{s.hypeScore}</span> <span className="text-zinc-500 text-xs ml-1">{s.redditMentions} mentions</span></div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-900 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Highest Volume Activity</h3>
            {[...rankings].sort((a: any, b: any) => b.relVolume - a.relVolume).slice(0, 5).map((s: any) => (
              <div key={s.symbol} className="flex justify-between items-center py-1.5 border-b border-zinc-800/50">
                <div><span className="font-bold text-zinc-100">{s.symbol}</span> <span className="text-zinc-500 text-xs">{(s.volume / 1e6).toFixed(1)}M</span></div>
                <div className="text-amber-400 font-bold">{s.relVolume}x avg</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}