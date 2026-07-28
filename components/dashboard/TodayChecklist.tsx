"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { todayKey, dateKeyOf } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPE_LABELS, type AppEvent } from "@/lib/events";

// 오늘 마감 체크리스트의 데이터/토글 로직. TodayChecklist와 통합 뷰(TodaySchedule)가
// 함께 재사용할 수 있도록 훅으로 분리했다. 계산/저장 방식은 이전과 동일하다.
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

interface TodayChecklistProps {
  companies: Company[];
  events: AppEvent[];
}

export default function TodayChecklist({ companies, events }: TodayChecklistProps) {
  const { todayDeadlines, checkedIds, loaded, toggle, taskError } = useTodayChecklist(events);

  return (
    <section className="rounded-[10px] border border-border bg-card">
      <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
        오늘 해야 할 일
      </h2>

      {taskError && (
        <p className="border-b border-error/40 bg-error/10 px-6 py-2 text-xs text-error">
          {taskError}
        </p>
      )}

      {todayDeadlines.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          오늘 예정된 일정이 없습니다 🎉
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {todayDeadlines.map((event) => {
            const company = companies.find((c) => c.id === event.companyId);
            const checked = checkedIds.has(event.id);

            return (
              <li
                key={event.id}
                className="flex items-center gap-3 px-6 py-3 transition-colors duration-150 hover:bg-background"
              >
                <button
                  type="button"
                  onClick={() => toggle(event.id)}
                  disabled={!loaded}
                  aria-pressed={checked}
                  aria-label={`${event.title} 완료 표시`}
                  className={
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border text-xs disabled:cursor-not-allowed disabled:opacity-50 " +
                    (checked
                      ? "border-primary bg-primary text-white"
                      : "border-border text-transparent")
                  }
                >
                  ✓
                </button>
                <Link
                  href={`/companies/${event.companyId}`}
                  className="flex min-w-0 flex-1 items-center gap-2"
                >
                  <span
                    className={
                      "truncate text-sm " +
                      (checked ? "text-secondary line-through" : "text-foreground")
                    }
                  >
                    {event.title}
                  </span>
                  <span className="truncate text-xs text-secondary">· {company?.name ?? ""}</span>
                </Link>
                <span
                  className={
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium " +
                    EVENT_TYPE_BADGE_CLASS.deadline
                  }
                >
                  {EVENT_TYPE_LABELS.deadline}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
