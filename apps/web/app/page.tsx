import Link from 'next/link';

const features = [
  {
    title: 'Research Pipeline',
    desc: 'Multi-model AI research using Perplexity, Claude, and Gemini in a staged pipeline that collects evidence, extracts entities, and synthesizes analyst memos.',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  },
  {
    title: 'Risk Scoring',
    desc: 'Manipulation-risk engine built on SEC/FINRA warning patterns: coordinated posting, promotional language, low source diversity, dilution signals, and spread analysis.',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  },
  {
    title: 'Event-Driven Backtester',
    desc: 'Intraday simulator with latency buckets, spread-aware fills, halt handling, slippage modeling, and walk-forward testing by regime.',
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
  },
];

const layers = [
  { name: 'Source Ingestion', detail: 'Permitted feeds, forums, filings, market data' },
  { name: 'Normalization', detail: 'Dedupe, extract tickers, classify language' },
  { name: 'Intelligence', detail: 'Sentiment, catalyst, credibility, manipulation scoring' },
  { name: 'Research Orchestration', detail: 'Perplexity + Claude + Gemini pipeline' },
  { name: 'Strategy Engine', detail: 'Entry/exit rules, ranking, size/risk logic' },
  { name: 'Backtester', detail: 'Event-driven simulation with cost modeling' },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold text-sm">SI</div>
          <span className="font-semibold text-zinc-100">SmallCap Intel</span>
        </div>
        <Link href="/dashboard" className="px-4 py-2 bg-emerald-500 text-zinc-950 rounded-lg text-sm font-medium hover:bg-emerald-400 transition">
          Open Dashboard
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-6 border border-emerald-500/20">
          Intraday Intelligence Platform
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-4 leading-tight">
          Small-Cap Intelligence.<br />Backtested Edge.
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-8">
          Detect unusual retail attention, separate organic interest from promotion, and test whether any signal survives latency, spread, and slippage.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/dashboard" className="px-6 py-3 bg-emerald-500 text-zinc-950 rounded-lg font-medium hover:bg-emerald-400 transition">
            Launch Dashboard
          </Link>
          <a href="#architecture" className="px-6 py-3 border border-zinc-700 text-zinc-300 rounded-lg font-medium hover:border-zinc-500 transition">
            View Architecture
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                </svg>
              </div>
              <h3 className="text-zinc-100 font-semibold mb-2">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2 text-center">6-Layer Pipeline Architecture</h2>
        <p className="text-zinc-400 text-center mb-10">Modular services for independent improvement and clean backtesting</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {layers.map((l, i) => (
            <div key={l.name} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                {i + 1}
              </div>
              <div>
                <div className="text-zinc-100 font-medium text-sm">{l.name}</div>
                <div className="text-zinc-500 text-xs mt-1">{l.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-zinc-500 text-sm">
          <span>SmallCap Intel</span>
          <span>Built with Next.js, FastAPI, and multi-model AI</span>
        </div>
      </footer>
    </div>
  );
}
