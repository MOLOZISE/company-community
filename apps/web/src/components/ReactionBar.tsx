'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useAuthStore } from '@/store/auth';

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'] as const;
type Emoji = (typeof EMOJIS)[number];

interface ReactionBarProps {
  postId: string;
}

export function ReactionBar({ postId }: ReactionBarProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const utils = trpc.useContext();
  const [pulsingEmoji, setPulsingEmoji] = useState<Emoji | null>(null);

  const { data: counts = {} as Record<Emoji, number> } = trpc.reactions.getForPost.useQuery({ postId });
  const { data: myReaction } = trpc.reactions.getMyReaction.useQuery({ postId }, { enabled: !!user });

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

    setPulsingEmoji(emoji);
    window.setTimeout(() => setPulsingEmoji((current) => (current === emoji ? null : current)), 300);
    toggle.mutate({ postId, emoji });
  }

  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {EMOJIS.map((emoji) => {
        const count = counts[emoji] ?? 0;
        const active = myReaction === emoji;

        return (
          <motion.button
            key={emoji}
            type="button"
            onClick={() => handleClick(emoji)}
            disabled={toggle.isLoading}
            aria-label={`${emoji} 반응 ${count > 0 ? `${count}개` : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            animate={pulsingEmoji === emoji ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`flex items-center gap-1 rounded-full border px-2 py-1 text-sm transition-colors ${
              active
                ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>{emoji}</span>
            <AnimatePresence mode="wait" initial={false}>
              {count > 0 && (
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="text-xs font-medium"
                >
                  {count}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </div>
  );
}
