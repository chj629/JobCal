"use client";

import { useMemo, useState } from "react";
import { buildShowcaseMockData } from "@/components/landing/landingShowcaseMockData";
import { useLocale, useT } from "@/lib/locale-context";
import { dateKeyOf, formatDateKey } from "@/lib/date";
import type { AppEvent } from "@/lib/events";
import MiniCalendar from "@/components/calendar/MiniCalendar";
import TodayEventsCard from "@/components/calendar/TodayEventsCard";
import CalendarWeeklyProgress from "@/components/calendar/CalendarWeeklyProgress";
import CalendarMonthGrid from "@/components/calendar/CalendarMonthGrid";
import ScrollReveal from "@/components/landing/ScrollReveal";

// 56차: Calendar 쇼케이스. app/(app)/calendar/page.tsx의 데스크톱(md+) 좌측 3장(MiniCalendar/
// TodayEventsCard/CalendarWeeklyProgress) + 우측 CalendarMonthGrid 배치를 그대로 재사용한다.
// 이 두 컴포넌트(TodayEventsCard/CalendarWeeklyProgress)는 Dashboard 쪽과 달리 checkedIds를
// 컨텍스트가 아니라 props로 받으므로, 로컬 useState로 몇 건을 "이미 체크됨"으로 미리 채워
// 방문자에게 실제로 쓰이고 있는 화면처럼(진행률 0%가 아니게) 보이게 했다 — 실제 서비스에서는
// event_completions 테이블 값이지만, 로그인하지 않은 방문자에게 보여줄 수 있는 값이 없어
// 이 프리뷰 안에서만 존재하는 로컬 상태로 대신한다.
export default function LandingCalendarShowcase() {
  const t = useT();
  const { locale } = useLocale();
  const { companies, events } = buildShowcaseMockData(t);

  const today = useMemo(() => new Date(), []);
  const [focusDate, setFocusDate] = useState(today);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set(["showcase-e2"]));

  const localeCode = locale === "ja" ? "ja-JP" : "ko-KR";
  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(localeCode, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
  }, [localeCode]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, AppEvent[]> = {};
    for (const event of events) {
      const at = event.startsAt ?? event.dueAt;
      if (!at) continue;
      const key = dateKeyOf(at);
      const list = map[key] ?? [];
      list.push(event);
      map[key] = list;
    }
    return map;
  }, [events]);

  const todayKeyStr = formatDateKey(today);
  const todayEvents = (eventsByDate[todayKeyStr] ?? []).slice().sort((a, b) => {
    const atA = (a.startsAt ?? a.dueAt) as string;
    const atB = (b.startsAt ?? b.dueAt) as string;
    return new Date(atA).getTime() - new Date(atB).getTime();
  });

  function toggleChecked(eventId: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  function navigateMonth(direction: 1 | -1) {
    setFocusDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction, 1);
      return next;
    });
  }

  return (
    <section className="bg-stitch-bg px-6 py-24 md:px-12 md:py-32">
      {/* 57차: "Dashboard와 같은 중앙정렬 반복을 피하고, 텍스트는 더 왼쪽에 강하게,
          Calendar UI는 더 크게" 요청 — 카피와 UI를 위/아래로 쌓던 구조를 버리고,
          lg 이상에서는 고정폭 좁은 텍스트 컬럼(왼쪽, sticky) + 훨씬 넓은 UI
          컬럼(오른쪽)의 비대칭 2단 구성으로 바꿨다. 컨테이너 자체도 Dashboard보다
          넓게(1200→1580px) 잡아서, 텍스트가 고정폭을 차지하고 남는 UI 쪽 실제
          렌더 폭이 이전(패딩 포함 1200px)보다 커지게 했다 — Calendar 카드
          내부(MiniCalendar/TodayEventsCard/CalendarWeeklyProgress/CalendarMonthGrid)
          자체는 전혀 안 바꿨고 바깥 배치만 바뀐다. lg 미만에서는 폭이 부족해
          비대칭 2단이 의미 없으므로 원래대로 텍스트 위 / UI 아래로 쌓인다.
          58차: PDF/정적 캡처에서 헤드라인이 오른쪽에서 잘려 보인다는 리포트로
          다시 점검. 그리드 아이템은 기본 min-width:auto라, 내용에 줄바꿈
          지점이 없으면 300px 트랙을 넘어 그대로 넘칠 수 있다 — Chrome 화면
          렌더링에서는 CJK 줄바꿈이 대부분 허용돼 우연히 잘 보였지만(쉼표에서
          자연스럽게 2줄로 꺾임), PDF 렌더러 등 다른 엔진은 word-break:
          keep-all을 더 엄격히(문장 전체를 못 끊는 한 덩어리로) 해석할 수
          있어 실제 클리핑 원인으로 가장 유력했다. 폭에 따라 우연히 좋은
          지점에서 꺾이길 기대하는 대신, Hero 제목과 같은 패턴(titleLine1/
          titleLine2 두 i18n 키 + 명시적 <br/>)으로 바꿔 항상 정확히 쉼표
          지점에서만 2줄로 꺾이게 고정했다 — 어떤 렌더링 엔진에서도 결과가
          같다. 추가 안전장치로 (1) 그리드 아이템에 min-w-0를 줘서
          min-width:auto로 인한 트랙 오버플로 가능성 자체를 없애고,
          (2) break-keep 대신 break-words(줄바꿈 지점이 없으면 강제로라도
          줄바꿈해 컨테이너 밖으로 넘치는 것을 원천 차단)로 바꿨다. 폰트
          크기/색/굵기/컬럼 폭(300px)은 원래 값 그대로다. */}
      <div className="mx-auto max-w-[1580px] lg:grid lg:grid-cols-[300px_1fr] lg:items-start lg:gap-12">
        {/* 58차: PDF/정적 캡처 시점에는 IntersectionObserver가 한 번도 안 걸려
            opacity:0 상태 그대로 캡처될 수 있다 — "화면에서는 잘 보이는데
            PDF에서는 텍스트가 빠져 있다"는 것도 같은 리포트의 원인 중 하나일
            수 있어, 인쇄/PDF( @media print )에서는 무조건 완전히 보이는
            상태로 강제한다(Tailwind print: variant). ScrollReveal 자체
            (Dashboard도 같이 쓰는 공용 컴포넌트)는 손대지 않고, 이 섹션에서
            넘기는 className에만 print:opacity-100 print:translate-y-0을
            추가했다 — Dashboard 쪽 사용에는 전혀 영향 없다. */}
        <ScrollReveal className="min-w-0 print:translate-y-0 print:opacity-100 lg:sticky lg:top-32">
          <h2 className="text-[36px] leading-[1.2] font-[600] tracking-tight break-words text-neutral-900 sm:text-[46px]">
            {t("landing.showcase.calendar.titleLine1")}
            <br />
            {t("landing.showcase.calendar.titleLine2")}
          </h2>
          <p className="mt-5 whitespace-pre-line text-[16px] leading-[1.7] break-words text-neutral-500 sm:text-[18px]">
            {t("landing.showcase.calendar.description")}
          </p>
        </ScrollReveal>

        <ScrollReveal className="mt-12 min-w-0 print:translate-y-0 print:opacity-100 lg:mt-0">
          <div className="rounded-stitch-2xl border border-stitch-border bg-card p-6 shadow-xl sm:p-10">
            <div className="font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink md:flex md:gap-6">
              <div className="mb-6 flex shrink-0 flex-col gap-4 md:mb-0 md:w-72">
                <MiniCalendar
                  focusDate={focusDate}
                  today={today}
                  eventsByDate={eventsByDate}
                  onNavigateMonth={navigateMonth}
                  onSelectDate={() => {}}
                />
                <TodayEventsCard
                  events={todayEvents}
                  companies={companies}
                  checkedIds={checkedIds}
                  loaded
                  onToggleComplete={toggleChecked}
                  onSelectEvent={() => {}}
                />
                <CalendarWeeklyProgress events={events} checkedIds={checkedIds} />
              </div>

              <div className="min-w-0 flex-1">
                <CalendarMonthGrid
                  focusDate={focusDate}
                  today={today}
                  eventsByDate={eventsByDate}
                  companies={companies}
                  weekdayLabels={weekdayLabels}
                  onSelectEvent={() => {}}
                />
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
