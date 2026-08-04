"use client";

import { useState, type FormEvent } from "react";
import type { ContactFormValues } from "@/lib/companyContacts";
import { useT } from "@/lib/locale-context";

interface ContactFormProps {
  title: string;
  initialValues: ContactFormValues;
  onCancel: () => void;
  onSubmit: (values: ContactFormValues) => void;
}

const fieldClass =
  "h-10 w-full rounded-[10px] border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";
const labelClass = "mb-1 block text-sm text-secondary";

export default function ContactForm({ title, initialValues, onCancel, onSubmit }: ContactFormProps) {
  const t = useT();
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.name.trim()) {
      setError(t("companies.contacts.nameRequired"));
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
            <label className={labelClass}>{t("companies.contacts.name")}</label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className={fieldClass}
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>

          <div>
            <label className={labelClass}>
              {t("companies.contacts.role")} <span className="text-secondary">{t("common.optional")}</span>
            </label>
            <input
              type="text"
              value={values.role}
              onChange={(e) => setValues({ ...values, role: e.target.value })}
              className={fieldClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                {t("companies.contacts.email")} <span className="text-secondary">{t("common.optional")}</span>
              </label>
              <input
                type="text"
                value={values.email}
                onChange={(e) => setValues({ ...values, email: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                {t("companies.contacts.phone")} <span className="text-secondary">{t("common.optional")}</span>
              </label>
              <input
                type="text"
                value={values.phone}
                onChange={(e) => setValues({ ...values, phone: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {t("companies.contacts.memo")} <span className="text-secondary">{t("common.optional")}</span>
            </label>
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
