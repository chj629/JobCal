"use client";

import { createContext, useContext } from "react";

// app/(app)/layout.tsx가 들고 있는 aiDrawerMounted 상태를 app/(app)/@modal 슬롯(intercepting
// route) 안쪽의 CompanyDetailModal까지 전달하기 위한 최소 context. @modal은 layout.tsx의
// 직접 자식이 아니라 Next.js parallel route로 렌더링되어 prop으로 내려줄 수 없다.
const AiDrawerMountedContext = createContext(false);

export const AiDrawerMountedProvider = AiDrawerMountedContext.Provider;

export function useAiDrawerMounted() {
  return useContext(AiDrawerMountedContext);
}
