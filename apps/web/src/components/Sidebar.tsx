'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import {
  BOARD_SECTION_LIMIT,
  BOARD_SECTION_ORDER,
  type BoardSectionKey,
  SPACE_SECTION_LIMIT,
  formatChannelHighlight,
  getBoardSectionConfig,
  getBoardSectionHref,
  getSpaceFilterHref,
  normalizeBoardSection,
} from '@/lib/channel-groups';
import { CHANNEL_LIST_QUERY } from '@/lib/channel-directory';
import { ChannelRequestModal } from './ChannelRequestModal';
import { useAuthStore } from '@/store/auth';

interface SidebarProps {
  onNavigate?: () => void;
  onlineUserCount?: number;
}

type ChannelItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: string | null;
  purpose: string | null;
  postingMode: string | null;
  scope: string | null;
  defaultSort: string | null;
  displayOrder: number | null;
  sidebarSection: string | null;
  memberCount: number | null;
  postCount: number | null;
  latestPostTitle?: string | null;
  topPostTitle?: string | null;
};

type SectionTone = 'default' | 'slate' | 'blue' | 'orange' | 'green' | 'purple';

const BOARD_SECTION_META = BOARD_SECTION_ORDER.map((section) => ({
  ...section,
  tone: section.accent as SectionTone,
}));

const UI_TEXT = {
  spacesSection: '소모임',
  spacesAll: '공간 전체보기',
  admin: '관리',
  adminChannels: '채널 요청 관리',
  adminReports: '신고 관리',
  feed: '모아보기',
  onlinePrefix: '지금 활동 중',
  onlineSuffix: '명',
  request: '+ 게시판/공간 개설 요청',
  join: '참여',
  leave: '나가기',
  morePrefix: '+ ',
  moreSuffix: '개 더 보기',
  joined: '참여 중',
  discoverable: '참여 가능',
} as const;

export function Sidebar({ onNavigate, onlineUserCount = 0 }: SidebarProps = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [loadDirectory, setLoadDirectory] = useState(false);
  const { user } = useAuthStore();

  const { data: channelsData } = trpc.channels.getList.useQuery(CHANNEL_LIST_QUERY, {
    enabled: loadDirectory,
  });
  const { data: myChannelIds, refetch: refetchMemberships } = trpc.channels.getMyMemberships.useQuery(
    undefined,
    {
      enabled: !!user && loadDirectory,
    }
  );
  const { data: isAdmin = false } = trpc.channels.isAdmin.useQuery(undefined, {
    enabled: !!user && loadDirectory,
  });

  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });
  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });

  const channels = (channelsData?.items ?? []) as ChannelItem[];
  const boards = channels.filter((channel) => channel.type === 'board');
  const spaces = channels.filter((channel) => channel.type === 'space');

  const boardGroups = useMemo(() => {
    const grouped: Record<BoardSectionKey, ChannelItem[]> = {
      announcement: [],
      company: [],
      subsidiary: [],
      lifestyle: [],
      career: [],
      anonymous: [],
    };

    for (const channel of boards) {
      const section = normalizeBoardSection(channel.sidebarSection);
      if (section) grouped[section].push(channel);
    }

    return grouped;
  }, [boards]);

  const activeBoardSection = useMemo(() => {
    if (!pathname) return null;

    if (pathname === '/boards') {
      const sectionFromQuery = normalizeBoardSection(searchParams.get('section'));
      if (sectionFromQuery) return sectionFromQuery;
    }

    for (const section of BOARD_SECTION_ORDER) {
      if (boardGroups[section.key].some((channel) => isChannelRouteActive(pathname, boardPath(channel.slug)))) {
        return section.key;
      }
    }

    return null;
  }, [boardGroups, pathname, searchParams]);

  const activeSpaceChannel = useMemo(() => {
    if (!pathname) return false;
    return pathname === '/spaces' || spaces.some((channel) => isChannelRouteActive(pathname, spacePath(channel.slug)));
  }, [pathname, spaces]);

  const mySpaces = spaces.filter((space) => myChannelIds?.includes(space.id));
  const otherSpaces = spaces.filter((space) => !myChannelIds?.includes(space.id));
  const visibleMySpaces = mySpaces.slice(0, SPACE_SECTION_LIMIT);
  const visibleOtherSpaces = otherSpaces.slice(0, SPACE_SECTION_LIMIT);

  return (
    <aside
      className="w-56 shrink-0"
      onPointerEnter={() => setLoadDirectory(true)}
      onFocusCapture={() => setLoadDirectory(true)}
      onClick={() => setLoadDirectory(true)}
    >
      {showRequestModal && <ChannelRequestModal onClose={() => setShowRequestModal(false)} />}

      <div className="sticky top-20 space-y-3">
        {/* 항상 노출: 홈 / 게시판 / 모아보기 */}
        <section className="rounded-2xl border border-slate-200 bg-white p-2">
          <NavLink href="/home" active={pathname === '/home'} onClick={onNavigate}>
            🏠 홈
          </NavLink>
          <NavLink href="/boards" active={pathname === '/boards' && !searchParams.get('section')} onClick={onNavigate} muted>
            📋 게시판 전체
          </NavLink>
          <NavLink href="/popular" active={pathname === '/popular'} onClick={onNavigate} muted>
            {UI_TEXT.feed}
          </NavLink>
        </section>

        {!loadDirectory ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-3 space-y-2">
              <div className="h-8 animate-pulse rounded bg-slate-100" />
              <div className="h-8 animate-pulse rounded bg-slate-100" />
              <div className="h-8 animate-pulse rounded bg-slate-100" />
            </div>
          </section>
        ) : (
          <>
            <div className="space-y-2">
              {BOARD_SECTION_META.map((section) => {
                const items = boardGroups[section.key];
                if (items.length === 0) return null;
                return (
                  <BoardSectionCard
                    key={section.key}
                    section={section}
                    items={items}
                    active={activeBoardSection === section.key}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>

        <SpaceSection
          spaces={spaces}
          mySpaces={mySpaces}
          otherSpaces={otherSpaces}
          visibleMySpaces={visibleMySpaces}
          visibleOtherSpaces={visibleOtherSpaces}
          active={activeSpaceChannel}
          onNavigate={onNavigate}
          join={join}
          leave={leave}
        />

            {isAdmin && (
              <NavSection label={UI_TEXT.admin} count={2} active={false} tone="default">
                <NavLink href="/admin/channels" active={pathname === '/admin/channels'} onClick={onNavigate} muted>
                  {UI_TEXT.adminChannels}
                </NavLink>
                <NavLink href="/admin/reports" active={pathname === '/admin/reports'} onClick={onNavigate} muted>
                  {UI_TEXT.adminReports}
                </NavLink>
              </NavSection>
            )}

            <div className="px-3 py-1 text-xs text-slate-400">
              {UI_TEXT.onlinePrefix} {onlineUserCount.toLocaleString()}
              {UI_TEXT.onlineSuffix}
            </div>

            <button
              onClick={() => setShowRequestModal(true)}
              className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              {UI_TEXT.request}
            </button>
          </>
        )}
      </div>
    </aside>
  );
}

function BoardSectionCard({
  section,
  items,
  active,
  onNavigate,
}: {
  section: (typeof BOARD_SECTION_META)[number];
  items: ChannelItem[];
  active: boolean;
  onNavigate?: () => void;
}) {
  const visibleItems = items.slice(0, BOARD_SECTION_LIMIT);
  const moreCount = Math.max(0, items.length - BOARD_SECTION_LIMIT);

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-[0_1px_0_rgba(15,23,42,0.02)] ${
        active ? 'border-blue-300 ring-1 ring-blue-100' : 'border-slate-200'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-sm font-semibold ${
          section.tone === 'orange'
            ? 'border-orange-100 bg-orange-50 text-orange-700'
            : section.tone === 'green'
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : section.tone === 'purple'
                ? 'border-purple-100 bg-purple-50 text-purple-700'
                : section.tone === 'blue'
                  ? 'border-blue-100 bg-blue-50 text-blue-700'
                  : 'border-slate-100 bg-slate-50 text-slate-700'
        }`}
      >
        <div className="min-w-0">
          <p className="truncate">{section.label}</p>
          <p className="mt-0.5 truncate text-[11px] font-normal opacity-70">{section.description}</p>
        </div>
        <span className="rounded-full bg-white/85 px-2 py-0.5 text-xs font-semibold text-slate-700">
          {items.length}
        </span>
      </div>

      <div className="space-y-1 p-2">
        {visibleItems.map((channel) => {
          const highlight = getChannelHighlight(channel);
          return (
            <Link
              key={channel.id}
              href={boardPath(channel.slug)}
              prefetch={false}
              onClick={onNavigate}
              className="group block rounded-xl border border-transparent px-2.5 py-2 transition-colors hover:border-slate-200 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900 group-hover:text-blue-700">
                    {channel.name}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-slate-500">{highlight}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {(channel.postCount ?? 0).toLocaleString()}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="px-3 pb-3">
        <Link
          href={getBoardSectionHref(section.key)}
          onClick={onNavigate}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          {moreCount > 0 ? `${UI_TEXT.morePrefix}${moreCount}${UI_TEXT.moreSuffix}` : '전체 보기'}
        </Link>
      </div>
    </section>
  );
}

function SpaceSection({
  spaces,
  mySpaces,
  otherSpaces,
  visibleMySpaces,
  visibleOtherSpaces,
  active,
  onNavigate,
  join,
  leave,
}: {
  spaces: ChannelItem[];
  mySpaces: ChannelItem[];
  otherSpaces: ChannelItem[];
  visibleMySpaces: ChannelItem[];
  visibleOtherSpaces: ChannelItem[];
  active: boolean;
  onNavigate?: () => void;
  join: ReturnType<typeof trpc.channels.join.useMutation>;
  leave: ReturnType<typeof trpc.channels.leave.useMutation>;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[22px] border shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
        active ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-indigo-100'
      }`}
    >
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-700 px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Space hub</p>
            <h2 className="mt-1 text-base font-semibold">소모임</h2>
          </div>
          <Link
            href={getSpaceFilterHref('all')}
            onClick={onNavigate}
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
          >
            {UI_TEXT.spacesAll}
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatPill label="전체" value={spaces.length} />
          <StatPill label={UI_TEXT.joined} value={mySpaces.length} />
          <StatPill label={UI_TEXT.discoverable} value={otherSpaces.length} />
        </div>
      </div>

      <div className="space-y-3 bg-white p-3">
        <SpaceGroup
          title={UI_TEXT.joined}
          filterKey="joined"
          count={mySpaces.length}
          tone="indigo"
          spaces={visibleMySpaces}
          onNavigate={onNavigate}
          onJoinLeave={(space) => leave.mutate({ channelId: space.id })}
          actionLabel={UI_TEXT.leave}
          actionTone="danger"
          emptyLabel="참여 중인 소모임이 없습니다."
        />

        <SpaceGroup
          title={UI_TEXT.discoverable}
          filterKey="discoverable"
          count={otherSpaces.length}
          tone="emerald"
          spaces={visibleOtherSpaces}
          onNavigate={onNavigate}
          onJoinLeave={(space) => join.mutate({ channelId: space.id })}
          actionLabel={UI_TEXT.join}
          actionTone="primary"
          emptyLabel="참여 가능한 소모임이 없습니다."
        />
      </div>
    </section>
  );
}

function SpaceGroup({
  title,
  filterKey,
  count,
  tone,
  spaces,
  onNavigate,
  onJoinLeave,
  actionLabel,
  actionTone,
  emptyLabel,
}: {
  title: string;
  filterKey: 'joined' | 'discoverable';
  count: number;
  tone: 'indigo' | 'emerald';
  spaces: ChannelItem[];
  onNavigate?: () => void;
  onJoinLeave: (space: ChannelItem) => void;
  actionLabel: string;
  actionTone: 'primary' | 'danger';
  emptyLabel: string;
}) {
  const toneClasses =
    tone === 'indigo'
      ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
      : 'border-emerald-100 bg-emerald-50 text-emerald-700';

  return (
    <div className={`rounded-2xl border p-3 ${toneClasses}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-[11px] text-current/70">{count.toLocaleString()}개 공간</p>
        </div>
        <Link
          href={getSpaceFilterHref(filterKey)}
          onClick={onNavigate}
          className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-700"
        >
          전체 보기
        </Link>
      </div>

      {spaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-current/10 bg-white/70 px-3 py-4 text-sm text-slate-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-1.5">
          {spaces.map((space) => (
            <div
              key={space.id}
              className="group flex items-center gap-2 rounded-xl border border-transparent bg-white/80 px-2.5 py-2 transition-colors hover:border-current/10 hover:bg-white"
            >
              <Link href={spacePath(space.slug)} prefetch={false} onClick={onNavigate} className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{space.name}</p>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {space.description ?? '프로젝트, 스터디, 취미 모임 공간'}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => onJoinLeave(space)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  actionTone === 'danger'
                    ? 'bg-white text-rose-600 hover:bg-rose-50'
                    : 'bg-white text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {actionLabel}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 px-2 py-2 text-center">
      <div className="text-[11px] text-white/60">{label}</div>
      <div className="mt-0.5 text-sm font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}

function NavSection({
  label,
  count,
  active = false,
  tone = 'default',
  children,
}: {
  label: string;
  count: number;
  active?: boolean;
  tone?: SectionTone;
  children: React.ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-2xl border bg-white ${active ? 'border-slate-300 ring-1 ring-slate-100' : 'border-slate-200'}`}>
      <div
        className={`flex items-center justify-between gap-2 border-b px-3 py-2 text-sm font-semibold ${
          tone === 'blue'
            ? 'border-blue-100 bg-blue-50 text-blue-700'
            : 'border-slate-100 bg-slate-50 text-slate-700'
        }`}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">{count}</span>
      </div>
      <nav className="p-1">{children}</nav>
    </section>
  );
}

function NavLink({
  href,
  active,
  onClick,
  muted,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      className={`block rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-blue-50 font-semibold text-blue-700'
          : muted
            ? 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </Link>
  );
}

function boardPath(slug: string) {
  return `/boards/${slug}`;
}

function spacePath(slug: string) {
  return `/spaces/${slug}`;
}

function isChannelRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getChannelHighlight(channel: ChannelItem) {
  const preferred =
    channel.defaultSort === 'hot'
      ? channel.topPostTitle ?? channel.latestPostTitle
      : channel.latestPostTitle ?? channel.topPostTitle;

  const label = channel.defaultSort === 'hot' ? '핫한 글' : '최근 글';
  const fallback = channel.description ?? getBoardSectionConfig(normalizeBoardSection(channel.sidebarSection) ?? 'company').description;
  const value = formatChannelHighlight(preferred ?? fallback);
  return `${label} · ${value}`;
}
