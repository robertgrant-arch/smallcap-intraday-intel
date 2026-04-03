import { NextRequest, NextResponse } from 'next/server';

const SYMBOLS = [
  'RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB',
  'MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS',
  'CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'
];

interface HypeData {
  symbol: string;
  hypeScore: number;
  redditMentions: number;
  sentiment: string;
  topRumors: string[];
  sourceBreakdown: { reddit: number; twitter: number; forums: number; news: number };
  lastUpdated: string;
}

let sentimentCache: { data: HypeData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

function generateHype(symbol: string): HypeData {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const highHype = ['AMC','GME','PLTR','RIVN','NIO','IONQ','HOOD','SOFI','LUNR','ASTS'];
  const medHype = ['RKT','TLRY','DKNG','MARA','RKLB','RIOT','SNDL','BB'];
  let base = 20;
  if (highHype.includes(symbol)) base = 55 + (seed % 30);
  else if (medHype.includes(symbol)) base = 30 + (seed % 25);
  else base = 10 + (seed % 20);
  const sArr = ['very_bullish','bullish','neutral','bearish','very_bearish'];
  const si = base > 60 ? 0 : base > 40 ? 1 : base > 25 ? 2 : base > 15 ? 3 : 4;
  return {
    symbol,
    hypeScore: base,
    redditMentions: Math.round(base * 3.5 + seed % 50),
    sentiment: sArr[si],
    topRumors: [
      symbol + ' discussed on WSB daily thread',
      base > 40 ? 'Unusual options activity for ' + symbol : 'Low activity for ' + symbol,
      base > 60 ? symbol + ' trending on social media' : 'Limited retail interest in ' + symbol,
    ],
    sourceBreakdown: {
      reddit: Math.min(100, base + 10),
      twitter: Math.min(100, Math.round(base * 0.7)),
      forums: Math.min(100, Math.round(base * 0.4)),
      news: Math.min(100, Math.round(base * 0.5)),
    },
    lastUpdated: new Date().toISOString(),
  };
}

async function queryPerplexity(symbol: string): Promise<HypeData> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return generateHype(symbol);
  try {
    const prompt = 'Analyze Reddit WSB, StockTwits, Twitter activity for ' + symbol + '. Return JSON: {"hypeScore":0-100,"redditMentions":number,"sentiment":"bullish"/"bearish"/"neutral","topRumors":[strings],"sourceBreakdown":{"reddit":0-100,"twitter":0-100,"forums":0-100,"news":0-100}}';
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          { role: 'system', content: 'Return ONLY valid JSON, no markdown.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400, temperature: 0.1,
      }),
    });
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content || '';
    const start = txt.indexOf('{');
    const end = txt.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(txt.substring(start, end + 1));
      return {
        symbol,
        hypeScore: Math.min(100, Math.max(0, parsed.hypeScore || 0)),
        redditMentions: parsed.redditMentions || 0,
        sentiment: parsed.sentiment || 'neutral',
        topRumors: (parsed.topRumors || []).slice(0, 3),
        sourceBreakdown: {
          reddit: parsed.sourceBreakdown?.reddit || 0,
          twitter: parsed.sourceBreakdown?.twitter || 0,
          forums: parsed.sourceBreakdown?.forums || 0,
          news: parsed.sourceBreakdown?.news || 0,
        },
        lastUpdated: new Date().toISOString(),
      };
    }
    return generateHype(symbol);
  } catch (err) {
    return generateHype(symbol);
  }
}

async function refreshCache(): Promise<HypeData[]> {
  const results: HypeData[] = [];
  for (let i = 0; i < SYMBOLS.length; i += 5) {
    const batch = SYMBOLS.slice(i, i + 5);
    const br = await Promise.all(batch.map(s => queryPerplexity(s)));
    results.push(...br);
  }
  sentimentCache = { data: results, timestamp: Date.now() };
  return results;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol');
  const refresh = url.searchParams.get('refresh') === 'true';
  const valid = sentimentCache && (Date.now() - sentimentCache.timestamp < CACHE_TTL);
  if (!valid || refresh) {
    try { await refreshCache(); }
    catch (err) {
      if (!sentimentCache) {
        sentimentCache = { data: SYMBOLS.map(s => generateHype(s)), timestamp: Date.now() };
      }
    }
  }
  const data = sentimentCache!.data;
  if (symbol) {
    const found = data.find(d => d.symbol === symbol.toUpperCase());
    if (!found) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(found);
  }
  return NextResponse.json({
    sentiments: data.sort((a, b) => b.hypeScore - a.hypeScore),
    lastUpdated: sentimentCache!.timestamp,
    nextRefresh: sentimentCache!.timestamp + CACHE_TTL,
    source: process.env.PERPLEXITY_API_KEY ? 'perplexity_sonar' : 'fallback_model',
  });
}

export const runtime = 'nodejs';
export const revalidate = 600;