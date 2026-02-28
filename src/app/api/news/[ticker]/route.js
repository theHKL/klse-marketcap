import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import Parser from 'rss-parser';

const parser = new Parser();

export async function GET(request, { params }) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  try {
    const supabase = createServiceClient();
    const { data: security } = await supabase
      .from('securities')
      .select('name, symbol')
      .ilike('symbol', symbol)
      .single();

    if (!security) {
      return NextResponse.json({ articles: [] });
    }

    const query = encodeURIComponent(`${security.name} ${security.symbol} KLSE`);
    const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-MY&gl=MY&ceid=MY:en`;

    const feed = await parser.parseURL(rssUrl);

    const articles = (feed.items || []).slice(0, 5).map((item) => {
      const lastDash = item.title?.lastIndexOf(' - ');
      return {
        title: lastDash > 0 ? item.title.slice(0, lastDash) : (item.title || ''),
        link: item.link,
        publishedAt: item.pubDate || item.isoDate,
        source: lastDash > 0 ? item.title.slice(lastDash + 3) : '',
        description: item.contentSnippet || '',
      };
    });

    return NextResponse.json(
      { articles },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (err) {
    console.error('News fetch error:', err);
    return NextResponse.json({ articles: [] });
  }
}
