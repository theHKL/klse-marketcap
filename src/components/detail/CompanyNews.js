'use client';

import { useState, useEffect } from 'react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
}

export default function CompanyNews({ symbol }) {
  const [articles, setArticles] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchNews() {
      try {
        const res = await fetch(`/api/news/${symbol.toLowerCase()}`);
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();
        if (!cancelled) setArticles(json.articles || []);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    fetchNews();
    return () => {
      cancelled = true;
    };
  }, [symbol]);

  if (error) return null;

  return (
    <section aria-label="Company news">
      <h2 className="text-xl font-bold">Latest News</h2>

      <div className="mt-3 space-y-3">
        {articles === null ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-2xl bg-white p-4 shadow-card">
              <div className="h-4 w-3/4 rounded bg-surface" />
              <div className="mt-2 h-3 w-1/2 rounded bg-surface" />
              <div className="mt-2 h-3 w-full rounded bg-surface" />
            </div>
          ))
        ) : articles.length === 0 ? (
          <p className="text-sm text-slate-400">No recent news available.</p>
        ) : (
          articles.map((article, i) => (
            <a
              key={i}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-2xl bg-white p-4 shadow-card transition-shadow hover:shadow-md"
            >
              <h3 className="font-semibold leading-snug text-slate-800 hover:text-blue-500">
                {article.title}
              </h3>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                {article.source && <span>{article.source}</span>}
                {article.source && article.publishedAt && (
                  <span aria-hidden="true">&middot;</span>
                )}
                {article.publishedAt && <span>{timeAgo(article.publishedAt)}</span>}
              </div>
              {article.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                  {article.description}
                </p>
              )}
            </a>
          ))
        )}
      </div>
    </section>
  );
}
