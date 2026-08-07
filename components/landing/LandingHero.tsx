"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2, Lock, Monitor, Sparkles } from "lucide-react";
import { useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";

// 34_landingPage.png Hero. 오른쪽 대시보드 미리보기는 실제 Supabase 데이터를 쓰지 않고
// 시안과 동일한 성격의 더미 수치・더미 기업명(サンプル 등)만 표시하는 정적 UI다.
const TRUST_ITEMS = [
  { icon: CheckCircle2, key: "landing.hero.trustFree" },
  { icon: Lock, key: "landing.hero.trustNoCard" },
  { icon: Monitor, key: "landing.hero.trustDevice" },
] as const;

const PREVIEW_KPIS = [
  { key: "landing.hero.previewKpiEntry", value: 32 },
  { key: "landing.hero.previewKpiInProgress", value: 15 },
  { key: "landing.hero.previewKpiOffer", value: 2 },
  { key: "landing.hero.previewKpiInterview", value: 3 },
] as const;

const PREVIEW_TODAY_ITEMS = [
  {
    companyKey: "landing.hero.previewTodayItem1Company",
    stepKey: "landing.hero.previewTodayItem1Step",
    timeKey: "landing.hero.previewTodayItem1Time",
  },
  {
    companyKey: "landing.hero.previewTodayItem2Company",
    stepKey: "landing.hero.previewTodayItem2Step",
    timeKey: "landing.hero.previewTodayItem2Time",
  },
] as const;

const PREVIEW_FUNNEL_ROWS = [
  { key: "landing.hero.previewFunnelEntry", percent: 100 },
  { key: "landing.hero.previewFunnelDocument", percent: 70 },
  { key: "landing.hero.previewFunnelInterview", percent: 45 },
  { key: "landing.hero.previewFunnelFinal", percent: 15 },
] as const;

export default function LandingHero() {
  const t = useT();
  const router = useRouter();

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-16 pb-20">
      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles size={14} />
            {t("landing.hero.badge")}
          </span>

          <h1 className="mt-6 text-4xl leading-tight font-bold text-foreground sm:text-5xl">
            {t("landing.hero.titleLine1")}
            <br />
            {t("landing.hero.titlePrefix")}
            <span className="text-primary">{t("landing.hero.titleHighlight")}</span>
            {t("landing.hero.titleSuffix")}
          </h1>

          <p className="mt-5 max-w-md text-base text-secondary">{t("landing.hero.description")}</p>

          <div className="mt-8">
            <Button size="lg" variant="primary" onClick={() => router.push("/signup")}>
              {t("landing.hero.getStarted")}
              <ArrowRight size={18} />
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2">
            {TRUST_ITEMS.map(({ icon: Icon, key }) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-secondary">
                <Icon size={14} />
                {t(key)}
              </span>
            ))}
          </div>
        </div>

        <div
          aria-hidden="true"
          className="rounded-2xl border border-border bg-card p-5 shadow-xl"
        >
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-white">
              <CalendarDays size={14} />
            </span>
            <span className="text-sm font-semibold text-foreground">{t("common.appName")}</span>
          </div>

          <p className="mt-4 text-sm font-semibold text-foreground">
            {t("landing.hero.previewGreeting")}
          </p>
          <p className="text-xs text-secondary">{t("landing.hero.previewSubtitle")}</p>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {PREVIEW_KPIS.map(({ key, value }) => (
              <div key={key} className="rounded-lg border border-border p-2">
                <p className="text-lg font-bold text-foreground">{value}</p>
                <p className="mt-0.5 truncate text-[10px] text-secondary">{t(key)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-foreground">
              {t("landing.hero.previewTodayTitle")}
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {PREVIEW_TODAY_ITEMS.map((item) => (
                <div key={item.companyKey} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-foreground">
                      {t(item.companyKey)}
                    </p>
                    <p className="text-[10px] text-secondary">{t(item.stepKey)}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-secondary">{t(item.timeKey)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-border p-3">
            <p className="text-xs font-semibold text-foreground">
              {t("landing.hero.previewFunnelTitle")}
            </p>
            <div className="mt-2 flex flex-col gap-1.5">
              {PREVIEW_FUNNEL_ROWS.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <span className="w-14 shrink-0 truncate text-[10px] text-secondary">
                    {t(row.key)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${row.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
