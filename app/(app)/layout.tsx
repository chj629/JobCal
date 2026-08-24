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
import { AiDrawerProvider } from "@/lib/ai-drawer-context";

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
  // AI onboarding Step 2("메일 본문 붙여넣기" 데모/spotlight). Header(Step 1 CTA)와
  // AiMailDrawer(실제 textarea)가 서로 형제 컴포넌트라 이 레이아웃이 상태를 소유하고
  // 양쪽에 내려준다. Step 2 자체는 별도 DB 상태를 쓰지 않는다 — Drawer가 열릴 때마다
  // (Step 1 CTA 클릭 시 또는 "?" 도움말로 다시 볼 때) 매번 새로 시작한다.
  const [aiOnboardingStep2Active, setAiOnboardingStep2Active] = useState(false);
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
                    <AiDrawerProvider value={{ open: handleOpenAiDrawer }}>
                      <div className="flex min-h-screen sm:h-screen sm:overflow-hidden">
                        <Sidebar />
                        {/* min-[1600px](풀스크린 데스크톱)에서 Drawer가 열려 있는 동안 이 열
                            (Header+main) 전체에 Drawer 폭과 같은 오른쪽 여백을 줘서 콘텐츠를
                            왼쪽으로 밀어낸다("push") — Header/main이 이 div의 자식이라
                            margin-right 하나로 둘 다 함께 좁아지고, Sidebar는 이 div 밖이라
                            영향받지 않는다. Drawer.tsx 자체(항상 position:fixed + translate-x
                            슬라이드)는 그대로 두고 main 쪽만 그만큼 비켜준다. 1600px 미만은
                            (모바일 포함) 예전처럼 그대로 fixed 오버레이만 하고 push하지
                            않는다 — 더 좁은 폭까지 push하면 Calendar/Analytics의 @container
                            2단 그리드가 줄어든 main 폭 때문에 의도치 않게 1단으로 접힐 수
                            있다. 이 1600px 기준은 과거 push 모드가 쓰던 것과 동일하다(git
                            "AI drawer 반응 개선" 커밋으로 fixed 오버레이 + 아래 가로 스크롤
                            스펜서 방식으로 바뀌면서 사라졌던 것을 되살림). transition은
                            Drawer의 기존 슬라이드(duration-200 ease-out)와 같은 타이밍이라
                            둘이 함께 끝나 보인다. */}
                        <div
                          className={
                            "flex min-w-0 flex-1 flex-col transition-[margin-right] duration-200 ease-out sm:min-h-0" +
                            (aiDrawerOpen ? " min-[1600px]:mr-[440px]" : "")
                          }
                        >
                          <Header
                            aiDrawerOpen={aiDrawerMounted}
                            onOpenAiDrawer={handleOpenAiDrawer}
                            onStartAiOnboardingStep2={() => setAiOnboardingStep2Active(true)}
                          />
                          {/* @container/main: Calendar/Analytics의 2단 그리드가 뷰포트가 아니라
                              main의 실제 폭을 기준으로 전환되는 컨테이너 쿼리 기준점 — min-[1600px]에서
                              위 margin-right로 main 폭이 실제로 줄면 이 컨테이너 쿼리도 함께 반응한다
                              (별도 처리 불필요). */}
                          {/* sm(640px) 이상에서는 <main>이 자체 세로 스크롤을 갖는다(Sidebar | Main(scroll)).
                              모바일(640px 미만)은 지금처럼 body가 스크롤 컨테이너로 남는다.
                              overflow-x-auto + relative: min-[1600px] 미만에서 AI Drawer(440px, fixed
                              오버레이, push 없음)가 열려 있는 동안 main 오른쪽 끝에 보이지 않는 스펜서
                              (아래 aiDrawerMounted 분기)를 붙여 main의 스크롤 가능 폭만 440px 늘린다 —
                              가려진 오른쪽 영역을 가로 스크롤해서 볼 수 있다. min-[1600px] 이상은 이미
                              margin-right로 push돼 가려질 내용이 없으므로 스펜서를 숨긴다(안 숨기면
                              불필요한 가로 스크롤이 새로 생긴다). relative는 그 스펜서(absolute)의 기준점. */}
                          <main
                            className={
                              "relative min-w-0 flex-1 pb-16 md:pb-0 @container/main sm:min-h-0 sm:overflow-y-auto sm:overflow-x-auto" +
                              (isStitchRoute ? " stitch-scrollbar-hidden" : "")
                            }
                          >
                            {children}
                            {/* aiDrawerMounted일 때만 렌더 — 1x1px, 화면에 보이지 않지만 absolute 위치가
                                main의 오른쪽 끝보다 440px 밖이라 main의 scrollWidth를 그만큼 늘린다.
                                min-[1600px]에서는 push가 이미 처리하므로 숨긴다 — sm:block과
                                min-[1600px]:hidden을 따로 쓰면 두 미디어 쿼리가 2304px 같은 넓은
                                뷰포트에서 동시에 매치되어 어느 쪽이 이기는지가 Tailwind가 생성한
                                CSS의 등장 순서에 좌우되는데, 이 프로젝트 빌드에서는 min-[1600px]
                                블록이 sm 블록보다 먼저 나와 sm:block이 이겨버려 숨겨지지 않는
                                버그가 있었다. sm~1599px 구간만 명시하는 단일 범위 variant로 바꿔
                                두 미디어 쿼리가 겹치지 않게 해서 순서에 의존하지 않게 한다. */}
                            {aiDrawerMounted && (
                              <div
                                aria-hidden="true"
                                className="absolute top-0 hidden h-px w-px sm:max-[1599px]:block"
                                style={{ left: "calc(100% + 439px)" }}
                              />
                            )}
                          </main>
                        </div>
                        {/* Drawer.tsx는 항상 position:fixed라(sm 이상에서도) 이 자리가 실제 flex
                            레이아웃에 관여하지 않는다 — 렌더 위치 자체는 시각적으로 무관하다. push는
                            Drawer가 아니라 위 열(Header+main)의 margin-right가 담당한다. */}
                        <AiMailDrawer
                          open={aiDrawerOpen}
                          onClose={() => setAiDrawerOpen(false)}
                          onClosed={() => setAiDrawerMounted(false)}
                          onboardingStep2Active={aiOnboardingStep2Active}
                          onOnboardingStep2Dismiss={() => setAiOnboardingStep2Active(false)}
                        />
                      </div>
                    </AiDrawerProvider>
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
