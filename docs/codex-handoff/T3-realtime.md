# T3 — Realtime 댓글·알림

> **이 파일을 Codex 에 그대로 붙여 넣으면 됩니다.**
> Codex: 작업 시작 전 `docs/codex-handoff/00-common-context.md` 를 먼저 읽으세요.

---

## 배경

현재 F5 눌러야 새 댓글/알림이 보인다 → Slack/Discord 감성이 제일 약한 지점.
**데모 클라이맥스 장면**(두 시연자가 실시간으로 상호작용하는 순간)의 핵심.

범위 주의: "진짜 협업툴"을 만드는 게 아니다. **활동감이 느껴지는 최소한의 실시간 연출**만 하면 충분.

---

## 요구사항

### 1. Supabase Realtime Publication 확인

`comments`, `notifications` 테이블이 realtime publication 에 포함되는지 확인.
포함 안 되어 있으면 마이그레이션 `packages/db/src/migrations/007_realtime_publication.sql` 추가:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### 2. 훅 2개 신설

#### `apps/web/src/hooks/useRealtimeComments.ts`
- 파라미터: `postId`
- `supabase.channel(`post:${postId}:comments`)` 구독
- INSERT 이벤트 수신 시:
  - react-query 의 `comments.getByPost` 캐시에 prepend (또는 적절한 삽입 위치)
  - `payload.new.id` 가 이미 캐시에 있으면 스킵 (자기 탭에서 방금 단 댓글 중복 방지)
- 언마운트 시 채널 해제

#### `apps/web/src/hooks/useRealtimeNotifications.ts`
- 파라미터: 현재 userId (auth store 에서 읽어도 됨)
- `notifications` 테이블에서 `userId` 필터링된 INSERT 수신
- 수신 시:
  - 알림 벨 카운트 invalidate/증가
  - 짧은 토스트 표시 (기존 토스트 컴포넌트 있으면 재사용, 없으면 간단히)

### 3. 연결 지점

- `apps/web/src/components/CommentSection.tsx` → `useRealtimeComments(postId)` 호출
- `apps/web/src/components/NotificationBell.tsx` → `useRealtimeNotifications(userId)` 호출

### 4. UX 디테일

- 신규 댓글 등장 시 페이드인 애니메이션 200ms (Tailwind `animate-fade-in` 또는 Framer Motion)
- 알림 벨 배지 숫자 변경 시 살짝 bounce (선택)

---

## 범위 밖

- 타이핑 인디케이터 (T7 에서 별도)
- 온라인 상태 표시 (T7 에서 별도)
- 재연결/오프라인 복구 로직 정교화
- 게시글 목록 실시간 갱신 (댓글만)

---

## 완료 기준

- 두 브라우저 창에서 동시 로그인
- 한쪽에서 댓글 작성 → 반대쪽에 **1초 이내** 등장
- 알림 벨 배지가 새로고침 없이 증가
- 탭 백그라운드 상태에서도 수신 정상
- 자기 탭에서 단 댓글이 중복 렌더되지 않음
- `pnpm type-check` · `pnpm build` 통과

---

## 참고

- 분석 리포트 `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md` §3 🥉 3순위
- Supabase Realtime 문서: `postgres_changes` 이벤트 사용
- 기존 supabase 클라이언트: `apps/web/src/lib/supabase.ts`
- 기존 auth store: `useAuthStore` (Zustand)
