import type { EventType } from "@/lib/events";

// docs/stitch/메인페이지 5개의 캘린더 두 화면(월간/주간) 공통. 월간 그리드의 이벤트
// pill과 주간 시간표의 이벤트 카드가 같은 타입별 색상(파랑=일정, 빨강=마감)을 쓴다.
// result_announcement는 두 Stitch 화면 어디에도 예시가 없어, 앱 다른 곳에서 이미
// "결과 발표"에 쓰는 --color-joined(보라)를 같은 스타일 구조로 확장했다.
export const EVENT_CHIP_CLASS: Record<EventType, string> = {
  schedule: "bg-blue-50 border-primary-navy/20 text-primary-navy hover:bg-blue-100",
  deadline: "bg-red-50 border-error/20 text-error hover:bg-red-100",
  result_announcement: "bg-purple-50 border-joined/20 text-joined hover:bg-purple-100",
};
