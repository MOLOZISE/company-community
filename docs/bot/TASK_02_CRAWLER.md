# TASK 02 — RSS 크롤러 + 중복 제거

> **Codex 실행 태스크.** TASK 01 완료 후 실행.
> 완료 후 `pnpm dev` 실행 시 콘솔에 크롤링된 기사 목록 출력.

## 목표

- RSS 피드에서 최신 기사를 파싱
- SQLite로 이미 처리한 URL 추적 (중복 등록 방지)
- `RawArticle[]` 형태로 반환

---

## Step 1. dedup.ts 생성 (SQLite 기반 중복 제거)

**파일:** `apps/bot/src/dedup.ts`

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'dedup.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.exec(`
      CREATE TABLE IF NOT EXISTS processed_urls (
        url TEXT PRIMARY KEY,
        processed_at TEXT NOT NULL DEFAULT (datetime('now')),
        post_id TEXT
      )
    `);
  }
  return db;
}

export function isProcessed(url: string): boolean {
  const row = getDb().prepare('SELECT 1 FROM processed_urls WHERE url = ?').get(url);
  return !!row;
}

export function markProcessed(url: string, postId?: string): void {
  getDb()
    .prepare('INSERT OR IGNORE INTO processed_urls (url, post_id) VALUES (?, ?)')
    .run(url, postId ?? null);
}

export function getRecentlyProcessed(hours = 24): string[] {
  const rows = getDb()
    .prepare(
      `SELECT url FROM processed_urls
       WHERE processed_at > datetime('now', '-${hours} hours')`
    )
    .all() as { url: string }[];
  return rows.map((r) => r.url);
}
```

---

## Step 2. crawler.ts 생성

**파일:** `apps/bot/src/crawler.ts`

```typescript
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

  // 최신순 정렬, 최대 5개만 처리 (한 사이클에 너무 많이 올리지 않도록)
  return articles
    .sort((a, b) => {
      const da = a.pubDate ? new Date(a.pubDate).getTime() : 0;
      const db = b.pubDate ? new Date(b.pubDate).getTime() : 0;
      return db - da;
    })
    .slice(0, 5);
}
```

---

## Step 3. index.ts에 크롤러 테스트 코드 추가

TASK 02 완료 후 `apps/bot/src/index.ts`를 다음으로 교체:

```typescript
import 'dotenv/config';
import { config } from './config.js';
import { crawlAll } from './crawler.js';

async function main() {
  console.log(`[Bot] 시작 — 스케줄: ${config.BOT_INTERVAL_MINUTES}분마다`);
  console.log(`[Bot] LM Studio: ${config.LMSTUDIO_BASE_URL} / ${config.LMSTUDIO_MODEL}`);

  console.log('\n[Bot] 크롤링 테스트 실행...');
  const articles = await crawlAll();
  console.log(`[Bot] 크롤링 완료: ${articles.length}개 새 기사`);
  for (const a of articles) {
    console.log(`  - [${a.source}] ${a.title}`);
    console.log(`    ${a.link}`);
  }
}

main().catch((err) => {
  console.error('[Bot] 치명적 오류:', err);
  process.exit(1);
});
```

---

## 완료 검증

```bash
pnpm --filter bot dev
# 예상 출력:
# [Bot] 시작 — 스케줄: 10분마다
# [Bot] 크롤링 테스트 실행...
# [Bot] 크롤링 완료: 3개 새 기사
#   - [Hacker News] Show HN: ...
#   - [ZDNet Korea] 삼성전자 ...
#   - [연합뉴스] ...
```

두 번 실행 시 두 번째 실행에서 `0개 새 기사` 출력 (중복 제거 확인).

---

## 주의사항

- `rss-parser`가 일부 피드(네이버 뉴스)에서 CORS 또는 인코딩 오류를 낼 수 있음 → 해당 피드 주석 처리 후 진행
- `dedup.db`는 `.gitignore`에 포함되어 있음 (커밋 금지)
- 타임아웃 10초 초과 시 해당 소스만 스킵하고 나머지 계속 진행
