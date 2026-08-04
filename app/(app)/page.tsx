"use client";

import { useState } from "react";
import { Award, Briefcase, Building2, CalendarDays } from "lucide-react";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { createEmptyCompanyFormValues } from "@/lib/companies";
import { dateKeyOf, todayKey } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import CompanyForm from "@/components/CompanyForm";
import TodaySchedule from "@/components/dashboard/TodaySchedule";
import UpcomingSchedule from "@/components/dashboard/UpcomingSchedule";
import FocusCompanies from "@/components/dashboard/FocusCompanies";
import PipelineOverview from "@/components/dashboard/PipelineOverview";

function isWithinNext7Days(dateKey: string, fromKey: string) {
  const from = new Date(`${fromKey}T00:00:00`);
  const target = new Date(`${dateKey}T00:00:00`);
  const diffDays = Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 6;
}

export default function DashboardPage() {
  const t = useT();
  const { companies, addCompany, loading: companiesLoading, error } = useCompanies();
  const { steps, loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { events, loading: eventsLoading } = useEvents();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loading = companiesLoading || stepsLoading || eventsLoading;

  const today = todayKey();
  const inProgressCount = companies.filter((c) => c.overallStatus === "in_progress").length;
  const offerCount = companies.filter((c) => c.overallStatus === "offer").length;
  const thisWeekEventCount = events.filter((event) => {
    const at = event.startsAt ?? event.dueAt;
    return at !== null && isWithinNext7Days(dateKeyOf(at), today);
  }).length;

  const kpiTiles = [
    {
      label: t("dashboard.kpi.totalCompanies"),
      value: companies.length,
      icon: Building2,
      colorClass: "bg-primary/10 text-primary",
    },
    {
      label: t("dashboard.kpi.inProgress"),
      value: inProgressCount,
      icon: Briefcase,
      colorClass: "bg-success/10 text-success",
    },
    {
      label: t("dashboard.kpi.thisWeekSchedule"),
      value: thisWeekEventCount,
      icon: CalendarDays,
      colorClass: "bg-joined/10 text-joined",
    },
    {
      label: t("dashboard.kpi.offer"),
      value: offerCount,
      icon: Award,
      colorClass: "bg-warning/10 text-warning",
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-[960px] px-7 pt-7 pb-8 text-sm text-secondary">
        {t("dashboard.loading")}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[960px] px-7 pt-7 pb-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[24px] font-bold text-foreground">{t("dashboard.title")}</h1>
          <p className="mt-1 text-[13px] text-secondary">{t("dashboard.description")}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="h-9 shrink-0 rounded-[8px] border border-border bg-card px-3.5 text-[13px] font-medium text-foreground transition-colors duration-150 hover:bg-background"
        >
          {t("dashboard.addCompany")}
        </button>
      </div>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {kpiTiles.map(({ label, value, icon: Icon, colorClass }) => (
            <div
              key={label}
              className="flex h-[164px] flex-col rounded-[10px] border border-border bg-card p-6"
            >
              <div className="flex items-start gap-3">
                <span
                  className={
                    "flex h-14 w-14 shrink-0 items-center justify-center rounded-full " + colorClass
                  }
                >
                  <Icon size={24} />
                </span>
                <div className="flex flex-col gap-2">
                  <span className="text-[16px] font-bold text-secondary">{label}</span>
                  <p className="text-[38px] font-bold text-foreground">{value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TodaySchedule companies={companies} events={events} steps={steps} />
          <PipelineOverview companies={companies} steps={steps} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <UpcomingSchedule companies={companies} events={events} steps={steps} />
          <FocusCompanies companies={companies} events={events} steps={steps} />
        </div>
      </div>

      {isAddOpen && (
        <CompanyForm
          title={t("dashboard.addCompanyModalTitle")}
          initialValues={createEmptyCompanyFormValues()}
          onCancel={() => setIsAddOpen(false)}
          onSubmit={async (values) => {
            const ok = await addCompany(values);
            if (ok) {
              setIsAddOpen(false);
              refreshSteps();
            }
          }}
        />
      )}
    </div>
  );
}
