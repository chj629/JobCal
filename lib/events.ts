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

// AI 추출 결과처럼 값이 없을 수 있는 ISO 문자열을 <input type="datetime-local"> 문자열로 변환한다.
export function isoToDatetimeLocal(isoString: string | null): string {
  return isoString ? toDatetimeLocal(isoString) : "";
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

// location/online_url은 DB 컬럼상 서로 독립이라 둘 다 값을 가질 수 있다(예: AI 메일
// 분석이 이메일 원문에서 장소와 온라인 링크를 둘 다 추출한 경우) — 하지만 제품 결정상
// 사용자가 화면에서 "형식"을 확정하는 순간에는 항상 온라인/대면/미정 중 하나만 남는다.
// StepDetailPanel과 EmailAnalysisReview의 형식 select가 이 두 함수를 공유해, 화면마다
// "무엇을 온라인으로 볼지"·"확정 시 무엇을 지울지" 규칙이 어긋나지 않게 한다.
export type EventFormat = "online" | "offline" | "undecided";

// 표시 전용 파생: 실제로 저장된 값을 보고 지금 어떤 형식으로 "보여줘야" 하는지만 판단한다.
// 이 함수를 호출한다고 해서 DB나 로컬 상태가 바뀌지 않는다 — 온라인/대면 둘 다 값이 있는
// (레거시 또는 AI 추출 직후) 데이터도 그대로 두고 "일단 온라인으로 보여준다"는 우선순위만
// 정한다.
export function deriveEventFormat(values: Pick<EventFormValues, "location" | "onlineUrl">): EventFormat {
  if (values.onlineUrl) return "online";
  if (values.location) return "offline";
  return "undecided";
}

// 사용자가 형식을 "명시적으로" 확정했을 때만 호출해야 한다 — 선택한 형식에 해당하는
// 필드만 fieldValue로 남기고 반대쪽은 강제로 비운다(온라인→location 삭제, 대면→
// onlineUrl 삭제, 미정→둘 다 삭제). 단순히 형식 편집 화면을 열었다가 아무 것도 바꾸지
// 않고 닫는 경우에는 이 함수를 아예 호출하지 않는 것이 호출부의 책임이다 — 그래야
// location/online_url이 둘 다 있는 레거시·AI 추출 데이터가 사용자의 명시적 선택 전까지
// 그대로 보존된다.
export function applyExplicitEventFormat(
  values: EventFormValues,
  format: EventFormat,
  fieldValue: string
): EventFormValues {
  if (format === "online") {
    return { ...values, onlineUrl: fieldValue, location: "" };
  }
  if (format === "offline") {
    return { ...values, location: fieldValue, onlineUrl: "" };
  }
  return { ...values, onlineUrl: "", location: "" };
}

// docs/database.md 필드 사용 규칙: event_type에 따라 사용하는 필드만 채우고 나머지는 null로 저장한다.
// online_url은 예외적으로 모든 타입에 허용한다 (마감 제출 링크, 결과 확인 링크 등).
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
    online_url: values.onlineUrl.trim() ? values.onlineUrl.trim() : null,
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

// StepDetailPanel처럼 "이 전형에 실제로 등록된 일정"을 보여줘야 하는 곳에서 쓴다. getNextEvent와
// 달리 과거 일정도 대상에 포함한다 — 미래 일정이 있으면 그중 가장 가까운 것을, 없으면 과거
// 일정 중 가장 최근 것을 반환한다. 날짜가 있는 일정이 하나도 없으면 null.
export function getRepresentativeEvent(events: AppEvent[]): AppEvent | null {
  const now = Date.now();

  const dated = events
    .map((event) => ({ event, at: event.startsAt ?? event.dueAt }))
    .filter((entry): entry is { event: AppEvent; at: string } => entry.at !== null);

  const future = dated.filter((entry) => new Date(entry.at).getTime() >= now);
  if (future.length > 0) {
    future.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return future[0].event;
  }

  const past = dated.filter((entry) => new Date(entry.at).getTime() < now);
  past.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  return past[0]?.event ?? null;
}

// starts_at/due_at이 둘 다 없는 이벤트 — "날짜 미정" 일정. getNextEvent/getRepresentativeEvent가
// 이미 날짜가 있는 이벤트만 다루는 것과 정반대 조건이라, 그 판단 기준(entry.at !== null)을
// 그대로 뒤집어 하나로 공유한다. AI 메일 분석처럼 형식/URL/장소는 알지만 실시 일시는 아직
// 모르는 이벤트가 여기 해당한다. Calendar/Dashboard/getNextEvent는 이 이벤트를 계속 제외해야
// 하므로(정상 일정처럼 취급하면 안 됨) 그 필터들은 건드리지 않는다.
export function isUndatedEvent(event: Pick<AppEvent, "startsAt" | "dueAt">): boolean {
  return event.startsAt === null && event.dueAt === null;
}

// 한 전형에 날짜 미정 이벤트가 여러 개 쌓이는 경우는 드물다(수동 등록은 EventForm이 날짜를
// 필수로 요구해 애초에 만들 수 없고, AI 등록도 같은 전형·타입·제목의 날짜 미정 이벤트가 이미
// 있으면 EmailAnalysisReview가 새로 만들지 않고 그 이벤트를 채운다) — 있더라도 대표로 하나만
// 보여주면 충분하므로 첫 번째 항목을 쓴다.
export function getUndatedEvent(events: AppEvent[]): AppEvent | null {
  return events.find(isUndatedEvent) ?? null;
}

// formEventTimeIso(EventFormValues용)의 AppEvent 버전. EmailAnalysisReview가 "이미 저장된
// 이벤트와 이번에 새로 추출된 이벤트가 같은 일시를 가리키는지"를 비교할 때 양쪽에 동일한
// 규칙을 적용하기 위해 쓴다.
export function eventTimeIso(event: Pick<AppEvent, "eventType" | "startsAt" | "dueAt">): string | null {
  const raw = event.eventType === "schedule" ? event.startsAt : event.dueAt;
  return raw ? new Date(raw).toISOString() : null;
}

// 날짜 미정 이벤트에 새 분석 결과의 날짜가 확인됐을 때(EmailAnalysisReview) 새로 만들지 않고
// 기존 이벤트를 채우는 용도. 날짜/제목/타입 등은 incoming(새 분석 결과)을 그대로 쓰되,
// location/onlineUrl/memo는 이번에 비어 있으면(AI가 이번엔 못 뽑았거나 원래 없었으면) 기존
// 이벤트에 있던 값을 그대로 보존해, 이전에 확인된 정보가 날짜 확정 과정에서 사라지지 않게 한다.
export function mergeEventFormValues(
  existing: AppEvent,
  incoming: EventFormValues
): EventFormValues {
  return {
    ...incoming,
    location: incoming.location.trim() ? incoming.location : (existing.location ?? ""),
    onlineUrl: incoming.onlineUrl.trim() ? incoming.onlineUrl : (existing.onlineUrl ?? ""),
    memo: incoming.memo.trim() ? incoming.memo : (existing.memo ?? ""),
  };
}
