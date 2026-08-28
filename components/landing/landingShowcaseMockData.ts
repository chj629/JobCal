import type { Company } from "@/lib/companies";
import type { AppEvent } from "@/lib/events";
import type { ApplicationStep, StepStatus } from "@/lib/applicationSteps";
import { DEFAULT_STEP_KEYS } from "@/lib/applicationSteps";
import {
  addDaysToDateKey,
  datetimeLocalInAsiaTokyoToIso,
  todayKeyInAsiaTokyo,
} from "@/lib/date";

// 56차: Dashboard/Calendar/Companies 랜딩 쇼케이스 전용 목업 데이터. 실제 서비스 컴포넌트
// (TodayChecklistCard, TodaySchedule, UpcomingSchedule, PipelineOverview, FocusCompanies,
// MiniCalendar, TodayEventsCard, CalendarWeeklyProgress, CalendarMonthGrid)를 그대로
// 재사용하되, 비로그인 방문자에게는 실제 데이터가 없으므로 이 파일이 그 컴포넌트들의
// props 타입(Company/AppEvent/ApplicationStep)에 맞는 그럴듯한 표본 데이터를 만들어 준다.
// 날짜는 항상 호출 시점의 "오늘"을 기준으로 상대적으로 계산해서, 방문 시점과 무관하게
// 항상 "오늘 일정/이번 주 마감" 같은 카드들이 빈 화면이 아니라 채워진 상태로 보이게 한다.

function isoAt(daysFromToday: number, hour: number, minute = 0): string {
  const date = addDaysToDateKey(todayKeyInAsiaTokyo(), daysFromToday);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return datetimeLocalInAsiaTokyoToIso(`${date}T${time}`);
}

function dateKey(daysFromToday: number): string {
  return addDaysToDateKey(todayKeyInAsiaTokyo(), daysFromToday);
}

function buildSteps(companyId: string, currentIndex: number | null): ApplicationStep[] {
  return DEFAULT_STEP_KEYS.map((key, index) => {
    let status: StepStatus = "waiting";
    if (currentIndex === null) {
      status = "passed";
    } else if (index < currentIndex) {
      status = "passed";
    } else if (index === currentIndex) {
      status = "in_progress";
    }
    return {
      id: `${companyId}-step-${key}`,
      companyId,
      name: key,
      stepKey: key,
      stepOrder: index + 1,
      stepStatus: status,
    };
  });
}

export interface ShowcaseMockData {
  companies: Company[];
  steps: ApplicationStep[];
  events: AppEvent[];
}

export function buildShowcaseMockData(t: (key: string) => string): ShowcaseMockData {
  function emptyCompanyFields() {
    return {
      websiteUrl: "",
      mypageUrl: "",
      selectionMemo: "",
      location: "",
      industry: "",
      source: "",
    };
  }

  const companies: Company[] = [
    {
      id: "showcase-c1",
      name: t("landing.showcase.mock.company1"),
      overallStatus: "in_progress",
      priority: "high",
      createdAt: dateKey(-21),
      updatedAt: dateKey(-1),
      position: "",
      ...emptyCompanyFields(),
    },
    {
      id: "showcase-c2",
      name: t("landing.showcase.mock.company2"),
      overallStatus: "in_progress",
      priority: "medium",
      createdAt: dateKey(-14),
      updatedAt: dateKey(0),
      position: "",
      ...emptyCompanyFields(),
    },
    {
      id: "showcase-c3",
      name: t("landing.showcase.mock.company3"),
      overallStatus: "in_progress",
      priority: "high",
      createdAt: dateKey(-30),
      updatedAt: dateKey(-2),
      position: "",
      ...emptyCompanyFields(),
    },
    {
      id: "showcase-c4",
      name: t("landing.showcase.mock.company4"),
      overallStatus: "offer",
      priority: "medium",
      createdAt: dateKey(-40),
      updatedAt: dateKey(-3),
      position: "",
      ...emptyCompanyFields(),
    },
    {
      id: "showcase-c5",
      name: t("landing.showcase.mock.company5"),
      overallStatus: "in_progress",
      priority: "low",
      createdAt: dateKey(-5),
      updatedAt: dateKey(-1),
      position: "",
      ...emptyCompanyFields(),
    },
  ];

  const steps: ApplicationStep[] = [
    ...buildSteps("showcase-c1", 5), // interview_1 진행 중
    ...buildSteps("showcase-c2", 2), // es 진행 중
    ...buildSteps("showcase-c3", 6), // interview_2 진행 중
    ...buildSteps("showcase-c4", null), // 전부 통과(내정)
    ...buildSteps("showcase-c5", 0), // entry 진행 중
  ];

  function stepIdFor(companyId: string, key: string): string {
    return `${companyId}-step-${key}`;
  }

  const events: AppEvent[] = [
    {
      id: "showcase-e1",
      companyId: "showcase-c1",
      applicationStepId: stepIdFor("showcase-c1", "interview_1"),
      eventType: "schedule",
      title: t("landing.showcase.mock.eventInterview1"),
      startsAt: isoAt(0, 14, 0),
      endsAt: isoAt(0, 15, 0),
      dueAt: null,
      location: null,
      onlineUrl: null,
      memo: null,
    },
    {
      id: "showcase-e2",
      companyId: "showcase-c2",
      applicationStepId: stepIdFor("showcase-c2", "es"),
      eventType: "deadline",
      title: t("landing.showcase.mock.eventEsDeadline"),
      startsAt: null,
      endsAt: null,
      dueAt: isoAt(0, 23, 59),
      location: null,
      onlineUrl: null,
      memo: null,
    },
    {
      id: "showcase-e3",
      companyId: "showcase-c3",
      applicationStepId: stepIdFor("showcase-c3", "interview_2"),
      eventType: "schedule",
      title: t("landing.showcase.mock.eventInterview2"),
      startsAt: isoAt(1, 10, 30),
      endsAt: isoAt(1, 11, 30),
      dueAt: null,
      location: null,
      onlineUrl: null,
      memo: null,
    },
    {
      id: "showcase-e4",
      companyId: "showcase-c5",
      applicationStepId: stepIdFor("showcase-c5", "entry"),
      eventType: "deadline",
      title: t("landing.showcase.mock.eventDocDeadline"),
      startsAt: null,
      endsAt: null,
      dueAt: isoAt(2, 23, 59),
      location: null,
      onlineUrl: null,
      memo: null,
    },
    {
      id: "showcase-e5",
      companyId: "showcase-c2",
      applicationStepId: stepIdFor("showcase-c2", "briefing"),
      eventType: "schedule",
      title: t("landing.showcase.mock.eventBriefing"),
      startsAt: isoAt(4, 13, 0),
      endsAt: isoAt(4, 14, 30),
      dueAt: null,
      location: null,
      onlineUrl: null,
      memo: null,
    },
    {
      id: "showcase-e6",
      companyId: "showcase-c1",
      applicationStepId: stepIdFor("showcase-c1", "interview_1"),
      eventType: "result_announcement",
      title: t("landing.showcase.mock.eventResult"),
      startsAt: null,
      endsAt: null,
      dueAt: isoAt(5, 18, 0),
      location: null,
      onlineUrl: null,
      memo: null,
    },
  ];

  return { companies, steps, events };
}
