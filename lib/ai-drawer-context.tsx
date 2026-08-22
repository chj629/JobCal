"use client";

import { createContext, useContext } from "react";

export interface AiDrawerContextValue {
  // 앱 내부 페이지 어디서든(예: Dashboard의 통합 Empty State) 기존 AI Drawer를 열기 위한
  // 함수. app/(app)/layout.tsx의 handleOpenAiDrawer를 그대로 노출할 뿐이다 — Drawer
  // open/close 로직 자체를 여기서 새로 만들지 않고, Header의 「AIで追加」 버튼이 쓰는 것과
  // 완전히 같은 함수 하나를 공유한다(중복 금지). AI onboarding Step1/2/3 흐름은 이 함수와
  // 무관하게 Header/app/(app)/layout.tsx에 그대로 남아 있다 — 이 open()은 그 흐름을 거치지
  // 않고 곧장 Drawer만 여는, Header 실제 버튼의 "onboarding popover가 없을 때" 동작과 같다.
  open: () => void;
}

const AiDrawerContext = createContext<AiDrawerContextValue | null>(null);

export const AiDrawerProvider = AiDrawerContext.Provider;

export function useAiDrawer(): AiDrawerContextValue {
  const context = useContext(AiDrawerContext);
  if (!context) {
    throw new Error("useAiDrawer must be used within an AiDrawerProvider");
  }
  return context;
}
