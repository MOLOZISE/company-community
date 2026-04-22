# 공통 컨텍스트 (모든 Codex 작업자가 먼저 읽을 것)

> 이 파일은 T1~T7 모든 작업 파일에서 참조합니다.
> Codex 는 작업 시작 전 이 블록 전체를 읽고 내재화해야 합니다.

---

## 프로젝트 개요

- **서비스**: 사내 커뮤니티 (Blind + 당근 + Reddit + Slack 하이브리드) **데모**
- **스택**: Next.js 15 (App Router) · React 18 · Tailwind v4 · tRPC v11 · Drizzle ORM · Supabase (Postgres + Auth + Realtime + Storage) · Turborepo · pnpm

## 모노레포 구조

```
apps/web/                          Next.js 프론트엔드
  src/app/                         App Router 페이지
  src/components/                  React 컴포넌트
  src/lib/                         trpc, supabase, utils
packages/api/src/routers/          tRPC 라우터
  index.ts                         라우터 등록 지점
packages/db/
  src/schema/index.ts              Drizzle 스키마 (단일 파일)
  src/migrations/                  SQL 마이그레이션 (005까지 존재)
  src/seed.ts                      시드 스크립트
```

**반드시 `/CLAUDE.md` 를 먼저 읽고 네이밍·파일 구조·패턴을 따를 것.**

---

## 이번 단계의 목적

이 작업은 **운영 완성도가 아니라 데모 시연 체감**을 끌어올리기 위한 것이다.
판단이 갈릴 때는 항상 **"데모장에서 관객 반응이 더 큰 쪽"** 을 선택하라.

다음 항목은 **이번 범위 밖**이다:
- 이메일/도메인 인증 강화
- Rate Limit / 스팸 방지
- 한글 FTS / 검색 엔진 교체
- 기존 hot score 알고리즘 리팩터
- 테스트 프레임워크 신규 세팅
- UI 디자인 시스템 재설계

---

## 작업 원칙

1. **타입 안전**: 모든 tRPC 프로시저는 Zod 입력 스키마 + 명시적 반환 타입 + JSDoc 코멘트 1줄.
2. **스키마 변경**: `packages/db/src/schema/index.ts` 수정 + 새 마이그레이션 SQL 파일 추가 (순번: 006 이후, 중복 금지).
3. **기존 패턴 재사용**: 새로 짜기 전에 유사 라우터/컴포넌트가 이미 있는지 확인.
   - 참고 라우터: `posts.ts`, `comments.ts`, `votes.ts`, `reactions.ts`
   - 참고 컴포넌트: `PostCard.tsx`, `CommentSection.tsx`, `ReactionBar.tsx`
4. **컴포넌트**: `apps/web/src/components/` 에 PascalCase.
5. **익명 모드 존중**: 익명 게시글/댓글에서 실명·부서·아바타 노출 금지. 기존 `anonymousSeed`/`anonNumber` 로직 참고.
6. **과잉 구현 금지**: 요구된 scope 외의 리팩터·추상화·주석·에러 처리 추가 금지.
7. **주석은 WHY 가 비자명할 때만.** WHAT 은 코드가 말하게 할 것.
8. **빌드/타입체크 통과 상태로 PR**: `pnpm type-check` · `pnpm build` 확인.

---

## 금지 사항 (흔한 실수 차단)

- ❌ 이메일 검증 / 회사 도메인 화이트리스트 구현
- ❌ Rate Limit / 스팸 방지 로직 추가
- ❌ 한글 FTS / pg_trgm 등 검색 엔진 교체
- ❌ 기존 `hotScore` 알고리즘 리팩터
- ❌ 테스트 프레임워크(Vitest/Playwright) 신규 세팅
- ❌ `CLAUDE.md` · `README.md` 등 문서 수정 (요청 없는 한)
- ❌ 스키마 대규모 변경 (요구된 테이블만 추가, 기존 컬럼 변경 금지)
- ❌ UI 디자인 시스템 재설계 (기존 Tailwind 컨벤션 유지)

---

## 브랜치 · PR 규칙

- 브랜치: `feat/demo-T{n}-{slug}` (예: `feat/demo-T1-trending-widgets`)
- PR 제목: `feat(demo): Tn - 한 줄 요약`
- PR 본문에 반드시 포함:
  - 변경 파일 목록 (추가/수정/삭제)
  - 새로 생긴 tRPC 프로시저 시그니처
  - 새 DB 테이블/컬럼
  - 수동 테스트 시나리오 (데모 스크립트에 바로 쓸 수 있도록)
  - 남은 TODO / 알려진 한계

---

## 다른 Codex 와 충돌 가능한 파일

병렬 작업 중이므로 **아래 파일은 변경 최소화**하고, 수정 시 PR 설명에 명시:

| 파일 | 이 파일을 건드릴 작업 |
|---|---|
| `packages/db/src/schema/index.ts` | T2, T4, T5 (각자 자기 테이블만 추가) |
| `packages/api/src/routers/index.ts` | T1, T2, T4, T5 (새 라우터 등록) |
| `apps/web/src/components/PostCard.tsx` | T2(저장 버튼), T5(해시태그 렌더), T7(애니메이션) |
| `apps/web/src/components/PostCreateModal.tsx` | T4(Poll), T5(해시태그 입력 힌트) |

**충돌 가능 파일 수정 시엔 최소 변경 원칙**, 다른 작업 기능을 건드리거나 제거하지 말 것.

---

## 모호할 때

- 추측하지 말고 질문할 것.
- 스키마/API 설계가 애매하면 작업 블록의 "범위 밖" 섹션을 먼저 확인.
- 그래도 불확실하면 **일단 최소 구현 + TODO 코멘트** 로 남기고 보고.
