import type { ReactNode } from "react";

export interface LoadingStateProps {
  children: ReactNode;
  className?: string;
}

// companies/page.tsx, calendar/page.tsx가 쓰던 로딩 박스(테두리 + 카드 배경 + 중앙 정렬 텍스트)를
// 그대로 공통화한 것. 페이지 전체 로딩(early return)과 특정 영역만 로딩되는 경우 양쪽에서
// 동일하게 쓸 수 있도록 문구만 children으로 받는다.
export default function LoadingState({ children, className = "" }: LoadingStateProps) {
  return (
    <div
      className={
        "rounded-lg border border-border bg-card px-6 py-10 text-center text-sm text-secondary" +
        (className ? " " + className : "")
      }
    >
      {children}
    </div>
  );
}
