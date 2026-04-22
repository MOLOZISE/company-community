# T7 — 쇼케이스 연출 3종 (애니 리액션 · 온라인 인디케이터 · AI 요약)

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

필수는 아니지만 **발표 때 관객 반응이 큰 연출 3종**.
시간 되는 만큼 우선순위대로 구현하고, 중간에 중단해도 각각 독립 동작해야 함.

**우선순위**: (1) 애니메이션 리액션 → (2) 온라인 인디케이터 → (3) AI 요약

---

## 1. 애니메이션 이모지 리액션 (가성비 최고, 먼저 구현)

### 변경 대상
- `apps/web/src/components/ReactionBar.tsx`

### 요구사항
- Framer Motion 사용 (이미 설치되어 있지 않으면 `apps/web` 에 추가)
- 리액션 클릭 시 이모지가 튀어오르는 애니메이션
  - scale: `1 → 1.4 → 1`, duration 300ms, easing: `easeOut`
- 카운터 숫자 변경 시 롤링 애니메이션
  - `AnimatePresence` + `motion.span` 으로 숫자가 위에서 내려오는 느낌
- 호버 시 살짝 커지는 효과 (scale 1.05)

### 완료 기준
- 6종 이모지 각각 클릭 시 애니메이션 정상
- 카운터 숫자 변경 시 부드럽게 전환
- 기존 toggle 로직 회귀 없음

---

## 2. 온라인 인디케이터 (Supabase Presence)

### 요구사항

#### 훅 신설: `apps/web/src/hooks/usePresence.ts`
- 전역 채널 `'online-users'` 에 `track` 으로 자신의 userId 등록
- 현재 온라인 유저 ID 목록을 반환
- 언마운트 시 untrack

#### 앱 루트에서 훅 호출
- 로그인 상태일 때만 호출
- 적절한 레이아웃 컴포넌트 (예: `apps/web/src/app/(main)/layout.tsx`)에서 초기화

#### UI 반영
- 프로필 아바타 컴포넌트에 온라인이면 🟢 점 (아바타 우하단)
- `Sidebar.tsx` 하단에 "지금 활동 중 · N명" 표시

### 완료 기준
- 두 창에서 동시 로그인 → 양쪽 모두 "2명" 표시
- 한쪽 닫으면 몇 초 내 "1명" 으로 감소
- 로그아웃 상태에서는 온라인 점 표시 없음

---

## 3. AI 3줄 요약 버튼

### 요구사항

#### API 엔드포인트: `apps/web/src/app/api/summarize/route.ts`
- POST `{ postId: string }` → `{ summary: string }`
- 게시글 본문을 DB 에서 조회하여 Anthropic SDK 호출
- 모델: `claude-haiku-4-5-20251001`
- 프롬프트: "다음 게시글을 한국어 3줄로 요약해주세요. 각 줄은 불릿으로 시작하세요."
- in-memory 캐시 (`Map<postId, summary>`) — 같은 글은 재요청 안 함
- 환경변수 `ANTHROPIC_API_KEY` 없으면 `501` 반환

#### UI: `PostCard.tsx` 또는 게시글 상세에 버튼
- 본문 길이 500자 이상일 때만 버튼 노출
- 환경변수 미설정 시(서버에서 501 반환) 버튼 숨김
- 버튼: "✨ 3줄 요약"
- 클릭 → 로딩 스피너 → 결과를 게시글 상단에 접히는 박스로 렌더
- 박스는 한 번 펼쳐지면 유지, 닫기 버튼 있음

#### 환경변수
- `.env.local.example` 에 `ANTHROPIC_API_KEY=` 추가 (값은 비워둠)

### 완료 기준
- 500자 이상 게시글에 버튼 노출
- 클릭 → 3~5초 내 요약 박스 렌더
- 동일 게시글 두 번째 클릭은 캐시에서 즉시 반환
- API 키 없는 환경에서는 버튼이 노출되지 않음

---

## 공통 완료 기준

- 각 기능이 **독립적으로 토글 가능** (하나가 깨져도 나머지 동작)
- 환경변수/설정 없을 때 graceful degradation (에러 화면 X)
- 기존 기능 회귀 없음
- `pnpm type-check` · `pnpm build` 통과

---

## 범위 밖

- 타이핑 인디케이터, 실시간 참여자 카운터 (시간 남을 때 별도 작업)
- 주간 다이제스트 이메일
- AI 요약 결과 DB 영구 저장 (in-memory 로 충분)

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §5
- 애니메이션 참고: Slack/Discord 이모지 반응 UX
- Anthropic SDK: `@anthropic-ai/sdk` (없으면 설치)
- T3(Realtime) 이 먼저 완료되어 있으면 Presence 채널 설정이 더 매끄러움
