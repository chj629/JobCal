"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
}

export default function CompanyDetailScreen({ companyId }: CompanyDetailScreenProps) {
  const t = useT();
  const router = useRouter();
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
  // 로그아웃 시 companies-context 등 여러 Context가 각자 독립적으로 onAuthStateChange를
  // 구독하고 있어(lib/companies-context.tsx 등), signOut() 직후 companies가 빈 배열로
  // 바뀌는 시점과 이 페이지가 실제로 /login으로 옮겨가는 시점 사이에 "loading=false인데
  // company가 없는" 렌더가 잠깐 낄 수 있다 — 예전엔 이걸 진짜 404로 오인해 notFound()를
  // 불렀다. 이 컴포넌트만을 위한 별도 세션 감시를 둬서(companies-context 등 데이터
  // context에는 인증 책임을 얹지 않는다) "!company"가 인증 상실 때문인지 진짜 404인지
  // 구분한다. 이 라우트는 애초에 middleware(lib/supabase/proxy.ts)가 보호하는 경로라
  // 최초 진입 시엔 세션이 있었다고 봐도 안전하므로 true로 시작한다.
  const [hasSession, setHasSession] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

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
    // 삭제 성공 시 deleteCompany가 companies context에서 이 기업을 먼저 제거하고, 그 다음
    // handleConfirmDelete가 router.push("/companies")를 호출한다 — 그 사이 한 번
    // company === undefined인 채로 재렌더링될 수 있다. isDeleting이 true인 동안은 이
    // 과도기 렌더로 보고 notFound() 대신 아무것도 보여주지 않은 채 페이지 이동을 기다린다.
    if (isDeleting) return null;
    // 세션이 없다면(로그아웃 직후) companies가 비어 있는 게 당연하다 — 진짜 404가 아니라
    // /login으로의 이동을 기다리는 중이므로 notFound() 없이 아무것도 그리지 않는다.
    if (!hasSession) return null;
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
      router.push("/companies");
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
        <Link
          href="/companies"
          className="mb-4 inline-block text-[13px] text-secondary transition-colors hover:text-stitch-ink"
        >
          {t("companies.detail.backToList")}
        </Link>

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
