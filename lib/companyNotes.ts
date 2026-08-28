// docs/database.md: company_notes
export interface CompanyNote {
  id: string;
  companyId: string;
  title: string;
  content: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteFormValues {
  title: string;
  content: string;
}

export function createEmptyNoteFormValues(): NoteFormValues {
  return {
    title: "",
    content: "",
  };
}

export function noteToFormValues(note: CompanyNote): NoteFormValues {
  return {
    title: note.title,
    content: note.content,
  };
}

// Supabase company_notes 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface CompanyNoteRow {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export function rowToCompanyNote(row: CompanyNoteRow): CompanyNote {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    content: row.content,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function noteFormValuesToRow(values: NoteFormValues) {
  return {
    title: values.title.trim(),
    content: values.content.trim(),
  };
}
