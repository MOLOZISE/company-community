'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
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
  type: string | null;
  purpose: string | null;
  postingMode: string | null;
  scope: string | null;
  displayOrder: number | null;
};

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

  // Board taxonomy grouping
  const noticeBoards = boards.filter((b) => b.purpose === 'announcement');
  const anonBoards = boards.filter((b) => b.postingMode === 'anonymous_only');
  const generalBoards = boards.filter(
    (b) => b.purpose !== 'announcement' && b.postingMode !== 'anonymous_only'
  );

  const mySpaces = spaces.filter((s) => myChannelIds?.includes(s.id));
  const otherSpaces = spaces.filter((s) => !myChannelIds?.includes(s.id));

  function isMember(id: string) {
    return myChannelIds?.includes(id) ?? false;
  }

  function boardPath(slug: string) {
    return `/boards/${slug}`;
  }
  function spacePath(slug: string) {
    return `/spaces/${slug}`;
  }

  return (
    <aside className="w-56 shrink-0">
      {showRequestModal && <ChannelRequestModal onClose={() => setShowRequestModal(false)} />}
      <div className="sticky top-20 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 6rem)' }}>

        {/* 공지 / 필독 */}
        {noticeBoards.length > 0 && (
          <NavSection label="📌 공지 / 필독">
            {noticeBoards.map((b) => (
              <NavLink
                key={b.id}
                href={boardPath(b.slug)}
                active={pathname === boardPath(b.slug)}
                onClick={onNavigate}
              >
                {b.name}
              </NavLink>
            ))}
          </NavSection>
        )}

        {/* 공통 게시판 */}
        {generalBoards.length > 0 && (
          <NavSection label="🗂 게시판">
            <NavLink href="/boards" active={pathname === '/boards'} onClick={onNavigate}>
              전체 게시판
            </NavLink>
            {generalBoards.map((b) => (
              <NavLink
                key={b.id}
                href={boardPath(b.slug)}
                active={pathname === boardPath(b.slug)}
                onClick={onNavigate}
                joined={isMember(b.id)}
                onJoinLeave={() =>
                  isMember(b.id)
                    ? leave.mutate({ channelId: b.id })
                    : join.mutate({ channelId: b.id })
                }
              >
                # {b.name}
              </NavLink>
            ))}
          </NavSection>
        )}

        {/* 익명 게시판 */}
        {anonBoards.length > 0 && (
          <NavSection label="🔒 익명 게시판">
            {anonBoards.map((b) => (
              <NavLink
                key={b.id}
                href={boardPath(b.slug)}
                active={pathname === boardPath(b.slug)}
                onClick={onNavigate}
              >
                {b.name}
              </NavLink>
            ))}
          </NavSection>
        )}

        {/* 내 공간 */}
        <NavSection label="🚀 내 공간">
          <NavLink href="/spaces" active={pathname === '/spaces'} onClick={onNavigate}>
            공간 탐색
          </NavLink>
          {mySpaces.map((s) => (
            <NavLink
              key={s.id}
              href={spacePath(s.slug)}
              active={pathname === spacePath(s.slug)}
              onClick={onNavigate}
              joined
              onJoinLeave={() => leave.mutate({ channelId: s.id })}
            >
              · {s.name}
            </NavLink>
          ))}
          {otherSpaces.slice(0, 3).map((s) => (
            <NavLink
              key={s.id}
              href={spacePath(s.slug)}
              active={pathname === spacePath(s.slug)}
              onClick={onNavigate}
              joined={false}
              onJoinLeave={() => join.mutate({ channelId: s.id })}
            >
              · {s.name}
            </NavLink>
          ))}
        </NavSection>

        {/* 관리자 */}
        {isAdmin && (
          <NavSection label="⚙ 관리">
            <NavLink href="/admin/channels" active={pathname === '/admin/channels'} onClick={onNavigate}>
              채널 신청 관리
            </NavLink>
            <NavLink href="/admin/reports" active={pathname === '/admin/reports'} onClick={onNavigate}>
              신고 관리
            </NavLink>
          </NavSection>
        )}

        {/* 모아보기 — 하단 보조 */}
        <div className="border-t border-slate-200 pt-1">
          <NavLink href="/feed" active={pathname === '/feed'} onClick={onNavigate} muted>
            📰 모아보기
          </NavLink>
          <div className="px-3 pb-2 pt-1 text-xs text-slate-400">
            지금 활동 중 {onlineUserCount.toLocaleString()}명
          </div>
        </div>

        <button
          onClick={() => setShowRequestModal(true)}
          className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
        >
          + 게시판 / 공간 개설 신청
        </button>
      </div>
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white py-2">
      <p className="px-3 pb-1 pt-1 text-xs font-semibold tracking-wide text-slate-400">{label}</p>
      <nav className="px-1">{children}</nav>
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
        className={`flex-1 truncate px-3 py-2 text-sm ${
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
          onClick={onJoinLeave}
          className={`mr-1 rounded px-1.5 py-0.5 text-xs opacity-0 group-hover:opacity-100 ${
            joined
              ? 'text-slate-300 hover:text-red-400'
              : 'text-slate-400 hover:bg-blue-50 hover:text-blue-600'
          }`}
          title={joined ? '나가기' : '참여'}
        >
          {joined ? '✕' : '+'}
        </button>
      )}
    </div>
  );
}
