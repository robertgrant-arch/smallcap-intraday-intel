export default function SourcesPage() {
  const sources = [
    { name: 'SEC EDGAR', type: 'Filing', method: 'API', rights: 'Public', credibility: 95 },
    { name: 'StockTwits', type: 'Social', method: 'API', rights: 'Permitted', credibility: 45 },
    { name: 'Reuters', type: 'News', method: 'RSS', rights: 'Public', credibility: 90 },
    { name: 'Yahoo Finance', type: 'Market Data', method: 'API', rights: 'Public', credibility: 85 },
    { name: 'Reddit r/pennystocks', type: 'Forum', method: 'API', rights: 'Review Needed', credibility: 30 },
  ];
  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Source Registry</h1>
      <p className="text-zinc-400 text-sm mb-4">Manage permitted data sources with legal/technical metadata and credibility scores.</p>
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Access</th>
              <th className="text-left px-4 py-2">Rights</th>
              <th className="text-left px-4 py-2">Credibility</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3 font-medium text-zinc-100">{s.name}</td>
                <td className="px-4 py-3 text-zinc-400">{s.type}</td>
                <td className="px-4 py-3 text-zinc-400">{s.method}</td>
                <td className="px-4 py-3 text-zinc-400">{s.rights}</td>
                <td className="px-4 py-3 text-zinc-400">{s.credibility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
