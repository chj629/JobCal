"use client";

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
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
import {
  companyToFormValues,
  OVERALL_STATUS_BADGE_CLASS,
  OVERALL_STATUSES,
  PRIORITIES,
  type Company,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";
import { useApplicationSteps } from "@/lib/application-steps-context";
import { useEvents } from "@/lib/events-context";
import { useCompanyContacts } from "@/lib/company-contacts-context";
import { useCompanyNotes } from "@/lib/company-notes-context";
import { useCompanyCredentials } from "@/lib/company-credentials-context";
import { useNextActions } from "@/lib/next-actions-context";
import { useT } from "@/lib/locale-context";
import { useStepReconcileCheck } from "@/lib/useStepReconcileCheck";

export interface CompanyDetailScreenProps {
  companyId: string;
  // standalone 페이지에서는 목록으로 이동(router.push("/companies")), 모달에서는 모달을
  // 닫는 동작(router.back(), 애니메이션 포함)으로 각각 다르게 연결된다 — 이 컴포넌트
  // 자신은 "닫힌다"는 사실만 알고 실제로 무엇을 할지는 몰라도 된다. 삭제 성공 시에도
  // 그대로 재사용한다(아래 handleConfirmDelete 참고).
  onClose: () => void;
}

// app/(app)/companies/[id]/page.tsx(standalone)와 app/(app)/@modal/(.)companies/[id]/page.tsx
// (풀스크린 모달)가 공유하는 Company Detail 본체. UI/CRUD/전형/일정/메모 로직은 여기 하나만
// 존재하고, 두 라우트는 이 컴포넌트에 companyId/onClose만 다르게 넘겨 얇게 감싼다.
export default function CompanyDetailScreen({ companyId, onClose }: CompanyDetailScreenProps) {
  const t = useT();
  const { showToast } = useToast();
  const { companies, deleteCompany, loading: companiesLoading, error } = useCompanies();
  const { loading: stepsLoading, refresh: refreshSteps } = useApplicationSteps();
  const { loading: eventsLoading, refresh: refreshEvents } = useEvents();
  const { refresh: refreshContacts } = useCompanyContacts();
  const { refresh: refreshNotes } = useCompanyNotes();
  const { refresh: refreshCredentials } = useCompanyCredentials();
  const { refresh: refreshNextActions } = useNextActions();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const loading = companiesLoading || stepsLoading || eventsLoading;
  const company = companies.find((c) => c.id === companyId);

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
    // 삭제로 이 기업이 context에서 사라지면 onClose()가 실제로 화면을 정리하기 직전
    // company === undefined인 채로 한 번 더 렌더링된다. 이 경우엔 notFound() 대신
    // 그냥 아무것도 보여주지 않고 정리가 끝나길 기다린다.
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
      refreshCredentials();
      refreshNextActions();
      // router.push("/companies")를 직접 호출하면(과거 구현) standalone에서는 문제없지만,
      // 인터셉트 모달(@modal) 안에서는 Next.js가 이 push를 "같은 부모 아래에서의 이동"으로
      // 처리해 @modal 슬롯이 default.tsx로 리셋되지 않고 그대로 남는 문제가 있었다(빈
      // 모달이 안 닫힌 채 떠 있는 상태로 보임). onClose를 그대로 쓰면 standalone은 기존과
      // 동일하게 /companies로 이동하고, 모달은 정상적인 닫힘 경로(요청 → 애니메이션 →
      // router.back())를 타 두 경우 모두 올바르게 정리된다.
      onClose();
    } else {
      // 확인 다이얼로그는 닫지 않는다 — 다시 시도할 수 있게 isDeleting만 복구한다.
      setIsDeleting(false);
      showToast(t("common.deleteFailed"), "error");
    }
  }

  return (
    <>
      <CompanyDetailView
        key={company.id}
        company={company}
        error={error}
        onClose={onClose}
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
  onClose: () => void;
  onDeleteClick: () => void;
}

function CompanyDetailView({ company, error, onClose, onDeleteClick }: CompanyDetailViewProps) {
  const t = useT();
  const { updateCompany } = useCompanies();
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  // Escape로 닫을 때 언마운트가 유발하는 blur가 confirmNameEdit을 한 번 더 부르지 않도록 막는 표시.
  const skipNameBlurRef = useRef(false);
  const stepReconcile = useStepReconcileCheck();

  function startEditName() {
    skipNameBlurRef.current = false;
    setNameDraft(company.name);
    setIsEditingName(true);
  }

  async function confirmNameEdit() {
    if (skipNameBlurRef.current) {
      skipNameBlurRef.current = false;
      setIsEditingName(false);
      return;
    }
    if (!nameDraft.trim()) {
      setIsEditingName(false);
      return;
    }
    await updateCompany(company.id, { ...companyToFormValues(company), name: nameDraft });
    setIsEditingName(false);
  }

  // overallStatus는 CompanyForm 제출과 동일하게 stepReconcile.guardSubmit을 거친다 —
  // 미확정 전형이 남아있는 채로 최종 상태로 바뀌는 경우 StepReconcileDialog가 그대로 뜬다.
  async function handleOverallStatusChange(newStatus: OverallStatus) {
    const proceed = stepReconcile.guardSubmit(company, async (values) => {
      await updateCompany(company.id, values);
    });
    proceed({ ...companyToFormValues(company), overallStatus: newStatus });
  }

  async function handlePriorityChange(newPriority: Priority) {
    await updateCompany(company.id, { ...companyToFormValues(company), priority: newPriority });
  }

  return (
    <div className="min-h-screen bg-stitch-bg min-[1600px]:min-h-full">
      <div className="mx-auto max-w-[1200px] px-6 pb-6 pt-14 font-[family-name:var(--font-hanken-grotesk)] font-[350] tracking-[-0.025em] text-stitch-ink">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            {isEditingName ? (
              <input
                type="text"
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={confirmNameEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                  if (e.key === "Escape") {
                    skipNameBlurRef.current = true;
                    setIsEditingName(false);
                  }
                }}
                className="mb-2 w-full max-w-lg rounded-stitch-md border border-primary-navy bg-white px-2 py-0.5 text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink outline-none"
              />
            ) : (
              <div
                onClick={startEditName}
                className="group mb-2 flex cursor-pointer items-center gap-2"
              >
                <h1 className="text-[36px] font-[400] leading-[1.2] tracking-tight text-stitch-ink group-hover:underline">
                  {company.name}
                </h1>
                <MaterialIcon
                  name="edit"
                  size={16}
                  className="shrink-0 text-secondary opacity-70 transition-opacity group-hover:opacity-100"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* 기존 읽기 전용 배지와 같은 rounded-full/색상 규칙을 유지하되 select로
                  바꿔 클릭 즉시 인라인으로 바꿀 수 있게 한다. */}
              <div className="relative">
                <select
                  value={company.overallStatus}
                  onChange={(e) => handleOverallStatusChange(e.target.value as OverallStatus)}
                  className={
                    "cursor-pointer appearance-none rounded-full border py-1 pl-2.5 pr-6 text-[11px] font-[400] outline-none " +
                    OVERALL_STATUS_BADGE_CLASS[company.overallStatus]
                  }
                >
                  {OVERALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(
                        `companies.list.status.${status === "in_progress" ? "inProgress" : status}`
                      )}
                    </option>
                  ))}
                </select>
                <MaterialIcon
                  name="expand_more"
                  size={13}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-current"
                />
              </div>

              <span className="text-[11px] font-[400] text-secondary">
                {t("companies.detail.priorityPrefix")}
              </span>
              <div className="relative -ml-1">
                <select
                  value={company.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as Priority)}
                  className={
                    "cursor-pointer appearance-none rounded-full border py-1 pl-2.5 pr-6 text-[11px] font-[400] outline-none " +
                    (company.priority === "high"
                      ? "border-transparent bg-[#fef2f2] text-error"
                      : "border-stitch-border bg-[#f8f9ff] text-secondary")
                  }
                >
                  {PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {t(`companies.list.priority.${priority}`)}
                    </option>
                  ))}
                </select>
                <MaterialIcon
                  name="expand_more"
                  size={13}
                  className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-current"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("companies.detail.backToList")}
              className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:bg-[#f8f9ff]"
            >
              <MaterialIcon name="close" size={18} />
            </button>
            <button
              type="button"
              onClick={onDeleteClick}
              aria-label={t("common.delete")}
              className="flex h-8 w-8 items-center justify-center rounded-stitch-xl border border-stitch-border bg-card text-secondary shadow-sm transition-colors hover:border-error/40 hover:text-error"
            >
              <MaterialIcon name="delete" size={18} />
            </button>
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
          <div className="contents lg:flex lg:flex-col lg:col-span-8 lg:gap-6">
            <div className="order-1 flex flex-col gap-6 rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
              <StepDetailPanel
                companyId={company.id}
                selectedStepId={selectedStepId}
                onClose={() => setSelectedStepId(null)}
              />
              <div className="h-px bg-stitch-border" />
              <SelectionMemo company={company} />
            </div>

            <div className="order-4 flex flex-col gap-6 rounded-stitch-xl border border-stitch-border bg-card p-6 shadow-sm">
              <CompanyNotes companyId={company.id} />
              <div className="h-px bg-stitch-border" />
              <CompanyInfoCard company={company} />
              <div className="h-px bg-stitch-border" />
              <MypageInfoCard company={company} />
              <div className="h-px bg-stitch-border" />
              <CompanyContacts companyId={company.id} />
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col lg:col-span-4 lg:gap-4">
            <div className="order-2">
              <CompanySchedulePanel companyId={company.id} />
            </div>
            <div className="order-3">
              <NextActions companyId={company.id} />
            </div>
          </div>
        </div>

        {stepReconcile.reconcileState && (
          <StepReconcileDialog
            companyName={stepReconcile.reconcileState.company.name}
            onCancel={stepReconcile.cancel}
            onConfirm={stepReconcile.confirm}
          />
        )}
      </div>
    </div>
  );
}
