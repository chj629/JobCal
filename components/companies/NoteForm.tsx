"use client";

import { useState, type FormEvent } from "react";
import type { NoteFormValues } from "@/lib/companyNotes";
import { useT } from "@/lib/locale-context";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface NoteFormProps {
  title: string;
  initialValues: NoteFormValues;
  onCancel: () => void;
  onSubmit: (values: NoteFormValues) => void;
}

const labelClass = "mb-1 block text-sm text-secondary";

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
    <Modal title={title} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label={
            <>
              {t("companies.notes.title")}{" "}
              <span className="text-secondary">{t("common.optional")}</span>
            </>
          }
          type="text"
          value={values.title}
          onChange={(e) => setValues({ ...values, title: e.target.value })}
        />

        <div>
          <label className={labelClass}>{t("companies.notes.content")}</label>
          <textarea
            value={values.content}
            onChange={(e) => setValues({ ...values, content: e.target.value })}
            rows={5}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
          />
          {error && <p className="mt-1 text-xs text-error">{error}</p>}
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
