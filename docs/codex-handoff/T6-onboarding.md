# T6 — 추천 채널 온보딩

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

가입 직후 "뭘 해야 할지" 막막함 해소.
첫 진입 경험을 구조화하여 데모의 "② 직접 참여" 단계로 자연스럽게 이어지게 한다.

---

## 요구사항

### 1. 라우터 추가

`packages/api/src/routers/channels.ts` 에 `getRecommended({ limit })` 추가 — `protectedProcedure`:

- 기준:
  1. 사용자가 **아직 가입하지 않은** 채널 중
  2. `profile.department` 와 매칭되는 채널 우선 (scope 또는 관련 필드가 있다면 활용)
  3. 그 외엔 멤버 수 상위
- 기본 limit 3
- 반환: `Array<{ id, slug, name, description, memberCount, iconUrl? }>`

### 2. 온보딩 카드 컴포넌트

`apps/web/src/components/OnboardingCard.tsx` 신설:

- 표시 조건:
  - 내가 속한 채널이 0개 **또는**
  - 가입 후 7일 이내 (profile.createdAt 기준)
  - 로컬스토리지 `onboarding_dismissed === 'true'` 면 숨김
- 레이아웃:
  - 상단 타이틀: "커뮤니티에 오신 걸 환영해요!"
  - 3단계 가이드 (아이콘 + 라벨):
    - ① 관심 채널 고르기
    - ② 첫 글 써보기
    - ③ 반응 남기기
  - 추천 채널 3개 카드 (가로 배치)
    - 각 카드에 "가입" 버튼
    - 가입 mutation (`channels.join`) 성공 시 해당 카드 제거
    - 모두 가입 or 닫기 시 카드 전체 숨김
  - 우상단 닫기 버튼 (X) → 로컬스토리지 `onboarding_dismissed=true` 저장

### 3. 연결

`apps/web/src/app/(main)/feed/page.tsx` 최상단에 `<OnboardingCard />` 삽입.

---

## 범위 밖

- 다단계 튜토리얼 투어 (step-by-step 하이라이트 등)
- 단계별 진행도 트래킹 (체크 상태 저장)
- 이메일 온보딩 시리즈

---

## 완료 기준

- 신규 계정으로 가입 → `/feed` 진입 시 온보딩 카드 노출
- 채널 "가입" 버튼 → 즉시 해당 카드 제거, 0개 되면 전체 숨김
- 닫기 → 이후 세션에서도 숨김 유지 (로컬스토리지)
- 이미 채널에 가입되어 있고 가입일 7일 경과 → 카드 노출 안 됨
- `pnpm type-check` · `pnpm build` 통과

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 - 4번, §4.1
- 기존 `channels.getMyMemberships` / `channels.join` 활용
