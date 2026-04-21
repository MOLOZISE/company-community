'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Sidebar } from '@/components/Sidebar';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchBar } from '@/components/SearchBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) router.replace('/login');
  }, [user, isLoading, router]);

  // Close drawer on resize to desktop
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="채널 메뉴 열기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/feed" className="font-bold text-slate-900 hover:text-blue-600">
              Company Community
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            <SearchBar />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />
            <Link href="/profile" className="text-sm text-slate-500 hover:text-slate-900 px-2 py-1">
              프로필
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-slate-500 hover:text-slate-900 px-2 py-1"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/40 md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-64 z-30 bg-white shadow-xl md:hidden overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-semibold text-slate-800">채널</span>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <div className="p-2">
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 flex gap-6">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
