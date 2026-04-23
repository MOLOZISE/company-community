'use client';

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';

export function useRealtimeNotifications(userId: string | null | undefined, enabled = true) {
  const utils = trpc.useContext();

  useEffect(() => {
    if (!userId || !enabled) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => {
          utils.notifications.getUnreadCount.setData(undefined, (current) => (current ?? 0) + 1);
          utils.notifications.getUnreadCount.invalidate();
          utils.notifications.getList.invalidate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, userId, utils.notifications]);
}
