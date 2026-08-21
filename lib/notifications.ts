import { dateKeyOf, diffInDays, formatDateKey } from "@/lib/date";
import type { AppEvent } from "@/lib/events";
import type { Company } from "@/lib/companies";
import type { ApplicationStep, StepStatus } from "@/lib/applicationSteps";

// v1 알림센터가 다루는 종류. result_announcement는 이번 단계 범위 밖(요청 범위: deadline/
// schedule의 D-1/D-day만). "billing"(Paddle past_due)은 3단계에서 추가 — events 기반
// 계산과는 완전히 별도 경로(computeBillingNotification)로 계산되며, 이 kind만 bucket이 없다.
export type EventNotificationKind = "deadline" | "schedule";
export type NotificationBucket = "d1" | "d0";

export interface EventNotification {
  // deterministic key: `${kind}:${event.id}:${dateKey}:${bucket}`. dateKey(기준 일시의
  // YYYY-MM-DD)가 포함되므로 일정 날짜가 바뀌면 자동으로 새 key가 되어, 재조정 전 알림에
  // 대한 읽음 기록이 재조정 후 알림을 잘못 숨기는 일이 없다.
  key: string;
  kind: EventNotificationKind;
  bucket: NotificationBucket;
  eventId: string;
  companyId: string;
  companyName: string;
  title: string;
  // 알림의 기준 일시(deadline은 due_at, schedule은 starts_at) — 그대로 ISO 문자열.
  at: string;
}

// Paddle 구독 결제 이상(past_due) 알림. deadline/schedule과 달리 기업/일정에 연결되지
// 않고, 제목/설명이 이미 messages/*.json에 고정 문구로 존재한다(이벤트 title처럼 사용자
// 데이터를 조합하지 않음) — titleKey/descriptionKey를 이 단계에서 그대로 들고 있는다.
export interface BillingNotification {
  key: string;
  kind: "billing";
  titleKey: string;
  descriptionKey: string;
}

export type AppNotification = EventNotification | BillingNotification;

// messages/ja.json·ko.json의 notifications.* 키. kind/bucket 조합별 문구 템플릿을 여기
// (계산 로직과 같은 파일)에 고정해두고, 실제 번역(t())은 이 키를 소비하는 컴포넌트
// (components/NotificationPanel.tsx)에서 수행한다 — lib/notifications.ts 자체는 이전과
// 동일하게 locale을 모르는 순수 계산 로직으로 남긴다(components/calendar/EventDetailPopover.tsx의
// EVENT_TYPE_LABEL_KEYS와 같은 분리 방식).
export const NOTIFICATION_TITLE_KEYS: Record<EventNotificationKind, Record<NotificationBucket, string>> = {
  deadline: { d1: "notifications.deadlineD1", d0: "notifications.deadlineD0" },
  schedule: { d1: "notifications.scheduleD1", d0: "notifications.scheduleD0" },
};

// 알림에 표시하는 날짜/시간 문구 키. "5分前"류 상대 생성시각이 아니라, 알림이 가리키는
// 이벤트 자체의 실제 시각(D-1이면 "明日 {time}", D-day면 "{time}")이다.
export const NOTIFICATION_TIME_KEYS: Record<NotificationBucket, string> = {
  d1: "notifications.timeD1",
  d0: "notifications.timeD0",
};

// docs/database.md: waiting은 시스템이 캐스케이드 규칙에 따라 자동으로만 부여하는 상태로,
// 아직 차례가 오지 않았을 뿐인 "진행 예정" 전형이다(사용자가 미리 일정을 등록해둘 수 있음).
// passed/failed만 "이미 종료된 전형"이고, waiting/in_progress는 둘 다 여전히 진행 중인
// 전형으로 취급해 알림 대상에 유지한다.
const CONCLUDED_STEP_STATUSES: ReadonlySet<StepStatus> = new Set(["passed", "failed"]);

function isStepConcluded(applicationStepId: string, stepsById: Map<string, ApplicationStep>): boolean {
  const step = stepsById.get(applicationStepId);
  // 연결된 전형을 찾을 수 없는 경우(정상적으로는 전형 삭제 시 이벤트도 cascade 삭제되어
  // 발생하지 않아야 함) 알림을 임의로 숨기지 않고 안전하게 포함한다.
  if (!step) return false;
  return CONCLUDED_STEP_STATUSES.has(step.stepStatus);
}

function buildNotification(
  kind: EventNotificationKind,
  bucket: NotificationBucket,
  event: AppEvent,
  at: string,
  dateKey: string,
  companiesById: Map<string, Company>
): EventNotification {
  const company = companiesById.get(event.companyId);

  return {
    key: `${kind}:${event.id}:${dateKey}:${bucket}`,
    kind,
    bucket,
    eventId: event.id,
    companyId: event.companyId,
    companyName: company?.name ?? "",
    title: event.title,
    at,
  };
}

// events/companies/applicationSteps는 모두 이미 각자의 Context Provider가 클라이언트에 전량
// 로드해둔 상태를 그대로 받는다 — 이 함수는 추가 쿼리를 하지 않는 순수 계산 함수다.
// now를 인자로 받아 테스트에서 특정 시각을 고정할 수 있게 한다(기본값: 호출 시점).
export function computeNotifications(
  events: AppEvent[],
  companies: Company[],
  applicationSteps: ApplicationStep[],
  now: Date = new Date()
): EventNotification[] {
  const companiesById = new Map(companies.map((company) => [company.id, company]));
  const stepsById = new Map(applicationSteps.map((step) => [step.id, step]));
  const today = formatDateKey(now);

  const notifications: EventNotification[] = [];

  for (const event of events) {
    // application_step_id가 없는 이벤트는 정상 포함, 있으면 종료된(passed/failed) 전형인
    // 경우에만 제외한다.
    if (event.applicationStepId && isStepConcluded(event.applicationStepId, stepsById)) {
      continue;
    }

    const kind: EventNotificationKind | null =
      event.eventType === "deadline" ? "deadline" : event.eventType === "schedule" ? "schedule" : null;
    if (!kind) continue;

    const at = kind === "deadline" ? event.dueAt : event.startsAt;
    if (!at) continue;

    const dateKey = dateKeyOf(at);
    const diff = diffInDays(today, dateKey);

    if (diff === 1) {
      notifications.push(buildNotification(kind, "d1", event, at, dateKey, companiesById));
    } else if (diff === 0) {
      notifications.push(buildNotification(kind, "d0", event, at, dateKey, companiesById));
    }
  }

  return notifications.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

// Paddle 결제 이상(past_due) 알림 — computeNotifications와 완전히 분리된 별도 계산.
// events/companies/applicationSteps를 전혀 건드리지 않으므로 기존 deadline/schedule 계산에는
// 어떤 영향도 없다. subscriptionStatus는 lib/paddle/getUserSubscriptionSummary.ts가 이미
// 읽어오는 paddle_subscriptions.status를 그대로 받는다 — 새 Paddle 이벤트/컬럼을 추가하지
// 않고, "past_due일 때만 하나 표시"라는 요구를 이 함수 안에서 판정만 한다. Pro 판정
// (lib/paddle/getUserPlan.ts)에는 전혀 관여하지 않는다.
//
// key 설계: `billing:{paddle_subscription_id}:past_due:{cycleKey}`. updated_at은 의도적으로
// 쓰지 않는다 — subscription.updated는 scheduled_change 등 결제 실패와 무관한 변경에도 매번
// updated_at을 갱신하므로(lib/paddle/processWebhook.ts의 upsertSubscription은 이벤트가 올
// 때마다 무조건 upsert한다), updated_at을 key에 넣으면 "같은 past_due 상태가 계속 이어지는
// 중"에도 무관한 웹훅 재전송/필드 변경만으로 새 unread 알림이 생겨버린다.
//
// 대신 cycleKey로 paddle_subscriptions.current_billing_period_starts_at(0023)을 쓴다 — 이
// 값은 Paddle이 subscription.created/updated 페이로드에 이미 실어 보내는
// current_billing_period.starts_at을 그대로 저장한 것으로, "지금 이미 시작되어 아직
// 갱신되지 않은" 결제 주기의 시작 시각이다. 결제 재시도(dunning)나 scheduled_change 같은
// 무관한 필드 변경으로는 바뀌지 않고, 실제로 결제가 성공해 다음 결제 주기로 넘어갈 때만
// 바뀐다 — 즉:
//   - 같은 past_due가 이어지는 동안은 cycleKey가 항상 같아 새 unread가 생기지 않는다.
//   - past_due가 해소(다음 주기로 갱신 성공)됐다가 나중에 다시 past_due가 되면, 그 사이
//     cycleKey가 반드시 바뀌어 있으므로 새 key가 되어 다시 unread로 표시된다.
// cycleKey가 아직 없으면(0023 배포 이전에 이미 upsert된 오래된 행 등) "unknown"으로
// fallback한다 — 다음 웹훅이 도착해 실제 값이 채워지면 그 순간 한 번만 key가 바뀐다(무해한
// 일회성 재표시).
export function computeBillingNotification(
  subscriptionId: string | null,
  subscriptionStatus: string | null,
  currentBillingPeriodStartsAt: string | null
): BillingNotification | null {
  if (subscriptionStatus !== "past_due" || !subscriptionId) return null;

  const cycleKey = currentBillingPeriodStartsAt ?? "unknown";

  return {
    key: `billing:${subscriptionId}:past_due:${cycleKey}`,
    kind: "billing",
    titleKey: "notifications.billingPastDueTitle",
    descriptionKey: "notifications.billingPastDueDescription",
  };
}
