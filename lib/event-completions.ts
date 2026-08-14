"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// event_completions는 이벤트 타입과 무관하게 event_id 단위로 체크 상태를 저장한다
// (0007_create_event_completions.sql). components/dashboard/TodayChecklist.tsx의
// useTodayChecklist(마감 이벤트만 필터링)와 캘린더 페이지의 오늘의 예정 체크리스트
// (일정 이벤트 대상)가 이 공용 훅을 함께 쓴다.
export function useEventCompletions() {
  const supabase = useMemo(() => createClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
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

      const { data, error } = await supabase.from("event_completions").select("event_id");

      if (!isMounted) return;

      if (error) {
        setError(error.message);
      } else if (data) {
        setCheckedIds(new Set(data.map((row) => row.event_id as string)));
      }

      setLoaded(true);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function toggle(eventId: string) {
    if (!userId || !loaded) return;
    setError(null);
    const isChecked = checkedIds.has(eventId);

    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });

    if (isChecked) {
      const { error } = await supabase
        .from("event_completions")
        .delete()
        .eq("event_id", eventId);

      if (error) {
        setError(error.message);
        setCheckedIds((prev) => new Set(prev).add(eventId));
      }
    } else {
      const { error } = await supabase
        .from("event_completions")
        .insert({ user_id: userId, event_id: eventId });

      if (error) {
        setError(error.message);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
    }
  }

  return { checkedIds, loaded, toggle, error };
}
