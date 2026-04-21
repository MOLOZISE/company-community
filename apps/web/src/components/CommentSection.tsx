'use client';

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { VoteButton } from './VoteButton';
import { ConfirmDialog } from './ConfirmDialog';
import { CommentSkeleton } from './Skeleton';
import { relativeTime } from '@/lib/time';
import { supabase } from '@/lib/supabase';
import { toast } from '@/store/toast';
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
      toast.success('댓글이 삭제되었습니다.');
    },
  });

  const updateComment = trpc.comments.update.useMutation({
    onSuccess: () => {
      utils.comments.getByPost.invalidate({ postId });
      setEditing(false);
      toast.success('댓글이 수정되었습니다.');
    },
  });

  const createReply = trpc.comments.create.useMutation({
    onSuccess: () => {
      setReplyText('');
      setReplying(false);
      utils.comments.getByPost.invalidate({ postId });
      toast.success('답글이 등록되었습니다.');
    },
  });

  const authorLabel = comment.isAnonymous ? '익명' : '멤버';
  const isOwner = user?.id === comment.authorId;

  function startEdit() {
    setEditText(comment.content);
    setEditing(true);
  }

  return (
    <div className={isReply ? 'ml-4 sm:ml-8 border-l-2 border-slate-100 pl-3 sm:pl-4' : ''}>
      <ConfirmDialog
        open={confirmDelete}
        title="댓글을 삭제하시겠어요?"
        description="삭제된 댓글은 복구할 수 없습니다."
        confirmLabel="삭제"
        destructive
        onConfirm={() => {
          setConfirmDelete(false);
          deleteComment.mutate({ id: comment.id });
        }}
        onCancel={() => setConfirmDelete(false)}
      />

      <div className="py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-slate-700">{authorLabel}</span>
          <span className="text-xs text-slate-400">{relativeTime(comment.createdAt)}</span>
          {isOwner && !editing && (
            <div className="flex gap-2 ml-auto">
              <button onClick={startEdit} className="text-xs text-slate-300 hover:text-blue-400" aria-label="댓글 수정">수정</button>
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-slate-300 hover:text-red-400" aria-label="댓글 삭제">삭제</button>
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
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${editText.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                {editText.length}/{MAX_COMMENT}
              </span>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">취소</button>
                <button
                  onClick={() => updateComment.mutate({ id: comment.id, content: editText.trim() })}
                  disabled={!editText.trim() || updateComment.isLoading}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
        )}

        {!editing && (
          <div className="flex items-center gap-3 mt-2">
            <VoteButton
              targetType="comment"
              targetId={comment.id}
              upvoteCount={comment.upvoteCount ?? 0}
              currentVote={myVotes[comment.id] ?? null}
            />
            {!isReply && (
              <button
                onClick={() => setReplying(!replying)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
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
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replyAnon}
                  onChange={(e) => setReplyAnon(e.target.checked)}
                  className="w-3 h-3"
                />
                익명
              </label>
              <span className={`text-xs ${replyText.length > MAX_COMMENT * 0.9 ? 'text-red-400' : 'text-slate-400'}`}>
                {replyText.length}/{MAX_COMMENT}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setReplying(false)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
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
                className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
  const utils = trpc.useContext();

  const { data: commentTree, isLoading } = trpc.comments.getByPost.useQuery({ postId });

  useEffect(() => {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => utils.comments.getByPost.invalidate({ postId })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId, utils.comments.getByPost]);

  const allCommentIds = commentTree
    ? commentTree.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)])
    : [];

  const { data: myVotes = {} } = trpc.votes.getMyVotesForComments.useQuery(
    { commentIds: allCommentIds },
    { enabled: !!user && allCommentIds.length > 0 }
  );

  const createComment = trpc.comments.create.useMutation({
    onSuccess: () => {
      setText('');
      utils.comments.getByPost.invalidate({ postId });
      toast.success('댓글이 등록되었습니다.');
    },
  });

  return (
    <div className="mt-6 pt-6 border-t border-slate-100">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">댓글 {commentCount}</h2>

      {user ? (
        <div className="mb-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_COMMENT))}
            placeholder="댓글을 입력하세요..."
            rows={3}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnon}
                  onChange={(e) => setIsAnon(e.target.checked)}
                  className="w-3.5 h-3.5"
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
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              댓글 등록
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 mb-6">댓글을 작성하려면 로그인하세요.</p>
      )}

      {isLoading ? (
        <div className="space-y-1 divide-y divide-slate-50">
          {Array.from({ length: 3 }).map((_, i) => <CommentSkeleton key={i} />)}
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
    </div>
  );
}
