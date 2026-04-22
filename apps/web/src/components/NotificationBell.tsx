'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { relativeTime } from '@/lib/time';
import { useAuthStore } from '@/store/auth';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

const TYPE_LABEL: Record<string, string> = {
  comment: '댓글',
  reply: '답글',
  vote: '투표',
  mention: '멘션',
};

function getTargetLink(
  postId: string | null,
  targetType: string | null,
  targetId: string | null
): string {
  if (postId) {
    return targetType === 'comment' && targetId ? `/posts/${postId}#comment-${targetId}` : `/posts/${postId}`;
  }
  if (targetType === 'post' && targetId) return `/posts/${targetId}`;
  return '/';
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const utils = trpc.useContext();
  const { user } = useAuthStore();
  useRealtimeNotifications(user?.id);

  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const { data: items = [] } = trpc.notifications.getList.useQuery(
    { limit: 20 },
    { enabled: open && !!user }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.getUnreadCount.invalidate(),
  });

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUnreadCount.invalidate();
      utils.notifications.getList.invalidate();
    },
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleNotificationClick(n: (typeof items)[number]) {
    if (!n.isRead) markRead.mutate({ id: n.id });
    const link = getTargetLink(n.postId, n.targetType, n.targetId);
    setOpen(false);
    router.push(link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
        aria-label="알림"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-1rem))] bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">알림</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">알림이 없습니다</p>
            ) : (
              items.map((n) => {
                const hasLink = true;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`px-4 py-3 border-b border-slate-50 transition-colors ${
                      hasLink ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
                    } ${!n.isRead ? 'bg-indigo-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                      <div className={!n.isRead ? '' : 'pl-4'}>
                        <p className="text-xs font-medium text-indigo-600 mb-0.5">
                          {TYPE_LABEL[n.type] ?? n.type}
                          {hasLink && <span className="ml-1 text-slate-400">→</span>}
                        </p>
                        <p className="text-sm text-slate-700">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
