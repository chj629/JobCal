"use client";

import { useState, type FormEvent } from "react";
import {
  OVERALL_STATUSES,
  PRIORITIES,
  type CompanyFormValues,
  type OverallStatus,
  type Priority,
} from "@/lib/companies";
import { useT } from "@/lib/locale-context";

interface CompanyFormProps {
  title: string;
  initialValues: CompanyFormValues;
  onCancel: () => void;
  onSubmit: (values: CompanyFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

// docs/database.md의 overall_status 내부 값은 그대로 두고, 표시 라벨만
// companies.list.status.*를 재사용해 번역한다(기업 목록 화면과 동일한 상태 개념).
const STATUS_LABEL_KEYS: Record<OverallStatus, string> = {
  in_progress: "companies.list.status.inProgress",
  offer: "companies.list.status.offer",
  joined: "companies.list.status.joined",
  rejected: "companies.list.status.rejected",
  cancelled: "companies.list.status.cancelled",
};

export default function CompanyForm({
  title,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[10px] border border-border bg-card p-6 shadow-lg">
        <h2 className="mb-4 text-[16px] font-semibold text-foreground">{title}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={labelClass}>{t("companies.form.name")}</label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className={fieldClass}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t("companies.form.status")}</label>
              <select
                value={values.overallStatus}
                onChange={(e) =>
                  setValues({ ...values, overallStatus: e.target.value as OverallStatus })
                }
                className={fieldClass}
              >
                {OVERALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {t(STATUS_LABEL_KEYS[status])}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("companies.form.priorityLabel")}</label>
              <select
                value={values.priority}
                onChange={(e) =>
                  setValues({ ...values, priority: e.target.value as Priority })
                }
                className={fieldClass}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {t(`companies.list.priority.${priority}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>{t("companies.form.websiteUrl")}</label>
            <input
              type="text"
              value={values.websiteUrl}
              onChange={(e) => setValues({ ...values, websiteUrl: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t("companies.form.mypageUrl")}</label>
            <input
              type="text"
              value={values.mypageUrl}
              onChange={(e) => setValues({ ...values, mypageUrl: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-secondary"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
            >
              {t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
