// docs/database.md: next_actions
export interface NextAction {
  id: string;
  companyId: string;
  text: string;
  dueLabel: string;
  done: boolean;
  // DB row에는 항상 존재한다. optional은 기존 fixture 호환을 유지하기 위함이다.
  createdAt?: string;
  updatedAt?: string;
}

// Supabase next_actions 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface NextActionRow {
  id: string;
  user_id: string;
  company_id: string;
  text: string;
  due_label: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

export function rowToNextAction(row: NextActionRow): NextAction {
  return {
    id: row.id,
    companyId: row.company_id,
    text: row.text,
    dueLabel: row.due_label,
    done: row.done,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
