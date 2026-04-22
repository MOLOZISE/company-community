'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type PresencePayload = {
  userId?: string;
};

/**
 * Track online users in a presence room.
 */
export function usePresence(userId?: string | null, roomKey = 'online-users') {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setOnlineUserIds([]);
      return;
    }

    const channel = supabase.channel(roomKey, {
      config: {
        presence: { key: userId },
      },
    });

    const syncPresence = () => {
      const state = channel.presenceState<PresencePayload>();
      const ids = Object.values(state)
        .flat()
        .map((presence) => presence.userId)
        .filter((value): value is string => Boolean(value));
      setOnlineUserIds(Array.from(new Set(ids)));
    };

    channel.on('presence', { event: 'sync' }, syncPresence);

    void channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ userId });
        syncPresence();
      }
    });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [roomKey, userId]);

  return onlineUserIds;
}
