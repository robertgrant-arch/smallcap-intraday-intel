'use client';
import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Flame, RefreshCw } from 'lucide-react';

const retColor = (v: number) => v > 0 ? 'text-emerald-400' : v < 0 ? 'text-red-400' : 'text-zinc-400';
const hypeColor = (v: number) => v > 70 ? 'text-orange-400' : v > 40 ? 'text-amber-400' : 'text-zinc-500';

export default function DashboardPage() {
  const [data, setData] = useState<any>({ rankings: [], stats: {}, updated: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/rankings').then(r => r.json()).catch(() => ({ rankings: [], stats: {}, updated: '' })),
      fetch('/api/sentiment').then(r => r.json()).catch(() => ({ sentiments: [] }))
    ]).then(([rankData, sentData]) => {
      const hypeMap: Record<string, any> = {};
      for (const s of (sentData.sentiments || [])) { hypeMap[s.symbol] = s; }
      const merged = (rankData.rankings || []).map((stock: any) => {
        const hype = hypeMap[stock.symbol];
        if (!hype) return stock;
        return { ...stock, hypeScore: hype.hypeScore || 0, redditMentions: hype.redditMentions || 0, topRumors: hype.topRumors || [], hypeSentiment: hype.sentiment || 'neutral' };
      });
      const avgHype = merged.length ? Math.round(merged.reduce((s: number, r: any) => s + (r.hypeScore || 0), 0) / merged.length) : 0;
      const highHype = merged.filter((s: any) => s.hypeScore > 60).length;
      setData({ ...rankData, rankings: merged, stats: { ...rankData.stats, avgHype, highHype }, sentSource: sentData.source || 'model' });
      setLoading(false);
    });
  }, []);

  const { rankings = [], stats = {} as any, updated = '', sentSource = 'model' } = data;

  if (loading) return <div className="text-zinc-500 p-8">Loading live data...</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Expected Return Rankings</h1>
      <div className="flex items-center gap-4 mb-4">
        <div className="text-zinc-500 text-xs">Updated: <span className="text-zinc-300">{new Date(updated).toLocaleTimeString()}</span></div>
        <a href="/dashboard" className="text-emerald-400 text-xs hover:underline flex items-center gap-1"><RefreshCw className="w-3 h-3" />Refresh</a>
        <div className="text-zinc-500 text-xs">Tracked <span className="text-zinc-100 font-bold">{(stats as any).totalTracked}</span></div>
        <div className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Live Data</div>
        <div className="text-xs px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 flex items-center gap-1"><Flame className="w-3 h-3" />Hype: {sentSource === 'perplexity_sonar' ? 'Perplexity Sonar' : 'Model'}</div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500 text-xs">Avg Score</div>
          <div className="text-xl font-bold text-zinc-100">{(stats as any).avgScore}</div>
          <div className="text-zinc-500 text-xs">out of 100</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500 text-xs">High Confidence</div>
          <div className="text-xl font-bold text-zinc-100">{(stats as any).highConfidence}</div>
          <div className="text-zinc-500 text-xs">score &gt;= 70</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <div className="text-zinc-500 text-xs">High Risk</div>
          <div className="text-xl font-bold text-zinc-100">{(stats as any).highRisk}</div>
          <div className="text-zinc-500 text-xs">elevated vol</div>
        </div>
        <div className="bg-zinc-900 border border-orange-800/50 rounded-lg p-3">
          <div className="text-orange-500 text-xs flex items-center gap-1"><Flame className="w-3 h-3" />Avg Hype</div>
          <div className="text-xl font-bold text-orange-400">{(stats as any).avgHype || 0}</div>
          <div className="text-zinc-500 text-xs">social score</div>
        </div>
        <div className="bg-zinc-900 border border-orange-800/50 rounded-lg p-3">
          <div className="text-orange-500 text-xs flex items-center gap-1"><Flame className="w-3 h-3" />High Hype</div>
          <div className="text-xl font-bold text-orange-400">{(stats as any).highHype || 0}</div>
          <div className="text-zinc-500 text-xs">hype &gt; 60</div>
        </div>
      </div>
      <h2 className="text-sm font-semibold text-zinc-100 mb-3">Stocks Ranked by Expected Return</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Ticker</th>
              <th className="text-left py-2 px-2">Score</th>
              <th className="text-left py-2 px-2">Catalyst</th>
              <th className="text-left py-2 px-2">Risk</th>
              <th className="text-left py-2 px-2">Sentiment</th>
              <th className="text-right py-2 px-2">Price</th>
              <th className="text-right py-2 px-2">Change</th>
              <th className="text-right py-2 px-2">5D Return</th>
              <th className="text-right py-2 px-2">Rel Vol</th>
              <th className="text-right py-2 px-2">Upside</th>
              <th className="text-right py-2 px-2"><span className="text-orange-400">Hype</span></th>
              <th className="text-right py-2 px-2"><span className="text-orange-400">Reddit</span></th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((s: any, i: number) => (
              <tr key={s.symbol} className="border-b border-zinc-800/50 hover:bg-zinc-800/30" title={s.topRumors?.join(' | ')}>
                <td className="py-2 px-2 text-zinc-500">{i + 1}</td>
                <td className="py-2 px-2"><div className="font-bold text-zinc-100">{s.symbol}</div><div className="text-zinc-500 text-xs truncate max-w-[140px]">{s.name}</div></td>
                <td className="py-2 px-2 font-bold text-zinc-100">{s.score}</td>
                <td className="py-2 px-2"><span className={`text-xs px-1.5 py-0.5 rounded ${s.catalyst === 'Social Hype' ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>{s.catalyst}</span></td>
                <td className="py-2 px-2 text-zinc-400">{s.risk}</td>
                <td className="py-2 px-2 text-zinc-400">{s.sentiment}</td>
                <td className="py-2 px-2 text-right font-mono text-zinc-100">$ {s.price?.toFixed(2)}</td>
                <td className={`py-2 px-2 text-right font-mono ${retColor(s.changePercent)}`}>{s.changePercent > 0 ? '+' : ''}{s.changePercent}%</td>
                <td className={`py-2 px-2 text-right font-mono ${retColor(s.fiveDayReturn)}`}>{s.fiveDayReturn > 0 ? '+' : ''}{s.fiveDayReturn}%</td>
                <td className="py-2 px-2 text-right font-mono text-zinc-300">{s.relVolume}x</td>
                <td className="py-2 px-2 text-right font-mono text-emerald-400">{s.upside}%</td>
                <td className={`py-2 px-2 text-right font-mono font-bold ${hypeColor(s.hypeScore)}`}>{s.hypeScore}</td>
                <td className="py-2 px-2 text-right font-mono text-zinc-400">{s.redditMentions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rankings.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-400" /> Top 5 Expected Returns</h2>
              <div className="space-y-2">
                {rankings.slice(0, 5).map((s: any) => (
                  <div key={s.symbol} className="flex justify-between items-center">
                    <div><span className="text-zinc-100 font-medium">{s.symbol}</span><span className="text-xs ml-2 text-zinc-500">{s.catalyst}</span></div>
                    <div className="flex items-center gap-3">
                      <span className={`font-mono font-bold ${retColor(s.changePercent)}`}>{s.changePercent > 0 ? '+' : ''}{s.changePercent}%</span>
                      <span className="text-zinc-100 font-bold">{s.score}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-zinc-900 border border-orange-800/50 rounded-lg p-4">
              <h2 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2"><Flame className="w-4 h-4" /> Highest Social Hype</h2>
              <div className="space-y-2">
                {[...rankings].sort((a: any, b: any) => b.hypeScore - a.hypeScore).slice(0, 5).map((s: any) => (
                  <div key={s.symbol} className="flex justify-between items-center">
                    <div><span className="text-zinc-100 font-medium">{s.symbol}</span><span className="text-xs ml-2 text-zinc-500 truncate max-w-[150px] inline-block align-middle">{s.topRumors?.[0] || 'No rumors'}</span></div>
                    <div className="flex items-center gap-3">
                      <span className="text-orange-400 font-mono font-bold">{s.hypeScore}</span>
                      <span className="text-zinc-500 text-xs">{s.redditMentions} mentions</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-4">
            <h2 className="text-sm font-semibold text-zinc-100 mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-amber-400" /> Highest Volume Activity</h2>
            <div className="space-y-2">
              {[...rankings].sort((a: any, b: any) => b.relVolume - a.relVolume).slice(0, 5).map((s: any) => (
                <div key={s.symbol} className="flex justify-between items-center">
                  <div><span className="text-zinc-100 font-medium">{s.symbol}</span><span className="font-mono text-xs ml-2 text-zinc-500">{(s.volume / 1e6).toFixed(1)}M</span></div>
                  <span className="text-amber-400 font-mono font-bold">{s.relVolume}x avg</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
