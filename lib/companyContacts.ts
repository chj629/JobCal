// docs/database.md: company_contacts
export interface CompanyContact {
  id: string;
  companyId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  memo: string;
  updatedAt: string;
}

export interface ContactFormValues {
  name: string;
  email: string;
  phone: string;
  role: string;
  memo: string;
}

export function createEmptyContactFormValues(): ContactFormValues {
  return {
    name: "",
    email: "",
    phone: "",
    role: "",
    memo: "",
  };
}

export function contactToFormValues(contact: CompanyContact): ContactFormValues {
  return {
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    role: contact.role,
    memo: contact.memo,
  };
}

// Supabase company_contacts 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface CompanyContactRow {
  id: string;
  user_id: string;
  company_id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  memo: string;
  updated_at: string;
}

export function rowToCompanyContact(row: CompanyContactRow): CompanyContact {
  return {
    id: row.id,
    companyId: row.company_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    memo: row.memo,
    updatedAt: row.updated_at,
  };
}

export function contactFormValuesToRow(values: ContactFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    role: values.role.trim(),
    memo: values.memo.trim(),
  };
}
