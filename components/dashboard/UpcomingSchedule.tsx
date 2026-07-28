"use client";

import Link from "next/link";
import { getTodayResultsList } from "@/components/dashboard/TodayResults";
import { getUpcomingHighlights } from "@/components/dashboard/UpcomingDDay";
import { getUpcomingDeadlinesList } from "@/components/dashboard/UpcomingDeadlines";
import { dateKeyOf, diffInDays, formatTimeOfDay, todayKey } from "@/lib/date";
import type { Company } from "@/lib/companies";
import { EVENT_TYPE_BADGE_CLASS, EVENT_TYPE_LABELS, type AppEvent } from "@/lib/events";
import type { ApplicationStep } from "@/lib/applicationSteps";

interface UpcomingScheduleProps {
  companies: Company[];
  events: AppEvent[];
  steps: ApplicationStep[];
}

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_ROWS = 5;

function formatRowDate(iso: string) {
  const key = dateKeyOf(iso);
  const diff = diffInDays(todayKey(), key);
  if (diff === 0) return "오늘";
  if (diff === 1) return "내일";

  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())} (${WEEKDAY_LABELS[date.getDay()]})`;
}

// 01-dashboard.png의 "다가오는 일정" 표. TodayResults/UpcomingDDay/UpcomingDeadlines의
// 기존 계산 함수를 그대로 재사용해 이벤트를 시간순으로 합친다. 같은 이벤트가 여러 계산에
// 동시에 걸리는 경우(예: 회사별 최근 일정과 마감 목록이 겹치는 경우)를 대비해 event.id
// 기준으로 중복만 제거하고, 필터링/정렬 로직 자체는 손대지 않는다.
export default function UpcomingSchedule({ companies, events, steps }: UpcomingScheduleProps) {
  const combined = new Map<string, { event: AppEvent; at: string }>();

  for (const event of getTodayResultsList(events)) {
    combined.set(event.id, { event, at: event.dueAt as string });
  }
  for (const event of getUpcomingDeadlinesList(events)) {
    combined.set(event.id, { event, at: event.dueAt as string });
  }
  for (const { event, at } of getUpcomingHighlights(companies, events)) {
    combined.set(event.id, { event, at });
  }

  const rows = Array.from(combined.values())
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(0, MAX_ROWS);

  return (
    <section className="flex h-[346px] flex-col rounded-[10px] border border-border bg-card">
      <h2 className="px-6 py-4 text-[16px] font-semibold text-foreground">다가오는 일정</h2>

      {rows.length === 0 ? (
        <p className="flex flex-1 items-center justify-center px-6 py-10 text-center text-sm text-secondary">
          다가오는 일정이 없습니다.
        </p>
      ) : (
        <div className="mx-6 flex-1 overflow-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="shadow-[0_2px_3px_-2px_rgba(0,0,0,0.08)]">
              <tr className="bg-background text-left text-xs text-secondary">
                <th className="px-2 py-2 font-medium">날짜</th>
                <th className="px-2 py-2 font-medium">시간</th>
                <th className="px-2 py-2 font-medium">기업</th>
                <th className="px-2 py-2 font-medium">전형</th>
                <th className="px-2 py-2 font-medium">장소/방식</th>
                <th className="px-2 py-2 font-medium">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ event, at }) => {
                const company = companies.find((c) => c.id === event.companyId);
                const step = steps.find((s) => s.id === event.applicationStepId);
                const place = event.location ?? (event.onlineUrl ? "온라인" : "-");

                return (
                  <tr key={event.id} className="hover:bg-background">
                    <td className="px-2 py-2.5 text-secondary">{formatRowDate(at)}</td>
                    <td className="px-2 py-2.5 text-foreground">{formatTimeOfDay(at)}</td>
                    <td className="px-2 py-2.5">
                      <Link
                        href={`/companies/${event.companyId}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {company?.name ?? ""}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-secondary">{step?.name ?? event.title}</td>
                    <td className="px-2 py-2.5 text-secondary">{place}</td>
                    <td className="px-2 py-2.5">
                      <span
                        className={
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium " +
                          EVENT_TYPE_BADGE_CLASS[event.eventType]
                        }
                      >
                        {EVENT_TYPE_LABELS[event.eventType]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mx-6 pt-3 pb-3">
        <Link
          href="/calendar"
          className="flex h-9 w-full items-center justify-center rounded-[8px] border border-border px-4 text-xs font-medium text-primary transition-colors duration-150 hover:bg-background"
        >
          더 많은 일정 보기 ↓
        </Link>
      </div>
    </section>
  );
}
