# TASK 03 — LM Studio 연동 게시물 생성기

> **Codex 실행 태스크.** TASK 02 완료 후 실행.
> LM Studio API를 호출해 크롤링된 기사를 사내 게시판 게시물로 변환.

## 목표

- `RawArticle` → `GeneratedPost` 변환
- LM Studio `/v1/chat/completions` 호출
- 한국어 게시물 생성 (제목, 본문, flair 포함)
- LM Studio 오프라인 시 graceful fallback

---

## Step 1. generator.ts 생성

**파일:** `apps/bot/src/generator.ts`

```typescript
import { config } from './config.js';
import type { RawArticle, GeneratedPost } from './types.js';

interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LMStudioResponse {
  choices: Array<{
    message: { content: string };
    finish_reason: string;
  }>;
}

const SYSTEM_PROMPT = `당신은 사내 커뮤니티 게시판의 콘텐츠 큐레이터입니다.
외부 뉴스/기사를 사내 직원들에게 유용한 게시물로 변환하는 역할을 합니다.

규칙:
1. 제목: 30자 이내, 핵심 내용 요약, 한국어
2. 본문: 200~500자. 기사 핵심 내용 + 사내 직원 관점에서의 시사점 1~2문장 추가
3. flair: 아래 중 하나만 선택 (영문)
   - "뉴스" (일반 뉴스)
   - "기술" (기술/개발 관련)
   - "업계동향" (산업 트렌드)
   - "속보" (긴급/중요 뉴스)
4. JSON만 반환. 마크다운 코드블록 없이 순수 JSON

반환 형식:
{"title":"제목","content":"본문 내용","flair":"뉴스"}`;

async function callLMStudio(messages: LMStudioMessage[]): Promise<string> {
  const response = await fetch(`${config.LMSTUDIO_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.LMSTUDIO_MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.7,
      stream: false,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`LM Studio HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as LMStudioResponse;
  return data.choices[0]?.message?.content ?? '';
}

function parseGeneratedContent(
  raw: string,
  article: RawArticle
): Pick<GeneratedPost, 'title' | 'content' | 'flair'> {
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { title?: string; content?: string; flair?: string };
    return {
      title: (parsed.title ?? article.title).slice(0, 300),
      content: (parsed.content ?? article.summary).slice(0, 5000),
      flair: parsed.flair ?? '뉴스',
    };
  } catch {
    // JSON 파싱 실패 시 원문 기사 정보 사용
    return {
      title: article.title.slice(0, 300),
      content: `📰 **${article.source}** 뉴스\n\n${article.summary}\n\n[원문 보기](${article.link})`,
      flair: '뉴스',
    };
  }
}

export async function generatePost(article: RawArticle): Promise<GeneratedPost | null> {
  const userPrompt = `다음 기사를 사내 게시판 게시물로 변환해주세요.

출처: ${article.source}
제목: ${article.title}
내용 요약: ${article.summary}
원문 링크: ${article.link}`;

  try {
    const raw = await callLMStudio([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]);

    const { title, content, flair } = parseGeneratedContent(raw, article);

    // 원문 링크를 본문 끝에 추가
    const contentWithLink = `${content}\n\n---\n📎 출처: [${article.source}](${article.link})`;

    return {
      title,
      content: contentWithLink.slice(0, 10000),
      flair,
      channelId: article.channelId,
      isAnonymous: false,
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      console.error('[Generator] LM Studio 타임아웃 (60s)');
    } else if (err instanceof Error && err.message.includes('ECONNREFUSED')) {
      console.error('[Generator] LM Studio 서버 오프라인 — 스킵');
    } else {
      console.error('[Generator] 생성 오류:', err instanceof Error ? err.message : err);
    }
    return null;
  }
}

export async function generatePosts(articles: RawArticle[]): Promise<GeneratedPost[]> {
  const posts: GeneratedPost[] = [];
  for (const article of articles) {
    console.log(`[Generator] 생성 중: "${article.title.slice(0, 50)}..."`);
    const post = await generatePost(article);
    if (post) {
      posts.push(post);
      console.log(`[Generator] 완료: "${post.title}"`);
    }
    // LM Studio 과부하 방지 — 기사당 2초 간격
    await new Promise((r) => setTimeout(r, 2000));
  }
  return posts;
}
```

---

## Step 2. index.ts에 생성기 테스트 코드 추가

TASK 03 완료 후 `apps/bot/src/index.ts`를 다음으로 교체:

```typescript
import 'dotenv/config';
import { config } from './config.js';
import { crawlAll } from './crawler.js';
import { generatePosts } from './generator.js';

async function main() {
  console.log(`[Bot] LM Studio: ${config.LMSTUDIO_BASE_URL} / ${config.LMSTUDIO_MODEL}`);

  console.log('\n[Bot] 크롤링...');
  const articles = await crawlAll();
  console.log(`[Bot] 크롤링 완료: ${articles.length}개`);

  if (articles.length === 0) {
    console.log('[Bot] 새 기사 없음 — 종료');
    return;
  }

  // 테스트: 1개만 생성
  console.log('\n[Bot] LM Studio 게시물 생성 테스트...');
  const posts = await generatePosts(articles.slice(0, 1));
  for (const p of posts) {
    console.log('\n=== 생성된 게시물 ===');
    console.log('제목:', p.title);
    console.log('채널:', p.channelId);
    console.log('flair:', p.flair);
    console.log('본문:\n', p.content);
  }
}

main().catch((err) => {
  console.error('[Bot] 치명적 오류:', err);
  process.exit(1);
});
```

---

## 완료 검증

```bash
# LM Studio가 실행 중이어야 함 (포트 1218, google/gemma-4-e4b 로드)
pnpm --filter bot dev

# 예상 출력:
# [Generator] 생성 중: "Show HN: I built a..."
# [Generator] 완료: "HN 인기글: 개인 프로젝트로 만든..."
#
# === 생성된 게시물 ===
# 제목: HN 인기글: 개인 프로젝트로 만든 X
# 채널: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
# flair: 기술
# 본문: ...
```

---

## 모델 선택 가이드

| 모델 | 속도 | 한국어 품질 | 권장 용도 |
|------|------|------------|---------|
| `google/gemma-4-e4b` | 빠름 | 양호 | 기본값, 일반 뉴스 |
| `eeve-korean-10.8b-raft` | 중간 | 우수 | 한국어 뉴스 전용 |
| `deepseek-r1-distill-qwen-14b` | 느림 | 우수 | 심층 분석 게시물 |

`.env.local`의 `LMSTUDIO_MODEL`을 바꿔서 선택.
