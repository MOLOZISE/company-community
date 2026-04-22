'use client';

import Link from 'next/link';
import { useEffect } from 'react';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-16">
      <div className="w-full rounded-[var(--cc-radius-card)] border border-slate-200 bg-white p-8 shadow-[var(--cc-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Error</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">문제가 생겼어요</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 새로고침해서 페이지를 다시 불러오면 됩니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={reset}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            다시 시도
          </button>
          <Link
            href="/feed"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            피드로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
