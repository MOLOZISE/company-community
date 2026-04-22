'use client';

import { motion } from 'framer-motion';
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
      <motion.button
        type="button"
        onClick={() => handleVote('up')}
        disabled={voteMutation.isLoading}
        whileTap={{ scale: 0.92, y: -1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors ${
          currentVote === 'up'
            ? 'bg-orange-50 text-orange-500'
            : 'text-slate-400 hover:bg-orange-50 hover:text-orange-500'
        }`}
      >
        <ArrowIcon direction="up" />
      </motion.button>

      <motion.span
        key={score}
        layout
        initial={{ y: 6, opacity: 0.2, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        className={`min-w-[20px] text-center text-sm font-semibold ${
          score > 0 ? 'text-orange-500' : score < 0 ? 'text-blue-500' : 'text-slate-400'
        }`}
      >
        {score}
      </motion.span>

      {downvoteCount !== undefined && (
        <motion.button
          type="button"
          onClick={() => handleVote('down')}
          disabled={voteMutation.isLoading}
          whileTap={{ scale: 0.92, y: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={`flex items-center gap-1 rounded px-2 py-1 text-sm font-medium transition-colors ${
            currentVote === 'down'
              ? 'bg-blue-50 text-blue-500'
              : 'text-slate-400 hover:bg-blue-50 hover:text-blue-500'
          }`}
        >
          <ArrowIcon direction="down" />
        </motion.button>
      )}
    </div>
  );
}

function ArrowIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      {direction === 'up' ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="m6 12 4-4 4 4" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="m14 8-4 4-4-4" />
      )}
    </svg>
  );
}
