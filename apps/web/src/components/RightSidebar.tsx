'use client';

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
  return (
    <aside className="hidden xl:block xl:w-72 xl:shrink-0">
      <div className="sticky top-6 space-y-3">
        <CommunityStatsCard stats={stats} />
        <TrendingTopicsCard topics={topics} />
        <ActiveChannelsCard channels={channels} />
      </div>
    </aside>
  );
}
