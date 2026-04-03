import { CheckCircle2, XCircle, Clock } from 'lucide-react';

const sources = [
  { name: 'Yahoo Finance', type: 'Market Data', method: 'yahoo-finance2 npm', rights: 'Public', status: 'active', endpoint: '/api/quotes', credibility: 95 },
  { name: 'SEC EDGAR', type: 'Filing', method: 'EFTS API', rights: 'Public', status: 'active', endpoint: '/api/filings', credibility: 99 },
  { name: 'Yahoo Finance (Movers)', type: 'Market Data', method: 'yahoo-finance2 npm', rights: 'Public', status: 'active', endpoint: '/api/movers', credibility: 90 },
  { name: 'Finnhub', type: 'Real-time Quotes', method: 'REST API', rights: 'API Key Required', status: 'pending', endpoint: 'finnhub.io/api/v1', credibility: 92 },
  { name: 'StockTwits', type: 'Social Sentiment', method: 'REST API', rights: 'API Key Required', status: 'pending', endpoint: 'api.stocktwits.com', credibility: 45 },
  { name: 'Alpha Vantage', type: 'Historical Data', method: 'REST API', rights: 'API Key Required', status: 'pending', endpoint: 'alphavantage.co/query', credibility: 88 },
  { name: 'Reddit r/pennystocks', type: 'Forum Sentiment', method: 'Reddit API', rights: 'OAuth Required', status: 'pending', endpoint: 'oauth.reddit.com', credibility: 30 },
];

export default function SourcesPage() {
  const active = sources.filter(s => s.status === 'active').length;
  const pending = sources.filter(s => s.status === 'pending').length;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-2">Source Registry</h1>
      <p className="text-zinc-400 text-sm mb-6">Connected data sources with live status and credibility scores.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-500 text-xs">Active Sources</div>
          <div className="text-emerald-400 text-2xl font-bold">{active}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-500 text-xs">Pending Integration</div>
          <div className="text-amber-400 text-2xl font-bold">{pending}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-zinc-500 text-xs">Avg Credibility</div>
          <div className="text-zinc-100 text-2xl font-bold">{Math.round(sources.reduce((a, s) => a + s.credibility, 0) / sources.length)}</div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-500 text-xs border-b border-zinc-800">
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Method</th>
              <th className="text-left px-4 py-2">Endpoint</th>
              <th className="text-left px-4 py-2">Rights</th>
              <th className="text-left px-4 py-2">Credibility</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="px-4 py-3">
                  {s.status === 'active' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                </td>
                <td className="px-4 py-3 font-medium text-zinc-100">{s.name}</td>
                <td className="px-4 py-3 text-zinc-400">{s.type}</td>
                <td className="px-4 py-3 text-zinc-400 font-mono text-xs">{s.method}</td>
                <td className="px-4 py-3 text-zinc-500 font-mono text-xs">{s.endpoint}</td>
                <td className="px-4 py-3 text-zinc-400">{s.rights}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.credibility >= 80 ? 'bg-emerald-500' : s.credibility >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.credibility}%` }} />
                    </div>
                    <span className="text-zinc-400 text-xs">{s.credibility}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
