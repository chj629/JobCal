"use client";

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { NoteFormValues } from "@/lib/companyNotes";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";

interface NoteFormProps {
  title: string;
  initialValues: NoteFormValues;
  onCancel: () => void;
  onSubmit: (values: NoteFormValues) => void;
}

// docs/stitch/모달다이어로그/.../screen.png의 pill 입력창. components/CompanyForm.tsx가
// 처음 로컬로 구현한 것과 동일한 스타일을 그대로 따른다(CompanyForm 자체는 건드리지 않음).
const FIELD_INPUT_CLASS =
  "w-full rounded-full border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy";

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
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

function TextareaField(props: TextareaHTMLAttributes<HTMLTextAreaElement> & { id: string }) {
  return (
    <textarea
      {...props}
      className="w-full resize-none rounded-stitch-2xl border border-stitch-border bg-[#f8f9ff] px-5 py-2.5 text-[14px] text-foreground outline-none transition-all focus:border-primary-navy focus:ring-1 focus:ring-primary-navy"
    />
  );
}

export default function NoteForm({ title, initialValues, onCancel, onSubmit }: NoteFormProps) {
  const t = useT();
  const [values, setValues] = useState<NoteFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.content.trim()) {
      setError(t("companies.notes.contentRequired"));
      return;
    }
    onSubmit(values);
  }

  return (
    <Modal
      title={title}
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
            form="note-form"
            className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90"
          >
            {t("common.save")}
          </button>
        </>
      }
    >
      <form id="note-form" onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label={
            <>
              {t("companies.notes.title")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          htmlFor="note-form-title"
        >
          <TextField
            id="note-form-title"
            type="text"
            value={values.title}
            onChange={(e) => setValues({ ...values, title: e.target.value })}
          />
        </FormField>

        <FormField label={t("companies.notes.content")} htmlFor="note-form-content">
          <TextareaField
            id="note-form-content"
            value={values.content}
            onChange={(e) => setValues({ ...values, content: e.target.value })}
            rows={5}
          />
          {error && <p className="mt-1 px-1 text-[12px] text-error">{error}</p>}
        </FormField>
      </form>
    </Modal>
  );
}
