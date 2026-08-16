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
import { CompanyCredentialsProvider } from "@/lib/company-credentials-context";
import { NextActionsProvider } from "@/lib/next-actions-context";
import { ToastProvider } from "@/components/ui/Toast";
import { AiDrawerMountedProvider } from "@/lib/ai-drawer-context";

export default function AppLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  // app/(app)/@modal 병렬 슬롯. /companies/[id]로의 소프트 내비게이션을 이 레이아웃
  // 아래(모든 페이지 공통) 어디서든 가로채 풀스크린 모달로 띄우기 위한 것으로, 일치하는
  // 라우트가 없으면 app/(app)/@modal/default.tsx가 null을 렌더링해 평소엔 아무 영향이 없다.
  modal: React.ReactNode;
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
              <CompanyCredentialsProvider>
                <NextActionsProvider>
                  <ToastProvider>
                    <div className="flex min-h-screen sm:h-screen sm:overflow-hidden">
                      <Sidebar />
                      <div className="flex min-w-0 flex-1 flex-col sm:min-h-0">
                        <Header
                          aiDrawerOpen={aiDrawerMounted}
                          onOpenAiDrawer={handleOpenAiDrawer}
                        />
                        {/* @container/main: Calendar/Analytics의 2단 그리드가 뷰포트가 아니라
                            main의 실제 폭을 기준으로 전환되는 컨테이너 쿼리 기준점 — AI Drawer는
                            항상 fixed 오버레이라(아래 AiMailDrawer 주석 참고) main 폭 자체는
                            건드리지 않으므로, Drawer가 열려도 이 컨테이너 쿼리 결과는 바뀌지 않는다. */}
                        {/* sm(640px) 이상에서는 <main>이 자체 세로 스크롤을 갖는다(Sidebar | Main(scroll)).
                            모바일(640px 미만)은 지금처럼 body가 스크롤 컨테이너로 남는다.
                            overflow-x-auto + relative: AI Drawer(440px, 항상 fixed)가 열려 있는 동안
                            main 오른쪽 끝에 보이지 않는 스펜서(아래 aiDrawerMounted 분기)를 붙여 main의
                            스크롤 가능 폭만 440px 늘린다 — 페이지 자체의 grid/max-width/card 크기는
                            전혀 줄이지 않고(Drawer가 그 위를 덮을 뿐), 가려진 오른쪽 영역은 main을
                            가로 스크롤해서 그대로 볼 수 있다. relative는 그 스펜서(absolute)의 기준점. */}
                        <main
                          className={
                            "relative min-w-0 flex-1 pb-16 md:pb-0 @container/main sm:min-h-0 sm:overflow-y-auto sm:overflow-x-auto" +
                            (isStitchRoute ? " stitch-scrollbar-hidden" : "")
                          }
                        >
                          {children}
                          {/* aiDrawerMounted일 때만 렌더 — 1x1px, 화면에 보이지 않지만 absolute 위치가
                              main의 오른쪽 끝보다 440px 밖이라 main의 scrollWidth를 그만큼 늘린다. */}
                          {aiDrawerMounted && (
                            <div
                              aria-hidden="true"
                              className="absolute top-0 hidden h-px w-px sm:block"
                              style={{ left: "calc(100% + 439px)" }}
                            />
                          )}
                        </main>
                        {/* app/(app)/@modal 슬롯. CompanyDetailModal 자신이 fixed 포지셔닝으로
                            <main> 영역만 덮으므로(Header/Sidebar 회피) 여기 위치 자체는
                            시각적으로 무관하다 — children과 형제로 두어 목록/대시보드 등
                            아래 페이지가 언마운트되지 않게 하는 것이 핵심이다. AiDrawerMountedProvider:
                            @modal은 parallel route라 이 레이아웃의 직접 자식이 아니어서 prop으로
                            aiDrawerMounted를 내려줄 수 없어 context로 전달한다 — AI Drawer가 열려
                            있는 동안 CompanyDetailModal도 main과 동일한 가로 스크롤 스펜서 기법을
                            쓰기 위함(components/companies/CompanyDetailModal.tsx 참고). */}
                        <AiDrawerMountedProvider value={aiDrawerMounted}>{modal}</AiDrawerMountedProvider>
                      </div>
                      {/* Drawer.tsx는 항상 position:fixed라(sm 이상에서도) 이 자리가 실제 flex
                          레이아웃에 관여하지 않는다 — 렌더 위치 자체는 시각적으로 무관하다. */}
                      <AiMailDrawer
                        open={aiDrawerOpen}
                        onClose={() => setAiDrawerOpen(false)}
                        onClosed={() => setAiDrawerMounted(false)}
                      />
                    </div>
                  </ToastProvider>
                </NextActionsProvider>
              </CompanyCredentialsProvider>
            </CompanyContactsProvider>
          </CompanyNotesProvider>
        </EventsProvider>
      </ApplicationStepsProvider>
    </CompaniesProvider>
  );
}
