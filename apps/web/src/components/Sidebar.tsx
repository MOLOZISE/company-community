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
  const joined = channels.filter((channel) => myChannelIds?.includes(channel.id));
  const discover = channels.filter((channel) => !myChannelIds?.includes(channel.id)).slice(0, 6);
  const totalPosts = channels.reduce((sum, channel) => sum + (channel.postCount ?? 0), 0);
  const totalMembers = channels.reduce((sum, channel) => sum + (channel.memberCount ?? 0), 0);

  return (
    <aside className="w-56 shrink-0">
      <div className="sticky top-20 space-y-4">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">커뮤니티</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <Stat label="글" value={totalPosts} />
              <Stat label="멤버" value={totalMembers} />
            </div>
          </div>

          <nav className="p-2">
            <Link
              href="/feed"
              onClick={onNavigate}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-slate-50 ${
                pathname === '/feed' && !activeChannel
                  ? 'bg-blue-50 font-semibold text-blue-700'
                  : 'text-slate-700'
              }`}
            >
              <span>전체 피드</span>
              <span className="text-xs text-slate-400">{totalPosts}</span>
            </Link>
          </nav>
        </section>

        <ChannelSection
          title="내 채널"
          empty="아직 참여한 채널이 없습니다"
          channels={joined}
          activeChannel={activeChannel}
          onNavigate={onNavigate}
          onToggle={(channelId) => leave.mutate({ channelId })}
          toggleLabel="나가기"
        />

        <ChannelSection
          title="발견하기"
          empty="새 채널이 생기면 여기에 표시됩니다"
          channels={discover}
          activeChannel={activeChannel}
          onNavigate={onNavigate}
          onToggle={(channelId) => join.mutate({ channelId })}
          toggleLabel="참여"
        />
      </div>
    </aside>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-slate-50 px-2 py-1.5">
      <p className="font-semibold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-slate-400">{label}</p>
    </div>
  );
}

type Channel = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number | null;
  postCount: number | null;
};

function ChannelSection({
  title,
  empty,
  channels,
  activeChannel,
  onNavigate,
  onToggle,
  toggleLabel,
}: {
  title: string;
  empty: string;
  channels: Channel[];
  activeChannel: string | null;
  onNavigate?: () => void;
  onToggle: (channelId: string) => void;
  toggleLabel: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      </div>
      <div className="p-2">
        {channels.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-5 text-slate-400">{empty}</p>
        ) : (
          channels.map((channel) => {
            const isActive = activeChannel === channel.id;
            return (
              <div key={channel.id} className="group rounded-md hover:bg-slate-50">
                <div className="flex items-start gap-1 px-2 py-2">
                  <Link
                    href={`/feed?channel=${channel.id}`}
                    onClick={onNavigate}
                    className={`min-w-0 flex-1 ${isActive ? 'text-blue-700' : 'text-slate-700'}`}
                  >
                    <p className="truncate text-sm font-medium"># {channel.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {(channel.postCount ?? 0).toLocaleString()}개 글 · {(channel.memberCount ?? 0).toLocaleString()}명
                    </p>
                  </Link>
                  <button
                    onClick={() => onToggle(channel.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-slate-400 opacity-0 hover:bg-white hover:text-blue-600 group-hover:opacity-100"
                  >
                    {toggleLabel}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
