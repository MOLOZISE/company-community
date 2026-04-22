import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { markProcessed } from './dedup.js';
import type { GeneratedPost, PostResult } from './types.js';

const supabase = createClient(
  config.NEXT_PUBLIC_SUPABASE_URL,
  config.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getBotToken(): Promise<string> {
  const now = Date.now() / 1000;
  if (cachedToken && cachedToken.expires_at > now + 60) {
    return cachedToken.access_token;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: config.BOT_EMAIL,
    password: config.BOT_PASSWORD,
  });

  if (error || !data.session) {
    throw new Error(`Bot 로그인 실패: ${error?.message ?? '세션 없음'}`);
  }

  cachedToken = {
    access_token: data.session.access_token,
    expires_at: data.session.expires_at ?? now + 3600,
  };

  return cachedToken.access_token;
}

interface TRPCResponse<T> {
  result?: { data: T };
  error?: { message: string; code: string };
}

async function callTRPC<T>(procedure: string, input: unknown, token: string): Promise<T> {
  const url = `${config.COMMUNITY_API_URL}/api/trpc/${procedure}`;
  const body = JSON.stringify({ json: input });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    signal: AbortSignal.timeout(15_000),
  });

  const data = (await response.json()) as TRPCResponse<T>;

  if (data.error) {
    throw new Error(`tRPC 오류 [${data.error.code}]: ${data.error.message}`);
  }
  if (!data.result) {
    throw new Error('tRPC 응답에 result 없음');
  }

  return data.result.data;
}

interface CreatedPost {
  id: string;
  title?: string;
}

export async function postToBoard(post: GeneratedPost, articleLink: string): Promise<PostResult> {
  try {
    const token = await getBotToken();

    const created = await callTRPC<CreatedPost>(
      'posts.create',
      {
        channelId: post.channelId,
        title: post.title,
        content: post.content,
        isAnonymous: post.isAnonymous,
        mediaUrls: [],
        flair: post.flair,
      },
      token
    );

    markProcessed(articleLink, created.id);
    console.log(`[Poster] 게시물 등록 완료 — id: ${created.id}`);

    return { success: true, postId: created.id, articleLink };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Poster] 등록 실패: ${msg}`);
    return { success: false, error: msg, articleLink };
  }
}

export async function postAll(posts: GeneratedPost[], articleLinks: string[]): Promise<PostResult[]> {
  const results: PostResult[] = [];
  for (let i = 0; i < posts.length; i++) {
    const result = await postToBoard(posts[i]!, articleLinks[i] ?? '');
    results.push(result);
    if (i < posts.length - 1) await new Promise((r) => setTimeout(r, 3000));
  }
  return results;
}
