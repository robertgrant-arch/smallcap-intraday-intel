export default function BacktestPage() {
  const metrics = [
    { label: 'Sharpe Ratio', value: '1.42' },
    { label: 'Sortino Ratio', value: '2.18' },
    { label: 'Profit Factor', value: '1.65' },
    { label: 'Max Drawdown', value: '-4.2%' },
    { label: 'Win Rate', value: '58%' },
    { label: 'Fill Ratio', value: '82%' },
    { label: 'Avg Edge Decay', value: '340ms' },
    { label: 'Net Return (after costs)', value: '+12.4%' },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Backtest Engine</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Configuration</h2>
          <div className="space-y-3 text-sm">
            <div><label className="text-zinc-500 block mb-1">Strategy</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"><option>Momentum Continuation</option><option>Fade Low-Quality Hype</option><option>Catalyst Breakout</option></select></div>
            <div><label className="text-zinc-500 block mb-1">Entry Delay</label><select className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100"><option>15 seconds</option><option>30 seconds</option><option>60 seconds</option><option>180 seconds</option></select></div>
            <div><label className="text-zinc-500 block mb-1">Date Range</label><input type="text" value="2025-01-01 to 2025-12-31" className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-zinc-100" readOnly /></div>
            <button className="w-full py-2 bg-emerald-500 text-zinc-950 rounded font-medium text-sm hover:bg-emerald-400 transition">Run Backtest</button>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-zinc-100 mb-4">Results</h2>
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((m) => (
              <div key={m.label} className="bg-zinc-800/50 rounded p-3">
                <div className="text-zinc-500 text-xs">{m.label}</div>
                <div className="text-zinc-100 font-semibold mt-1">{m.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
