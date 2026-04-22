'use client';

type CommunityStats = {
  totalMembers: number;
  monthlyPosts: number;
  monthlyReactions: number;
  monthlySaves: number;
};

interface CommunityStatsCardProps {
  stats?: CommunityStats | null;
}

const tiles = [
  {
    key: 'members',
    label: '구성원 참여',
    valueKey: 'totalMembers',
    accent: 'text-sky-600 bg-sky-50 ring-sky-100',
    icon: MemberIcon,
  },
  {
    key: 'posts',
    label: '이번 달 게시글',
    valueKey: 'monthlyPosts',
    accent: 'text-emerald-600 bg-emerald-50 ring-emerald-100',
    icon: PostIcon,
  },
  {
    key: 'reactions',
    label: '이번 달 반응',
    valueKey: 'monthlyReactions',
    accent: 'text-amber-600 bg-amber-50 ring-amber-100',
    icon: ReactionIcon,
  },
  {
    key: 'saves',
    label: '이번 달 저장',
    valueKey: 'monthlySaves',
    accent: 'text-violet-600 bg-violet-50 ring-violet-100',
    icon: SaveIcon,
  },
] as const;

export function CommunityStatsCard({ stats }: CommunityStatsCardProps) {
  const values = stats ?? {
    totalMembers: 0,
    monthlyPosts: 0,
    monthlyReactions: 0,
    monthlySaves: 0,
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Community Stats</p>
          <h2 className="mt-1 text-base font-semibold text-slate-950">커뮤니티 현황</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
          이번 달 기준
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          const value = values[tile.valueKey];

          return (
            <div key={tile.key} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
              <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ${tile.accent}`}>
                <Icon />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{tile.label}</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">
                {value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MemberIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 16.5c0-2.2-2.5-4-5.5-4s-5.5 1.8-5.5 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 10.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
    </svg>
  );
}

function PostIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h10v11H5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h5M7.5 10h5M7.5 12.5h3" />
    </svg>
  );
}

function ReactionIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 16.2 4.2 10.4a3.4 3.4 0 0 1 4.8-4.8L10 6.6l1-1a3.4 3.4 0 0 1 4.8 4.8L10 16.2Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3.8h8v12.4l-4-2.3-4 2.3V3.8Z" />
    </svg>
  );
}
