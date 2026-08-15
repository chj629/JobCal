// docs/database.md: company_credentials
// マイページURL(login_url에 대응)은 companies.mypage_url로 이미 저장하고 있어 이 타입에서는
// 다루지 않는다. encrypted_password도 암호화 방식이 확정되기 전까지 앱에서 다루지 않는다.
export interface CompanyCredential {
  id: string;
  companyId: string;
  loginId: string;
  loginMemo: string;
}

export interface CredentialFormValues {
  loginId: string;
  loginMemo: string;
}

export function createEmptyCredentialFormValues(): CredentialFormValues {
  return {
    loginId: "",
    loginMemo: "",
  };
}

export function credentialToFormValues(credential: CompanyCredential): CredentialFormValues {
  return {
    loginId: credential.loginId,
    loginMemo: credential.loginMemo,
  };
}

// Supabase company_credentials 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface CompanyCredentialRow {
  id: string;
  user_id: string;
  company_id: string;
  login_url: string | null;
  login_id: string | null;
  encrypted_password: string | null;
  login_memo: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToCompanyCredential(row: CompanyCredentialRow): CompanyCredential {
  return {
    id: row.id,
    companyId: row.company_id,
    loginId: row.login_id ?? "",
    loginMemo: row.login_memo ?? "",
  };
}

export function credentialFormValuesToRow(values: CredentialFormValues) {
  return {
    login_id: values.loginId.trim() || null,
    login_memo: values.loginMemo.trim() || null,
  };
}
