# T5 — 해시태그 + 태그 피드

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

Reddit 토픽성 + 당근 관심사 탐색을 한 기능으로 해결.
T1 의 "요즘 인기 주제" 위젯과 자연스럽게 연결됨.

---

## 요구사항

### 1. 본문에서 `#키워드` 자동 추출

- 서버 측 `posts.create` / `posts.update` 시점에 정규식으로 추출
- 정규식: 한글·영문·숫자·언더스코어 허용, 예: `/#([\p{L}\p{N}_]+)/gu`
- 중복 제거 후 저장

### 2. 스키마 추가

`packages/db/src/schema/index.ts`:

- 새 테이블 `postTags`
  - `postId` (uuid, FK posts.id, on delete cascade)
  - `tag` (text, lowercase 정규화 권장)
  - `createdAt` (timestamp, default now)
  - PK: `(postId, tag)`
  - 인덱스: `(tag, createdAt desc)` — 태그별 피드 조회용

### 3. 마이그레이션

`packages/db/src/migrations/009_tags.sql` 추가.

### 4. 라우터 변경

`packages/api/src/routers/posts.ts`:

- `create` / `update` 내부에서 본문 파싱 → `postTags` 갱신
  - update 시엔 기존 태그 삭제 후 재삽입 (간단)
- 새 프로시저 `getByTag({ tag, limit, offset })`
  - 반환: 기존 `getFeed` 와 동일한 응답 구조 (UI 재사용)
  - 태그는 join 하여 조회

`packages/api/src/routers/trending.ts` (T1 완료 시):
- `getTrendingTopics` 를 `post_tags` 기반으로 전환
- T1 이 아직 `flair` 기반이면 T5 완료 후 전환 PR 을 별도로 낼 것 (또는 PR 설명에 교체 쿼리 예시 포함)

### 5. UI

- `PostCard.tsx` 렌더 시 본문 내 `#태그`를 Link 로 변환
  - 클릭 시 `/tag/[tag]` 로 이동
  - 이미 `#` 이 포함된 텍스트를 Link 로 감싸는 간단한 파서
- 새 페이지: `apps/web/src/app/(main)/tag/[tag]/page.tsx`
  - 타이틀: `#{tag}`
  - 기존 `InfinitePostList` 재사용 (가능한 형태로)
  - 빈 상태: "아직 이 주제의 글이 없어요"

### 6. 한글 태그

- `#온보딩`, `#재택근무` 등 한글 해시태그 정상 동작해야 함
- URL 은 `encodeURIComponent` 로 처리

---

## 범위 밖

- 태그 자동완성 (입력 시 제안)
- 태그 별칭/머지 관리
- 태그 팔로우
- 태그 통계 대시보드

---

## 완료 기준

- 본문에 `#온보딩` 입력 → 저장 후 해당 글에서 `#온보딩` 이 클릭 가능한 링크
- `/tag/온보딩` 페이지에서 해당 태그 글 피드 렌더
- 빈 상태 정상
- 태그 업데이트 시(글 수정) 변경 반영
- `pnpm type-check` · `pnpm build` 통과

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 - 5번
- `InfinitePostList.tsx`, `PostCard.tsx` 의 기존 렌더 로직 확인
