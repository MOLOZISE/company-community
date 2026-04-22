# Auto-Post Bot — Architecture Overview

> 10분마다 웹을 크롤링하고 LM Studio(로컬 LLM)로 게시물을 자동 생성·등록하는 봇

## 시스템 구조

```
┌─────────────────────────────────────────────────────┐
│                   apps/bot (Node.js)                │
│                                                     │
│  ┌──────────┐   ┌─────────────┐   ┌─────────────┐  │
│  │ Scheduler│──▶│  Crawler    │──▶│  Generator  │  │
│  │(node-cron│   │(RSS/HTML)   │   │(LM Studio)  │  │
│  │10min)    │   └─────────────┘   └──────┬──────┘  │
│  └──────────┘                            │          │
│                                          ▼          │
│                                   ┌─────────────┐  │
│                                   │   Poster    │  │
│                                   │(tRPC HTTP)  │  │
│                                   └─────────────┘  │
└─────────────────────────────────────────────────────┘
         │                                  │
         ▼                                  ▼
  뉴스 RSS / 웹 사이트              community-community API
  (연합뉴스, ZDNet KR,              POST /api/trpc/posts.create
   Hacker News 등)                  (JWT 인증 필요)
         │
         ▼
  LM Studio (로컬)
  http://127.0.0.1:1218/v1
  모델: google/gemma-4-e4b
  (또는 eeve-korean-10.8b-raft)
```

## 봇 동작 플로우

```
매 10분
  └─▶ [Crawler] RSS/HTML 크롤링
        └─▶ 새 기사 필터링 (중복 제거, DB에 기록된 URL 스킵)
              └─▶ [Generator] LM Studio API 호출
                    프롬프트: "다음 기사를 사내 게시판 게시물로 변환..."
                    반환: { title, content, flair, channelId }
                        └─▶ [Poster] tRPC HTTP 호출
                              posts.create mutation
                              (Bot 계정 JWT 사용)
                                  └─▶ 성공/실패 로그
```

## 파일 구조

```
apps/bot/
├── src/
│   ├── index.ts          # 진입점 + node-cron 스케줄러
│   ├── crawler.ts        # RSS/HTML 크롤러
│   ├── generator.ts      # LM Studio 연동 콘텐츠 생성기
│   ├── poster.ts         # tRPC HTTP 클라이언트 (게시물 등록)
│   ├── dedup.ts          # 중복 URL 추적 (SQLite or JSON)
│   ├── config.ts         # 환경변수 + 상수
│   └── types.ts          # 공유 TypeScript 타입
├── .env.local            # BOT_JWT, LMSTUDIO_BASE_URL 등
├── package.json
├── tsconfig.json
└── README.md
```

## 환경변수 (.env.local)

```env
# LM Studio
LMSTUDIO_BASE_URL=http://127.0.0.1:1218/v1
LMSTUDIO_MODEL=google/gemma-4-e4b

# Community API (Next.js가 실행 중인 주소)
COMMUNITY_API_URL=http://localhost:3000

# Bot 계정 (Supabase에서 별도 생성한 bot@company.com)
BOT_EMAIL=bot@company.com
BOT_PASSWORD=<strong-password>

# 스케줄 (분 단위)
BOT_INTERVAL_MINUTES=10

# 채널 매핑 (기사 카테고리 → channelId)
CHANNEL_GENERAL=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
CHANNEL_ENGINEERING=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
CHANNEL_RANDOM=dddddddd-dddd-dddd-dddd-dddddddddddd
```

## tRPC 인증 방식

봇은 Supabase에서 발급받은 JWT를 Authorization 헤더로 전달합니다:

```
POST http://localhost:3000/api/trpc/posts.create
Authorization: Bearer <BOT_JWT>
Content-Type: application/json
```

JWT 갱신은 `poster.ts`에서 supabase-js `signInWithPassword`로 처리합니다.

## 크롤링 대상 (기본값)

| 소스 | URL | 채널 |
|------|-----|------|
| 연합뉴스 RSS | `https://www.yonhapnewstv.co.kr/browse/feed/` | general |
| ZDNet Korea | `https://feeds.feedburner.com/ZDNetKorea` | engineering |
| Hacker News | `https://hnrss.org/frontpage` | engineering |
| 네이버 뉴스 IT | `https://rss.news.naver.com/main/rss/press/index.nhn?pressId=030` | engineering |
| 자유 주제 | Hacker News /best | random |

## 구현 태스크 순서

Codex가 순서대로 구현해야 할 태스크 파일:

1. [`TASK_01_PROJECT_SETUP.md`](./TASK_01_PROJECT_SETUP.md) — apps/bot 패키지 초기화
2. [`TASK_02_CRAWLER.md`](./TASK_02_CRAWLER.md) — RSS 크롤러 + 중복 제거
3. [`TASK_03_GENERATOR.md`](./TASK_03_GENERATOR.md) — LM Studio 연동 게시물 생성
4. [`TASK_04_POSTER_SCHEDULER.md`](./TASK_04_POSTER_SCHEDULER.md) — tRPC 등록 + 스케줄러

## 완료 검증 기준

- `pnpm --filter bot dev` 실행 후 10분 이내에 게시판에 자동 게시물 등록 확인
- LM Studio 꺼진 상태에서 에러 로그만 출력하고 프로세스 중단 없음
- 동일 URL 기사 중복 등록 없음
