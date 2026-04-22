import RSSParser from 'rss-parser';
import { RSS_SOURCES } from './config.js';
import { isProcessed } from './dedup.js';
import type { RawArticle } from './types.js';

const parser = new RSSParser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; CompanyCommunityBot/1.0)',
  },
});

async function fetchFeed(source: (typeof RSS_SOURCES)[number]): Promise<RawArticle[]> {
  try {
    const feed = await parser.parseURL(source.url);
    const articles: RawArticle[] = [];

    for (const item of feed.items.slice(0, 5)) {
      const link = item.link ?? item.guid;
      if (!link) continue;
      if (isProcessed(link)) continue;

      const summary = stripHtml(item.contentSnippet ?? item.content ?? item.summary ?? '');
      if (summary.length < 30) continue;

      articles.push({
        title: item.title ?? '제목 없음',
        link,
        summary: summary.slice(0, 800),
        pubDate: item.pubDate,
        source: source.label,
        channelId: source.channelId,
        category: source.category,
      });
    }

    return articles;
  } catch (err) {
    console.error(`[Crawler] ${source.label} 피드 오류:`, err instanceof Error ? err.message : err);
    return [];
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function crawlAll(): Promise<RawArticle[]> {
  const results = await Promise.allSettled(RSS_SOURCES.map((s) => fetchFeed(s)));
  const articles: RawArticle[] = [];

  for (const r of results) {
    if (r.status === 'fulfilled') articles.push(...r.value);
  }

  return articles
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);
}
