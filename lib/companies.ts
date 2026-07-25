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

export const MOCK_COMPANIES: Company[] = [
  {
    id: "1",
    name: "株式会社レコモット",
    currentStep: "1차 면접",
    status: "진행 중",
    nextSchedule: "2026-07-28",
    priority: "높음",
    updatedAt: "2026-07-20",
    websiteUrl: "https://www.recomo.jp",
    mypageUrl: "https://mypage.recomo.jp/login",
    memo: "1차 면접에서 최근 프로젝트 경험 위주로 질문받음. 자기소개 1분 준비.",
  },
  {
    id: "2",
    name: "株式会社ソルクシーズ",
    currentStep: "ES",
    status: "진행 중",
    nextSchedule: "2026-07-25",
    priority: "보통",
    updatedAt: "2026-07-18",
    websiteUrl: "https://www.solxyz.co.jp",
    mypageUrl: "https://mypage.solxyz.co.jp",
    memo: "ES 제출 마감 임박. 지원 동기 항목 재검토 필요.",
  },
  {
    id: "3",
    name: "株式会社ネオジャパン",
    currentStep: "최종 면접",
    status: "진행 중",
    nextSchedule: "2026-07-25",
    priority: "높음",
    updatedAt: "2026-07-22",
    websiteUrl: "https://www.neo.co.jp",
    mypageUrl: "https://saiyo.neo.co.jp/mypage",
    memo: "최종 면접 결과는 당일 저녁 발표 예정.",
  },
  {
    id: "4",
    name: "株式会社オービック",
    currentStep: "내정",
    status: "내정",
    nextSchedule: null,
    priority: "보통",
    updatedAt: "2026-07-10",
    websiteUrl: "https://www.obic.co.jp",
    mypageUrl: "https://mypage.obic.co.jp",
    memo: "내정 승낙 여부 회신 마감일 확인 필요.",
  },
  {
    id: "5",
    name: "株式会社TKC",
    currentStep: "Web 테스트",
    status: "진행 중",
    nextSchedule: "2026-07-27",
    priority: "낮음",
    updatedAt: "2026-07-15",
    websiteUrl: "https://www.tkc.jp",
    mypageUrl: "https://saiyo.tkc.jp/mypage",
    memo: "Web 테스트는 자택에서 응시, 제한시간 60분.",
  },
  {
    id: "6",
    name: "株式会社サイバーエージェント",
    currentStep: "2차 면접",
    status: "불합격",
    nextSchedule: null,
    priority: "보통",
    updatedAt: "2026-06-30",
    websiteUrl: "https://www.cyberagent.co.jp",
    mypageUrl: "https://mypage.cyberagent.co.jp",
    memo: "2차 면접에서 불합격 통보 받음.",
  },
  {
    id: "7",
    name: "楽天グループ株式会社",
    currentStep: "입사",
    status: "입사",
    nextSchedule: null,
    priority: "높음",
    updatedAt: "2026-05-01",
    websiteUrl: "https://www.rakuten.co.jp",
    mypageUrl: "https://mypage.rakuten-recruit.jp",
    memo: "입사 예정. 입사 서류 제출 완료.",
  },
  {
    id: "8",
    name: "株式会社リクルート",
    currentStep: "엔트리",
    status: "지원 취소",
    nextSchedule: null,
    priority: "낮음",
    updatedAt: "2026-06-01",
    websiteUrl: "https://www.recruit.co.jp",
    mypageUrl: "https://mypage.recruit.co.jp",
    memo: "개인 사정으로 지원 취소함.",
  },
  {
    id: "9",
    name: "日本電気株式会社",
    currentStep: "설명회",
    status: "진행 중",
    nextSchedule: "2026-08-02",
    priority: "보통",
    updatedAt: "2026-07-23",
    websiteUrl: "https://www.nec.com/ja",
    mypageUrl: "https://mypage.nec-saiyo.jp",
    memo: "설명회 참가 신청 완료, 사전 질문 준비.",
  },
];

export function getCompanyById(id: string): Company | undefined {
  return MOCK_COMPANIES.find((company) => company.id === id);
}
