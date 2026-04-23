'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/home');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 text-sm">로딩 중...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Company Community</h1>
        <p className="text-lg text-slate-600 mb-8">실명·익명으로 자유롭게 소통하는 사내 커뮤니티</p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 bg-slate-200 text-slate-900 rounded-lg hover:bg-slate-300 font-medium"
          >
            회원가입
          </Link>
        </div>
      </div>
    </main>
  );
}
