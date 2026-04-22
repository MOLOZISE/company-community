# TASK 04 — tRPC 게시물 등록 + 스케줄러

> **Codex 실행 태스크.** TASK 03 완료 후 실행.
> 완료 후 `pnpm --filter bot start`가 10분마다 실행되어야 한다.

## 목표

- Supabase JWT 로그인으로 봇 계정 인증
- tRPC HTTP 직접 호출로 게시물 등록
- node-cron으로 10분 주기 스케줄링
- 실패 시 graceful 처리 + 로깅

---

## Step 1. poster.ts 생성

**파일:** `apps/bot/src/poster.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { markProcessed } from './dedup.js';
import type { GeneratedPost, PostResult } from './types.js';

const supabase = createClient(
  config.NEXT_PUBLIC_SUPABASE_URL,
  config.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getBotToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.expires_at > now + 60) {
    return cachedToken.access_token;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.BOT_EMAIL,
    password: config.BOT_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`Bot 로그인 실패: ${error?.message ?? '세션 없음'}`);
  }

  cachedToken = {
    access_token: data.session.access_token,
    expires_at: data.session.expires_at ?? now + 3600,
  };

  return cachedToken.access_token;
}

interface TRPCResponse<T> {
  result?: { data: T };
  error?: { message: string; code: string };
}

async function callTRPC<T>(
  procedure: string,
  input: unknown,
  token: string
): Promise<T> {
  const url = `${config.COMMUNITY_API_URL}/api/trpc/${procedure}`;
  const body = JSON.stringify({ json: input });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await response.json()) as TRPCResponse<T>;

  if (data.error) {
    throw new Error(`tRPC 오류 [${data.error.code}]: ${data.error.message}`);
  }
  if (!data.result) {
    throw new Error('tRPC 응답에 result 없음');
  }

  return data.result.data;
}

interface CreatedPost {
  id: string;
  title?: string;
}

export async function postToBoard(
  post: GeneratedPost,
  articleLink: string
): Promise<PostResult> {
  try {
    const token = await getBotToken();

    const created = await callTRPC<CreatedPost>(
      'posts.create',
      {
        channelId: post.channelId,
        title: post.title,
        content: post.content,
        isAnonymous: post.isAnonymous,
        mediaUrls: [],
        flair: post.flair,
      },
      token
    );

    markProcessed(articleLink, created.id);
    console.log(`[Poster] 게시물 등록 완료 — id: ${created.id}`);

    return { success: true, postId: created.id, articleLink };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Poster] 등록 실패: ${msg}`);
    return { success: false, error: msg, articleLink };
  }
}

export async function postAll(
  posts: GeneratedPost[],
  articleLinks: string[]
): Promise<PostResult[]> {
  const results: PostResult[] = [];
  for (let i = 0; i < posts.length; i++) {
    const result = await postToBoard(posts[i]!, articleLinks[i] ?? '');
    results.push(result);
    // 연속 등록 방지 — 3초 간격
    if (i < posts.length - 1) await new Promise((r) => setTimeout(r, 3000));
  }
  return results;
}
```

---

## Step 2. 최종 index.ts (스케줄러 포함)

**파일:** `apps/bot/src/index.ts` (완전 교체)

```typescript
import 'dotenv/config';
import cron from 'node-cron';
import { config } from './config.js';
import { crawlAll } from './crawler.js';
import { generatePosts } from './generator.js';
import { postAll } from './poster.js';

async function runBotCycle(): Promise<void> {
  const startAt = new Date().toISOString();
  console.log(`\n[Bot] ===== 사이클 시작 ${startAt} =====`);

  // 1. 크롤링
  let articles;
  try {
    articles = await crawlAll();
    console.log(`[Bot] 새 기사: ${articles.length}개`);
  } catch (err) {
    console.error('[Bot] 크롤링 실패:', err);
    return;
  }

  if (articles.length === 0) {
    console.log('[Bot] 새 기사 없음 — 이번 사이클 스킵');
    return;
  }

  // 2. LM Studio로 게시물 생성
  const posts = await generatePosts(articles);
  console.log(`[Bot] 생성 완료: ${posts.length}개 게시물`);

  if (posts.length === 0) {
    console.log('[Bot] 생성된 게시물 없음 (LM Studio 오프라인?)');
    return;
  }

  // 3. 게시판 등록
  const links = articles.slice(0, posts.length).map((a) => a.link);
  const results = await postAll(posts, links);

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`[Bot] 등록 결과 — 성공: ${succeeded}, 실패: ${failed}`);
  console.log(`[Bot] ===== 사이클 종료 =====\n`);
}

async function main() {
  console.log('='.repeat(50));
  console.log('[Bot] Company Community 자동 글쓰기 봇 시작');
  console.log(`[Bot] LM Studio: ${config.LMSTUDIO_BASE_URL}`);
  console.log(`[Bot] 모델: ${config.LMSTUDIO_MODEL}`);
  console.log(`[Bot] 스케줄: ${config.BOT_INTERVAL_MINUTES}분마다`);
  console.log('='.repeat(50));

  // 시작 즉시 1회 실행
  await runBotCycle();

  // 이후 N분마다 반복
  const cronExpr = `*/${config.BOT_INTERVAL_MINUTES} * * * *`;
  cron.schedule(cronExpr, () => {
    runBotCycle().catch((err) => {
      console.error('[Bot] 예상치 못한 오류:', err);
    });
  });

  console.log(`[Bot] 스케줄러 등록 완료 (${cronExpr})`);
  console.log('[Bot] Ctrl+C로 종료\n');
}

main().catch((err) => {
  console.error('[Bot] 치명적 오류:', err);
  process.exit(1);
});
```

---

## Step 3. package.json 스크립트 최종 확인

`apps/bot/package.json`의 scripts가 다음과 같은지 확인:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc --noEmit",
    "type-check": "tsc --noEmit"
  }
}
```

---

## Step 4. Windows 자동 시작 설정 (선택사항)

개발 서버와 함께 봇을 자동 시작하려면 `package.json`(루트)의 `dev` 스크립트에 추가:

```json
{
  "scripts": {
    "dev": "turbo dev",
    "dev:bot": "pnpm --filter bot start"
  }
}
```

또는 터미널 2개를 나눠서 실행:
```bash
# 터미널 1: Next.js
pnpm dev

# 터미널 2: Bot
pnpm --filter bot start
```

---

## 완료 검증

```bash
# 사전 조건:
# 1. LM Studio 실행 중 (포트 1218, google/gemma-4-e4b 로드)
# 2. Next.js 개발 서버 실행 중 (포트 3000)
# 3. apps/bot/.env.local 설정 완료
# 4. bot@company.com 계정 Supabase에 등록

pnpm --filter bot start

# 예상 출력:
# ==================================================
# [Bot] Company Community 자동 글쓰기 봇 시작
# [Bot] LM Studio: http://127.0.0.1:1218/v1
# [Bot] 모델: google/gemma-4-e4b
# [Bot] 스케줄: 10분마다
# ==================================================
#
# [Bot] ===== 사이클 시작 2026-04-22T10:00:00.000Z =====
# [Bot] 새 기사: 3개
# [Generator] 생성 중: "Show HN: ..."
# [Generator] 완료: "HN 인기글: ..."
# [Bot] 생성 완료: 3개 게시물
# [Poster] 게시물 등록 완료 — id: xxxxxxxx-xxxx-...
# [Bot] 등록 결과 — 성공: 3, 실패: 0
# [Bot] ===== 사이클 종료 =====
```

게시판 웹 UI(http://localhost:3000)에서 자동 게시물 확인.

---

## 트러블슈팅

| 오류 | 원인 | 해결 |
|------|------|------|
| `Bot 로그인 실패` | BOT_EMAIL/PASSWORD 오류 | Supabase 대시보드에서 계정 확인 |
| `tRPC 오류 [UNAUTHORIZED]` | JWT 만료 | `getBotToken()`이 자동 갱신하므로 재시작 |
| `tRPC 오류 [NOT_FOUND]` | COMMUNITY_API_URL 오류 | localhost:3000 Next.js 실행 여부 확인 |
| `LM Studio 오프라인` | 모델 언로드됨 | LM Studio에서 모델 로드 후 재시도 |
| `새 기사 없음` | 모든 URL 처리됨 | `dedup.db` 삭제 후 재시작 (테스트용) |
