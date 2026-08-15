"use client";

import { useState } from "react";
import { useCompanyNotes } from "@/lib/company-notes-context";
import {
  createEmptyNoteFormValues,
  noteToFormValues,
  type CompanyNote,
  type NoteFormValues,
} from "@/lib/companyNotes";
import { useT } from "@/lib/locale-context";
import NoteForm from "@/components/companies/NoteForm";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import MaterialIcon from "@/components/ui/MaterialIcon";

interface CompanyNotesProps {
  companyId: string;
}

// docs/stitch/메인페이지 5개/jobcal_company_detail_refined_information_ia의 "企業メモ" 카드.
// Stitch는 메모 하나를 클릭하면 바로 textarea로 바뀌는 인라인 편집을 보여주지만, 추가/수정
// 모달(NoteForm)은 이번 페이지 본체와 별도 기준이라 기존 그대로 재사용한다. 그래서 각 메모는
// Stitch와 같은 카드 모양으로 보여주고, 편집/삭제는 호버로 나타나는 아이콘 버튼이 기존
// NoteForm/ConfirmDialog를 그대로 연다.
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
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[15px] font-[500] text-stitch-ink">
          <MaterialIcon name="notes" size={17} className="text-secondary" />
          {t("companies.notes.heading")}
        </h2>
        <button
          type="button"
          onClick={() => setFormState({ note: null })}
          className="flex items-center gap-0.5 rounded-stitch-md px-2 py-1 text-[11px] font-[400] text-primary-navy transition-colors hover:bg-black/[0.02]"
        >
          <MaterialIcon name="add" size={14} />
          {t("companies.notes.addButton")}
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <div className="pl-6">
        {companyNotes.length === 0 ? (
          <EmptyState icon="notes" title={t("companies.notes.empty")} />
        ) : (
          <div className="space-y-3">
            {companyNotes.map((note) => (
              <div
                key={note.id}
                className="group relative rounded-stitch-xl border border-transparent bg-[#f8f9ff] p-4 transition-colors hover:border-stitch-border"
              >
                <div className="absolute right-3 top-3 flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => setFormState({ note })}
                    className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-background"
                    aria-label={t("common.edit")}
                  >
                    <MaterialIcon name="edit" size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(note)}
                    className="rounded-stitch-md border border-stitch-border bg-white p-1.5 text-secondary shadow-sm hover:bg-background hover:text-error"
                    aria-label={t("common.delete")}
                  >
                    <MaterialIcon name="delete" size={14} />
                  </button>
                </div>
                {note.title && (
                  <p className="mb-1 text-[12px] font-[400] text-secondary">{note.title}</p>
                )}
                <p className="whitespace-pre-wrap pr-16 text-[13px] leading-relaxed text-stitch-ink">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

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
