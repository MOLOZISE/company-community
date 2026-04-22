'use client';

import Link from 'next/link';

interface ActiveChannelsCardProps {
  channels?: Array<{ id: string; slug: string; name: string; postCount: number }> | null;
}

export function ActiveChannelsCard({ channels }: ActiveChannelsCardProps) {
  const items = channels ?? [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Active Channels</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">오늘의 채널</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          최근 24시간
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm leading-6 text-slate-500">
          아직 24시간 기준의 채널 활동 데이터가 없어요.
          <br />
          조금만 더 기다리면 가장 활발한 채널이 여기에 표시됩니다.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((channel, index) => (
            <Link
              key={channel.id}
              href={`/feed?channel=${channel.id}`}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 transition-colors hover:border-emerald-200 hover:bg-emerald-50/60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-500 ring-1 ring-slate-100">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-emerald-700">
                  {channel.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-slate-400">#{channel.slug}</span>
              </span>
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-100">
                {channel.postCount.toLocaleString()}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
