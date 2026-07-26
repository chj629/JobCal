"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCompanies } from "@/lib/companies-context";
import { createEmptyCompanyFormValues } from "@/lib/companies";
import CompanyForm from "@/components/CompanyForm";
import DashboardGreeting from "@/components/dashboard/DashboardGreeting";
import TodayChecklist from "@/components/dashboard/TodayChecklist";
import TodayTimetable from "@/components/dashboard/TodayTimetable";
import SevenDayStrip from "@/components/dashboard/SevenDayStrip";
import PriorityHighlights from "@/components/dashboard/PriorityHighlights";
import RecentCompanies from "@/components/dashboard/RecentCompanies";
import PipelineOverview from "@/components/dashboard/PipelineOverview";

export default function DashboardPage() {
  const { companies, addCompany, loading, error } = useCompanies();
  const [userName, setUserName] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

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
          <TodayChecklist companies={companies} />
          <TodayTimetable companies={companies} />
        </div>

        <SevenDayStrip companies={companies} />
        <PriorityHighlights companies={companies} />
        <RecentCompanies companies={companies} />
        <PipelineOverview companies={companies} />
      </div>

      {isAddOpen && (
        <CompanyForm
          title="기업 추가"
          initialValues={createEmptyCompanyFormValues()}
          onCancel={() => setIsAddOpen(false)}
          onSubmit={async (values) => {
            const ok = await addCompany(values);
            if (ok) setIsAddOpen(false);
          }}
        />
      )}
    </div>
  );
}
