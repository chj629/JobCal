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

// 더 이상 전형이 진행되지 않는 최종 상태. 이 상태로 "새로" 바뀔 때만 미완료
// application_steps 확인 흐름(useStepReconcileCheck)을 거친다.
export const FINAL_OVERALL_STATUSES: OverallStatus[] = ["offer", "joined", "rejected", "cancelled"];

export const OVERALL_STATUS_LABELS: Record<OverallStatus, string> = {
  in_progress: "진행 중",
  offer: "내정",
  joined: "입사",
  rejected: "불합격",
  cancelled: "지원 취소",
};

// app/(app)/companies/page.tsx(목록)와 components/companies/CompanyDetailScreen.tsx(상세)가
// 상태 배지에 그대로 이어붙이는 색상 클래스. 두 곳이 항상 같은 규칙을 쓰도록 여기 하나로만
// 둔다 — 기존 "내정만 success, 나머지는 전부 동일한 회색" 규칙이 진행중/불합격/지원취소를
// 시각적으로 구분하지 못해, 상태별로 의미가 통하는 색으로 나눴다(진행중=navy, 내정·입사=success,
// 불합격=error, 지원취소=neutral gray). 배지 자체의 옅은 pill 스타일(rounded-full border
// {색}/20 bg-{색}/10 text-{색})과 크기/padding은 기존 내정 배지 그대로 유지한다.
export const OVERALL_STATUS_BADGE_CLASS: Record<OverallStatus, string> = {
  in_progress: "border-primary-navy/20 bg-primary-navy/10 text-primary-navy",
  offer: "border-success/20 bg-success/10 text-success",
  joined: "border-success/20 bg-success/10 text-success",
  rejected: "border-error/20 bg-error/10 text-error",
  cancelled: "border-stitch-border bg-[#f8f9ff] text-secondary",
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
  createdAt: string;
  updatedAt: string;
  websiteUrl: string;
  mypageUrl: string;
  // company_notes(여러 개의 자유 메모 목록)와는 별개로, 기업당 하나만 존재하는 "選考メモ" 값.
  selectionMemo: string;
  // Company Detail "企業情報" 카드의 4개 필드.
  location: string;
  industry: string;
  source: string;
  position: string;
}

export interface CompanyFormValues {
  name: string;
  overallStatus: OverallStatus;
  priority: Priority;
  websiteUrl: string;
  mypageUrl: string;
  selectionMemo: string;
  location: string;
  industry: string;
  source: string;
  position: string;
}

export function createEmptyCompanyFormValues(): CompanyFormValues {
  return {
    name: "",
    overallStatus: "in_progress",
    priority: "medium",
    websiteUrl: "",
    mypageUrl: "",
    selectionMemo: "",
    location: "",
    industry: "",
    source: "",
    position: "",
  };
}

export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    overallStatus: company.overallStatus,
    priority: company.priority,
    websiteUrl: company.websiteUrl,
    mypageUrl: company.mypageUrl,
    selectionMemo: company.selectionMemo,
    location: company.location,
    industry: company.industry,
    source: company.source,
    position: company.position,
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
  selection_memo: string | null;
  location: string | null;
  industry: string | null;
  source: string | null;
  position: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    overallStatus: row.overall_status,
    priority: row.priority,
    createdAt: row.created_at.slice(0, 10),
    updatedAt: row.updated_at.slice(0, 10),
    websiteUrl: row.website_url,
    mypageUrl: row.mypage_url,
    selectionMemo: row.selection_memo ?? "",
    location: row.location ?? "",
    industry: row.industry ?? "",
    source: row.source ?? "",
    position: row.position ?? "",
  };
}

export function companyFormValuesToRow(values: CompanyFormValues) {
  return {
    name: values.name.trim(),
    overall_status: values.overallStatus,
    priority: values.priority,
    website_url: values.websiteUrl.trim(),
    mypage_url: values.mypageUrl.trim(),
    selection_memo: values.selectionMemo.trim() || null,
    location: values.location.trim() || null,
    industry: values.industry.trim() || null,
    source: values.source.trim() || null,
    position: values.position.trim() || null,
  };
}
