"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import StepTimeline from "@/components/companies/StepTimeline";
import StepDetailPanel from "@/components/companies/StepDetailPanel";
import CompanyContacts from "@/components/companies/CompanyContacts";
import CompanyNotes from "@/components/companies/CompanyNotes";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { getNextEvent } from "@/lib/events";
import { useLocale, useT } from "@/lib/locale-context";

export default function CompanyDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, deleteCompany, loading: companiesLoading, error } = useCompanies();
  const { loading: stepsLoading } = useApplicationSteps();
  const { loading: eventsLoading } = useEvents();
  const [isDeleting, setIsDeleting] = useState(false);

  const loading = companiesLoading || stepsLoading || eventsLoading;
  const company = companies.find((c) => c.id === id);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-8 text-sm text-secondary">
        {t("companies.detail.loading")}
      </div>
    );
  }

  if (!company) {
    // Deleting removes this company from context, which re-renders this
    // page with company === undefined right before router.push("/companies")
    // finishes navigating away. Without this guard, notFound() would fire
    // during that transient render instead of the intended navigation.
    if (isDeleting) {
      return null;
    }
    notFound();
  }

  async function handleDelete() {
    if (window.confirm(t("companies.list.deleteConfirm", { name: company!.name }))) {
      setIsDeleting(true);
      const ok = await deleteCompany(company!.id);
      if (ok) {
        router.push("/companies");
      } else {
        setIsDeleting(false);
      }
    }
  }

  // company.id로 key를 주어, 다른 기업 상세로 이동할 때(같은 라우트 재사용 시)
  // selectedStepId 등 아래 컴포넌트의 로컬 상태가 확실히 초기화되도록 한다.
  return <CompanyDetailView key={company.id} company={company} error={error} onDelete={handleDelete} />;
}

interface CompanyDetailViewProps {
  company: Company;
  error: string | null;
  onDelete: () => void;
}

function CompanyDetailView({ company, error, onDelete }: CompanyDetailViewProps) {
  const t = useT();
  const { locale } = useLocale();
  const { updateCompany } = useCompanies();
  const { steps } = useApplicationSteps();
  const { events } = useEvents();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const companySteps = steps.filter((step) => step.companyId === company.id);
  const currentStep = getCurrentStep(companySteps);
  const companyEvents = events.filter((event) => event.companyId === company.id);
  const nextEvent = getNextEvent(companyEvents);
  const nextEventAt = nextEvent ? (nextEvent.startsAt ?? nextEvent.dueAt) : null;

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="flex items-center justify-between">
        <Link href="/companies" className="text-sm text-secondary hover:text-foreground">
          {t("companies.detail.backToList")}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
          >
            {t("common.edit")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="h-10 rounded-[10px] border border-error px-4 text-sm font-medium text-error"
          >
            {t("common.delete")}
          </button>
        </div>
      </div>

      <header className="mt-4 mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">{company.name}</h1>
        <div className="mt-2">
          <StatusBadge status={company.overallStatus} />
        </div>
      </header>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-[10px] border border-border bg-card p-6">
          <h2 className="mb-4 text-[16px] font-semibold text-foreground">
            {t("companies.detail.basicInfo")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-secondary">{t("companies.detail.currentStep")}</dt>
              <dd className="mt-1 text-foreground">
                {currentStep?.name ?? t("dashboard.noStepLabel")}
              </dd>
            </div>
            <div>
              <dt className="text-secondary">{t("companies.detail.priority")}</dt>
              <dd className="mt-1 text-foreground">
                {t(`companies.list.priority.${company.priority}`)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-secondary">{t("companies.detail.nextSchedule")}</dt>
              <dd className="mt-1 text-foreground">
                {nextEventAt && nextEvent
                  ? `${nextEvent.title} · ${new Date(nextEventAt).toLocaleString(
                      locale === "ja" ? "ja-JP" : "ko-KR",
                      {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}`
                  : t("companies.detail.noSchedule")}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-secondary">{t("companies.detail.homepage")}</dt>
              <dd className="mt-1">
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {company.websiteUrl}
                </a>
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-[10px] border border-border bg-card p-6">
          <h2 className="mb-4 text-[16px] font-semibold text-foreground">
            {t("companies.detail.mypage")}
          </h2>
          {company.mypageUrl ? (
            <a
              href={company.mypageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {company.mypageUrl}
            </a>
          ) : (
            <p className="text-sm text-secondary">{t("companies.detail.mypageEmpty")}</p>
          )}
        </section>
      </div>

      <StepTimeline
        companyId={company.id}
        selectedStepId={selectedStepId}
        onSelect={setSelectedStepId}
      />
      {selectedStepId && (
        <StepDetailPanel
          companyId={company.id}
          selectedStepId={selectedStepId}
          onClose={() => setSelectedStepId(null)}
        />
      )}

      <div className="mb-8">
        <CompanyContacts companyId={company.id} />
      </div>

      <CompanyNotes companyId={company.id} />

      {isEditOpen && (
        <CompanyForm
          title={t("companies.list.editCompanyModalTitle")}
          initialValues={companyToFormValues(company)}
          onCancel={() => setIsEditOpen(false)}
          onSubmit={async (values) => {
            const ok = await updateCompany(company.id, values);
            if (ok) setIsEditOpen(false);
          }}
        />
      )}
    </div>
  );
}
