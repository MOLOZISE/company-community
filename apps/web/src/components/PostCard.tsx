'use client';

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';
import { getFlairStyle, FLAIRS } from '@/lib/flair';
import { ConfirmDialog } from './ConfirmDialog';
import { Avatar } from './Avatar';
import { PollCard } from './PollCard';
import { HashtagText } from './HashtagText';
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
  kind: string | null;
  isPinned: boolean | null;
  createdAt: Date | string | null;
  hotScore?: string | number | null;
};

interface PostCardProps {
  post: Post;
  onDeleted?: () => void;
  isSaved?: boolean;
}

export function PostCard({ post, onDeleted, isSaved: isSavedProp }: PostCardProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const utils = trpc.useContext();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localSaved, setLocalSaved] = useState<boolean | null>(null);

  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      toast.success('게시글을 삭제했어요.');
      onDeleted?.();
    },
  });

  const savedFromQuery =
    trpc.saves.getIsSavedMap.useQuery({ postIds: [post.id] }, { enabled: !!user && isSavedProp === undefined }).data?.[
      post.id
    ] ?? false;

  const displayedSaved = localSaved ?? isSavedProp ?? savedFromQuery;

  useEffect(() => {
    setLocalSaved(null);
  }, [isSavedProp, savedFromQuery]);

  const toggleSaved = trpc.saves.toggle.useMutation({
    onMutate: async () => {
      if (!user) return { previous: displayedSaved };
      const next = !displayedSaved;
      setLocalSaved(next);
      return { previous: displayedSaved };
    },
    onSuccess: (result) => {
      setLocalSaved(null);
      toast.success(result.saved ? '북마크에 저장했어요.' : '북마크에서 제거했어요.');
      utils.saves.getIsSavedMap.invalidate();
      utils.saves.getMySaves.invalidate();
    },
    onError: (_error, _input, context) => {
      setLocalSaved(context?.previous ?? null);
      toast.error('북마크 처리에 실패했어요.');
    },
  });

  const isOwner = user?.id === post.authorId;
  const isAnon = post.isAnonymous;
  const authorLabel = isAnon ? post.anonAlias ?? '익명' : post.authorName ?? '멤버';
  const firstImage = post.mediaUrls?.[0];
  const flairLabel = FLAIRS.find((f) => f.value === post.flair)?.label;
  const hotScore = Number(post.hotScore ?? 0);
  const heat = Math.min(1, Math.max(0, hotScore / 12));
  const accent = isAnon ? '245, 158, 11' : '37, 99, 235';

  const cardStyle: CSSProperties = {
    backgroundImage: `linear-gradient(135deg, rgba(${accent}, ${0.08 + heat * 0.14}), rgba(255, 255, 255, ${
      isAnon ? 0.96 : 0.985
    }) 46%)`,
    boxShadow:
      heat > 0.5
        ? '0 18px 56px rgba(37, 99, 235, 0.12)'
        : '0 12px 36px rgba(15, 23, 42, 0.05)',
  };

  return (
    <article
      style={cardStyle}
      className={`group relative overflow-hidden rounded-[var(--cc-radius-card)] border p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:border-slate-300 ${
        post.isPinned ? 'border-blue-200' : isAnon ? 'border-amber-200' : 'border-slate-200'
      }`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, rgba(${accent}, ${0.2 + heat * 0.55}), rgba(${accent}, ${
            0.72 + heat * 0.22
          }))`,
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="게시글을 삭제할까요?"
        description="삭제한 게시글은 복구할 수 없어요."
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
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 ring-1 ring-amber-100">
                  <MaskIcon />
                  {authorLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">
                  <FaceIcon />
                  <Link href={`/users/${post.authorId}`} className="hover:text-blue-800">
                    {authorLabel}
                  </Link>
                </span>
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
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
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

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              if (!user) {
                router.push('/login');
                return;
              }
              toggleSaved.mutate({ postId: post.id });
            }}
            disabled={toggleSaved.isLoading}
            aria-pressed={displayedSaved}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors ${
              displayedSaved
                ? 'bg-amber-50 text-amber-700 ring-amber-100 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {displayedSaved ? '저장됨' : '북마크'}
          </button>

          {isOwner && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      <div className="group block">
        {post.title && (
          <Link href={`/posts/${post.id}`} className="block">
            <h3 className="mb-1 text-base font-semibold leading-6 text-slate-950 group-hover:text-blue-600">
              {post.title}
            </h3>
          </Link>
        )}
        <HashtagText text={post.content} className="block line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-slate-600" />

        {firstImage && (
          <Link href={`/posts/${post.id}`} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={firstImage}
              alt=""
              loading="lazy"
              className="mt-3 aspect-[16/9] max-h-64 w-full rounded-lg object-cover"
            />
          </Link>
        )}
      </div>

      {post.kind === 'poll' && <PollCard postId={post.id} />}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Metric label="추천" value={post.upvoteCount ?? 0} />
        <Metric label="댓글" value={post.commentCount ?? 0} strong={(post.commentCount ?? 0) > 0} />
        <Metric label="조회" value={post.viewCount ?? 0} />
        <Metric label="hot" value={Math.round(hotScore * 10) / 10} strong={heat > 0.4} />
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

function MaskIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5c1.2-2.6 4-4 5.5-4s4.3 1.4 5.5 4c-.1 4.2-2.2 7.8-5.5 9-3.3-1.2-5.4-4.8-5.5-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 10h.01M13 10h.01" />
    </svg>
  );
}

function FaceIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 17c3.5 0 6-2.8 6-6.5S13.5 4 10 4 4 6.8 4 10.5 6.5 17 10 17Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9.4h.01M12.5 9.4h.01M8 12.1c1.1.8 2.8.8 4 0" />
    </svg>
  );
}
