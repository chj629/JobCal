"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AiMailDrawer from "@/components/ai/AiMailDrawer";
import { CompaniesProvider } from "@/lib/companies-context";
import { ApplicationStepsProvider } from "@/lib/application-steps-context";
import { EventsProvider } from "@/lib/events-context";
import { CompanyNotesProvider } from "@/lib/company-notes-context";
import { CompanyContactsProvider } from "@/lib/company-contacts-context";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  // aiDrawerOpen은 X 클릭 즉시 false가 되어 Drawer의 닫힘 애니메이션을 시작시켜야 한다.
  // Header AI 버튼은 그 애니메이션이 끝나 Drawer가 실제로 화면에서 사라진 뒤에만 다시
  // 보여야 하므로, 열 때는 같이 true가 되지만 닫을 때는 Drawer의 onClosed 콜백이 올 때만
  // false가 되는 별도 상태를 둔다.
  const [aiDrawerMounted, setAiDrawerMounted] = useState(false);
  // docs/stitch/ 리뉴얼: screen.png에는 스크롤바가 보이지 않는다. <main>은 이 레이아웃이
  // 모든 페이지에서 공유하므로, 아직 리뉴얼하지 않은 페이지에 영향을 주지 않도록
  // 리뉴얼된 경로에서만 스크롤바 숨김 클래스를 붙인다.
  const pathname = usePathname();
  const isStitchRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/analytics");

  function handleOpenAiDrawer() {
    setAiDrawerOpen(true);
    setAiDrawerMounted(true);
  }

  return (
    <CompaniesProvider>
      <ApplicationStepsProvider>
        <EventsProvider>
          <CompanyNotesProvider>
            <CompanyContactsProvider>
              <ToastProvider>
                <div className="flex min-h-screen min-[1600px]:h-screen min-[1600px]:overflow-hidden">
                  <Sidebar />
                  <div className="flex min-w-0 flex-1 flex-col min-[1600px]:min-h-0">
                    <Header
                      aiDrawerOpen={aiDrawerMounted}
                      onOpenAiDrawer={handleOpenAiDrawer}
                    />
                    {/* @container/main: Calendar/Analytics의 2단 그리드가 뷰포트가 아니라
                        main의 실제 폭을 기준으로 전환되도록 컨테이너 쿼리 기준점을 둔다.
                        AI Drawer가 push 모드로 열려 main이 좁아지면 뷰포트가 1600px 이상이어도
                        자동으로 1단을 유지하고, Drawer를 닫아 main이 다시 넓어지면 별도 상태
                        없이 곧바로 2단으로 복귀한다. */}
                    {/* 1600px 이상에서는 <main>이 자체 세로 스크롤을 갖는다(Sidebar | Main(scroll) |
                        AI Drawer 구조). 그 미만은 지금처럼 body가 스크롤 컨테이너로 남는다. */}
                    <main
                      className={
                        "min-w-0 flex-1 pb-16 md:pb-0 @container/main min-[1600px]:min-h-0 min-[1600px]:overflow-y-auto" +
                        (isStitchRoute ? " stitch-scrollbar-hidden" : "")
                      }
                    >
                      {children}
                    </main>
                  </div>
                  {/* min-[1600px] 이상에서 Drawer.tsx가 이 자리를 static flex item으로 차지해
                      main을 자연스럽게 밀어낸다(push). 그 미만에서는 Drawer 내부에서
                      fixed 오버레이로 그대로 렌더링되어 여기 위치는 시각적으로 무관하다. */}
                  <AiMailDrawer
                    open={aiDrawerOpen}
                    onClose={() => setAiDrawerOpen(false)}
                    onClosed={() => setAiDrawerMounted(false)}
                  />
                </div>
              </ToastProvider>
            </CompanyContactsProvider>
          </CompanyNotesProvider>
        </EventsProvider>
      </ApplicationStepsProvider>
    </CompaniesProvider>
  );
}
