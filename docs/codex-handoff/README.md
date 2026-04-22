# Codex 위탁 인덱스 — 회사 커뮤니티 데모 강화

이 디렉터리는 **Codex 에이전트에게 작업을 위탁하기 위한 지침 모음**입니다.
각 파일은 독립적으로 한 Codex 인스턴스에 그대로 복붙하면 작업이 시작되도록 self-contained 하게 작성되었습니다.

---

## 파일 구성

| 파일 | 용도 | 받는 대상 |
|---|---|---|
| `README.md` | 이 인덱스 | — |
| `00-common-context.md` | 공통 컨텍스트 (모든 작업 프롬프트 앞에 자동 포함됨) | Codex |
| `T1-trending-widgets.md` | 첫 화면 3위젯 | Codex A |
| `T2-bookmarks.md` | 저장/북마크 | Codex B |
| `T3-realtime.md` | Realtime 댓글·알림 | Codex C |
| `T4-polls.md` | Poll(투표형 게시글) | Codex D |
| `T5-hashtags.md` | 해시태그 + 태그 피드 | Codex E |
| `T6-onboarding.md` | 추천 채널 온보딩 | Codex F |
| `T7-showcase.md` | 쇼케이스 연출 3종 | Codex G |
| `MERGE-CHECKLIST.md` | 통합 체크리스트 (오너용) | 오너 |
| `QA-SCENARIO.md` | D-Day 엔드투엔드 시나리오 (오너용) | 오너 |

---

## 사용법

### Codex 에게 위탁할 때
각 작업 파일(T1~T7)은 상단에 **"이 파일만 그대로 붙여 넣으면 됨"** 이라고 명시되어 있습니다.
해당 파일 전체를 복사해서 Codex 프롬프트에 붙여 넣으면, 파일 안에서 `00-common-context.md` 를 먼저 읽으라는 지시와 작업 상세가 모두 들어 있습니다.

### 권장 착수 순서
```
1차(동시 착수):  T1 · T2 · T3
2차:             T4 · T6
3차:             T5 · T7
```

파일 충돌 가능성이 낮은 조합부터 병렬로 돌리면 안전합니다.

### 오너 작업
- 각 Codex PR 수령 → `MERGE-CHECKLIST.md` 로 통합 점검
- 전체 통합 후 → `QA-SCENARIO.md` 로 D-Day 시나리오 리허설

---

## 참고 문서

- 분석 리포트: `C:\Users\WCHS\.claude\plans\crispy-mixing-kahan.md`
- 프로젝트 가이드: `/CLAUDE.md`
