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
    await new Promise((r) => setTimeout(r, 2000));
  }
  return posts;
}
