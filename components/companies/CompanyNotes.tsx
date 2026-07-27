"use client";

import { useState } from "react";
import { useCompanyNotes } from "@/lib/company-notes-context";
import {
  createEmptyNoteFormValues,
  noteToFormValues,
  type CompanyNote,
  type NoteFormValues,
} from "@/lib/companyNotes";
import { dateKeyOf } from "@/lib/date";
import NoteForm from "@/components/companies/NoteForm";

interface CompanyNotesProps {
  companyId: string;
}

export default function CompanyNotes({ companyId }: CompanyNotesProps) {
  const { notes, error, addNote, updateNote, deleteNote } = useCompanyNotes();
  const [formState, setFormState] = useState<{ note: CompanyNote | null } | null>(null);

  const companyNotes = notes
    .filter((note) => note.companyId === companyId)
    .sort((a, b) => a.position - b.position);

  async function handleDelete(note: CompanyNote) {
    if (window.confirm(`'${note.title || "이 메모"}'을(를) 삭제하시겠습니까?`)) {
      await deleteNote(note.id);
    }
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
        <h2 className="text-[16px] font-semibold text-foreground">메모</h2>
        <button
          type="button"
          onClick={() => setFormState({ note: null })}
          className="text-xs font-medium text-primary hover:underline"
        >
          + 메모 추가
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-[10px] border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {companyNotes.length === 0 ? (
        <p className="py-6 text-center text-sm text-secondary">등록된 메모가 없습니다.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {companyNotes.map((note) => (
            <div key={note.id} className="rounded-[10px] border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {note.title || "제목 없음"}
                </h3>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setFormState({ note })}
                    className="text-secondary hover:text-primary hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note)}
                    className="text-secondary hover:text-error hover:underline"
                  >
                    삭제
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
          title={formState.note ? "메모 수정" : "메모 추가"}
          initialValues={formState.note ? noteToFormValues(formState.note) : createEmptyNoteFormValues()}
          onCancel={() => setFormState(null)}
          onSubmit={handleSubmit}
        />
      )}
    </section>
  );
}
