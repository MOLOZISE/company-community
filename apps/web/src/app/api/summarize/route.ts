import { NextResponse } from 'next/server';
import { db, posts } from '@repo/db';
import { eq } from 'drizzle-orm';

const summaryCache = new Map<string, string>();
const HAS_ANTHROPIC_KEY = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = 'claude-haiku-4-5-20251001';

export async function GET() {
  return NextResponse.json({ available: HAS_ANTHROPIC_KEY });
}

export async function POST(request: Request) {
  if (!HAS_ANTHROPIC_KEY) {
    return NextResponse.json({ error: 'Anthropic API key is not configured' }, { status: 501 });
  }

  const body = (await request.json().catch(() => null)) as { postId?: string } | null;
  const postId = body?.postId?.trim();
  if (!postId) {
    return NextResponse.json({ error: 'postId is required' }, { status: 400 });
  }

  const cached = summaryCache.get(postId);
  if (cached) {
    return NextResponse.json({ summary: cached });
  }

  const [post] = await db
    .select({ id: posts.id, title: posts.title, content: posts.content })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (process.env.ANTHROPIC_API_KEY) {
    headers['x-api-key'] = process.env.ANTHROPIC_API_KEY;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      temperature: 0.2,
      system: 'You summarize community posts in Korean. Be concise and useful.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `다음 게시글을 한국어 3줄로 요약해주세요. 각 줄은 불릿으로 시작하세요.\n\n제목: ${post.title ?? '제목 없음'}\n\n본문:\n${post.content}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Anthropic request failed with status ${response.status}` },
      { status: 502 }
    );
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const summary = data.content?.map((item) => item.text ?? '').join('\n').trim() || '요약을 생성하지 못했습니다.';
  summaryCache.set(postId, summary);

  return NextResponse.json({ summary });
}
