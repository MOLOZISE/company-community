'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';
import { getFlairStyle, FLAIRS } from '@/lib/flair';
import { ConfirmDialog } from './ConfirmDialog';
import { Avatar } from './Avatar';
import { toast } from '@/store/toast';

type Post = {
  id: string;
  title: string | null;
  content: string;
  isAnonymous: boolean | null;
  anonAlias: string | null;
  authorId: string;
  authorName: string | null;
  authorAvatar: string | null;
  upvoteCount: number | null;
  commentCount: number | null;
  viewCount: number | null;
  mediaUrls: string[] | null;
  flair: string | null;
  isPinned: boolean | null;
  createdAt: Date | string | null;
};

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
}

export function PostCard({ post, onDeleted }: PostCardProps) {
  const { user } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success('게시물이 삭제되었습니다.');
      onDeleted?.();
    },
  });

  const isOwner = user?.id === post.authorId;
  const isAnon = post.isAnonymous;
  const authorLabel = isAnon ? post.anonAlias ?? '익명' : (post.authorName ?? '멤버');
  const firstImage = post.mediaUrls?.[0];
  const flairLabel = FLAIRS.find((f) => f.value === post.flair)?.label;

  return (
    <article className={`bg-white rounded-xl border p-4 hover:border-slate-300 transition-colors ${post.isPinned ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'}`}>
      <ConfirmDialog
        open={confirmDelete}
        title="게시물을 삭제하시겠어요?"
        description="삭제된 게시물은 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => { setConfirmDelete(false); deletePost.mutate({ id: post.id }); }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          {post.isPinned && <span className="text-blue-500 font-medium">📌</span>}
          <Avatar src={post.authorAvatar} name={authorLabel} isAnon={!!isAnon} size="sm" />
          {isAnon ? (
            <span className="font-medium text-slate-700">{authorLabel}</span>
          ) : (
            <Link href={`/users/${post.authorId}`} className="font-medium text-slate-700 hover:text-blue-600">
              {authorLabel}
            </Link>
          )}
          {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
          {flairLabel && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFlairStyle(post.flair)}`}>
              {flairLabel}
            </span>
          )}
        </div>
        {isOwner && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-slate-400 hover:text-red-500 shrink-0"
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
