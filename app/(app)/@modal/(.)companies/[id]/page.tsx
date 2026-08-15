"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import CompanyDetailModal from "@/components/companies/CompanyDetailModal";
import CompanyDetailScreen from "@/components/companies/CompanyDetailScreen";

// /companies/[id]로의 소프트 내비게이션(Link/router.push)을 앱 전체 어디서든 가로채
// 이 풀스크린 모달로 대신 띄운다((app)/layout.tsx가 모든 페이지의 공통 조상이라, Dashboard/
// Companies/Calendar/Analytics/AI Drawer 어디서 진입해도 동일하게 동작한다). 하드
// 내비게이션(직접 URL 접속, 새로고침, 외부 링크)은 이 라우트를 거치지 않고 항상
// app/(app)/companies/[id]/page.tsx(standalone)가 그대로 렌더링된다.
export default function CompanyDetailInterceptedModal() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Company Detail 내부의 X 버튼/ESC/backdrop이 전부 이 함수 하나로 닫기를 요청하고,
  // 실제 router.back()은 CompanyDetailModal의 닫힘 애니메이션이 끝난 뒤(onClosed)에만
  // 호출된다 — 즉시 unmount되어 애니메이션이 잘리는 것을 막는다(components/CompanyCreateForm.tsx
  // 등 기존 Modal 소비자들과 동일한 패턴).
  const [open, setOpen] = useState(true);

  function requestClose() {
    setOpen(false);
  }

  return (
    <CompanyDetailModal open={open} onClose={requestClose} onClosed={() => router.back()}>
      <CompanyDetailScreen companyId={id} onClose={requestClose} />
    </CompanyDetailModal>
  );
}
