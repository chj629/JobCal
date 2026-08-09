"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import { useCompanyNotes } from "@/lib/company-notes-context";
import {
  createEmptyNoteFormValues,
  noteToFormValues,
  type CompanyNote,
  type NoteFormValues,
} from "@/lib/companyNotes";
import { dateKeyOf } from "@/lib/date";
import { useT } from "@/lib/locale-context";
import NoteForm from "@/components/companies/NoteForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

interface CompanyNotesProps {
  companyId: string;
}

export default function CompanyNotes({ companyId }: CompanyNotesProps) {
  const t = useT();
  const { notes, error, addNote, updateNote, deleteNote } = useCompanyNotes();
  const [formState, setFormState] = useState<{ note: CompanyNote | null } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CompanyNote | null>(null);

  const companyNotes = notes
    .filter((note) => note.companyId === companyId)
    .sort((a, b) => a.position - b.position);

  const fallbackTitle = t("companies.notes.deleteConfirmFallbackTitle");

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    await deleteNote(deleteTarget.id);
    setDeleteTarget(null);
  }

  async function handleSubmit(values: NoteFormValues) {
    const ok = formState?.note
      ? await updateNote(formState.note.id, values)
      : await addNote(companyId, values);
    if (ok) setFormState(null);
  }

  return (
    <section className="rounded-[10px] border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-foreground">{t("companies.notes.heading")}</h2>
        <button
          type="button"
          onClick={() => setFormState({ note: null })}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("companies.notes.addButton")}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {companyNotes.length === 0 ? (
        <EmptyState icon={NotebookPen} title={t("companies.notes.empty")} />
      ) : (
        <div className="flex flex-col gap-3">
          {companyNotes.map((note) => (
            <div key={note.id} className="rounded-[10px] border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {note.title || t("companies.notes.untitled")}
                </h3>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormState({ note })}
                    className="-my-3 py-3 text-secondary hover:text-primary hover:underline"
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(note)}
                    className="-my-3 py-3 text-secondary hover:text-error hover:underline"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-foreground">
                {note.content}
              </p>
              <p className="mt-2 text-xs text-secondary">{dateKeyOf(note.updatedAt)}</p>
            </div>
          ))}
        </div>
      )}

      {formState && (
        <NoteForm
          title={
            formState.note ? t("companies.notes.editModalTitle") : t("companies.notes.addModalTitle")
          }
          initialValues={formState.note ? noteToFormValues(formState.note) : createEmptyNoteFormValues()}
          onCancel={() => setFormState(null)}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("companies.notes.deleteConfirm", {
          title: deleteTarget?.title || fallbackTitle,
        })}
        description={t("common.cannotUndo")}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        variant="danger"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </section>
  );
}
