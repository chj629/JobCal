"use client";

import { useState, type FormEvent } from "react";
import { createEmptyCompanyFormValues, type CompanyFormValues } from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface CompanyCreateFormProps {
  title: string;
  description?: string;
  onCancel: () => void;
  onSubmit: (values: CompanyFormValues) => void | Promise<void>;
}

// docs/stitch/모달다이어로그/.../screen.png의 pill 입력창. CompanyForm.tsx와 동일한 스타일을
// 이 모달 전용으로 그대로 재사용한다(공용 컴포넌트는 건드리지 않음).
const FIELD_INPUT_CLASS =
  "w-full rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy";

// 신규 기업 등록 전용 최소 모달. 企業名만 입력받고, 나머지는 createEmptyCompanyFormValues의
// 기본값(overallStatus="in_progress", priority="medium" 등 기존 DB 기본값과 동일)을 그대로
// 써서 저장한다. 세부 정보(상태/우선순위/홈페이지/마이페이지 등)는 Company Detail에서
// 필요할 때 채우는 흐름으로 유도한다. 기존 기업 수정에 쓰는 CompanyForm.tsx는 그대로
// 두고 건드리지 않는다 — 이 컴포넌트는 신규 등록 두 곳(대시보드/기업 목록)에서만 쓴다.
export default function CompanyCreateForm({
  title,
  description,
  onCancel,
  onSubmit,
}: CompanyCreateFormProps) {
  const t = useT();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // Modal이 fade-out 애니메이션을 끝까지 재생한 뒤에만 실제 onCancel(부모의 unmount)을
  // 부르기 위한 로컬 상태. 배경/ESC/X/취소 버튼 모두 이 함수 하나로 닫기를 요청하고,
  // 실제 정리는 Modal의 onClosed에서 한 번만 일어난다.
  const [closing, setClosing] = useState(false);
  function requestClose() {
    setClosing(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    if (!name.trim()) {
      setError(t("companies.form.nameRequired"));
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit({ ...createEmptyCompanyFormValues(), name });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={!closing}
      onClosed={onCancel}
      title={title}
      description={description}
      onClose={requestClose}
      footer={
        <>
          <button
            type="button"
            onClick={requestClose}
            className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-colors hover:bg-black/[0.02]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="company-create-form"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving && <MaterialIcon name="progress_activity" size={16} className="animate-spin" />}
            {isSaving ? t("common.loading") : t("common.save")}
          </button>
        </>
      }
    >
      <form id="company-create-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="company-create-form-name"
            className="px-1 text-[12px] font-[500] text-foreground"
          >
            {t("companies.form.name")}
          </label>
          <input
            id="company-create-form-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder={t("companies.form.name")}
            className={FIELD_INPUT_CLASS}
          />
          {error && <p className="mt-1 px-1 text-[12px] text-error">{error}</p>}
        </div>
      </form>
    </Modal>
  );
}
