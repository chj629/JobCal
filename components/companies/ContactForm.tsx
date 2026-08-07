"use client";

import { useState, type FormEvent } from "react";
import type { ContactFormValues } from "@/lib/companyContacts";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ContactFormProps {
  title: string;
  initialValues: ContactFormValues;
  onCancel: () => void;
  onSubmit: (values: ContactFormValues) => void;
}

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
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={t("companies.contacts.name")}
          type="text"
          value={values.name}
          onChange={(e) => setValues({ ...values, name: e.target.value })}
          error={error}
        />

        <Input
          label={
            <>
              {t("companies.contacts.role")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          type="text"
          value={values.role}
          onChange={(e) => setValues({ ...values, role: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={
              <>
                {t("companies.contacts.email")}{" "}
                <span className="text-secondary">{t("common.optional")}</span>
              </>
            }
            type="text"
            value={values.email}
            onChange={(e) => setValues({ ...values, email: e.target.value })}
          />
          <Input
            label={
              <>
                {t("companies.contacts.phone")}{" "}
                <span className="text-secondary">{t("common.optional")}</span>
              </>
            }
            type="text"
            value={values.phone}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
          />
        </div>

        <div>
          <label className={labelClass}>
            {t("companies.contacts.memo")} <span className="text-secondary">{t("common.optional")}</span>
          </label>
          <textarea
            value={values.memo}
            onChange={(e) => setValues({ ...values, memo: e.target.value })}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" variant="primary">
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
