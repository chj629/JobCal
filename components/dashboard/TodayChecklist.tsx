"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { todayKey } from "@/lib/date";
import { STEP_TASK_LABELS, type Company } from "@/lib/companies";

interface TodayChecklistProps {
  companies: Company[];
}

export default function TodayChecklist({ companies }: TodayChecklistProps) {
  const supabase = useMemo(() => createClient(), []);
  const today = todayKey();
  const todayCompanies = companies.filter((company) => company.nextSchedule === today);

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

      const { data, error } = await supabase
        .from("task_completions")
        .select("company_id")
        .eq("schedule_date", today);

      if (!isMounted) return;

      if (error) {
        setTaskError(error.message);
      } else if (data) {
        setCheckedIds(new Set(data.map((row) => row.company_id as string)));
      }

      // load()는 마운트 시 한 번만 실행되므로, 이 시점 이후로는 toggle()의
      // 낙관적 업데이트를 되돌릴 일이 없다. loaded 이전의 클릭은 아래 toggle()에서 막는다.
      setLoaded(true);
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [supabase, today]);

  async function toggle(companyId: string) {
    if (!userId || !loaded) return;
    setTaskError(null);
    const isChecked = checkedIds.has(companyId);

    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (isChecked) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });

    if (isChecked) {
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("company_id", companyId)
        .eq("schedule_date", today);

      if (error) {
        setTaskError(error.message);
        setCheckedIds((prev) => new Set(prev).add(companyId));
      }
    } else {
      const { error } = await supabase
        .from("task_completions")
        .insert({ user_id: userId, company_id: companyId, schedule_date: today });

      if (error) {
        setTaskError(error.message);
        setCheckedIds((prev) => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
      }
    }
  }

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

      {todayCompanies.length === 0 ? (
        <p className="px-6 py-10 text-center text-sm text-secondary">
          오늘 예정된 일정이 없습니다 🎉
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {todayCompanies.map((company) => {
            const checked = checkedIds.has(company.id);
            const taskLabel = STEP_TASK_LABELS[company.currentStep] ?? `오늘 ${company.currentStep}`;

            return (
              <li key={company.id} className="flex items-center gap-3 px-6 py-3">
                <button
                  type="button"
                  onClick={() => toggle(company.id)}
                  disabled={!loaded}
                  aria-pressed={checked}
                  aria-label={`${company.name} 완료 표시`}
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
                  href={`/companies/${company.id}`}
                  className={
                    "flex-1 truncate text-sm hover:text-primary " +
                    (checked ? "text-secondary line-through" : "text-foreground")
                  }
                >
                  {taskLabel} <span className="text-secondary">· {company.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
