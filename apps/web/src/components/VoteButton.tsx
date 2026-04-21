'use client';

import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

interface VoteButtonProps {
  targetType: 'post' | 'comment';
  targetId: string;
  upvoteCount: number;
  downvoteCount?: number;
  currentVote: 'up' | 'down' | null;
  onVoted?: () => void;
}

export function VoteButton({
  targetType,
  targetId,
  upvoteCount,
  downvoteCount,
  currentVote,
  onVoted,
}: VoteButtonProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const utils = trpc.useContext();

  const voteMutation = trpc.votes.vote.useMutation({
    onSuccess: () => {
      onVoted?.();
      if (targetType === 'post') {
        utils.posts.getById.invalidate({ id: targetId });
        utils.posts.getFeed.invalidate();
      } else {
        utils.votes.getMyVotesForComments.invalidate();
      }
    },
  });

  function handleVote(type: 'up' | 'down') {
    if (!user) {
      router.push('/login');
      return;
    }
    voteMutation.mutate({ targetType, targetId, voteType: type });
  }

  const score = (upvoteCount ?? 0) - (downvoteCount ?? 0);

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleVote('up')}
        disabled={voteMutation.isLoading}
        className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
          currentVote === 'up'
            ? 'text-orange-500 bg-orange-50'
            : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50'
        }`}
      >
        ▲
      </button>
      <span
        className={`text-sm font-semibold min-w-[20px] text-center ${
          score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : 'text-slate-400'
        }`}
      >
        {score}
      </span>
      {downvoteCount !== undefined && (
        <button
          onClick={() => handleVote('down')}
          disabled={voteMutation.isLoading}
          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium transition-colors ${
            currentVote === 'down'
              ? 'text-blue-500 bg-blue-50'
              : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'
          }`}
        >
          ▼
        </button>
      )}
    </div>
  );
}
