"use client";

import { useParams, useRouter } from "next/navigation";
import CompanyDetailScreen from "@/components/companies/CompanyDetailScreen";

// 직접 URL 접근/새로고침/외부 링크(하드 내비게이션)를 위한 standalone fallback. 소프트
// 내비게이션은 app/(app)/@modal/(.)companies/[id]/page.tsx가 가로채 풀스크린 모달로
// 대신 띄운다 — 실제 UI/CRUD는 두 라우트가 CompanyDetailScreen 하나를 그대로 공유한다.
export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return <CompanyDetailScreen companyId={id} onClose={() => router.push("/companies")} />;
}
