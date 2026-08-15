"use client";

import { useState, type FormEvent, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { ContactFormValues } from "@/lib/companyContacts";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";

interface ContactFormProps {
  title: string;
  initialValues: ContactFormValues;
  onCancel: () => void;
  onSubmit: (values: ContactFormValues) => void | Promise<void>;
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

export default function ContactForm({ title, initialValues, onCancel, onSubmit }: ContactFormProps) {
  const t = useT();
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [error, setError] = useState("");
  // 저장 요청이 진행 중일 때 버튼을 비활성화해 더블클릭으로 같은 요청이 중복 실행되는
  // 것을 막는다. onSubmit이 끝나면(성공/실패 상관없이) 다시 눌러볼 수 있게 되돌린다.
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isSaving) return;
    if (!values.name.trim()) {
      setError(t("companies.contacts.nameRequired"));
      return;
    }
    setIsSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSaving(false);
    }
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
            form="contact-form"
            disabled={isSaving}
            className="rounded-full bg-primary-navy px-8 py-2.5 text-[14px] font-[500] text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? t("common.loading") : t("common.save")}
          </button>
        </>
      }
    >
      <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
        <FormField label={t("companies.contacts.name")} htmlFor="contact-form-name">
          <TextField
            id="contact-form-name"
            type="text"
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
          />
          {error && <p className="mt-1 px-1 text-[12px] text-error">{error}</p>}
        </FormField>

        <FormField
          label={
            <>
              {t("companies.contacts.role")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          htmlFor="contact-form-role"
        >
          <TextField
            id="contact-form-role"
            type="text"
            value={values.role}
            onChange={(e) => setValues({ ...values, role: e.target.value })}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            label={
              <>
                {t("companies.contacts.email")}{" "}
                <span className="text-secondary">{t("common.optional")}</span>
              </>
            }
            htmlFor="contact-form-email"
          >
            <TextField
              id="contact-form-email"
              type="text"
              value={values.email}
              onChange={(e) => setValues({ ...values, email: e.target.value })}
            />
          </FormField>
          <FormField
            label={
              <>
                {t("companies.contacts.phone")}{" "}
                <span className="text-secondary">{t("common.optional")}</span>
              </>
            }
            htmlFor="contact-form-phone"
          >
            <TextField
              id="contact-form-phone"
              type="text"
              value={values.phone}
              onChange={(e) => setValues({ ...values, phone: e.target.value })}
            />
          </FormField>
        </div>

        <FormField
          label={
            <>
              {t("companies.contacts.memo")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          htmlFor="contact-form-memo"
        >
          <TextareaField
            id="contact-form-memo"
            value={values.memo}
            onChange={(e) => setValues({ ...values, memo: e.target.value })}
            rows={3}
          />
        </FormField>
      </form>
    </Modal>
  );
}
