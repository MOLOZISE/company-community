# T4 — Poll (투표형 게시글)

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

**관객 참여형 데모 장치**. 발표장에서 관객이 직접 투표하게 만들어 기억에 남기는 핵심 기능.
Blind 익명 + Reddit 투표 감성을 한 기능으로 동시에 어필.

---

## 요구사항

### 1. 스키마 확장

`packages/db/src/schema/index.ts` 수정:

- `posts` 테이블에 `kind` 컬럼 추가
  - 타입: text (또는 enum), 값: `'text' | 'poll'`
  - default `'text'`
  - 기존 데이터는 default 로 채워지므로 안전

- 새 테이블 `pollOptions`
  - `id` (uuid pk)
  - `postId` (uuid, FK posts.id, on delete cascade)
  - `label` (text)
  - `orderIdx` (int, 0부터)
  - 인덱스: `(postId, orderIdx)`

- 새 테이블 `pollVotes`
  - `userId` (uuid, FK profiles.id)
  - `postId` (uuid, FK posts.id)
  - `pollOptionId` (uuid, FK pollOptions.id)
  - `createdAt` (timestamp)
  - UNIQUE: `(userId, postId)` — 한 글당 한 유저 1표

### 2. 마이그레이션

`packages/db/src/migrations/008_polls.sql` 추가.

### 3. 라우터: `packages/api/src/routers/polls.ts`

- `create({ postId, options: string[] })` — `protectedProcedure`
  - 게시글이 이미 생성된 후 호출되거나, posts.create 확장 (아래 4번 참고)
  - options 최소 2개, 최대 5개 validation

- `getResults({ postId })` — `publicProcedure`
  - 반환: `{ options: Array<{ id, label, orderIdx, voteCount }>, totalVotes, myVoteOptionId: string | null }`
  - 로그인 안 돼 있으면 `myVoteOptionId: null`

- `vote({ postId, optionId })` — `protectedProcedure`
  - UNIQUE 충돌 시 **upsert 로 교체 허용** (투표 변경 가능)
  - 반환: `{ success: true, myVoteOptionId }`

`packages/api/src/routers/index.ts` 에 `polls: pollsRouter` 등록.

### 4. posts.create mutation 확장

`posts.ts` 의 `create` 프로시저 입력에 옵션 추가:
- `kind: 'text' | 'poll'` (기본 `'text'`)
- `pollOptions?: string[]` (kind='poll' 일 때 필수, 2~5개)

트랜잭션으로:
1. posts insert (kind 포함)
2. kind='poll' 이면 pollOptions 에 일괄 insert

### 5. UI

#### `apps/web/src/components/PostCreateModal.tsx` 확장
- 상단에 "📊 투표 만들기" 토글 (체크박스 또는 탭)
- 토글 on 시: 옵션 입력 필드 (최소 2개 노출, "옵션 추가" 버튼으로 최대 5개까지)
- 옵션 빈 값 제출 방지

#### `apps/web/src/components/PollCard.tsx` 신설
- `post.kind === 'poll'` 일 때 `PostCard` 내부에서 렌더
- 레이아웃:
  - 옵션 리스트 (각 옵션: 라벨 + 득표율 progress bar + 투표 수)
  - 내가 이미 투표한 옵션은 강조 (테두리 or 아이콘)
  - 미투표 상태: 투표 버튼, 투표 상태: 결과만 표시 (+ "변경" 버튼으로 재투표 가능)
- `polls.getResults` 로 데이터 로드

#### `PostCard.tsx` 조건부 분기
- `post.kind === 'poll'` → `<PollCard />` 렌더
- 그 외 기존 렌더

### 6. 익명 투표 규칙

- 작성자 본인도 투표 가능
- 익명 게시글이어도 투표 집계 정상 (vote 는 userId 기준이지만 UI 에 표시하지 않음)

---

## 범위 밖

- 투표 마감 시각 (스키마에 `closedAt` 컬럼 추가해두되 UI 는 구현하지 않음 — 선택)
- 복수 선택
- 결과 그래프 애니메이션 (T7 에서 별도)
- 투표 실시간 집계 (새로고침 시 갱신으로 충분)

---

## 완료 기준

- 투표 생성 → 피드에 Poll 카드로 렌더
- 다른 계정으로 투표 → 새로고침 시 득표율 갱신
- 이미 투표한 사용자는 선택 강조 + 변경 가능
- 옵션 1개만 입력 시 저장 차단
- `pnpm type-check` · `pnpm build` 통과

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 - 9번
- 참고 패턴: `packages/api/src/routers/reactions.ts` (toggle/upsert 패턴)
- 시드에 Poll 예시 1~2개 추가하면 데모 준비가 편함 (`packages/db/src/seed.ts`)
