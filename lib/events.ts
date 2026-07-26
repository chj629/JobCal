// docs/database.md: events.event_type
export type EventType = "schedule" | "deadline" | "result_announcement";

export const EVENT_TYPES: EventType[] = ["schedule", "deadline", "result_announcement"];

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  schedule: "일정",
  deadline: "마감",
  result_announcement: "결과 발표",
};

// 캘린더/대시보드에서 종류별로 시각적으로 구분하기 위한 배지 색상.
export const EVENT_TYPE_BADGE_CLASS: Record<EventType, string> = {
  schedule: "bg-primary/10 text-primary",
  deadline: "bg-warning/10 text-warning",
  result_announcement: "bg-joined/10 text-joined",
};

// docs/database.md "다음 일정 계산": 동시각이면 deadline > schedule > result_announcement 우선
const EVENT_TYPE_PRIORITY: Record<EventType, number> = {
  deadline: 0,
  schedule: 1,
  result_announcement: 2,
};

export interface AppEvent {
  id: string;
  companyId: string;
  applicationStepId: string;
  eventType: EventType;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  dueAt: string | null;
  location: string | null;
  onlineUrl: string | null;
  memo: string | null;
}

// Supabase events 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface EventRow {
  id: string;
  user_id: string;
  company_id: string;
  application_step_id: string;
  event_type: EventType;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  due_at: string | null;
  location: string | null;
  online_url: string | null;
  memo: string | null;
}

export function rowToEvent(row: EventRow): AppEvent {
  return {
    id: row.id,
    companyId: row.company_id,
    applicationStepId: row.application_step_id,
    eventType: row.event_type,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dueAt: row.due_at,
    location: row.location,
    onlineUrl: row.online_url,
    memo: row.memo,
  };
}

export interface EventFormValues {
  eventType: EventType;
  title: string;
  startsAt: string; // <input type="datetime-local"> 문자열
  endsAt: string;
  dueAt: string;
  location: string;
  onlineUrl: string;
  memo: string;
}

export function createEmptyEventFormValues(eventType: EventType = "schedule"): EventFormValues {
  return {
    eventType,
    title: "",
    startsAt: "",
    endsAt: "",
    dueAt: "",
    location: "",
    onlineUrl: "",
    memo: "",
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocal(isoString: string): string {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function eventToFormValues(event: AppEvent): EventFormValues {
  return {
    eventType: event.eventType,
    title: event.title,
    startsAt: event.startsAt ? toDatetimeLocal(event.startsAt) : "",
    endsAt: event.endsAt ? toDatetimeLocal(event.endsAt) : "",
    dueAt: event.dueAt ? toDatetimeLocal(event.dueAt) : "",
    location: event.location ?? "",
    onlineUrl: event.onlineUrl ?? "",
    memo: event.memo ?? "",
  };
}

// docs/database.md 필드 사용 규칙: event_type에 따라 사용하는 필드만 채우고 나머지는 null로 저장한다.
export function eventFormValuesToRow(values: EventFormValues) {
  const isSchedule = values.eventType === "schedule";
  const isDeadlineOrResult =
    values.eventType === "deadline" || values.eventType === "result_announcement";

  return {
    event_type: values.eventType,
    title: values.title.trim(),
    starts_at: isSchedule && values.startsAt ? new Date(values.startsAt).toISOString() : null,
    ends_at: isSchedule && values.endsAt ? new Date(values.endsAt).toISOString() : null,
    due_at: isDeadlineOrResult && values.dueAt ? new Date(values.dueAt).toISOString() : null,
    location: isSchedule && values.location.trim() ? values.location.trim() : null,
    online_url: isSchedule && values.onlineUrl.trim() ? values.onlineUrl.trim() : null,
    memo: values.memo.trim() ? values.memo.trim() : null,
  };
}

// docs/database.md "다음 일정 계산": starts_at/due_at만 비교하고 ends_at은 비교 대상이 아니다.
// 과거 일정은 제외하고, 동시각이면 deadline > schedule > result_announcement 순으로 우선한다.
export function getNextEvent(events: AppEvent[]): AppEvent | null {
  const now = Date.now();

  const upcoming = events
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter(
      (entry): entry is { event: AppEvent; at: string } =>
        entry.at !== null && new Date(entry.at).getTime() >= now
    )
    .sort((a, b) => {
      const diff = new Date(a.at).getTime() - new Date(b.at).getTime();
      if (diff !== 0) return diff;
      return EVENT_TYPE_PRIORITY[a.event.eventType] - EVENT_TYPE_PRIORITY[b.event.eventType];
    });

  return upcoming[0]?.event ?? null;
}
