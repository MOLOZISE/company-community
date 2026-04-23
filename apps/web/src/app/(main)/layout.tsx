'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchBar } from '@/components/SearchBar';
import { RightSidebar } from '@/components/RightSidebar';
import { usePresence } from '@/hooks/usePresence';
import { trpc } from '@/lib/trpc';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const onlineUserIds = usePresence(user?.id);
  const { data: communityStats } = trpc.trending.getCommunityStats.useQuery();
  const { data: trendingTopics } = trpc.trending.getTrendingTopics.useQuery();
  const { data: activeChannels } = trpc.trending.getActiveChannels.useQuery();

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <div className="text-sm text-slate-400">불러오는 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-transparent">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              aria-label="채널 메뉴 열기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/boards" className="font-bold text-slate-950 hover:text-blue-600">
              Company Community
            </Link>
          </div>

          <div className="flex flex-1 justify-center">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationBell />
            <Link href="/profile" className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              프로필
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed left-0 top-0 z-30 h-full w-72 overflow-y-auto bg-white shadow-xl md:hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <span className="font-semibold text-slate-800">게시판 / 공간</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-600"
                aria-label="닫기"
              >
                닫기
              </button>
            </div>
            <div className="p-3">
              <Sidebar onNavigate={() => setDrawerOpen(false)} onlineUserCount={onlineUserIds.length} />
            </div>
          </div>
        </>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[14rem_minmax(0,1fr)_18rem]">
        <div className="hidden md:block">
          <Sidebar onlineUserCount={onlineUserIds.length} />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
        <RightSidebar stats={communityStats} topics={trendingTopics} channels={activeChannels} />
      </div>
    </div>
  );
}
