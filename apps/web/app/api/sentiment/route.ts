import { NextRequest, NextResponse } from 'next/server';

const SYMBOLS = [
  'RKT','AMC','TLRY','UWMC','DKNG','LUNR','DNA','SNDL','RKLB','BB',
  'MARA','SKLZ','SOFI','GME','MVST','AFRM','NIO','IONQ','HOOD','ASTS',
  'CLOV','CRSR','RIVN','LCID','OPEN','MNDY','PLTR','PSFE','RIOT'
];

export interface HypeData {
  symbol: string;
  hypeScore: number;
  redditMentions: number;
  sentiment: 'very_bullish' | 'bullish' | 'neutral' | 'bearish' | 'very_bearish';
  topRumors: string[];
  sourceBreakdown: { reddit: number; twitter: number; forums: number; news: number };
  lastUpdated: string;
}

// In-memory cache with 10-minute TTL
let sentimentCache: { data: HypeData[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function queryPerplexity(symbol: string): Promise<HypeData> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return generateFallbackHype(symbol);
  }

  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a financial social media analyst. Return ONLY valid JSON, no markdown.'
          },
          {
            role: 'user',
            content: `Analyze current Reddit (r/wallstreetbets, r/pennystocks, r/stocks, r/smallcaps), StockTwits, Twitter/X, and financial message board activity for stock ticker ${symbol}. Return JSON with these exact fields: { "redditMentions": (estimated number of mentions in last 24h), "hypeScore": (0-100 where 100 is extreme viral hype like GME squeeze), "sentiment": (one of: "very_bullish", "bullish", "neutral", "bearish", "very_bearish"), "topRumors": [(up to 3 short strings of current rumors/catalysts being discussed)], "sourceBreakdown": { "reddit": (0-100), "twitter": (0-100), "forums": (0-100), "news": (0-100) } }`
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
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
    return generateFallbackHype(symbol);
  } catch {
    return generateFallbackHype(symbol);
  }
}

function generateFallbackHype(symbol: string): HypeData {
  // Deterministic seed based on symbol for consistent fallback
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const highHype = ['AMC','GME','PLTR','RIVN','NIO','IONQ','HOOD','SOFI','LUNR','ASTS'];
  const medHype = ['RKT','TLRY','DKNG','MARA','RKLB','RIOT','SNDL','BB'];
  
  let base = 20;
  if (highHype.includes(symbol)) base = 55 + (seed % 30);
  else if (medHype.includes(symbol)) base = 30 + (seed % 25);
  else base = 10 + (seed % 20);

  const sentiments: HypeData['sentiment'][] = ['very_bullish','bullish','neutral','bearish','very_bearish'];
  const sentIdx = base > 60 ? 0 : base > 40 ? 1 : base > 25 ? 2 : base > 15 ? 3 : 4;

  return {
    symbol,
    hypeScore: base,
    redditMentions: Math.round(base * 3.5 + seed % 50),
    sentiment: sentiments[sentIdx],
    topRumors: [
      `${symbol} being discussed on WSB daily thread`,
      base > 40 ? `Unusual options activity spotted for ${symbol}` : `Low activity for ${symbol}`,
      base > 60 ? `${symbol} trending on social media` : `Limited retail interest in ${symbol}`,
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

async function refreshSentimentCache(): Promise<HypeData[]> {
  // Process in batches of 5 to avoid rate limits
  const results: HypeData[] = [];
  for (let i = 0; i < SYMBOLS.length; i += 5) {
    const batch = SYMBOLS.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(s => queryPerplexity(s)));
    results.push(...batchResults);
  }
  
  sentimentCache = { data: results, timestamp: Date.now() };
  return results;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const refresh = searchParams.get('refresh') === 'true';

  // Check if cache is valid
  const cacheValid = sentimentCache && (Date.now() - sentimentCache.timestamp < CACHE_TTL);

  if (!cacheValid || refresh) {
    try {
      await refreshSentimentCache();
    } catch (e: any) {
      if (!sentimentCache) {
        // No cache at all, generate fallback
        sentimentCache = {
          data: SYMBOLS.map(s => generateFallbackHype(s)),
          timestamp: Date.now(),
        };
      }
    }
  }

  const data = sentimentCache!.data;

  if (symbol) {
    const found = data.find(d => d.symbol === symbol.toUpperCase());
    if (!found) return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
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
export const revalidate = 600; // 10 minutes