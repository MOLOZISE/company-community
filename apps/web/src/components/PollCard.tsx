'use client';

import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { toast } from '@/store/toast';

interface PollCardProps {
  postId: string;
}

export function PollCard({ postId }: PollCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const utils = trpc.useContext();

  const { data, isLoading } = trpc.polls.getResults.useQuery({ postId });

  const vote = trpc.polls.vote.useMutation({
    onSuccess: () => {
      utils.polls.getResults.invalidate({ postId });
      toast.success('투표가 반영됐어요.');
    },
  });

  function handleVote(optionId: string) {
    if (!user) {
      router.push('/login');
      return;
    }
    vote.mutate({ postId, optionId });
  }

  if (isLoading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasVoted = Boolean(data.myVoteOptionId);
  const totalVotes = data.totalVotes ?? 0;

  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Poll</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-900">{hasVoted ? '투표 결과' : '투표하기'}</h3>
        </div>
        <div className="text-xs text-slate-400">{totalVotes.toLocaleString()}명 참여</div>
      </div>

      <div className="mt-4 space-y-2">
        {data.options.map((option) => {
          const percent = totalVotes > 0 ? Math.round((option.voteCount / totalVotes) * 100) : 0;
          const selected = data.myVoteOptionId === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleVote(option.id)}
              disabled={vote.isLoading}
              className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                hasVoted
                  ? selected
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-slate-900">{option.label}</span>
                {hasVoted ? (
                  <span className={`text-xs font-semibold ${selected ? 'text-blue-600' : 'text-slate-400'}`}>
                    {selected ? '내 선택' : `${percent}%`}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-slate-400">
                    {user ? '투표' : '로그인 후 투표'}
                  </span>
                )}
              </div>

              {hasVoted && (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${selected ? 'bg-blue-500' : 'bg-slate-300'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>{option.voteCount.toLocaleString()}표</span>
                    <span>{percent}%</span>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {hasVoted && (
        <p className="mt-3 text-xs leading-5 text-slate-400">
          다른 옵션을 눌러 선택을 바꿀 수 있어요.
        </p>
      )}
    </section>
  );
}
