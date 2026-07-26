import type { CompanyStatus } from "@/components/StatusBadge";

export type Priority = "높음" | "보통" | "낮음";

export interface Company {
  id: string;
  name: string;
  currentStep: string;
  status: CompanyStatus;
  nextSchedule: string | null;
  priority: Priority;
  updatedAt: string;
  websiteUrl: string;
  mypageUrl: string;
  memo: string;
}

export const COMPANY_STATUSES: CompanyStatus[] = [
  "진행 중",
  "내정",
  "입사",
  "불합격",
  "지원 취소",
];

export const STEP_TYPES = [
  "엔트리",
  "설명회",
  "ES",
  "Web 테스트",
  "코딩 테스트",
  "1차 면접",
  "2차 면접",
  "최종 면접",
  "내정",
  "입사",
];

export const PRIORITIES: Priority[] = ["높음", "보통", "낮음"];

export interface CompanyFormValues {
  name: string;
  status: CompanyStatus;
  currentStep: string;
  priority: Priority;
  nextSchedule: string;
  websiteUrl: string;
  mypageUrl: string;
  memo: string;
}

export function createEmptyCompanyFormValues(): CompanyFormValues {
  return {
    name: "",
    status: "진행 중",
    currentStep: STEP_TYPES[0],
    priority: "보통",
    nextSchedule: "",
    websiteUrl: "",
    mypageUrl: "",
    memo: "",
  };
}

export function companyToFormValues(company: Company): CompanyFormValues {
  return {
    name: company.name,
    status: company.status,
    currentStep: company.currentStep,
    priority: company.priority,
    nextSchedule: company.nextSchedule ?? "",
    websiteUrl: company.websiteUrl,
    mypageUrl: company.mypageUrl,
    memo: company.memo,
  };
}

// Supabase companies 테이블의 컬럼(snake_case)과 1:1로 대응한다.
export interface CompanyRow {
  id: string;
  user_id: string;
  name: string;
  status: CompanyStatus;
  current_step: string;
  priority: Priority;
  next_schedule: string | null;
  website_url: string;
  mypage_url: string;
  memo: string;
  created_at: string;
  updated_at: string;
}

export function rowToCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    currentStep: row.current_step,
    status: row.status,
    nextSchedule: row.next_schedule,
    priority: row.priority,
    updatedAt: row.updated_at.slice(0, 10),
    websiteUrl: row.website_url,
    mypageUrl: row.mypage_url,
    memo: row.memo,
  };
}

export function companyFormValuesToRow(values: CompanyFormValues) {
  return {
    name: values.name.trim(),
    status: values.status,
    current_step: values.currentStep,
    priority: values.priority,
    next_schedule: values.nextSchedule.trim() === "" ? null : values.nextSchedule,
    website_url: values.websiteUrl.trim(),
    mypage_url: values.mypageUrl.trim(),
    memo: values.memo.trim(),
  };
}
