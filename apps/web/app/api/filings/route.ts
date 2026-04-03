import { NextResponse } from 'next/server';

const HEADERS = {
  'User-Agent': 'SmallCapIntel/1.0 (contact@smallcapintel.com)',
  Accept: 'application/json',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker') || '';
  const formType = searchParams.get('type') || '';

  if (!ticker) {
    return NextResponse.json({ error: 'ticker parameter required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      q: `"${ticker}"`,
      dateRange: 'custom',
      startdt: getDateDaysAgo(90),
      enddt: getToday(),
    });
    if (formType) params.set('forms', formType);
    else params.set('forms', '8-K,10-Q,10-K,4,S-1');

    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?${params.toString()}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );

    if (!res.ok) {
      const params2 = new URLSearchParams({ q: ticker });
      const res2 = await fetch(
        `https://efts.sec.gov/LATEST/search-index?${params2.toString()}`,
        { headers: HEADERS }
      );
      const data = await res2.json();
      return NextResponse.json(data);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message, hits: { hits: [], total: { value: 0 } } }, { status: 500 });
  }
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getDateDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
