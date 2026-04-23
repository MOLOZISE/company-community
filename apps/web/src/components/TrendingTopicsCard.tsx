'use client';

import Link from 'next/link';

interface TrendingTopicsCardProps {
  topics?: Array<{ topic: string; count: number }> | null;
}

export function TrendingTopicsCard({ topics }: TrendingTopicsCardProps) {
  const items = topics ?? [];

  return (
    <section className="rounded-[var(--cc-radius-card)] border border-slate-200 bg-white p-4 shadow-[var(--cc-shadow-soft)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Trending Topics</p>
          <h2 className="mt-1 text-sm font-semibold text-slate-950">요즘 인기 주제</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
          24시간
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm leading-6 text-slate-500">
          아직 뜨는 주제가 없어요.
          <br />
          글이 쌓이면 여기서 바로 보입니다.
        </div>
      ) : (
        <ol className="space-y-2">
          {items.slice(0, 5).map((item, index) => (
            <li key={item.topic}>
              <Link
                href={`/tag/${encodeURIComponent(item.topic.toLowerCase())}`}
                className="group flex items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5 transition-colors hover:border-sky-200 hover:bg-sky-50/60"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900 group-hover:text-sky-700">
                    #{item.topic}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">최근 반응이 많은 주제</span>
                </span>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-100">
                  {item.count.toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
