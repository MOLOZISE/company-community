'use client';

import { trpc } from '@/lib/trpc';
import { ActiveChannelsCard } from './ActiveChannelsCard';
import { CommunityStatsCard } from './CommunityStatsCard';
import { TrendingTopicsCard } from './TrendingTopicsCard';

type CommunityStats = {
  totalMembers: number;
  monthlyPosts: number;
  monthlyReactions: number;
  monthlySaves: number;
};

type TrendingTopic = { topic: string; count: number };
type ActiveChannel = { id: string; slug: string; name: string; postCount: number };

interface RightSidebarProps {
  stats?: CommunityStats | null;
  topics?: TrendingTopic[] | null;
  channels?: ActiveChannel[] | null;
}

export function RightSidebar({ stats, topics, channels }: RightSidebarProps) {
  const { data: liveStats } = trpc.trending.getCommunityStats.useQuery(undefined, {
    enabled: stats === undefined,
  });
  const { data: liveTopics } = trpc.trending.getTrendingTopics.useQuery(undefined, {
    enabled: topics === undefined,
  });
  const { data: liveChannels } = trpc.trending.getActiveChannels.useQuery(undefined, {
    enabled: channels === undefined,
  });

  const finalStats = stats ?? liveStats;
  const finalTopics = topics ?? liveTopics;
  const finalChannels = channels ?? liveChannels;

  return (
    <aside className="hidden xl:block xl:w-72 xl:shrink-0">
      <div className="sticky top-6 space-y-3">
        <CommunityStatsCard stats={finalStats} />
        <TrendingTopicsCard topics={finalTopics} />
        <ActiveChannelsCard channels={finalChannels} />
      </div>
    </aside>
  );
}
