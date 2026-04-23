'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@repo/api';

type RouterOutput = inferRouterOutputs<AppRouter>;
type CommentTree = RouterOutput['comments']['getByPost'];
type TopComment = CommentTree[number];
type ReplyNode = TopComment['replies'][number];
type RealtimeComment = Omit<TopComment, 'replies'>;

function toReplyNode(next: RealtimeComment): ReplyNode {
  return next as ReplyNode;
}

function insertComment(tree: TopComment[], next: RealtimeComment): TopComment[] {
  if (tree.some((item) => item.id === next.id)) {
    return tree;
  }

  if (!next.parentId) {
    return [{ ...next, replies: [] }, ...tree];
  }

  return tree.map((item) => {
    if (item.id !== next.parentId) return item;
    if (item.replies.some((reply) => reply.id === next.id)) return item;
    return { ...item, replies: [toReplyNode(next), ...item.replies] };
  });
}

export function useRealtimeComments(postId: string | null | undefined, enabled = true) {
  const utils = trpc.useContext();

  useEffect(() => {
    if (!postId || !enabled) return;

    const channel = supabase
      .channel(`post:${postId}:comments`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        (payload) => {
          const next = payload.new as RealtimeComment;
          if (!next?.id) return;

          const current = utils.comments.getByPost.getData({ postId });
          if (!current) {
            utils.comments.getByPost.invalidate({ postId });
            return;
          }

          utils.comments.getByPost.setData({ postId }, (old) => {
            if (!old) return old;
            return insertComment(old, next);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, postId, utils.comments.getByPost]);
}
