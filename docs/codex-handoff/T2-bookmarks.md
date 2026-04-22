# T2 — 저장/북마크

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

현재 `PostCard` 의 "저장" 버튼이 UI만 있고 동작하지 않는다 → **데모 중 가장 티나는 버그**.
개인화 흐름(분석 리포트 §0 - ④)의 핵심 마무리 포인트.

---

## 요구사항

### 1. 스키마 추가

`packages/db/src/schema/index.ts` 에 `saves` 테이블:

- `userId` (uuid, FK `profiles.id`, on delete cascade)
- `postId` (uuid, FK `posts.id`, on delete cascade)
- `createdAt` (timestamp, default now)
- UNIQUE 제약: `(userId, postId)`
- 인덱스: `(userId, createdAt desc)` — 내 저장 목록 정렬용

### 2. 마이그레이션

`packages/db/src/migrations/006_saves.sql` 추가 (기존 순번 005 다음).
테이블 + UNIQUE + 인덱스 정의. RLS 필요 시 기존 패턴 따를 것.

### 3. 라우터: `packages/api/src/routers/saves.ts`

모두 `protectedProcedure`:

- `toggle({ postId })` → `{ saved: boolean }`
  - 있으면 삭제 / 없으면 추가
- `getMySaves({ limit, offset })` → 저장한 게시글 목록 (posts 조인, `createdAt desc`)
  - 응답 구조는 기존 `posts.getFeed` 와 동일한 형태 유지 → UI 재사용 위함
- `getIsSavedMap({ postIds: string[] })` → `Record<postId, boolean>`
  - 피드 렌더 시 한 번에 조회 (N+1 방지)

`packages/api/src/routers/index.ts` 에 `saves: savesRouter` 등록.

### 4. UI 연결

- `apps/web/src/components/PostCard.tsx` 의 저장 버튼에 `useMutation` 연결
  - optimistic update: 클릭 즉시 아이콘 상태 토글
  - 실패 시 롤백
- 피드 로드 시 `getIsSavedMap` 으로 보이는 게시글들의 저장 여부를 한 번에 조회 (부모 컴포넌트에서)
- 프로필 페이지 "저장한 글" 탭 추가
  - 위치: `apps/web/src/app/(main)/profile/` 내부 — 기존 프로필 페이지 구조 확인 후 탭 or 섹션 추가
  - 기존 `PostCard` 재사용

---

## 범위 밖

- 폴더/컬렉션 등 2차 분류
- 저장 시 알림 발송
- 저장 개수 공개 표시 (내 저장만 보이면 됨)

---

## 완료 기준

- 저장 버튼 클릭 → 아이콘 상태 즉시 변경, 새로고침 후에도 유지
- 프로필 페이지에서 "저장한 글" 탭 정상 노출, 내 저장 목록 렌더
- 저장 해제 시 목록에서 제거
- `pnpm type-check` · `pnpm build` 통과

---

## T1 과의 협업 포인트

T1 의 `getCommunityStats` 에서 `monthlySaves` 필드를 **실제 집계로 채울 수 있도록** T1 작업자에게 알릴 것.
PR 설명에 다음 내용 포함:
- `saves` 테이블의 컬럼명 (`createdAt`)
- "이번 달 저장" 집계 쿼리 예시 한 줄

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 🥈 2순위
- 참고할 토글 패턴: `packages/api/src/routers/reactions.ts` 의 `toggle`
