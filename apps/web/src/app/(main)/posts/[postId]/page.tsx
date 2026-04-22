'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { VoteButton } from '@/components/VoteButton';
import { CommentSection } from '@/components/CommentSection';
import { ReportButton } from '@/components/ReportButton';
import { ReactionBar } from '@/components/ReactionBar';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Avatar } from '@/components/Avatar';
import { PollCard } from '@/components/PollCard';
import { HashtagText } from '@/components/HashtagText';
import { relativeTime } from '@/lib/time';
import { getFlairStyle, FLAIRS } from '@/lib/flair';
import { toast } from '@/store/toast';

const MAX_TITLE = 300;
const MAX_CONTENT = 10000;
const SUMMARY_THRESHOLD = 500;

export default function PostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = use(params);
  const router = useRouter();
  const { user } = useAuthStore();
  const utils = trpc.useContext();

  const { data: post, isLoading } = trpc.posts.getById.useQuery({ id: postId });
  const incrementView = trpc.posts.incrementViewCount.useMutation();
  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => { toast.success('게시물이 삭제되었습니다.'); router.push('/feed'); },
  });
  const updatePost = trpc.posts.update.useMutation({
    onSuccess: () => {
      utils.posts.getById.invalidate({ id: postId });
      setEditing(false);
      toast.success('게시물이 수정되었습니다.');
    },
  });

  const myVoteQuery = trpc.votes.getMyVote.useQuery(
    { targetType: 'post', targetId: postId },
    { enabled: !!user }
  );

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFlair, setEditFlair] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [summaryAvailable, setSummaryAvailable] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryError, setSummaryError] = useState('');

  useEffect(() => {
    if (postId) incrementView.mutate({ id: postId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  useEffect(() => {
    let cancelled = false;

    async function checkSummaryAvailability() {
      if (!post || post.content.length < SUMMARY_THRESHOLD) {
        setSummaryAvailable(false);
        setSummary('');
        setSummaryError('');
        setSummaryLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/summarize');
        const data = (await response.json()) as { available?: boolean };
        if (!cancelled) {
          setSummaryAvailable(Boolean(data.available));
        }
      } catch {
        if (!cancelled) {
          setSummaryAvailable(false);
        }
      }
    }

    void checkSummaryAvailability();
    return () => {
      cancelled = true;
    };
  }, [post]);

  function startEdit() {
    if (!post) return;
    setEditTitle(post.title ?? '');
    setEditContent(post.content);
    setEditFlair(post.flair ?? '');
    setEditing(true);
  }

  async function handleSummarize() {
    if (!post || summaryLoading || summary) return;
    setSummaryLoading(true);
    setSummaryError('');

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      });
      const data = (await response.json()) as { summary?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || '요약 생성에 실패했습니다.');
      }

      setSummary(data.summary ?? '');
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : '요약 생성에 실패했습니다.');
    } finally {
      setSummaryLoading(false);
    }
  }

  if (isLoading) {
    return <div className="text-slate-400 text-sm py-8 text-center">불러오는 중...</div>;
  }

  if (!post) {
    return <div className="text-slate-400 text-sm py-8 text-center">게시물을 찾을 수 없습니다.</div>;
  }

  const isOwner = user?.id === post.authorId;
  const isAnon = post.isAnonymous;
  const authorLabel = isAnon ? post.anonAlias ?? '익명' : (post.authorName ?? '멤버');
  const flairLabel = FLAIRS.find((f) => f.value === post.flair)?.label;

  return (
    <article className="bg-white rounded-xl border border-slate-200 p-6">
      <ConfirmDialog
        open={confirmDelete}
        title="게시물을 삭제하시겠어요?"
        description="삭제된 게시물은 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => { setConfirmDelete(false); deletePost.mutate({ id: post.id }); }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2 flex-wrap">
            <Avatar src={post.authorAvatar} name={authorLabel} isAnon={!!isAnon} size="md" />
            {isAnon ? (
              <span className="font-medium text-slate-800">{authorLabel}</span>
            ) : (
              <Link href={`/users/${post.authorId}`} className="font-medium text-slate-800 hover:text-blue-600">
                {authorLabel}
              </Link>
            )}
            {post.createdAt && <span>{relativeTime(post.createdAt)}</span>}
            {flairLabel && !editing && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getFlairStyle(post.flair)}`}>
                {flairLabel}
              </span>
            )}
          </div>
          {!editing && post.title && (
            <h1 className="text-2xl font-bold text-slate-900">{post.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          {!isOwner && <ReportButton targetType="post" targetId={post.id} />}
          {isOwner && !editing && (
            <>
              <button onClick={startEdit} className="text-sm text-slate-400 hover:text-blue-500">수정</button>
              <button onClick={() => setConfirmDelete(true)} className="text-sm text-slate-400 hover:text-red-500">삭제</button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          {/* Flair picker */}
          <div className="flex flex-wrap gap-1.5">
            {FLAIRS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setEditFlair(editFlair === f.value ? '' : f.value)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  editFlair === f.value ? f.color + ' border-transparent' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="제목 (선택)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {editTitle.length > MAX_TITLE * 0.8 && (
              <p className={`text-xs mt-0.5 text-right ${editTitle.length >= MAX_TITLE ? 'text-red-400' : 'text-slate-400'}`}>
                {editTitle.length}/{MAX_TITLE}
              </p>
            )}
          </div>
          <div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, MAX_CONTENT))}
              rows={8}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className={`text-xs mt-0.5 text-right ${editContent.length > MAX_CONTENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
              {editContent.length}/{MAX_CONTENT}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button
              onClick={() => updatePost.mutate({ id: post.id, title: editTitle.trim() || undefined, content: editContent.trim(), flair: editFlair || null })}
              disabled={!editContent.trim() || updatePost.isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      ) : (
        <HashtagText
          text={post.content}
          className="block whitespace-pre-wrap leading-relaxed text-slate-700"
        />
      )}

      {!editing && summaryAvailable && post.content.length >= SUMMARY_THRESHOLD && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">AI Summary</p>
              <h2 className="mt-1 text-sm font-semibold text-slate-900">3줄 요약</h2>
            </div>
            <button
              type="button"
              onClick={handleSummarize}
              disabled={summaryLoading}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {summary ? '다시 요약' : summaryLoading ? '요약 중...' : '3줄 요약'}
            </button>
          </div>

          <div className="mt-3 min-h-20 rounded-lg bg-white p-4 text-sm leading-6 text-slate-700">
            {summaryLoading ? (
              <div className="space-y-2">
                <div className="h-3 w-11/12 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200" />
              </div>
            ) : summary ? (
              <p className="whitespace-pre-wrap">{summary}</p>
            ) : summaryError ? (
              <p className="text-sm text-red-600">{summaryError}</p>
            ) : (
              <p className="text-slate-500">게시글을 빠르게 읽을 수 있도록 핵심만 요약해 드려요.</p>
            )}
          </div>
        </div>
      )}

      {!editing && post.kind === 'poll' && <PollCard postId={post.id} />}

      {!editing && post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className="mt-4 space-y-2">
          {post.mediaUrls.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" loading="lazy" className="rounded-lg max-w-full" />
          ))}
        </div>
      )}

      {!editing && (
        <>
          <ReactionBar postId={postId} />

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
        </>
      )}

      <CommentSection postId={postId} commentCount={post.commentCount ?? 0} />
    </article>
  );
}
