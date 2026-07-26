"use client";

import { useState, type FormEvent } from "react";
import type { CompanyStatus } from "@/components/StatusBadge";
import {
  COMPANY_STATUSES,
  STEP_TYPES,
  PRIORITIES,
  type CompanyFormValues,
  type Priority,
} from "@/lib/companies";

interface CompanyFormProps {
  title: string;
  initialValues: CompanyFormValues;
  onCancel: () => void;
  onSubmit: (values: CompanyFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

export default function CompanyForm({
  title,
  initialValues,
  onCancel,
  onSubmit,
}: CompanyFormProps) {
  const [values, setValues] = useState<CompanyFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError("기업명을 입력해 주세요.");
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
            <label className={labelClass}>기업명</label>
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
              <label className={labelClass}>상태</label>
              <select
                value={values.status}
                onChange={(e) =>
                  setValues({ ...values, status: e.target.value as CompanyStatus })
                }
                className={fieldClass}
              >
                {COMPANY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>전형 단계</label>
              <select
                value={values.currentStep}
                onChange={(e) => setValues({ ...values, currentStep: e.target.value })}
                className={fieldClass}
              >
                {STEP_TYPES.map((step) => (
                  <option key={step} value={step}>
                    {step}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>우선순위</label>
              <select
                value={values.priority}
                onChange={(e) =>
                  setValues({ ...values, priority: e.target.value as Priority })
                }
                className={fieldClass}
              >
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>다음 일정</label>
              <input
                type="date"
                value={values.nextSchedule}
                onChange={(e) => setValues({ ...values, nextSchedule: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              일정 시간 <span className="text-secondary">(선택)</span>
            </label>
            <input
              type="time"
              value={values.nextScheduleTime}
              onChange={(e) => setValues({ ...values, nextScheduleTime: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>기업 홈페이지</label>
            <input
              type="text"
              value={values.websiteUrl}
              onChange={(e) => setValues({ ...values, websiteUrl: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>마이페이지 URL</label>
            <input
              type="text"
              value={values.mypageUrl}
              onChange={(e) => setValues({ ...values, mypageUrl: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>메모</label>
            <textarea
              value={values.memo}
              onChange={(e) => setValues({ ...values, memo: e.target.value })}
              rows={3}
              className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-[10px] border border-border px-4 text-sm font-medium text-secondary"
            >
              취소
            </button>
            <button
              type="submit"
              className="h-10 rounded-[10px] bg-primary px-4 text-sm font-medium text-white"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
