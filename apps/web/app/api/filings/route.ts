import { NextResponse } from 'next/server';

const EDGAR_BASE = 'https://efts.sec.gov/LATEST/search-index?q=';
const EDGAR_FULL_TEXT = 'https://efts.sec.gov/LATEST/search-index';
const EDGAR_SUBMISSIONS = 'https://data.sec.gov/submissions/CIK';

const HEADERS = {
  'User-Agent': 'SmallCapIntel/1.0 (contact@smallcapintel.com)',
  Accept: 'application/json',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker') || '';
  const formType = searchParams.get('type') || '';

  try {
    const url = `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(ticker)}%22&dateRange=custom&startdt=${getDateDaysAgo(30)}&enddt=${getToday()}&forms=${formType || '8-K,10-Q,10-K,4,S-1'}&hits.hits.total=true&hits.hits._source=file_date,display_names,form_type,file_description,file_num,period_of_report`;

    const res = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(ticker)}%22&forms=${formType || '8-K,10-Q,10-K,4'}&dateRange=custom&startdt=${getDateDaysAgo(30)}&enddt=${getToday()}`,
      { headers: HEADERS }
    );

    if (!res.ok) {
      const fullTextRes = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(ticker)}&forms=${formType || '8-K,10-Q,10-K,4'}`,
        { headers: HEADERS }
      );
      if (!fullTextRes.ok) throw new Error('SEC EDGAR API error');
      const data = await fullTextRes.json();
      return NextResponse.json(data);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    try {
      const fallback = await fetch(
        `https://efts.sec.gov/LATEST/search-index?q=${encodeURIComponent(ticker)}`,
        { headers: HEADERS }
      );
      const data = await fallback.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ error: error.message, filings: [] }, { status: 500 });
    }
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
