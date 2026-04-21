'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';

type Post = {
  id: string;
  title: string | null;
  content: string;
  isAnonymous: boolean | null;
  anonAlias: string | null;
  authorId: string;
  upvoteCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  mediaUrls: string[] | null;
  createdAt: Date | string | null;
};

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const { user } = useAuthStore();
  const deletePost = trpc.posts.delete.useMutation({ onSuccess: onDeleted });

  const isOwner = user?.id === post.authorId;
  const authorLabel = post.isAnonymous ? post.anonAlias ?? '익명' : '멤버';
  const firstImage = post.mediaUrls?.[0];

  return (
    <article className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{authorLabel}</span>
          {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
        </div>
        {isOwner && (
          <button
            onClick={() => deletePost.mutate({ id: post.id })}
            disabled={deletePost.isLoading}
            className="text-xs text-slate-400 hover:text-red-500"
          >
            삭제
          </button>
        )}
      </div>

      <Link href={`/posts/${post.id}`} className="block group">
        {post.title && (
          <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-blue-600">
            {post.title}
          </h3>
        )}
        <p className="text-sm text-slate-600 line-clamp-3">{post.content}</p>

        {firstImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt=""
            loading="lazy"
            className="mt-3 max-h-48 rounded-lg object-cover w-full"
          />
        )}
      </Link>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <span>↑ {post.upvoteCount ?? 0}</span>
        <span>💬 {post.commentCount ?? 0}</span>
        <span>👁 {post.viewCount ?? 0}</span>
      </div>
    </article>
  );
}
