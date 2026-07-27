"use client";

import { useState, type FormEvent } from "react";
import type { NoteFormValues } from "@/lib/companyNotes";

interface NoteFormProps {
  title: string;
  initialValues: NoteFormValues;
  onCancel: () => void;
  onSubmit: (values: NoteFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

export default function NoteForm({ title, initialValues, onCancel, onSubmit }: NoteFormProps) {
  const [values, setValues] = useState<NoteFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.content.trim()) {
      setError("내용을 입력해 주세요.");
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
            <label className={labelClass}>
              제목 <span className="text-secondary">(선택)</span>
            </label>
            <input
              type="text"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div>
            <label className={labelClass}>내용</label>
            <textarea
              value={values.content}
              onChange={(e) => setValues({ ...values, content: e.target.value })}
              rows={5}
              className="w-full rounded-[10px] border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
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
