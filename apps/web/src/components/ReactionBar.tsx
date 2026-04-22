'use client';

// Shown on post detail only — not on feed cards
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;
type Emoji = (typeof EMOJIS)[number];

interface ReactionBarProps {
  postId: string;
}

export function ReactionBar({ postId }: ReactionBarProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const utils = trpc.useContext();

  const { data: counts = {} as Record<Emoji, number> } = trpc.reactions.getForPost.useQuery({ postId });
  const { data: myReaction } = trpc.reactions.getMyReaction.useQuery(
    { postId },
    { enabled: !!user }
  );

  const toggle = trpc.reactions.toggle.useMutation({
    onSuccess: () => {
      utils.reactions.getForPost.invalidate({ postId });
      utils.reactions.getMyReaction.invalidate({ postId });
    },
  });

  function handleClick(emoji: Emoji) {
    if (!user) {
      router.push('/login');
      return;
    }
    toggle.mutate({ postId, emoji });
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = myReaction === emoji;
        return (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            disabled={toggle.isLoading}
            aria-label={`${emoji} 리액션${count > 0 ? ` ${count}개` : ''}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
              active
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="text-xs font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
