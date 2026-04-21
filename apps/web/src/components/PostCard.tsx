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
  channelName?: string | null;
  channelSlug?: string | null;
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
  const authorLabel = isAnon ? post.anonAlias ?? '익명 동료' : post.authorName ?? '멤버';
  const firstImage = post.mediaUrls?.[0];
  const flairLabel = FLAIRS.find((f) => f.value === post.flair)?.label;

  return (
    <article
      className={`rounded-lg border bg-white p-4 transition-colors hover:border-slate-300 ${
        post.isPinned ? 'border-blue-200 bg-blue-50/40' : 'border-slate-200'
      }`}
    >
      <ConfirmDialog
        open={confirmDelete}
        title="게시물을 삭제할까요?"
        description="삭제한 게시물은 되돌릴 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deletePost.mutate({ id: post.id });
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
          <Avatar src={post.authorAvatar} name={authorLabel} isAnon={!!isAnon} size="md" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {isAnon ? (
                <span className="font-semibold text-slate-800">{authorLabel}</span>
              ) : (
                <Link href={`/users/${post.authorId}`} className="font-semibold text-slate-800 hover:text-blue-600">
                  {authorLabel}
                </Link>
              )}
              {post.channelName && <span className="text-slate-400">#{post.channelName}</span>}
              {post.createdAt && <span className="text-slate-400">{relativeTime(post.createdAt)}</span>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {post.isPinned && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  고정글
                </span>
              )}
              {isAnon && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  익명
                </span>
              )}
              {flairLabel && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getFlairStyle(post.flair)}`}>
                  {flairLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {isOwner && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            삭제
          </button>
        )}
      </div>

      <Link href={`/posts/${post.id}`} className="block group">
        {post.title && (
          <h3 className="mb-1 text-base font-semibold leading-6 text-slate-950 group-hover:text-blue-600">
            {post.title}
          </h3>
        )}
        <p className="text-sm leading-6 text-slate-600 line-clamp-3">{post.content}</p>

        {firstImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstImage}
            alt=""
            loading="lazy"
            className="mt-3 aspect-[16/9] max-h-64 w-full rounded-lg object-cover"
          />
        )}
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Metric label="추천" value={post.upvoteCount ?? 0} />
        <Metric label="댓글" value={post.commentCount ?? 0} strong={(post.commentCount ?? 0) > 0} />
        <Metric label="조회" value={post.viewCount ?? 0} />
      </div>
    </article>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 ring-1 ${
        strong ? 'bg-blue-50 text-blue-700 ring-blue-100' : 'bg-slate-50 text-slate-500 ring-slate-100'
      }`}
    >
      {label} {value}
    </span>
  );
}
