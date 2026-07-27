// docs/database.md의 companies.overall_status와 1:1로 대응하는 영문 slug.
// DB에는 이 slug를 저장하고, 화면 표시용 한글 라벨은 OVERALL_STATUS_LABELS로 변환한다.
export type OverallStatus = "in_progress" | "offer" | "joined" | "rejected" | "cancelled";

export const OVERALL_STATUSES: OverallStatus[] = [
  "in_progress",
  "offer",
  "joined",
  "rejected",
  "cancelled",
];

export const OVERALL_STATUS_LABELS: Record<OverallStatus, string> = {
  in_progress: "진행 중",
  offer: "내정",
  joined: "입사",
  rejected: "불합격",
  cancelled: "지원 취소",
};

// docs/database.md의 companies.priority와 1:1로 대응하는 영문 slug.
export type Priority = "high" | "medium" | "low";

export const PRIORITIES: Priority[] = ["high", "medium", "low"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export interface Company {
  id: string;
  name: string;
  overallStatus: OverallStatus;
  priority: Priority;
  updatedAt: string;
  websiteUrl: string;
  mypageUrl: string;
}

export interface CompanyFormValues {
  name: string;
  overallStatus: OverallStatus;
  priority: Priority;
  websiteUrl: string;
  mypageUrl: string;
}

export function createEmptyCompanyFormValues(): CompanyFormValues {
  return {
    name: "",
    overallStatus: "in_progress",
    priority: "medium",
    websiteUrl: "",
    mypageUrl: "",
  };
}

export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    overallStatus: company.overallStatus,
    priority: company.priority,
    websiteUrl: company.websiteUrl,
    mypageUrl: company.mypageUrl,
  };
}

// Supabase companies 테이블의 컬럼(snake_case)과 1:1로 대응한다.
// memo 컬럼은 company_notes로 대체되어 더 이상 앱에서 다루지 않는다(컬럼 자체는 DB에 보존됨).
export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  overall_status: OverallStatus;
  priority: Priority;
  website_url: string;
  mypage_url: string;
  created_at: string;
  updated_at: string;
}

export function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    overallStatus: row.overall_status,
    priority: row.priority,
    updatedAt: row.updated_at.slice(0, 10),
    websiteUrl: row.website_url,
    mypageUrl: row.mypage_url,
  };
}

export function companyFormValuesToRow(values: CompanyFormValues) {
  return {
    name: values.name.trim(),
    overall_status: values.overallStatus,
    priority: values.priority,
    website_url: values.websiteUrl.trim(),
    mypage_url: values.mypageUrl.trim(),
  };
}
