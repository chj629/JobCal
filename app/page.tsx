import SummaryCard from "@/components/SummaryCard";
import StatusBadge, { type CompanyStatus } from "@/components/StatusBadge";

interface Company {
  id: string;
  name: string;
  currentStep: string;
  status: CompanyStatus;
  stepStatus: "예정" | "결과 대기";
  priority: "높음" | "보통" | "낮음";
  appliedAt: string;
}

interface TodayEvent {
  id: string;
  time: string;
  companyName: string;
  title: string;
}

interface UpcomingDeadline {
  id: string;
  companyName: string;
  label: string;
  dueDate: string;
  dDay: number;
}

const COMPANIES: Company[] = [
  {
    id: "1",
    name: "株式会社レコモット",
    currentStep: "1차 면접",
    status: "진행 중",
    stepStatus: "결과 대기",
    priority: "높음",
    appliedAt: "2026-06-01",
  },
  {
    id: "2",
    name: "株式会社ソルクシーズ",
    currentStep: "ES",
    status: "진행 중",
    stepStatus: "예정",
    priority: "보통",
    appliedAt: "2026-06-10",
  },
  {
    id: "3",
    name: "株式会社ネオジャパン",
    currentStep: "최종 면접",
    status: "진행 중",
    stepStatus: "결과 대기",
    priority: "높음",
    appliedAt: "2026-06-15",
  },
  {
    id: "4",
    name: "株式会社オービック",
    currentStep: "내정",
    status: "내정",
    stepStatus: "예정",
    priority: "보통",
    appliedAt: "2026-05-20",
  },
  {
    id: "5",
    name: "株式会社TKC",
    currentStep: "Web 테스트",
    status: "진행 중",
    stepStatus: "예정",
    priority: "낮음",
    appliedAt: "2026-06-20",
  },
];

const TODAY_EVENTS: TodayEvent[] = [
  { id: "1", time: "09:30", companyName: "株式会社ソルクシーズ", title: "ES 제출 마감" },
  { id: "2", time: "14:00", companyName: "株式会社レコモット", title: "1차 면접" },
  { id: "3", time: "18:00", companyName: "株式会社ネオジャパン", title: "최종 면접 결과 발표" },
];

const UPCOMING_DEADLINES: UpcomingDeadline[] = [
  { id: "1", companyName: "株式会社ソルクシーズ", label: "ES 제출 마감", dueDate: "2026-07-25", dDay: 0 },
  { id: "2", companyName: "株式会社TKC", label: "Web 테스트 마감", dueDate: "2026-07-27", dDay: 2 },
  { id: "3", companyName: "株式会社オービック", label: "내정 승낙 회신 마감", dueDate: "2026-07-30", dDay: 5 },
];

const RECENT_COMPANIES = [...COMPANIES].sort(
  (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
);

const SUMMARY = {
  inProgress: COMPANIES.filter((c) => c.status === "진행 중").length,
  todayEvents: TODAY_EVENTS.length,
  upcomingDeadlines: UPCOMING_DEADLINES.length,
  resultPending: COMPANIES.filter((c) => c.stepStatus === "결과 대기").length,
};

const TODAY_LABEL = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
}).format(new Date());

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">대시보드</h1>
        <p className="mt-1 text-sm text-secondary">{TODAY_LABEL}</p>
      </header>

      <section className="mb-8 grid grid-cols-4 gap-4">
        <SummaryCard label="진행 중인 기업" value={SUMMARY.inProgress} />
        <SummaryCard label="오늘 일정" value={SUMMARY.todayEvents} />
        <SummaryCard label="마감 임박" value={SUMMARY.upcomingDeadlines} />
        <SummaryCard label="결과 대기" value={SUMMARY.resultPending} />
      </section>

      <section className="mb-8 rounded-[10px] border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          오늘의 일정
        </h2>
        <ul className="divide-y divide-border">
          {TODAY_EVENTS.map((event) => (
            <li key={event.id} className="flex items-center gap-4 px-6 py-3">
              <span className="w-14 shrink-0 text-sm text-secondary">{event.time}</span>
              <span className="text-sm font-medium text-foreground">{event.companyName}</span>
              <span className="text-sm text-secondary">{event.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8 rounded-[10px] border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          마감 임박 기업
        </h2>
        <ul className="divide-y divide-border">
          {UPCOMING_DEADLINES.map((deadline) => (
            <li key={deadline.id} className="flex items-center gap-4 px-6 py-3">
              <span className="text-sm font-medium text-foreground">{deadline.companyName}</span>
              <span className="text-sm text-secondary">{deadline.label}</span>
              <span className="ml-auto text-sm font-medium text-warning">
                {deadline.dDay === 0 ? "D-Day" : `D-${deadline.dDay}`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-[10px] border border-border bg-card">
        <h2 className="border-b border-border px-6 py-4 text-[16px] font-semibold text-foreground">
          최근 지원 기업
        </h2>
        <ul className="divide-y divide-border">
          {RECENT_COMPANIES.map((company) => (
            <li key={company.id} className="flex items-center gap-4 px-6 py-3">
              <span className="flex-1 text-sm font-medium text-foreground">{company.name}</span>
              <span className="text-sm text-secondary">{company.currentStep}</span>
              <StatusBadge status={company.status} />
              <span className="w-24 text-right text-sm text-secondary">{company.appliedAt}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
