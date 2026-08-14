"use client";

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  type CompanyFormValues,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface CompanyFormProps {
  title: string;
  // docs/stitch/모달다이어로그/jobcal_standard_modal_design_company_registration_example/
  // screen.png의 제목 아래 보조 설명 한 줄. 시안은 "등록"(추가) 화면만 있어, 수정 모달을
  // 여는 곳에서는 안 넘기면 기존처럼 부제 없이 보인다.
  description?: string;
  initialValues: CompanyFormValues;
  onCancel: () => void;
  onSubmit: (values: CompanyFormValues) => void;
}

const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};

// docs/stitch/모달다이어로그/.../screen.png의 pill 입력창(label + rounded-full input,
// bg-surface-main). 공용 Input(components/ui/Input.tsx)은 rounded-lg + 좌측 아이콘 스타일이라
// 다른 화면(대시보드 등)에 영향을 주지 않도록 전역 컴포넌트는 바꾸지 않고 이 모달 전용
// 로컬 마크업으로 처리한다.
const FIELD_INPUT_CLASS =
  "w-full rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy";

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="px-1 text-[12px] font-[500] text-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function TextField(props: InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  return <input {...props} className={FIELD_INPUT_CLASS} />;
}

function SelectField({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { id: string }) {
  return (
    <div className="relative">
      <select {...props} className={FIELD_INPUT_CLASS + " appearance-none pr-10"}>
        {children}
      </select>
      <MaterialIcon
        name="expand_more"
        size={18}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-secondary"
      />
    </div>
  );
}

export default function CompanyForm({
  title,
  description,
  initialValues,
  onCancel,
  onSubmit,
}: CompanyFormProps) {
  const t = useT();
  const [values, setValues] = useState<CompanyFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError(t("companies.form.nameRequired"));
      return;
    }
    onSubmit(values);
  }

  return (
    <Modal
      title={title}
      description={description}
      onClose={onCancel}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-6 py-2.5 text-[14px] font-[500] text-primary-navy transition-colors hover:bg-black/[0.02]"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="company-form"
            className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90"
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="company-form" onSubmit={handleSubmit} className="space-y-6">
        <FormField label={t("companies.form.name")} htmlFor="company-form-name">
          <TextField
            id="company-form-name"
            type="text"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            placeholder={t("companies.form.name")}
          />
          {error && <p className="mt-1 px-1 text-[12px] text-error">{error}</p>}
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label={t("companies.form.status")} htmlFor="company-form-status">
            <SelectField
              id="company-form-status"
              value={values.overallStatus}
              onChange={(e) =>
                setValues({ ...values, overallStatus: e.target.value as OverallStatus })
              }
            >
              {OVERALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {t(STATUS_LABEL_KEYS[status])}
                </option>
              ))}
            </SelectField>
          </FormField>
          <FormField label={t("companies.form.priorityLabel")} htmlFor="company-form-priority">
            <SelectField
              id="company-form-priority"
              value={values.priority}
              onChange={(e) => setValues({ ...values, priority: e.target.value as Priority })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {t(`companies.list.priority.${priority}`)}
                </option>
              ))}
            </SelectField>
          </FormField>
        </div>

        <FormField label={t("companies.form.websiteUrl")} htmlFor="company-form-website">
          <TextField
            id="company-form-website"
            type="text"
            value={values.websiteUrl}
            onChange={(e) => setValues({ ...values, websiteUrl: e.target.value })}
          />
        </FormField>

        <FormField label={t("companies.form.mypageUrl")} htmlFor="company-form-mypage">
          <TextField
            id="company-form-mypage"
            type="text"
            value={values.mypageUrl}
            onChange={(e) => setValues({ ...values, mypageUrl: e.target.value })}
          />
        </FormField>
      </form>
    </Modal>
  );
}
