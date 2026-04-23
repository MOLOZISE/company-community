'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Avatar } from './Avatar';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { VoteButton } from './VoteButton';
import { ConfirmDialog } from './ConfirmDialog';
import { CommentSkeleton } from './Skeleton';
import { relativeTime } from '@/lib/time';
import { toast } from '@/store/toast';
import { useRealtimeComments } from '@/hooks/useRealtimeComments';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/api';

type RouterOutput = inferRouterOutputs<AppRouter>;
type CommentWithReplies = RouterOutput['comments']['getByPost'][number];
type Reply = CommentWithReplies['replies'][number];

const MAX_COMMENT = 3000;

interface CommentItemProps {
  comment: CommentWithReplies | Reply;
  postId: string;
  myVotes: Record<string, 'up' | 'down'>;
  isReply?: boolean;
}

function CommentItem({ comment, postId, myVotes, isReply = false }: CommentItemProps) {
  const { user } = useAuthStore();
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useContext();

  useEffect(() => {
    if (replying) {
      replyRef.current?.focus();
      replyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [replying]);

  useEffect(() => {
    if (editing) {
      editRef.current?.focus();
      editRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [editing]);

  const deleteComment = trpc.comments.delete.useMutation({
    onSuccess: () => {
      utils.comments.getByPost.invalidate({ postId });
      toast.success('댓글이 삭제되었어요.');
    },
  });

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      utils.comments.getByPost.invalidate({ postId });
      setEditing(false);
      toast.success('댓글이 수정되었어요.');
    },
  });

  const createReply = trpc.comments.create.useMutation({
    onSuccess: () => {
      setReplyText('');
      setReplying(false);
      utils.comments.getByPost.invalidate({ postId });
      toast.success('답글이 등록되었어요.');
    },
  });

  const isOwner = user?.id === comment.authorId;
  const isAnon = comment.isAnonymous;
  const anonLabel = comment.anonNumber === 0 ? '글쓴이' : comment.anonNumber != null ? `익명${comment.anonNumber}` : '익명';
  const authorLabel = isAnon ? anonLabel : comment.authorName ?? '멤버';

  return (
    <div className={isReply ? 'ml-4 border-l-2 border-slate-100 pl-3 sm:ml-8 sm:pl-4' : ''}>
      <ConfirmDialog
        open={confirmDelete}
        title="댓글을 삭제할까요?"
        description="삭제한 댓글은 복구할 수 없어요."
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deleteComment.mutate({ id: comment.id });
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="py-3">
        <div className="mb-1 flex items-center gap-2">
          <Avatar src={comment.authorAvatar} name={authorLabel} isAnon={!!isAnon} size="sm" />
          {isAnon ? (
            <span
              className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                comment.anonNumber === 0 ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {authorLabel}
            </span>
          ) : (
            <Link href={`/users/${comment.authorId}`} prefetch={false} className="text-xs font-medium text-slate-700 hover:text-blue-600">
              {authorLabel}
            </Link>
          )}
          <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
          {isOwner && !editing && (
            <div className="ml-auto flex gap-2">
              <button onClick={() => { setEditText(comment.content); setEditing(true); }} className="text-xs text-slate-300 hover:text-blue-400" aria-label="댓글 수정">
                수정
              </button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-300 hover:text-red-400" aria-label="댓글 삭제">
                삭제
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <div>
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value.slice(0, MAX_COMMENT))}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="mt-1 flex items-center justify-between">
              <span className={`text-xs ${editText.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                {editText.length}/{MAX_COMMENT}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600">
                  취소
                </button>
                <button
                  onClick={() => updateComment.mutate({ id: comment.id, content: editText.trim() })}
                  disabled={!editText.trim() || updateComment.isLoading}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-700">{comment.content}</p>
        )}

        {!editing && (
          <div className="mt-2 flex items-center gap-3">
            <VoteButton
              targetType="comment"
              targetId={comment.id}
              upvoteCount={comment.upvoteCount ?? 0}
              currentVote={myVotes[comment.id] ?? null}
            />
            {!isReply && (
              <button onClick={() => setReplying((current) => !current)} className="text-xs text-slate-400 hover:text-slate-600">
                답글
              </button>
            )}
          </div>
        )}
      </div>

      {replying && (
        <div className="mb-3 ml-2">
          <textarea
            ref={replyRef}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="답글을 입력하세요..."
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="mt-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={replyAnon}
                  onChange={(e) => setReplyAnon(e.target.checked)}
                  className="h-3 w-3"
                />
                익명
              </label>
              <span className={`text-xs ${replyText.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                {replyText.length}/{MAX_COMMENT}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setReplying(false)} className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600">
                취소
              </button>
              <button
                onClick={() =>
                  createReply.mutate({
                    postId,
                    parentId: comment.id,
                    content: replyText,
                    isAnonymous: replyAnon,
                  })
                }
                disabled={!replyText.trim() || createReply.isLoading}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CommentSectionProps {
  postId: string;
  commentCount: number;
}

export function CommentSection({ postId, commentCount }: CommentSectionProps) {
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const [isAnon, setIsAnon] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useContext();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldLoad(true);
      },
      { rootMargin: '200px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const { data: commentTree, isLoading } = trpc.comments.getByPost.useQuery({ postId }, { enabled: shouldLoad });
  useRealtimeComments(postId, shouldLoad);

  const allCommentIds = commentTree ? commentTree.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]) : [];

  const { data: myVotes = {} } = trpc.votes.getMyVotesForComments.useQuery(
    { commentIds: allCommentIds },
    { enabled: !!user && shouldLoad && allCommentIds.length > 0 }
  );

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setText('');
      utils.comments.getByPost.invalidate({ postId });
      toast.success('댓글이 등록되었어요.');
    },
  });

  return (
    <div ref={sectionRef} className="mt-6 border-t border-slate-100 pt-6">
      <h2 className="mb-4 text-sm font-semibold text-slate-700">댓글 {commentCount}</h2>

      {!shouldLoad ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          댓글은 아래로 내려가면 불러옵니다.
        </div>
      ) : (
        <>
          {user ? (
            <div className="mb-6">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT))}
                placeholder="댓글을 입력하세요..."
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={isAnon}
                      onChange={(e) => setIsAnon(e.target.checked)}
                      className="h-3.5 w-3.5"
                    />
                    익명으로 작성
                  </label>
                  <span className={`text-xs ${text.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                    {text.length}/{MAX_COMMENT}
                  </span>
                </div>
                <button
                  onClick={() => createComment.mutate({ postId, content: text, isAnonymous: isAnon })}
                  disabled={!text.trim() || createComment.isLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  댓글 등록
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-6 text-sm text-slate-400">댓글을 작성하려면 로그인하세요.</p>
          )}

          {isLoading ? (
            <div className="space-y-1 divide-y divide-slate-50">
              {Array.from({ length: 3 }).map((_, i) => (
                <CommentSkeleton key={i} />
              ))}
            </div>
          ) : commentTree?.length === 0 ? (
            <div className="text-sm text-slate-400">첫 번째 댓글을 남겨보세요.</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {commentTree?.map((comment) => (
                <div key={comment.id}>
                  <CommentItem comment={comment} postId={postId} myVotes={myVotes} />
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} postId={postId} myVotes={myVotes} isReply />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
