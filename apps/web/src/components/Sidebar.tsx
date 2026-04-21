'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeChannel = searchParams.get('channel');

  const { data: channelsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0 });
  const { data: myChannelIds, refetch: refetchMemberships } =
    trpc.channels.getMyMemberships.useQuery();

  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });
  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });

  const channels = channelsData?.items ?? [];

  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">채널</h2>
      </div>

      <div className="py-1">
        <Link
          href="/feed"
          onClick={onNavigate}
          className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-50 ${
            pathname === '/feed' && !activeChannel
              ? 'text-blue-600 font-medium bg-blue-50'
              : 'text-slate-700'
          }`}
        >
          전체 피드
        </Link>

        {channels.map((channel) => {
          const isMember = myChannelIds?.includes(channel.id) ?? false;
          const isActive = activeChannel === channel.id;

          return (
            <div key={channel.id} className="group flex items-center gap-1 px-2">
              <Link
                href={`/feed?channel=${channel.id}`}
                onClick={onNavigate}
                className={`flex-1 px-2 py-2 text-sm rounded hover:bg-slate-50 truncate ${
                  isActive ? 'text-blue-600 font-medium' : 'text-slate-700'
                }`}
              >
                # {channel.name}
              </Link>
              <button
                onClick={() =>
                  isMember
                    ? leave.mutate({ channelId: channel.id })
                    : join.mutate({ channelId: channel.id })
                }
                className={`text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                  isMember
                    ? 'text-slate-400 hover:text-red-500'
                    : 'text-blue-500 hover:text-blue-700'
                }`}
              >
                {isMember ? '나가기' : '참여'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-4">{inner}</div>
    </aside>
  );
}
