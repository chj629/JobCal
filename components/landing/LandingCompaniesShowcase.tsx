"use client";

import { buildShowcaseMockData } from "@/components/landing/landingShowcaseMockData";
import { useT } from "@/lib/locale-context";
import { OVERALL_STATUS_BADGE_CLASS, OVERALL_STATUSES } from "@/lib/companies";
import { getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { getNextEvent } from "@/lib/events";
import { formatTimeOfDay } from "@/lib/date";
import MaterialIcon from "@/components/ui/MaterialIcon";
import ScrollReveal from "@/components/landing/ScrollReveal";

function formatNextSchedule(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${formatTimeOfDay(iso)}`;
}

// 56차: Companies 쇼케이스. app/(app)/companies/page.tsx의 상태 탭/검색/필터 툴바 +
// 테이블 마크업(클래스 그대로)을 옮겨왔다 — 이 화면은 그 부분이 컴포넌트로 분리되어
// 있지 않고 page.tsx에 인라인되어 있어 컴포넌트 재사용이 불가능했다("실제 컴포넌트를
// import"가 아니라 "실제 마크업을 그대로 재사용"). 검색/필터/상태변경은 로그인 없이
// 저장할 데이터가 없으므로 장식만 두고 실제 동작(useState 등)은 연결하지 않았다 —
// "전체" 탭만 항상 활성 상태로 보여준다.
export default function LandingCompaniesShowcase() {
  const t = useT();
  const { companies, steps, events } = buildShowcaseMockData(t);

  const statusLabels: Record<string, string> = {
    in_progress: t("companies.list.status.inProgress"),
    offer: t("companies.list.status.offer"),
    joined: t("companies.list.status.joined"),
    rejected: t("companies.list.status.rejected"),
    cancelled: t("companies.list.status.cancelled"),
  };

  const rows = companies.map((company) => {
    const companySteps = steps.filter((step) => step.companyId === company.id);
    const companyEvents = events.filter((event) => event.companyId === company.id);
    const nextEvent = getNextEvent(companyEvents);
    const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;
    const currentStep = getCurrentStep(companySteps);
    return {
      company,
      currentStepDisplayName: currentStep ? getStepDisplayName(currentStep, t) : t("dashboard.noStepLabel"),
      nextEventAt,
    };
  });

  const statusTabs = [
    { key: "all", label: t("companies.list.status.all") },
    ...OVERALL_STATUSES.filter((s) => s === "in_progress" || s === "offer" || s === "rejected").map(
      (status) => ({ key: status, label: statusLabels[status] })
    ),
  ];

  return (
    <section id="features" className="bg-white px-6 py-24 md:px-12 md:py-32">
      {/* 57차: "제목 위/테이블 아래 반복을 피하고, 카피와 UI가 하나의 composition처럼
          보이게" 요청 — 헤드라인+설명을 별도 섹션으로 위에 얹지 않고, 테이블을 담은
          바로 그 카드의 "머리말"로 카드 안에 넣었다(바깥 stitch-bg 이중 프레임도
          제거해 패딩이 한 겹만 남아 테이블 실제 렌더 폭도 커진다 — "테이블이
          작고 약해 보인다"는 지적의 원인이었다). 헤드라인은 Dashboard(중앙정렬)/
          Calendar(고정폭 좌측 컬럼)와 또 다르게, 카드 안에서 좌측 큰 2줄급
          타이틀 + 우측 짧은 설명으로 나란히 놓여 하나의 "카드 헤더"처럼 읽힌다.
          탭/검색/테이블 자체 마크업은 이전과 동일, 안 건드렸다.
          58차: Calendar와 같은 이유(flex/grid 아이템의 기본 min-width:auto가
          줄바꿈 불가 상황에서 트랙/컬럼 폭을 넘겨버릴 수 있음)로 h2/p에도
          min-w-0을 주고, break-keep→break-words(줄바꿈 지점이 없으면 강제로도
          줄바꿈해 컨테이너 밖으로 절대 안 넘치게)로 바꿨다. 폰트 크기/배치는
          그대로다.
          58차: PDF/정적 캡처 시 IntersectionObserver가 안 걸려 opacity:0인
          채로 캡처될 수 있어, 인쇄/PDF에서는 무조건 완전히 보이게 강제한다
          (ScrollReveal 자체가 아니라 이 섹션이 넘기는 className에만 추가 —
          Dashboard가 쓰는 ScrollReveal에는 영향 없다).
          59차: 자연 줄바꿈에 맡겼더니 "迷わず" 단어 중간(迷わ/ず)에서 꺾여
          3줄로 어색하게 보인다는 피드백 — Hero/Calendar와 같은 패턴
          (titleLine1/titleLine2 두 i18n 키 + 명시적 <br/>)으로 바꿔 항상
          정확히 「、」 지점에서만 2줄로 고정했다. 컬럼 폭/폰트 크기/설명
          위치는 전혀 안 건드렸다 — "2줄"이라는 결과 자체는 이전과 같고,
          그 2줄이 되는 지점만 렌더링 엔진과 무관하게 결정적으로 고정된다. */}
      <ScrollReveal className="mx-auto max-w-[1500px] print:translate-y-0 print:opacity-100">
        <div className="rounded-stitch-xl border border-stitch-border bg-card p-8 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink shadow-xl sm:p-12">
          <div className="mb-10 flex flex-col gap-6 border-b border-stitch-border pb-10 lg:flex-row lg:items-end lg:justify-between">
            <h2 className="max-w-lg min-w-0 text-[36px] leading-[1.25] font-[600] tracking-tight break-words text-stitch-ink sm:text-[46px]">
              {t("landing.showcase.companies.titleLine1")}
              <br />
              {t("landing.showcase.companies.titleLine2")}
            </h2>
            <p className="max-w-sm min-w-0 whitespace-pre-line text-[16px] leading-[1.7] break-words text-secondary lg:text-right lg:text-[17px]">
              {t("landing.showcase.companies.description")}
            </p>
          </div>

          <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div className="flex gap-6">
              {statusTabs.map((tab) => (
                <span
                  key={tab.key}
                  className={
                    "pb-1 text-[13px] " +
                    (tab.key === "all"
                      ? "border-b-[1.5px] border-stitch-ink font-[400] text-stitch-ink"
                      : "text-secondary")
                  }
                >
                  {tab.label}
                </span>
              ))}
            </div>

            <div className="relative w-full md:w-56">
              <MaterialIcon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-secondary"
              />
              <div className="w-full rounded-stitch-xl border border-stitch-border bg-[#f8f9ff] py-1.5 pl-9 pr-4 text-[13px] text-secondary">
                {t("companies.list.searchPlaceholder")}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-stitch-border">
                  <th className="w-[34%] py-3 px-3 text-[11px] font-[400] text-secondary">
                    {t("companies.list.columns.company")}
                  </th>
                  <th className="w-[20%] whitespace-nowrap py-3 px-2 text-[11px] font-[400] text-secondary">
                    {t("companies.list.columns.currentStep")}
                  </th>
                  <th className="w-[90px] whitespace-nowrap py-3 px-2 text-[11px] font-[400] text-secondary">
                    {t("companies.list.columns.status")}
                  </th>
                  <th className="w-[18%] whitespace-nowrap py-3 px-2 text-[11px] font-[400] text-secondary">
                    {t("companies.list.columns.nextSchedule")}
                  </th>
                  <th className="w-[80px] whitespace-nowrap py-3 px-2 text-[11px] font-[400] text-secondary">
                    {t("companies.list.columns.priority")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stitch-border">
                {rows.map(({ company, currentStepDisplayName, nextEventAt }) => (
                  <tr key={company.id} className="transition-colors hover:bg-black/[0.015]">
                    <td className="overflow-hidden text-ellipsis whitespace-nowrap py-3 px-3 text-[14px] font-[400] text-stitch-ink">
                      {company.name}
                    </td>
                    <td className="whitespace-nowrap py-3 px-2 text-[12px] text-secondary">
                      {currentStepDisplayName}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={
                          "inline-block rounded-full border px-2.5 py-1 text-[11px] font-[400] " +
                          OVERALL_STATUS_BADGE_CLASS[company.overallStatus]
                        }
                      >
                        {statusLabels[company.overallStatus]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-3 px-2 text-[12px] text-secondary">
                      {nextEventAt ? formatNextSchedule(nextEventAt) : "-"}
                    </td>
                    <td className="py-3 px-2">
                      {company.priority === "high" ? (
                        <span className="whitespace-nowrap rounded-stitch-md bg-error/10 px-2 py-0.5 text-[11px] font-[400] text-error">
                          {t("companies.list.priority.high")}
                        </span>
                      ) : (
                        <span className="whitespace-nowrap rounded-stitch-md border border-stitch-border bg-[#f8f9ff] px-2 py-0.5 text-[11px] font-[400] text-secondary">
                          {company.priority === "medium"
                            ? t("companies.list.priority.medium")
                            : t("companies.list.priority.low")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
