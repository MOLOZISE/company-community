# TASK 01 — apps/bot 패키지 초기화

> **Codex 실행 태스크.** 이 파일의 지시를 순서대로 이행하라.
> 완료 후 `pnpm --filter bot dev`가 오류 없이 실행되어야 한다.

## 목표

`apps/bot/` 폴더를 Turborepo 모노레포의 새 워크스페이스 패키지로 생성하고
TypeScript + tsx 런타임 환경을 설정한다.

---

## Step 1. 디렉토리 및 package.json 생성

**파일:** `apps/bot/package.json`

```json
{
  "name": "bot",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc --noEmit",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/api": "workspace:*",
    "@repo/db": "workspace:*",
    "@supabase/supabase-js": "^2.39.0",
    "node-cron": "^3.0.3",
    "rss-parser": "^3.13.0",
    "cheerio": "^1.0.0",
    "node-fetch": "^3.3.2",
    "dotenv": "^16.4.1",
    "zod": "^3.22.4",
    "better-sqlite3": "^9.4.3"
  },
  "devDependencies": {
    "@repo/typescript-config": "workspace:*",
    "@types/node": "^20.11.0",
    "@types/node-cron": "^3.0.11",
    "@types/better-sqlite3": "^7.6.8",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

---

## Step 2. tsconfig.json 생성

**파일:** `apps/bot/tsconfig.json`

```json
{
  "extends": "@repo/typescript-config/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "target": "ES2022"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Step 3. 환경변수 파일 생성

**파일:** `apps/bot/.env.local` (git에 커밋하지 말 것 — .gitignore 확인)

```env
# LM Studio 로컬 서버
LMSTUDIO_BASE_URL=http://127.0.0.1:1218/v1
LMSTUDIO_MODEL=google/gemma-4-e4b

# Community 앱 URL (Next.js 개발 서버)
COMMUNITY_API_URL=http://localhost:3000

# Supabase (apps/web/.env.local에서 동일 값 복사)
NEXT_PUBLIC_SUPABASE_URL=<복사>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<복사>

# Bot 전용 계정
BOT_EMAIL=bot@company.com
BOT_PASSWORD=<strong-password>

# 스케줄 (분)
BOT_INTERVAL_MINUTES=10

# 채널 UUIDs (seed.sql 기준)
CHANNEL_GENERAL=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
CHANNEL_ENGINEERING=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
CHANNEL_RANDOM=dddddddd-dddd-dddd-dddd-dddddddddddd
```

**파일:** `apps/bot/.gitignore`

```
.env.local
dist/
node_modules/
dedup.db
*.db
```

---

## Step 4. config.ts 생성

**파일:** `apps/bot/src/config.ts`

```typescript
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  LMSTUDIO_BASE_URL: z.string().url().default('http://127.0.0.1:1218/v1'),
  LMSTUDIO_MODEL: z.string().default('google/gemma-4-e4b'),
  COMMUNITY_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string(),
  BOT_EMAIL: z.string().email(),
  BOT_PASSWORD: z.string().min(8),
  BOT_INTERVAL_MINUTES: z.coerce.number().int().min(1).default(10),
  CHANNEL_GENERAL: z.string().uuid(),
  CHANNEL_ENGINEERING: z.string().uuid(),
  CHANNEL_RANDOM: z.string().uuid(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('[Config] 환경변수 오류:', parsed.error.flatten());
  process.exit(1);
}

export const config = parsed.data;

export const RSS_SOURCES = [
  {
    url: 'https://www.yonhapnewstv.co.kr/browse/feed/',
    channelId: config.CHANNEL_GENERAL,
    category: 'general',
    label: '연합뉴스',
  },
  {
    url: 'https://hnrss.org/frontpage',
    channelId: config.CHANNEL_ENGINEERING,
    category: 'tech',
    label: 'Hacker News',
  },
  {
    url: 'https://feeds.feedburner.com/ZDNetKorea',
    channelId: config.CHANNEL_ENGINEERING,
    category: 'tech',
    label: 'ZDNet Korea',
  },
] as const;
```

---

## Step 5. types.ts 생성

**파일:** `apps/bot/src/types.ts`

```typescript
export interface RawArticle {
  title: string;
  link: string;
  summary: string;
  pubDate?: string;
  source: string;
  channelId: string;
  category: string;
}

export interface GeneratedPost {
  title: string;
  content: string;
  flair?: string;
  channelId: string;
  isAnonymous: boolean;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
  articleLink: string;
}
```

---

## Step 6. 진입점 stub 생성

**파일:** `apps/bot/src/index.ts`

```typescript
import 'dotenv/config';
import { config } from './config.js';

console.log(`[Bot] 시작 — 스케줄: ${config.BOT_INTERVAL_MINUTES}분마다`);
console.log(`[Bot] LM Studio: ${config.LMSTUDIO_BASE_URL}`);
console.log(`[Bot] LM Studio 모델: ${config.LMSTUDIO_MODEL}`);

// TODO: TASK 02~04 구현 후 아래 import 추가
// import { startScheduler } from './scheduler.js';
// startScheduler();
```

---

## Step 7. Turborepo turbo.json 확인

`turbo.json` 루트 파일에 bot이 포함되어 있지 않아도 `pnpm --filter bot` 으로 실행 가능.
별도 수정 불필요.

---

## Step 8. Bot 전용 Supabase 계정 생성 (수동)

> Codex가 자동화할 수 없는 수동 단계. 사용자가 직접 수행.

1. Supabase Dashboard → Authentication → Users → "Invite user" 클릭
2. 이메일: `bot@company.com` (또는 원하는 이름)
3. 비밀번호 설정
4. 생성된 user의 UUID를 확인
5. `profiles` 테이블에 해당 userId로 봇 프로필 INSERT:

```sql
INSERT INTO profiles (id, display_name, department, job_title, role)
VALUES (
  '<bot-user-uuid>',
  '뉴스봇',
  '시스템',
  '자동화봇',
  'bot'
);
```

6. `apps/bot/.env.local`의 `BOT_EMAIL`, `BOT_PASSWORD` 업데이트

---

## 완료 검증

```bash
cd apps/bot
pnpm install
pnpm dev
# 출력 예시:
# [Bot] 시작 — 스케줄: 10분마다
# [Bot] LM Studio: http://127.0.0.1:1218/v1
# [Bot] LM Studio 모델: google/gemma-4-e4b
```

환경변수 누락 시 Zod 에러 출력 + 프로세스 종료 확인.
