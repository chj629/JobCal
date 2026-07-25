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

export const MOCK_COMPANIES: Company[] = [
  {
    id: "1",
    name: "株式会社レコモット",
    currentStep: "1차 면접",
    status: "진행 중",
    nextSchedule: "2026-07-28",
    priority: "높음",
    updatedAt: "2026-07-20",
  },
  {
    id: "2",
    name: "株式会社ソルクシーズ",
    currentStep: "ES",
    status: "진행 중",
    nextSchedule: "2026-07-25",
    priority: "보통",
    updatedAt: "2026-07-18",
  },
  {
    id: "3",
    name: "株式会社ネオジャパン",
    currentStep: "최종 면접",
    status: "진행 중",
    nextSchedule: "2026-07-25",
    priority: "높음",
    updatedAt: "2026-07-22",
  },
  {
    id: "4",
    name: "株式会社オービック",
    currentStep: "내정",
    status: "내정",
    nextSchedule: null,
    priority: "보통",
    updatedAt: "2026-07-10",
  },
  {
    id: "5",
    name: "株式会社TKC",
    currentStep: "Web 테스트",
    status: "진행 중",
    nextSchedule: "2026-07-27",
    priority: "낮음",
    updatedAt: "2026-07-15",
  },
  {
    id: "6",
    name: "株式会社サイバーエージェント",
    currentStep: "2차 면접",
    status: "불합격",
    nextSchedule: null,
    priority: "보통",
    updatedAt: "2026-06-30",
  },
  {
    id: "7",
    name: "楽天グループ株式会社",
    currentStep: "입사",
    status: "입사",
    nextSchedule: null,
    priority: "높음",
    updatedAt: "2026-05-01",
  },
  {
    id: "8",
    name: "株式会社リクルート",
    currentStep: "엔트리",
    status: "지원 취소",
    nextSchedule: null,
    priority: "낮음",
    updatedAt: "2026-06-01",
  },
  {
    id: "9",
    name: "日本電気株式会社",
    currentStep: "설명회",
    status: "진행 중",
    nextSchedule: "2026-08-02",
    priority: "보통",
    updatedAt: "2026-07-23",
  },
];
