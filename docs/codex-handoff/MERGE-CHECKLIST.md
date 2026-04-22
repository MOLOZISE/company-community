# 통합 체크리스트 (오너 전용)

> 각 Codex 의 PR 이 들어온 후 머지 전에 확인하세요.

---

## 1. 마이그레이션 순번 충돌

`packages/db/src/migrations/` 파일명이 단조 증가하는지 확인.

| 예상 순번 | 작업 | 파일명 |
|---|---|---|
| 006 | T2 | `006_saves.sql` |
| 007 | T3 | `007_realtime_publication.sql` |
| 008 | T4 | `008_polls.sql` |
| 009 | T5 | `009_tags.sql` |

- [ ] 순번 중복 없음
- [ ] 머지 순서에 따라 필요 시 리넘버링

---

## 2. 라우터 등록

`packages/api/src/routers/index.ts` 의 `appRouter` 에 아래가 모두 등록되어 있는지:

- [ ] `trending` (T1)
- [ ] `saves` (T2)
- [ ] `polls` (T4)

(T3·T5·T6·T7 은 기존 라우터 확장이므로 신규 등록 없음)

---

## 3. 빌드 · 타입체크

- [ ] `pnpm type-check` 전체 통과
- [ ] `pnpm build` 전체 통과
- [ ] `pnpm lint` 무경고 (또는 허용 가능 수준)

---

## 4. 충돌 가능 파일 통합 검증

### `apps/web/src/components/PostCard.tsx`
T2(저장 버튼), T5(해시태그 렌더), T7(애니메이션 리액션)가 겹침.
- [ ] 저장 토글 동작
- [ ] 해시태그 링크 클릭 가능
- [ ] 이모지 리액션 애니메이션 정상
- [ ] Poll 게시글(kind='poll')일 때 `PollCard` 렌더

### `apps/web/src/components/PostCreateModal.tsx`
T4(Poll 토글), T5(태그 입력 힌트)가 겹침.
- [ ] 일반 글쓰기 정상
- [ ] Poll 토글 on/off 시 UI 전환
- [ ] 해시태그 입력 후 저장 시 파싱

### `packages/db/src/schema/index.ts`
T2·T4·T5 모두 테이블 추가.
- [ ] 각 테이블(`saves`, `pollOptions`, `pollVotes`, `postTags`) 모두 export 되어 있음
- [ ] `posts.kind` 컬럼 추가되어 있음 (T4)

---

## 5. 시드 데이터 갱신

`packages/db/src/seed.ts` 에 데모용 데이터 추가:
- [ ] Poll 게시글 예시 1~2개
- [ ] 해시태그 포함 게시글 예시 (`#온보딩`, `#재택근무` 등)
- [ ] 저장 예시 데이터 (몇 개)
- [ ] 시드 실행 테스트: `npx tsx packages/db/src/seed.ts`

---

## 6. 환경변수

`.env.local.example` 확인:
- [ ] `ANTHROPIC_API_KEY=` 항목 존재 (T7)
- [ ] 실제 `.env.local` 에 값 설정 (데모 환경)

---

## 7. 데모 엔드투엔드

`QA-SCENARIO.md` 의 7단계 시나리오를 처음부터 끝까지 한 번 돌려본다.

- [ ] 모든 단계 막힘 없이 통과

---

## 8. 크로스 브라우저 확인 (간단)

- [ ] Chrome 최신
- [ ] Safari (Mac 데모 시)
- [ ] 모바일 뷰 (반응형, Chrome DevTools)

---

## 머지 순서 권장

경쟁 파일이 많으므로 이 순서로 머지하면 충돌 최소:

1. **T1** (신규 파일 위주, 충돌 거의 없음)
2. **T3** (Realtime — 훅 신설이라 충돌 적음)
3. **T2** (PostCard 첫 번째 수정)
4. **T5** (PostCard·PostCreateModal 두 번째 수정, T2 위에 빌드)
5. **T4** (PostCard·PostCreateModal 세 번째 수정, schema 추가)
6. **T6** (feed 페이지 레이아웃)
7. **T7** (마지막에 UI 연출 얹음)
