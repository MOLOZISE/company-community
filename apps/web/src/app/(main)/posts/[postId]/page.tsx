'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { VoteButton } from '@/components/VoteButton';
import { CommentSection } from '@/components/CommentSection';
import { relativeTime } from '@/lib/time';

export default function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: post, isLoading } = trpc.posts.getById.useQuery({ id: postId });
  const incrementView = trpc.posts.incrementViewCount.useMutation();
  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => router.push('/feed'),
  });

  const myVoteQuery = trpc.votes.getMyVote.useQuery(
    { targetType: 'post', targetId: postId },
    { enabled: !!user }
  );

  useEffect(() => {
    if (postId) incrementView.mutate({ id: postId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  if (isLoading) {
    return <div className="text-slate-400 text-sm py-8 text-center">불러오는 중...</div>;
  }

  if (!post) {
    return <div className="text-slate-400 text-sm py-8 text-center">게시물을 찾을 수 없습니다.</div>;
  }

  const isOwner = user?.id === post.authorId;
  const authorLabel = post.isAnonymous ? post.anonAlias ?? '익명' : '멤버';

  return (
    <article className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <span className="font-medium text-slate-800">{authorLabel}</span>
            {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
          </div>
          {post.title && (
            <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => deletePost.mutate({ id: post.id })}
            disabled={deletePost.isLoading}
            className="text-sm text-slate-400 hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>

      <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{post.content}</p>

      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.mediaUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" loading="lazy" className="rounded-lg max-w-full" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
        <VoteButton
          targetType="post"
          targetId={post.id}
          upvoteCount={post.upvoteCount ?? 0}
          downvoteCount={post.downvoteCount ?? 0}
          currentVote={(myVoteQuery.data as 'up' | 'down' | null) ?? null}
        />
        <span className="text-sm text-slate-400">💬 {post.commentCount ?? 0}</span>
        <span className="text-sm text-slate-400">👁 {post.viewCount ?? 0}</span>
      </div>

      <CommentSection postId={postId} commentCount={post.commentCount ?? 0} />
    </article>
  );
}
