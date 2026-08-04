"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayKey, dateKeyOf } from "@/lib/date";
import type { AppEvent } from "@/lib/events";

// 오늘 마감 체크리스트의 데이터/토글 로직. 통합 뷰(TodaySchedule)가 재사용할 수 있도록
// 훅으로 분리했다. 계산/저장 방식은 이전과 동일하다.
export function useTodayChecklist(events: AppEvent[]) {
  const supabase = useMemo(() => createClient(), []);
  const today = todayKey();

  const todayDeadlines = events
    .filter((event) => event.eventType === "deadline" && event.dueAt !== null)
    .filter((event) => dateKeyOf(event.dueAt as string) === today)
    .sort((a, b) => new Date(a.dueAt as string).getTime() - new Date(b.dueAt as string).getTime());

  const [userId, setUserId] = useState<string | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

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
        setTaskError(error.message);
      } else if (data) {
        setCheckedIds(new Set(data.map((row) => row.event_id as string)));
      }

      // load()는 마운트 시 한 번만 실행되므로, 이 시점 이후로는 toggle()의
      // 낙관적 업데이트를 되돌릴 일이 없다. loaded 이전의 클릭은 아래 toggle()에서 막는다.
      setLoaded(true);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function toggle(eventId: string) {
    if (!userId || !loaded) return;
    setTaskError(null);
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
        setTaskError(error.message);
        setCheckedIds((prev) => new Set(prev).add(eventId));
      }
    } else {
      const { error } = await supabase
        .from("event_completions")
        .insert({ user_id: userId, event_id: eventId });

      if (error) {
        setTaskError(error.message);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
    }
  }

  return { todayDeadlines, checkedIds, loaded, toggle, taskError };
}
