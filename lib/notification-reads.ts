"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// notification_reads(0022)의 읽음 키 집합을 조회/기록하는 훅. lib/event-completions.ts의
// useEventCompletions()와 같은 모양(Set 상태 + optimistic update)을 그대로 따른다.
//
// 알림 자체(lib/notifications.ts)는 서버에 저장되지 않고 매번 즉석 계산되므로, 이 훅이
// 다루는 것은 오직 "이 deterministic key를 읽었는지" 뿐이다.
export function useNotificationReads() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (!user) {
        setLoaded(true);
        return;
      }

      setUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from("notification_reads")
        .select("notification_key");

      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setReadKeys(new Set(data.map((row) => row.notification_key as string)));
      }

      setLoaded(true);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // 개별 읽음 처리. 이미 읽은 key를 다시 넘겨도(중복 클릭 등) unique(user_id,
  // notification_key) 충돌이 upsert(ignoreDuplicates: true)로 조용히 무시되어 에러가 나지
  // 않는다 — notification_reads에는 update 정책이 없어 이 upsert는 실제로는
  // "INSERT ... ON CONFLICT DO NOTHING"으로만 동작한다.
  async function markRead(key: string) {
    if (!userId || !loaded || readKeys.has(key)) return;

    setError(null);
    setReadKeys((prev) => new Set(prev).add(key));

    const { error: upsertError } = await supabase
      .from("notification_reads")
      .upsert(
        { user_id: userId, notification_key: key },
        { onConflict: "user_id,notification_key", ignoreDuplicates: true }
      );

    if (upsertError) {
      setError(upsertError.message);
      setReadKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // "すべて既読にする": 아직 읽지 않은 key만 골라 한 번의 upsert로 일괄 처리한다. 이미 읽은
  // key가 섞여 들어와도(방어적으로) unique 충돌은 markRead와 동일하게 조용히 무시된다.
  async function markAllRead(keys: string[]) {
    if (!userId || !loaded) return;

    const unreadKeys = keys.filter((key) => !readKeys.has(key));
    if (unreadKeys.length === 0) return;

    setError(null);
    setReadKeys((prev) => {
      const next = new Set(prev);
      for (const key of unreadKeys) next.add(key);
      return next;
    });

    const { error: upsertError } = await supabase
      .from("notification_reads")
      .upsert(
        unreadKeys.map((key) => ({ user_id: userId, notification_key: key })),
        { onConflict: "user_id,notification_key", ignoreDuplicates: true }
      );

    if (upsertError) {
      setError(upsertError.message);
      setReadKeys((prev) => {
        const next = new Set(prev);
        for (const key of unreadKeys) next.delete(key);
        return next;
      });
    }
  }

  return { readKeys, loaded, markRead, markAllRead, error };
}
