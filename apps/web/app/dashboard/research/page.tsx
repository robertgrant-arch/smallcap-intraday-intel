export default function ResearchPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Research Memos</h1>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-100">ABCD — FDA Filing Catalyst</h2>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded">Confidence: 84</span>
        </div>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-emerald-400 font-medium mb-1">Bull Case</div>
            <p className="text-zinc-400">FDA filing confirmed via SEC EDGAR. Multiple independent sources corroborate timeline. Strong relative volume surge with organic source diversity.</p>
          </div>
          <div>
            <div className="text-red-400 font-medium mb-1">Bear Case</div>
            <p className="text-zinc-400">Wide spread at 0.8% suggests thin liquidity. Historical pattern shows post-filing fade within 30 minutes. Limited institutional coverage.</p>
          </div>
          <div>
            <div className="text-amber-400 font-medium mb-1">Manipulation Risk</div>
            <p className="text-zinc-400">Low risk. Source diversity index: 0.78. No coordinated posting patterns detected. Promotional language score: 12/100.</p>
          </div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Evidence Sources</h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-zinc-400"><span>SEC EDGAR Filing</span><span>2 min ago</span></div>
          <div className="flex justify-between text-zinc-400"><span>Reuters News Wire</span><span>5 min ago</span></div>
          <div className="flex justify-between text-zinc-400"><span>StockTwits Public API</span><span>8 min ago</span></div>
        </div>
      </div>
    </div>
  );
}
