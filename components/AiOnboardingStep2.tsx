"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/locale-context";

export interface AiOnboardingStep2Props {
  active: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  // 실제 "AIで分析" 버튼(EmailPasteForm.tsx) — buttonSpotlight 단계에서 이 버튼 자체를
  // spotlight하고 위치를 잰다. 새 버튼을 만들지 않고 실제 버튼을 그대로 가리킨다.
  analyzeButtonRef: RefObject<HTMLButtonElement | null>;
  // EmailPasteForm.tsx의 emailText.trim().length > 0과 완전히 같은 값을 그대로 받는다
  // (실제 "AIで分析" 버튼의 disabled 조건과 동일한 값) — textarea↔button spotlight 전환과
  // 버튼의 실제 활성화 여부가 절대 어긋나지 않도록 하기 위함이다.
  hasText: boolean;
  onDismiss: () => void;
  // textareaSpotlight 단계로 들어오고 나가는 시점을 EmailPasteForm.tsx에 알려준다 —
  // 그 동안에만 textarea placeholder를 튜토리얼용 문구로 바꿔야 하는데, phase는 이
  // 컴포넌트 내부 상태라 부모가 직접 알 수 없기 때문이다.
  onSpotlightActiveChange?: (active: boolean) => void;
}

// video: 실제 튜토리얼 영상 재생 중. fading: 영상이 끝나 fade out 하는 짧은 전환.
// textareaSpotlight: 영상이 사라지고 textarea를 강조하며 붙여넣기를 유도하는 단계.
// buttonSpotlight: textarea에 실제 값이 들어온 뒤, 이번엔 "AIで分析" 버튼을 강조하며
// 클릭을 유도하는 단계 — 이 단계가 onboarding의 최종 단계다(실제 버튼 클릭이 종료 조건).
type Phase = "video" | "fading" | "textareaSpotlight" | "buttonSpotlight";

// docs/tutorial/tutorial2.mov(1302x1080)을 변환한 정적 사본. 원본은 건드리지 않고
// public/tutorials에 h264/aac mp4로 복사해 Next.js가 정적으로 서빙한다.
// Header.tsx가 Step 1 hint를 보여주는 시점에 미리 <link rel="preload">로 이 경로를
// 프리페치해, Step 2 진입 시 영상 첫 프레임이 빈 화면으로 잠깐 보이는 것을 줄인다.
export const VIDEO_SRC = "/tutorials/ai-onboarding-step2.mp4";
const VIDEO_ASPECT_RATIO = "1302 / 1080";
// dim 전체(진입/퇴장), 영상 fade, hole이 대상 위치로 옮겨가는 애니메이션, 팝오버 fade/이동
// 전부 같은 박자로 맞춰 하나의 자연스러운 전환처럼 보이게 한다.
const TRANSITION_MS = 400;
const POPOVER_WIDTH = 280;
const POPOVER_GAP = 12;
const ARROW_SIZE = 12;

// components/AiOnboardingHint.tsx(1-step onboarding)와 같은 스타일 언어를 그대로
// 재사용한다: box-shadow spotlight, white/border 카드, rounded-2xl, shadow-lg
// 계열의 부드러운 그림자. AI 기능 전용 새 색상은 추가하지 않는다.
//
// dim overlay 구조: 서로 다른 단계가 각자 다른 dim 구현을 따로 mount/unmount 하면 그
// 전환 순간 화면이 한 번 밝아지는 flash가 생긴다. 이를 없애기 위해 dim은 처음부터
// 끝까지 단 하나의 div만 계속 유지한다 — 그 div는 항상 box-shadow spread로 "구멍"을
// 뚫는 방식이고, video 단계에는 그 구멍을 크기 0으로 접어둬 사실상 화면 전체를 균일하게
// 덮는 flat dim처럼 보이게 하고, textareaSpotlight/buttonSpotlight 단계에서는 그 구멍이
// 각각의 대상(textarea 또는 버튼) 자리로 커지도록(그리고 두 대상 사이를 오갈 때도
// 자리만) top/left/width/height만 CSS transition으로 바꾼다. dim 자신의 opacity는
// Step 2 전체가 나타날 때 한 번 0→1로, 사용자가 실제로 "AIで分析"을 눌러 종료될 때
// 한 번 1→0으로만 움직이고, 그 사이 어떤 단계 전환 중에도 절대 건드리지 않는다.
export default function AiOnboardingStep2({
  active,
  textareaRef,
  analyzeButtonRef,
  hasText,
  onDismiss,
  onSpotlightActiveChange,
}: AiOnboardingStep2Props) {
  const t = useT();
  const [phase, setPhase] = useState<Phase | null>(null);
  // dim(하나뿐인 persistent overlay)의 opacity. Step 2 진입 시 한 번 true가 되고, 사용자가
  // 실제 "AIで分析"을 눌러 종료될 때만 다시 false가 된다 — 그 사이 어떤 단계를 오가는
  // 동안에는 절대 바뀌지 않는다.
  const [dimVisible, setDimVisible] = useState(false);
  // video 컨텐츠 자신의 fade in/out(entered 다음 프레임에 true, ended 시 false로
  // 내려가며 fading으로 전환). dim과 완전히 분리된, video 레이어만의 opacity다.
  const [videoVisible, setVideoVisible] = useState(false);
  // 안내 팝오버(텍스트/버튼 공용) 카드 자신의 fade-in — textareaSpotlight/buttonSpotlight
  // 단계에 처음 진입할 때 한 번만 켜지고, 두 단계 사이를 오갈 때는 다시 끄지 않는다
  // (팝오버는 그대로 유지된 채 위치/문구만 바뀌며 자연스럽게 슬라이드한다).
  const [spotlightVisible, setSpotlightVisible] = useState(false);
  const [textareaRect, setTextareaRect] = useState<DOMRect | null>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  // active가 false가 된 뒤에도 dim이 fade-out을 다 재생할 시간(TRANSITION_MS)만큼은
  // 계속 렌더링을 유지하기 위한 상태 — AiOnboardingHint.tsx/Drawer.tsx와 동일한 mounted
  // 패턴. "사용자가 실제 AIで分析 클릭 → dim fade-out → onboarding 종료" 순서를
  // 그대로 구현한다(active가 꺼졌다고 곧장 통째로 사라지지 않는다).
  const [mounted, setMounted] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // settle-detection(아래)의 700ms 하드캡 setTimeout이 예약된 뒤 곧바로 rAF로 먼저
  // settle이 확인되거나(video 재생이 이미 시작되고도 한참 뒤라도) handleVideoEnded 등
  // 다른 경로로 phase가 이미 앞서 나간 경우, 이 하드캡이 뒤늦게(탭이 백그라운드라 타이머가
  // 지연되는 경우 특히) 발화해 phase를 다시 "video"로 되돌려 버리는 문제가 있었다.
  // effect가 다시 실행되어도 초기화되지 않는 ref로 "이미 결정됨"을 기억해, 최초 1회만
  // phase를 정하고 그 뒤의 지연 발화는 전부 무시한다.
  const phaseDecidedRef = useRef(false);

  // Drawer.tsx/AiOnboardingHint.tsx와 동일한 이유: active prop 변화를 effect가 아니라
  // 렌더 중에 감지해 즉시 반영한다. 켜질 때는 mounted를 올리고, 꺼질 때는 dimVisible을
  // 먼저 내려 fade-out을 그 즉시 시작한다(실제 unmount는 아래 effect에서 전환이 끝난
  // 뒤에만 한다).
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) {
      setMounted(true);
    } else {
      setDimVisible(false);
    }
  }

  useEffect(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // active가 꺼지는 경우에는 phase/textareaRect를 건드리지 않는다 — dim fade-out이
    // 재생되는 동안 화면에 마지막으로 보이던 상태(예: buttonSpotlight) 그대로 얼어붙어
    // 있어야 하기 때문이다. 다음에 active가 다시 true가 될 때만 아래에서 새로 초기화한다.
    if (!active) return;

    // 새 활성화 주기 시작 — 이번 주기의 최초 settle 결정을 다시 받아들인다.
    phaseDecidedRef.current = false;

    // lib/locale-context.tsx 등과 같은 패턴: effect 안에서 setState를 동기 호출하면
    // react-hooks/set-state-in-effect가 cascading render 위험을 경고한다.
    queueMicrotask(() => {
      setPhase(null);
      setVideoVisible(false);
      setSpotlightVisible(false);
      setButtonRect(null);
    });

    function measure() {
      const el = textareaRef.current;
      if (el) setTextareaRect(el.getBoundingClientRect());
    }

    // Drawer 패널(components/ui/Drawer.tsx)이 translate-x로 슬라이드 인 하는 도중에
    // textarea 좌표를 재면 최종 위치가 아니라 애니메이션 도중 좌표를 잡는다. 매
    // 프레임(requestAnimationFrame)마다 textarea의 getBoundingClientRect()를 직접
    // 재서, 연속 4프레임 동안 값이 변하지 않으면 "정지"로 본다. 최대 700ms
    // 안전장치도 함께 둔다. reduce-motion 사용자는 영상 없이 곧장 textareaSpotlight로
    // 넘어가므로 이 값이 정확해야 한다.
    const pollStartedAt = Date.now();
    let started = false;
    let rafId: number | null = null;
    let lastRight: number | null = null;
    let stableFrames = 0;

    function handleSettled() {
      if (started) return;
      started = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      // 지연 발화 방지: 이 활성화 주기에서 이미 최초 phase가 결정된 뒤라면(다른 경로로
      // 더 앞서 나갔을 수 있으므로) 이 하드캡/폴링 결과로 되돌리지 않는다.
      if (phaseDecidedRef.current) return;
      phaseDecidedRef.current = true;
      measure();
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setPhase(reduceMotion ? "textareaSpotlight" : "video");
    }

    function pollTextareaSettled() {
      const el = textareaRef.current;
      if (!el) {
        handleSettled();
        return;
      }
      const current = el.getBoundingClientRect().right;
      if (current === lastRight && Date.now() - pollStartedAt > 150) {
        stableFrames += 1;
        if (stableFrames >= 4) {
          handleSettled();
          return;
        }
      } else {
        stableFrames = 0;
      }
      lastRight = current;
      rafId = requestAnimationFrame(pollTextareaSettled);
    }

    rafId = requestAnimationFrame(pollTextareaSettled);
    timeoutsRef.current.push(setTimeout(handleSettled, 700));

    window.addEventListener("resize", measure);
    // Drawer 안쪽 스크롤 컨테이너는 이 컴포넌트 밖(EmailPasteForm 상위)에 있어
    // ref로 직접 잡지 않는다 — scroll 이벤트는 버블링하지 않지만 capture 단계는
    // 조상에서도 발생하므로 document capture로 모든 스크롤 컨테이너를 잡는다.
    document.addEventListener("scroll", measure, true);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
      document.removeEventListener("scroll", measure, true);
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current = [];
    };
  }, [active, textareaRef]);

  // buttonSpotlight 단계인 동안 "AIで分析" 버튼의 실제 위치를 잰다. Drawer는 이 시점에
  // 이미 오래전에 열려 정착된 상태라(textareaSpotlight를 거쳐 온 뒤이므로) textarea 때와
  // 같은 rAF 안정화 폴링은 필요 없다 — 곧장 재고 resize/scroll에도 계속 갱신한다.
  useEffect(() => {
    if (phase !== "buttonSpotlight") return;

    function measureButton() {
      const el = analyzeButtonRef.current;
      if (el) setButtonRect(el.getBoundingClientRect());
    }

    measureButton();
    window.addEventListener("resize", measureButton);
    document.addEventListener("scroll", measureButton, true);
    return () => {
      window.removeEventListener("resize", measureButton);
      document.removeEventListener("scroll", measureButton, true);
    };
  }, [phase, analyzeButtonRef]);

  // textarea에 처음으로 값이 들어오면(붙여넣기든 직접 입력이든) textareaSpotlight →
  // buttonSpotlight로 넘어간다. 반대로 사용자가 내용을 전부 지워 다시 빈 값이 되면
  // textareaSpotlight로 되돌아간다 — 실제 "AIで分析" 버튼도 이때 disabled로 돌아가므로,
  // 비활성 버튼을 계속 spotlight하는 대신 다시 "붙여넣기" 안내로 돌아가는 쪽이 더
  // 단순하고 항상 실제 버튼 상태와 일치한다(버튼을 억지로 활성화하지 않는다).
  useEffect(() => {
    // lib/locale-context.tsx 등과 같은 패턴: effect 안에서 setState를 동기 호출하면
    // react-hooks/set-state-in-effect가 cascading render 위험을 경고한다.
    if (phase === "textareaSpotlight" && hasText) {
      queueMicrotask(() => setPhase("buttonSpotlight"));
    } else if (phase === "buttonSpotlight" && !hasText) {
      queueMicrotask(() => setPhase("textareaSpotlight"));
    }
  }, [phase, hasText]);

  // dim은 phase가 처음 정해진(video든, reduce-motion으로 곧장 textareaSpotlight든) 다음
  // 프레임에 딱 한 번 fade-in 한다 — 그 뒤로는(video→...→buttonSpotlight를 오가도)
  // 다시 건드리지 않는다.
  useEffect(() => {
    if (!phase || dimVisible) return;
    const raf = requestAnimationFrame(() => setDimVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [phase, dimVisible]);

  // video 단계에 막 들어온 프레임에는 아직 videoVisible이 false라 opacity-0으로 그려지고,
  // 그 다음 프레임에 true로 바뀌며 opacity-100로의 transition이 재생된다(같은 프레임에서
  // 바로 opacity-100을 주면 브라우저가 전환 없이 곧장 최종 상태로 그려버린다).
  useEffect(() => {
    if (phase !== "video") return;
    const raf = requestAnimationFrame(() => setVideoVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // 안내 팝오버도 같은 이유로 같은 방식의 fade-in — 단, textareaSpotlight↔buttonSpotlight
  // 사이를 오갈 때는 이미 켜져 있으므로(spotlightVisible이 이미 true) 다시 껐다 켜지
  // 않는다. 위치/문구만 바뀌며 매끄럽게 이어진다.
  useEffect(() => {
    if (phase !== "textareaSpotlight" && phase !== "buttonSpotlight") return;
    if (spotlightVisible) return;
    const raf = requestAnimationFrame(() => setSpotlightVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [phase, spotlightVisible]);

  // active가 꺼진 뒤 dim fade-out(TRANSITION_MS)이 끝나면 그제서야 실제로 unmount한다.
  useEffect(() => {
    if (!mounted || active) return;
    const timeout = setTimeout(() => setMounted(false), TRANSITION_MS);
    return () => clearTimeout(timeout);
  }, [active, mounted]);

  // textareaSpotlight/buttonSpotlight 단계로 들어오는 시점에 부모에게 알린다(placeholder
  // 전환용 — 실제로는 textareaSpotlight일 때만 의미가 있지만, buttonSpotlight일 때는
  // 이미 실제 값이 있어 placeholder 자체가 보이지 않으므로 true로 둬도 무해하다).
  useEffect(() => {
    if (phase === "textareaSpotlight" || phase === "buttonSpotlight") {
      onSpotlightActiveChange?.(true);
    }
  }, [phase, onSpotlightActiveChange]);

  // 실제 종료(active=false)는 phase 값 자체가 바뀌지 않을 수 있어(dim fade-out 동안
  // phase를 마지막 단계로 얼려둔다, 위 주석 참고) 위 effect만으로는 placeholder가
  // 계속 튜토리얼 문구로 남는다 — active가 꺼지는 그 순간 바로 false를 알려 원상복구한다.
  useEffect(() => {
    if (!active) onSpotlightActiveChange?.(false);
  }, [active, onSpotlightActiveChange]);

  function handleVideoEnded() {
    setPhase("fading");
    timeoutsRef.current.push(setTimeout(() => setPhase("textareaSpotlight"), TRANSITION_MS));
  }

  // 영상을 불러오지 못했을 때(네트워크 오류 등) 온보딩이 멈춰있지 않도록 곧장
  // 최종 안내 상태로 넘어간다.
  function handleVideoError() {
    setPhase("textareaSpotlight");
  }

  function handleSkipVideo() {
    setPhase("textareaSpotlight");
  }

  if (!mounted || !phase || !textareaRect) return null;

  const isTextareaGuide = phase === "textareaSpotlight";
  const isButtonGuide = phase === "buttonSpotlight";
  const spotlightActive = isTextareaGuide || isButtonGuide;
  // buttonSpotlight로 막 넘어온 첫 프레임 등 buttonRect가 아직 측정되지 않았을 때는
  // textareaRect를 그대로 써서 "대상 없음(null)"으로 렌더가 깨지는 대신 이전 위치에서
  // 자연스럽게 이어 슬라이드하게 한다.
  const activeRect = isButtonGuide ? (buttonRect ?? textareaRect) : textareaRect;

  // dim(hole-punch) 구멍의 목표 위치. textareaSpotlight/buttonSpotlight 단계에서만
  // 각 대상 자리(+4px 여유)로 열리고, 그 전(video/fading)에는 textarea 정중앙에서
  // 크기 0으로 접혀 있어 화면 전체가 균일하게 덮인 flat dim처럼 보인다 — 별도 div가
  // 아니라 이 하나의 dim div가 top/left/width/height만 CSS transition으로 바꿔가며
  // "구멍이 자라나는" 또는 "다른 자리로 옮겨가는" 것처럼 자연스럽게 움직인다.
  const holeCenterX = textareaRect.left + textareaRect.width / 2;
  const holeCenterY = textareaRect.top + textareaRect.height / 2;
  const holeRect = spotlightActive
    ? {
        top: activeRect.top - 2,
        left: activeRect.left - 2,
        width: activeRect.width + 4,
        height: activeRect.height + 4,
      }
    : { top: holeCenterY, left: holeCenterX, width: 0, height: 0 };

  // 팝오버는 대상을 가리지 않도록 대상 왼쪽-위 방향(대상과 왼쪽 정렬, 그 위에 배치)에
  // 둔다. top 대신 bottom으로 위치를 잡아, 팝오버 자신의 실제 높이와 무관하게 "대상
  // 바로 위"에 자연스럽게 붙는다(내용 길이가 바뀌어도 안전). bottom/left에도 transition을
  // 걸어 textarea↔button 사이를 오갈 때 팝오버가 순간이동하지 않고 미끄러지듯 이동한다.
  const popoverLeft = Math.max(24, activeRect.left);
  const popoverBottom = window.innerHeight - activeRect.top + POPOVER_GAP;
  const popoverTitleKey = isButtonGuide ? "aiOnboarding.step2.analyzeTitle" : "aiOnboarding.step2.title";
  const popoverDescriptionKey = isButtonGuide
    ? "aiOnboarding.step2.analyzeDescription"
    : "aiOnboarding.step2.description";

  // dim이 완전히 사라지는 중(active=false, fade-out 진행)에는 그 안의 콘텐츠(video나
  // 팝오버)도 dim과 함께 같은 박자로 사라져야 한다 — dimVisible을 곱해 dim이 꺼지는
  // 순간 콘텐츠도 같이 fade-out 하도록 한다.
  const videoContentVisible = dimVisible && phase === "video" && videoVisible;
  const spotlightContentVisible = dimVisible && spotlightActive && spotlightVisible;

  return createPortal(
    <>
      {/* 유일한 persistent dim overlay. Step 2가 활성인 동안 절대 unmount되지 않고,
          opacity도 진입/퇴장 두 번만 움직인다. z-[55]: AI Drawer 패널(components/ui/
          Drawer.tsx, z-50, 불투명 흰 배경)보다 높아야 한다 — spotlight 단계의 구멍은
          Drawer 안(textarea/버튼)에 뚫리므로, dim이 Drawer보다 아래(z-40)에 있으면
          Drawer의 불투명 배경에 완전히 가려져 전혀 보이지 않는다. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[55] rounded-stitch-2xl transition-[opacity,top,left,width,height] ease-out"
        style={{
          top: holeRect.top,
          left: holeRect.left,
          width: holeRect.width,
          height: holeRect.height,
          opacity: dimVisible ? 1 : 0,
          transitionDuration: `${TRANSITION_MS}ms`,
          // 흰색 ring은 얇고 약하게: "사용 위치를 강조하는 정도"만 남기고, 대상 자체가
          // 별도의 큰 흰 카드처럼 보이지 않게 한다. 바깥 dim(9999px 스프레드)의
          // 어둡기는 이 튜닝 범위 밖이라 그대로 둔다.
          boxShadow: "0 0 0 1px rgba(255,255,255,0.28), 0 0 0 9999px rgba(0,0,0,0.3)",
        }}
      />

      {(phase === "video" || phase === "fading") && (
        <div
          aria-hidden={phase === "fading"}
          className={
            "pointer-events-none fixed inset-0 z-[60] flex items-center justify-center transition-opacity " +
            (videoContentVisible ? "opacity-100" : "opacity-0")
          }
          style={{ transitionDuration: `${TRANSITION_MS}ms` }}
        >
          {/* frame: 영상 크기 계산(width/max-height/aspect-ratio)을 이 wrapper가 직접 갖고,
              화면(AI Drawer 포함 전체) 정중앙에 절대 위치(left/top 50% + -translate 50%)
              시킨다 — 아래 スキップ 버튼은 이 frame 기준으로 absolute 배치되어 flex gap처럼
              높이에 포함되지 않으므로, 버튼 유무와 무관하게 영상 자체가 항상 정중앙에 온다. */}
          <div
            className="pointer-events-auto absolute left-1/2 top-1/2 h-auto w-[min(1100px,calc(100%_-_48px))] max-h-[82vh] -translate-x-1/2 -translate-y-1/2"
            style={{ aspectRatio: VIDEO_ASPECT_RATIO }}
          >
            <video
              src={VIDEO_SRC}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={handleVideoEnded}
              onError={handleVideoError}
              // frame이 이미 width: min(1100px, calc(100% - 48px)) + max-h-[82vh] +
              // aspect-ratio로 최종 크기를 정해두었으므로, video는 그 크기를 그대로
              // 채우기만 한다(w-full h-full) — object-contain은 혹시 모를 반올림 오차에도
              // 절대 찌그러지거나 잘리지 않게 하는 안전장치.
              className="h-full w-full rounded-2xl border border-stitch-border bg-white object-contain shadow-sm"
            />
            <button
              type="button"
              onClick={handleSkipVideo}
              className="absolute left-1/2 top-full mt-6 -translate-x-1/2 text-[13px] whitespace-nowrap text-white/80 transition-colors hover:text-white"
            >
              {t("aiOnboarding.step2.dismiss")}
            </button>
          </div>
        </div>
      )}

      {spotlightActive && (
        <div
          role="dialog"
          aria-label={t(popoverTitleKey)}
          // z-[55]: 위 dim과 같은 이유로 AI Drawer 패널(z-50)보다 위에 있어야 실제로 보인다.
          // shadow: 얕고 옅게 — textarea/버튼과 별개의 "카드"가 아니라 그 옆에 붙은 작은
          // tooltip처럼 보이도록 한다. bottom/left도 transition에 포함해 대상이 바뀔 때
          // 팝오버가 순간이동하지 않고 미끄러지듯 이동한다.
          className={
            "pointer-events-auto fixed z-[55] rounded-2xl border border-stitch-border bg-white p-5 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.12)] transition-[opacity,bottom,left] " +
            (spotlightContentVisible ? "opacity-100" : "opacity-0")
          }
          style={{
            bottom: popoverBottom,
            left: popoverLeft,
            width: POPOVER_WIDTH,
            transitionDuration: `${TRANSITION_MS}ms`,
          }}
        >
          {/* 팝오버가 대상 위에 있으므로, 화살표는 팝오버 아래쪽에 붙어 대상을 향해
              아래로 가리킨다(AiOnboardingHint.tsx의 위쪽 화살표와 반대 방향 —
              border-l/t 대신 border-r/b, top:-6 대신 bottom:-6). 크기(h-3 w-3)는 그대로
              두고, 팝오버 본문과 같은 옅은 그림자를 더해 "아래를 가리키는 한 덩어리"로
              더 또렷하게 읽히게 한다. */}
          <div
            aria-hidden="true"
            className="absolute h-3 w-3 rotate-45 border-b border-r border-stitch-border bg-white shadow-[2px_2px_4px_-2px_rgba(15,23,42,0.12)]"
            style={{ bottom: -(ARROW_SIZE / 2), left: 24 }}
          />

          <h3 className="text-[15px] font-semibold text-primary-navy">{t(popoverTitleKey)}</h3>
          <p className="mt-2 whitespace-pre-line text-[13px] leading-[1.6] text-stitch-ink">
            {t(popoverDescriptionKey)}
          </p>
          {isTextareaGuide && (
            <p className="mt-2 text-[11px] leading-[1.5] text-secondary">
              {t("aiOnboarding.step2.note")}
            </p>
          )}

          {/* 별도 CTA 버튼 없이(buttonSpotlight 단계는 실제 "AIで分析" 버튼 자체가
              CTA다), 원치 않을 때를 위한 작은 텍스트 액션만 둔다. */}
          <button
            type="button"
            onClick={onDismiss}
            className="mt-3 text-[12px] text-secondary transition-colors hover:text-stitch-ink"
          >
            {t("aiOnboarding.step2.dismiss")}
          </button>
        </div>
      )}
    </>,
    document.body
  );
}
