"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { createEmptyCompanyFormValues } from "@/lib/companies";
import CompanyForm from "@/components/CompanyForm";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import TodayChecklist from "@/components/dashboard/TodayChecklist";
import TodayTimetable from "@/components/dashboard/TodayTimetable";
import TodayResults from "@/components/dashboard/TodayResults";
import UpcomingDDay from "@/components/dashboard/UpcomingDDay";
import UpcomingDeadlines from "@/components/dashboard/UpcomingDeadlines";
import PipelineOverview from "@/components/dashboard/PipelineOverview";
import RecentCompanies from "@/components/dashboard/RecentCompanies";

export default function DashboardPage() {
  const { companies, addCompany, loading: companiesLoading, error } = useCompanies();
  const { steps, loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { events, loading: eventsLoading } = useEvents();
  const [userName, setUserName] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loading = companiesLoading || stepsLoading || eventsLoading;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name =
        (user.user_metadata?.full_name as string | undefined) ??
        (user.user_metadata?.name as string | undefined) ??
        user.email?.split("@")[0] ??
        null;
      setUserName(name);
    });
  }, []);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 text-sm text-secondary sm:px-8">
        불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <DashboardGreeting userName={userName} />
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
          >
            + 기업 추가
          </button>
          <button
            type="button"
            disabled
            title="준비 중입니다"
            className="h-10 cursor-not-allowed rounded-[10px] border border-border px-4 text-sm font-medium text-secondary opacity-70"
          >
            🤖 AI Assistant
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <TodayChecklist companies={companies} events={events} />
          <TodayTimetable companies={companies} events={events} />
        </div>

        <TodayResults companies={companies} events={events} />
        <UpcomingDDay companies={companies} events={events} />
        <UpcomingDeadlines companies={companies} events={events} />
        <PipelineOverview companies={companies} steps={steps} />
        <RecentCompanies companies={companies} steps={steps} />
      </div>

      {isAddOpen && (
        <CompanyForm
          title="기업 추가"
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
