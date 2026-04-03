const kpis = [
  { label: 'Active Signals', value: '12', change: '+3', positive: true },
  { label: 'Avg Confidence', value: '72', change: '+5', positive: true },
  { label: 'Manipulation Alerts', value: '4', change: '+2', positive: false },
  { label: 'Edge Decay (ms)', value: '340', change: '-60', positive: true },
];

const watchlist = [
  { ticker: 'ABCD', score: 84, catalyst: 'FDA Filing', risk: 'Low', sentiment: 'Bullish', spread: '0.8%', volume: '2.1M' },
  { ticker: 'EFGH', score: 71, catalyst: 'Earnings Beat', risk: 'Medium', sentiment: 'Mixed', spread: '1.2%', volume: '890K' },
  { ticker: 'IJKL', score: 65, catalyst: 'Partnership', risk: 'Low', sentiment: 'Bullish', spread: '0.5%', volume: '3.4M' },
  { ticker: 'MNOP', score: 42, catalyst: 'Social Spike', risk: 'High', sentiment: 'Promotional', spread: '3.1%', volume: '450K' },
  { ticker: 'QRST', score: 58, catalyst: 'Sector Sympathy', risk: 'Medium', sentiment: 'Neutral', spread: '1.8%', volume: '1.2M' },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
            <div className="text-zinc-500 text-xs mb-1">{k.label}</div>
            <div className="text-2xl font-bold text-zinc-100">{k.value}</div>
            <div className={`text-xs mt-1 ${k.positive ? 'text-emerald-400' : 'text-red-400'}`}>{k.change}</div>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-100">Watchlist</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
              <th className="text-left px-4 py-2">Ticker</th>
              <th className="text-left px-4 py-2">Score</th>
              <th className="text-left px-4 py-2">Catalyst</th>
              <th className="text-left px-4 py-2">Risk</th>
              <th className="text-left px-4 py-2">Sentiment</th>
              <th className="text-left px-4 py-2">Spread</th>
              <th className="text-left px-4 py-2">Volume</th>
            </tr>
          </thead>
          <tbody>
            {watchlist.map((w) => (
              <tr key={w.ticker} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium text-zinc-100">{w.ticker}</td>
                <td className="px-4 py-3 text-zinc-400">{w.score}</td>
                <td className="px-4 py-3 text-zinc-400">{w.catalyst}</td>
                <td className="px-4 py-3 text-zinc-400">{w.risk}</td>
                <td className="px-4 py-3 text-zinc-400">{w.sentiment}</td>
                <td className="px-4 py-3 text-zinc-400">{w.spread}</td>
                <td className="px-4 py-3 text-zinc-400">{w.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
