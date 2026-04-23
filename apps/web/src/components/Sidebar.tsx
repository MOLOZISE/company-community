'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ChannelRequestModal } from './ChannelRequestModal';
import { useAuthStore } from '@/store/auth';

interface SidebarProps {
  onNavigate?: () => void;
  onlineUserCount?: number;
}

type SidebarSectionKey =
  | 'announcement'
  | 'company'
  | 'subsidiary'
  | 'lifestyle'
  | 'career'
  | 'anonymous';

type ChannelItem = {
  id: string;
  slug: string;
  name: string;
  type: string | null;
  purpose: string | null;
  postingMode: string | null;
  scope: string | null;
  displayOrder: number | null;
  sidebarSection: string | null;
};

type SectionTone = 'default' | 'slate' | 'blue' | 'orange' | 'green' | 'purple';

const BOARD_SECTION_ORDER: Array<{
  key: SidebarSectionKey;
  label: string;
  tone: SectionTone;
  collapsible: boolean;
  defaultOpen: boolean;
}> = [
  { key: 'announcement', label: '\u{1F4CC} \uacf5\uc9c0/\ud544\ub3c5', tone: 'default', collapsible: false, defaultOpen: true },
  { key: 'company', label: '\u{1F3E2} \uc804\uc0ac \uac8c\uc2dc\ud310', tone: 'slate', collapsible: true, defaultOpen: true },
  { key: 'subsidiary', label: '\u{1F3ED} \uadf8\ub8f9\uc0ac \uac8c\uc2dc\ud310', tone: 'blue', collapsible: true, defaultOpen: false },
  { key: 'lifestyle', label: '\u{1F389} \uc0dd\ud65c/\uc7ac\ubbf8', tone: 'orange', collapsible: true, defaultOpen: false },
  { key: 'career', label: '\u{1F4BC} \uc5c5\ubb34/\ucee4\ub9ac\uc5b4', tone: 'green', collapsible: true, defaultOpen: false },
  { key: 'anonymous', label: '\u{1F512} \uc775\uba85 \uac8c\uc2dc\ud310', tone: 'purple', collapsible: true, defaultOpen: false },
];

const BOARD_SECTION_KEYS: SidebarSectionKey[] = BOARD_SECTION_ORDER.map((section) => section.key);
const BOARD_LIMIT = 6;

const UI_TEXT = {
  spacesSection: '\u{1F3AF} \uc18c\ubaa8\uc784',
  spacesAll: '\uacf5\uac04 \uc804\uccb4\ubcf4\uae30',
  admin: '\u2699 \uad00\ub9ac',
  adminChannels: '\ucc44\ub110 \uc694\uccad \uad00\ub9ac',
  adminReports: '\uc2e0\uace0 \uad00\ub9ac',
  feed: '\ubaa8\uc544\ubcf4\uae30',
  onlinePrefix: '\uc9c0\uae08 \ud65c\ub3d9 \uc911',
  onlineSuffix: '\uba85',
  request: '+ \uac8c\uc2dc\ud310/\uacf5\uac04 \uac1c\uc124 \uc694\uccad',
  morePrefix: '\uFF0B ',
  moreSuffix: '\uac1c \ub354 \ubcf4\uae30',
  joinTitle: '\ucc38\uc5ec',
  leaveTitle: '\ub098\uac00\uae30',
  chevronDown: '\u25BE',
  chevronRight: '\u25B8',
} as const;

export function Sidebar({ onNavigate, onlineUserCount = 0 }: SidebarProps = {}) {
  const pathname = usePathname();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const { user } = useAuthStore();

  const { data: boardsData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0, type: 'board' });
  const { data: spacesData } = trpc.channels.getList.useQuery({ limit: 50, offset: 0, type: 'space' });
  const { data: myChannelIds, refetch: refetchMemberships } = trpc.channels.getMyMemberships.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: isAdmin = false } = trpc.channels.isAdmin.useQuery(undefined, {
    enabled: !!user,
  });

  const leave = trpc.channels.leave.useMutation({ onSuccess: () => refetchMemberships() });
  const join = trpc.channels.join.useMutation({ onSuccess: () => refetchMemberships() });

  const boards = (boardsData?.items ?? []) as ChannelItem[];
  const spaces = (spacesData?.items ?? []) as ChannelItem[];

  const [showAllBoards, setShowAllBoards] = useState<Record<SidebarSectionKey, boolean>>({
    announcement: true,
    company: false,
    subsidiary: false,
    lifestyle: false,
    career: false,
    anonymous: false,
  });

  const boardGroups = useMemo(() => {
    const grouped: Record<SidebarSectionKey, ChannelItem[]> = {
      announcement: [],
      company: [],
      subsidiary: [],
      lifestyle: [],
      career: [],
      anonymous: [],
    };

    for (const channel of boards) {
      const section = normalizeSidebarSection(channel.sidebarSection);
      if (section) {
        grouped[section].push(channel);
      }
    }

    return grouped;
  }, [boards]);

  const activeBoardSection = useMemo(() => {
    if (!pathname) return null;

    for (const section of BOARD_SECTION_KEYS) {
      if (boardGroups[section].some((channel) => isChannelRouteActive(pathname, boardPath(channel.slug)))) {
        return section;
      }
    }

    return null;
  }, [boardGroups, pathname]);

  const activeSpaceChannel = useMemo(() => {
    if (!pathname) return false;
    return pathname === '/spaces' || spaces.some((channel) => isChannelRouteActive(pathname, spacePath(channel.slug)));
  }, [pathname, spaces]);

  useEffect(() => {
    if (!activeBoardSection) return;

    const activeIndex = boardGroups[activeBoardSection].findIndex((channel) =>
      isChannelRouteActive(pathname ?? '', boardPath(channel.slug))
    );

    if (activeIndex >= BOARD_LIMIT) {
      setShowAllBoards((current) => {
        if (current[activeBoardSection]) return current;
        return { ...current, [activeBoardSection]: true };
      });
    }
  }, [activeBoardSection, boardGroups, pathname]);

  const mySpaces = spaces.filter((space) => myChannelIds?.includes(space.id));
  const otherSpaces = spaces.filter((space) => !myChannelIds?.includes(space.id));

  function boardPath(slug: string) {
    return `/boards/${slug}`;
  }

  function spacePath(slug: string) {
    return `/spaces/${slug}`;
  }

  function handleShowAll(key: SidebarSectionKey) {
    setShowAllBoards((current) => ({ ...current, [key]: true }));
  }

  return (
    <aside className="w-56 shrink-0">
      {showRequestModal && <ChannelRequestModal onClose={() => setShowRequestModal(false)} />}

      <div className="sticky top-20 space-y-2 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>
        {BOARD_SECTION_ORDER.map((section) => {
          const items = boardGroups[section.key];
          if (items.length === 0) return null;

          const visibleItems = showAllBoards[section.key] ? items : items.slice(0, BOARD_LIMIT);

          return (
            <NavSection
              key={section.key}
              label={section.label}
              count={items.length}
              collapsible={section.collapsible}
              defaultOpen={section.defaultOpen}
              active={activeBoardSection === section.key}
              tone={section.tone}
            >
              {visibleItems.map((channel) => (
                <NavLink
                  key={channel.id}
                  href={boardPath(channel.slug)}
                  active={isChannelRouteActive(pathname, boardPath(channel.slug))}
                  onClick={onNavigate}
                >
                  {channel.name}
                </NavLink>
              ))}

              {!showAllBoards[section.key] && items.length > BOARD_LIMIT && (
                <button
                  type="button"
                  onClick={() => handleShowAll(section.key)}
                  className="mx-2 mt-1 rounded-md border border-dashed border-slate-200 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
                >
                  {UI_TEXT.morePrefix}
                  {items.length - BOARD_LIMIT}
                  {UI_TEXT.moreSuffix}
                </button>
              )}
            </NavSection>
          );
        })}

        <NavSection
          label={UI_TEXT.spacesSection}
          count={spaces.length}
          collapsible
          defaultOpen
          active={activeSpaceChannel}
          tone="default"
        >
          <NavLink href="/spaces" active={pathname === '/spaces'} onClick={onNavigate} muted>
            {UI_TEXT.spacesAll}
          </NavLink>

          {mySpaces.map((space) => (
            <NavLink
              key={space.id}
              href={spacePath(space.slug)}
              active={isChannelRouteActive(pathname, spacePath(space.slug))}
              onClick={onNavigate}
              joined
              onJoinLeave={() => leave.mutate({ channelId: space.id })}
            >
              {space.name}
            </NavLink>
          ))}

          {otherSpaces.slice(0, 3).map((space) => (
            <NavLink
              key={space.id}
              href={spacePath(space.slug)}
              active={isChannelRouteActive(pathname, spacePath(space.slug))}
              onClick={onNavigate}
              joined={false}
              onJoinLeave={() => join.mutate({ channelId: space.id })}
            >
              {space.name}
            </NavLink>
          ))}
        </NavSection>

        {isAdmin && (
          <NavSection label={UI_TEXT.admin} count={2} collapsible defaultOpen active={false} tone="default">
            <NavLink href="/admin/channels" active={pathname === '/admin/channels'} onClick={onNavigate}>
              {UI_TEXT.adminChannels}
            </NavLink>
            <NavLink href="/admin/reports" active={pathname === '/admin/reports'} onClick={onNavigate}>
              {UI_TEXT.adminReports}
            </NavLink>
          </NavSection>
        )}

        <div className="border-t border-slate-200 pt-1">
          <NavLink href="/feed" active={pathname === '/feed'} onClick={onNavigate} muted>
            {UI_TEXT.feed}
          </NavLink>
          <div className="px-3 pb-2 pt-1 text-xs text-slate-400">
            {UI_TEXT.onlinePrefix} {onlineUserCount.toLocaleString()}
            {UI_TEXT.onlineSuffix}
          </div>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          {UI_TEXT.request}
        </button>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  count,
  collapsible = false,
  defaultOpen = true,
  active = false,
  tone = 'default',
  children,
}: {
  label: string;
  count: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
  active?: boolean;
  tone?: SectionTone;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (active) {
      setOpen(true);
    }
  }, [active]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => {
          if (!collapsible) return;
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 text-left text-sm font-semibold ${toneStyles[tone]}`}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-slate-700">{count}</span>
          {collapsible && <span className="w-3 text-center text-slate-500">{open ? UI_TEXT.chevronDown : UI_TEXT.chevronRight}</span>}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          open ? 'max-h-[2200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="px-1 py-1">{children}</nav>
      </div>
    </section>
  );
}

function NavLink({
  href,
  active,
  onClick,
  onJoinLeave,
  joined,
  muted,
  children,
}: {
  href: string;
  active: boolean;
  onClick?: () => void;
  onJoinLeave?: () => void;
  joined?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center rounded-md hover:bg-slate-50">
      <Link
        href={href}
        onClick={onClick}
        className={`flex-1 truncate px-3 py-2 text-sm transition-colors ${
          active
            ? 'font-semibold text-blue-700'
            : muted
              ? 'text-slate-400 hover:text-slate-600'
              : 'text-slate-700'
        }`}
      >
        {children}
      </Link>

      {onJoinLeave !== undefined && (
        <button
          type="button"
          onClick={onJoinLeave}
          className={`mr-1 rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100 ${
            joined
              ? 'text-slate-300 hover:text-red-400'
              : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
          }`}
          title={joined ? UI_TEXT.leaveTitle : UI_TEXT.joinTitle}
        >
          {joined ? '\u2212' : '+'}
        </button>
      )}
    </div>
  );
}

function normalizeSidebarSection(value: string | null): SidebarSectionKey | null {
  switch (value) {
    case 'announcement':
    case 'company':
    case 'subsidiary':
    case 'lifestyle':
    case 'career':
    case 'anonymous':
      return value;
    default:
      return null;
  }
}

function isChannelRouteActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const toneStyles: Record<SectionTone, string> = {
  default: 'bg-white text-slate-700',
  slate: 'bg-slate-50 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  orange: 'bg-orange-50 text-orange-700',
  green: 'bg-emerald-50 text-emerald-700',
  purple: 'bg-purple-50 text-purple-700',
};
