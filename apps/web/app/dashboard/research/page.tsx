'use client';
import { useState } from 'react';
import { Search, FileText, RefreshCw, ExternalLink } from 'lucide-react';

interface Filing {
  file_date: string;
  form_type: string;
  display_names: string[];
  file_description: string;
  file_num: string;
}

export default function ResearchPage() {
  const [ticker, setTicker] = useState('');
  const [filings, setFilings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchFilings = async () => {
    if (!ticker.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/filings?ticker=${encodeURIComponent(ticker.trim())}`);
      const data = await res.json();
      setFilings(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const hits = filings?.hits?.hits || [];

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-2">Research Memos</h1>
      <p className="text-zinc-400 text-sm mb-6">Search SEC EDGAR for real-time filing data. Enter a ticker or company name.</p>

      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && searchFilings()}
            placeholder="Search ticker (e.g. AAPL, TSLA, GME)..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 pl-10 text-zinc-100 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button onClick={searchFilings} disabled={loading} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-zinc-950 rounded text-sm font-medium hover:bg-emerald-500 transition disabled:opacity-50">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search EDGAR
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800 rounded p-3 mb-4 text-red-400 text-sm">{error}</div>}

      {filings && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center">
            <span className="text-sm text-zinc-400">Found {filings?.hits?.total?.value || hits.length || 0} filings for <span className="text-zinc-100 font-medium">{ticker}</span></span>
            <span className="text-xs text-zinc-500">Source: SEC EDGAR (efts.sec.gov)</span>
          </div>
          {hits.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Form</th>
                  <th className="text-left px-4 py-2">Entity</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-left px-4 py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {hits.slice(0, 25).map((h: any, i: number) => {
                  const s = h._source || h;
                  return (
                    <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="px-4 py-2 text-zinc-400 whitespace-nowrap">{s.file_date || '-'}</td>
                      <td className="px-4 py-2">
                        <span className="bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded text-xs font-mono">{s.form_type || '-'}</span>
                      </td>
                      <td className="px-4 py-2 text-zinc-300 max-w-[200px] truncate">{(s.display_names || s.entity_name || ['-']).join(', ')}</td>
                      <td className="px-4 py-2 text-zinc-400 max-w-[250px] truncate">{s.file_description || '-'}</td>
                      <td className="px-4 py-2">
                        {h._id && (
                          <a href={`https://www.sec.gov/Archives/edgar/data/${h._id}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-zinc-500">No filings found. Try a different search term.</div>
          )}
        </div>
      )}

      {!filings && !loading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          <FileText className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400">Enter a ticker symbol to search SEC EDGAR filings</p>
          <p className="text-zinc-500 text-xs mt-1">Searches 8-K, 10-Q, 10-K, and Form 4 filings from the last 30 days</p>
        </div>
      )}
    </div>
  );
}
