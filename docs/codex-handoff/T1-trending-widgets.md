# T1 — 첫 화면 3위젯 (커뮤니티 현황 / 인기 주제 / 활발한 채널)

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

현재 `/feed` 우측 사이드바가 비어 있어 데모 첫인상이 "살아있는 커뮤니티" 느낌이 안 난다.
이 3개 카드가 채워지는 순간 데모 임팩트가 가장 크게 올라간다. **데모 성패의 핵심**.

**데이터 비어 있어도 카드 레이아웃은 보여야 함** — 빈 상태 메시지로라도.

---

## 요구사항

### 1. tRPC 라우터 신설: `packages/api/src/routers/trending.ts`

세 개 프로시저, 모두 `publicProcedure`:

- `getCommunityStats()`
  - 반환: `{ totalMembers, monthlyPosts, monthlyReactions, monthlySaves }`
  - `monthlySaves` 는 T2(저장 기능) 완료 전에는 `0` 반환 — 필드만 뚫어둘 것
  - 이번 달 = 현재 월 1일 00:00 ~ 현재

- `getTrendingTopics()`
  - 반환: `Array<{ topic: string, count: number }>` 상위 5개
  - 집계 기준: 최근 24h 게시글의 `flair` 값 빈도 (T5 완료 시 `post_tags` 로 교체 예정)
  - `flair` 없는 글은 제외

- `getActiveChannels()`
  - 반환: `Array<{ id, slug, name, postCount }>` 상위 5개
  - 집계 기준: 최근 24h 해당 채널에 생성된 posts 수 desc

### 2. 라우터 등록

`packages/api/src/routers/index.ts` 의 `appRouter` 에 `trending: trendingRouter` 추가.

### 3. UI 컴포넌트 3개

`apps/web/src/components/` 에 추가:

- `CommunityStatsCard.tsx` — 2x2 그리드, 아이콘 + 숫자 + 라벨 (참고 카피: "구성원 참여", "이번 달 게시글", "이번 달 반응", "이번 달 저장")
- `TrendingTopicsCard.tsx` — 1~5 순위 리스트 (왼쪽 순위번호, 오른쪽 건수)
- `ActiveChannelsCard.tsx` — 채널명 + 아이콘 + 최근 글 수

### 4. `/feed` 페이지 우측 사이드바에 세로 배치

`apps/web/src/app/(main)/feed/page.tsx` 확인하여 우측 컬럼에 3개 카드 세로 배치.
모바일에서는 숨김 (`hidden lg:block` 등).

### 5. 디자인 톤

- 카드: 흰 배경, `rounded-2xl`, 작은 그림자, `p-4` ~ `p-6`
- 타이틀 카피: "커뮤니티 현황" · "요즘 인기 주제" · "오늘의 활발한 채널"
- 각 카드 우측 상단 "더보기" 링크 (지금은 `#` 로 둬도 됨)
- 빈 상태: "아직 집계된 데이터가 없어요" 등 당근식 친근한 카피

---

## 범위 밖

- 실시간 갱신 불필요 (T3 에서 필요 시 연결)
- 무한스크롤/페이지네이션 불필요 (고정 상위 5)
- 집계 성능 최적화 불필요 (데모 트래픽 규모)
- "더보기" 페이지 라우트 구현 불필요

---

## 완료 기준

- `/feed` 진입 시 3카드가 실데이터로 렌더됨
- 데이터 0건일 때 빈 상태 메시지 정상 노출
- `pnpm type-check` · `pnpm build` 통과

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 🥇 1순위
- 기존 쿼리 패턴: `packages/api/src/routers/posts.ts` 의 `getFeed` 참고
- T2(저장) 가 먼저 완료되면 `monthlySaves` 를 실제 집계로 채울 것 — T2 작업자가 안내할 수도 있음
