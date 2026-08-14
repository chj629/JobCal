"use client";

import { useState } from "react";
import { notFound, useParams, useRouter } from "next/navigation";
import CompanyForm from "@/components/CompanyForm";
import StepTimeline from "@/components/companies/StepTimeline";
import StepDetailPanel from "@/components/companies/StepDetailPanel";
import SelectionMemo from "@/components/companies/SelectionMemo";
import CompanyNotes from "@/components/companies/CompanyNotes";
import CompanyInfoCard from "@/components/companies/CompanyInfoCard";
import MypageInfoCard from "@/components/companies/MypageInfoCard";
import CompanyContacts from "@/components/companies/CompanyContacts";
import CompanySchedulePanel from "@/components/companies/CompanySchedulePanel";
import NextActions from "@/components/companies/NextActions";
import StepReconcileDialog from "@/components/companies/StepReconcileDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import LoadingState from "@/components/ui/LoadingState";
import MaterialIcon from "@/components/ui/MaterialIcon";
import { useToast } from "@/components/ui/Toast";
import { companyToFormValues, type Company } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import { useT } from "@/lib/locale-context";
import { useStepReconcileCheck } from "@/lib/useStepReconcileCheck";

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
      <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
        <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14">
          <LoadingState>{t("companies.detail.loading")}</LoadingState>
        </div>
      </div>
    );
  }

  if (!company) {
    // 삭제로 이 기업이 context에서 사라지면 router.push("/companies")가 끝나기 직전
    // company === undefined인 채로 한 번 더 렌더링된다. 이 경우엔 notFound() 대신
    // 그냥 아무것도 보여주지 않고 이동이 끝나길 기다린다.
    if (isDeleting) return null;
    notFound();
  }

  async function handleConfirmDelete() {
    setIsDeleting(true);
    const ok = await deleteCompany(company!.id);
    if (ok) {
      showToast(t("companies.list.deleteSuccessToast", { name: company!.name }));
      // companies/page.tsx handleConfirmDelete와 동일한 이유로, 다른 Context의 로컬 state를
      // 삭제 성공 시에만 갱신한다.
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
  const router = useRouter();
  const { updateCompany } = useCompanies();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const stepReconcile = useStepReconcileCheck();

  return (
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h1 className="mb-2 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink">
              {company.name}
            </h1>
            <div className="flex items-center gap-2">
              {company.overallStatus === "offer" ? (
                <span className="rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[11px] font-[400] text-success">
                  {t("companies.list.status.offer")}
                </span>
              ) : (
                <span className="rounded-full border border-stitch-border bg-[#f8f9ff] px-2.5 py-1 text-[11px] font-[400] text-secondary">
                  {t(`companies.list.status.${company.overallStatus === "in_progress" ? "inProgress" : company.overallStatus}`)}
                </span>
              )}
              <span
                className={
                  "rounded-full px-2.5 py-1 text-[11px] font-[400] " +
                  (company.priority === "high"
                    ? "bg-[#fef2f2] text-error"
                    : "bg-[#f8f9ff] text-secondary")
                }
              >
                {t("companies.detail.priorityPrefix")}
                {t(`companies.list.priority.${company.priority}`)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="flex h-fit items-center gap-1 rounded-stitch-xl bg-primary-navy px-4 py-2 text-[12px] font-[400] text-white shadow-sm transition-all hover:opacity-90"
            >
              <MaterialIcon name="edit" size={16} />
              {t("common.edit")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/companies")}
              aria-label={t("companies.detail.backToList")}
              className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:bg-[#f8f9ff]"
            >
              <MaterialIcon name="close" size={18} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen((v) => !v)}
                aria-label={t("companies.detail.moreMenu")}
                className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:bg-[#f8f9ff]"
              >
                <MaterialIcon name="more_vert" size={18} />
              </button>
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-32 rounded-stitch-md border border-stitch-border bg-card py-1 text-left shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteClick();
                      }}
                      className="block w-full px-3 py-2 text-left text-[13px] text-error hover:bg-[#f8f9ff]"
                    >
                      {t("common.delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}

        <StepTimeline
          companyId={company.id}
          selectedStepId={selectedStepId}
          onSelect={setSelectedStepId}
        />

        <div className="grid grid-cols-1 items-start gap-4 pb-10 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div className="flex flex-col gap-6 rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
              <StepDetailPanel
                companyId={company.id}
                selectedStepId={selectedStepId}
                onClose={() => setSelectedStepId(null)}
              />
              <div className="h-px bg-stitch-border" />
              <SelectionMemo />
            </div>

            <div className="flex flex-col gap-6 rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
              <CompanyNotes companyId={company.id} />
              <div className="h-px bg-stitch-border" />
              <CompanyInfoCard company={company} />
              <div className="h-px bg-stitch-border" />
              <MypageInfoCard company={company} />
              <div className="h-px bg-stitch-border" />
              <CompanyContacts companyId={company.id} />
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-4">
            <CompanySchedulePanel companyId={company.id} />
            <NextActions />
          </div>
        </div>

        {isEditOpen && (
          <CompanyForm
            title={t("companies.list.editCompanyModalTitle")}
            initialValues={companyToFormValues(company)}
            onCancel={() => setIsEditOpen(false)}
            onSubmit={stepReconcile.guardSubmit(company, async (values) => {
              const ok = await updateCompany(company.id, values);
              if (ok) setIsEditOpen(false);
            })}
          />
        )}

        {stepReconcile.reconcileState && (
          <StepReconcileDialog
            companyName={stepReconcile.reconcileState.company.name}
            incompleteSteps={stepReconcile.reconcileState.incompleteSteps}
            isSaving={stepReconcile.isSaving}
            error={stepReconcile.stepError}
            onCancel={stepReconcile.cancel}
            onSaveWithoutChanges={stepReconcile.saveWithoutStepChanges}
            onSaveWithChanges={stepReconcile.saveWithStepChanges}
          />
        )}
      </div>
    </div>
  );
}
