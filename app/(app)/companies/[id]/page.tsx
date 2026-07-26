"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import StatusBadge from "@/components/StatusBadge";
import CompanyForm from "@/components/CompanyForm";
import { STEP_TYPES, companyToFormValues } from "@/lib/companies";
import { useCompanies } from "@/lib/companies-context";

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { companies, updateCompany, deleteCompany, loading, error } = useCompanies();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const company = companies.find((c) => c.id === id);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-8 py-8 text-sm text-secondary">
        불러오는 중입니다...
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

  const currentIndex = STEP_TYPES.indexOf(company.currentStep);

  async function handleDelete() {
    if (window.confirm(`'${company!.name}' 기업을 삭제하시겠습니까?`)) {
      setIsDeleting(true);
      const ok = await deleteCompany(company!.id);
      if (ok) {
        router.push("/companies");
      } else {
        setIsDeleting(false);
      }
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-8 py-8">
      <div className="flex items-center justify-between">
        <Link href="/companies" className="text-sm text-secondary hover:text-foreground">
          ← 기업 목록으로
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsEditOpen(true)}
            className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-foreground"
          >
            수정
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-10 rounded-[10px] border border-error px-4 text-sm font-medium text-error"
          >
            삭제
          </button>
        </div>
      </div>

      <header className="mt-4 mb-8">
        <h1 className="text-[28px] font-semibold text-foreground">{company.name}</h1>
        <div className="mt-2">
          <StatusBadge status={company.status} />
        </div>
      </header>

      {error && (
        <p className="mb-8 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <section className="mb-8 rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">기본 정보</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-secondary">현재 전형 단계</dt>
            <dd className="mt-1 text-foreground">{company.currentStep}</dd>
          </div>
          <div>
            <dt className="text-secondary">지원 우선순위</dt>
            <dd className="mt-1 text-foreground">{company.priority}</dd>
          </div>
          <div>
            <dt className="text-secondary">다음 일정</dt>
            <dd className="mt-1 text-foreground">{company.nextSchedule ?? "예정 없음"}</dd>
          </div>
          <div>
            <dt className="text-secondary">기업 홈페이지</dt>
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
          <div>
            <dt className="text-secondary">마이페이지 URL</dt>
            <dd className="mt-1">
              <a
                href={company.mypageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {company.mypageUrl}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section className="mb-8 rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">전형 타임라인</h2>
        <ol className="flex flex-col gap-4">
          {STEP_TYPES.map((step, index) => {
            const state =
              index < currentIndex ? "완료" : index === currentIndex ? "진행 중" : "예정";

            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={
                    "h-2.5 w-2.5 shrink-0 rounded-full " +
                    (state === "예정" ? "bg-border" : "bg-primary")
                  }
                />
                <span
                  className={
                    "text-sm " +
                    (state === "진행 중"
                      ? "font-semibold text-primary"
                      : state === "완료"
                        ? "text-foreground"
                        : "text-secondary")
                  }
                >
                  {step}
                </span>
                <span className="ml-auto text-xs text-secondary">{state}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rounded-[10px] border border-border bg-card p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">메모</h2>
        <p className="text-sm text-foreground">{company.memo}</p>
      </section>

      {isEditOpen && (
        <CompanyForm
          title="기업 수정"
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
