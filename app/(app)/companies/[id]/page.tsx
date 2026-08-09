"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, ExternalLink, Globe, Home } from "lucide-react";
import { notFound, useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import StepTimeline from "@/components/companies/StepTimeline";
import StepDetailPanel from "@/components/companies/StepDetailPanel";
import CompanyContacts from "@/components/companies/CompanyContacts";
import CompanyNotes from "@/components/companies/CompanyNotes";
import CompanySchedulePanel from "@/components/companies/CompanySchedulePanel";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LoadingState from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { getCurrentStep, getStepDisplayName } from "@/lib/applicationSteps";
import { useEvents } from "@/lib/events-context";
import { getNextEvent } from "@/lib/events";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import { dateKeyOf, diffInDays, todayKey } from "@/lib/date";
import { useLocale, useT } from "@/lib/locale-context";

export default function CompanyDetailPage() {
  const t = useT();
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, deleteCompany, loading: companiesLoading, error } = useCompanies();
  const { loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { refresh: refreshContacts } = useCompanyContacts();
  const { refresh: refreshNotes } = useCompanyNotes();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const loading = companiesLoading || stepsLoading || eventsLoading;
  const company = companies.find((c) => c.id === id);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-8">
        <LoadingState>{t("companies.detail.loading")}</LoadingState>
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

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const ok = await deleteCompany(company!.id);
    if (ok) {
      showToast(t("companies.list.deleteSuccessToast", { name: company!.name }));
      // companies/page.tsx의 handleConfirmDelete와 동일한 이유: DB는 CASCADE로 정리되지만
      // 다른 Context의 로컬 state는 그대로라, 삭제 성공 시에만 각자 refresh()로 최신 상태를
      // 다시 받아온다. /companies로 이동한 뒤에도 같은 레이아웃(Provider)이 유지되므로
      // 여기서 갱신해 둬야 Calendar 등에서 유령 데이터가 보이지 않는다.
      refreshSteps();
      refreshEvents();
      refreshContacts();
      refreshNotes();
      router.push("/companies");
    } else {
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  }

  return (
    <>
      <CompanyDetailView
        key={company.id}
        company={company}
        error={error}
        onDeleteClick={() => setIsDeleteConfirmOpen(true)}
      />
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title={t("companies.list.deleteConfirm", { name: company.name })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}

interface CompanyDetailViewProps {
  company: Company;
  error: string | null;
  onDeleteClick: () => void;
}

function CompanyDetailView({ company, error, onDeleteClick }: CompanyDetailViewProps) {
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

  // CompanySchedulePanel.tsx, UpcomingEventsCard.tsx와 동일한 D-day 규칙(오늘/내일/{N}일 후)을 재사용한다.
  function formatDDay(at: string) {
    const diff = diffInDays(todayKey(), dateKeyOf(at));
    if (diff === 0) return t("dashboard.today");
    if (diff === 1) return t("dashboard.tomorrow");
    return t("companies.detail.schedulePanel.dDay", { days: diff });
  }

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="flex items-center justify-between">
        <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-sm text-secondary">
          <Link href="/dashboard" aria-label={t("sidebar.dashboard")} className="hover:text-foreground">
            <Home size={15} />
          </Link>
          <ChevronRight size={14} className="shrink-0 text-border" />
          <Link href="/companies" className="hover:text-foreground">
            {t("sidebar.companies")}
          </Link>
          <ChevronRight size={14} className="shrink-0 text-border" />
          <span className="truncate font-medium text-foreground">{company.name}</span>
        </nav>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setIsEditOpen(true)}>
            {t("common.edit")}
          </Button>
          <Button type="button" variant="danger" onClick={onDeleteClick}>
            {t("common.delete")}
          </Button>
        </div>
      </div>

      <header className="mt-6 mb-8 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-semibold text-foreground">{company.name}</h1>
        <StatusBadge status={company.overallStatus} />
      </header>

      <div
        className={
          "mb-8 flex items-center gap-3 rounded-lg border px-5 py-4 " +
          (nextEventAt && nextEvent
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card")
        }
      >
        <CalendarDays
          size={20}
          className={"shrink-0 " + (nextEventAt && nextEvent ? "text-primary" : "text-secondary")}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-secondary">{t("companies.detail.nextSchedule")}</p>
          {nextEventAt && nextEvent ? (
            <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
              {nextEvent.title} ·{" "}
              {new Date(nextEventAt).toLocaleString(locale === "ja" ? "ja-JP" : "ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <p className="mt-0.5 text-sm text-secondary">{t("companies.detail.noSchedule")}</p>
          )}
        </div>
        {nextEventAt && nextEvent && (
          <Badge variant="primary" size="md" className="shrink-0">
            {formatDDay(nextEventAt)}
          </Badge>
        )}
      </div>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-5 text-[16px] font-semibold text-foreground">
                {t("companies.detail.basicInfo")}
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
                <div>
                  <dt className="text-secondary">{t("companies.detail.currentStep")}</dt>
                  <dd className="mt-1 text-foreground">
                    {currentStep ? getStepDisplayName(currentStep, t) : t("dashboard.noStepLabel")}
                  </dd>
                </div>
                <div>
                  <dt className="text-secondary">{t("companies.detail.priority")}</dt>
                  <dd className="mt-1 text-foreground">
                    {t(`companies.list.priority.${company.priority}`)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-secondary">{t("companies.detail.homepage")}</dt>
                  <dd className="mt-1">
                    {company.websiteUrl ? (
                      <a
                        href={company.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <Globe size={14} className="shrink-0" />
                        {company.websiteUrl}
                      </a>
                    ) : (
                      <span className="text-secondary">{t("companies.detail.homepageEmpty")}</span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-5 text-[16px] font-semibold text-foreground">
                {t("companies.detail.mypage")}
              </h2>
              {company.mypageUrl ? (
                <a
                  href={company.mypageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink size={14} className="shrink-0" />
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
        </div>

        <CompanySchedulePanel companyId={company.id} />
      </div>

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
