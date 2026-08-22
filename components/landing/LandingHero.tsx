"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref } from "@/lib/i18n/publicLocalePaths";
import MaterialIcon from "@/components/ui/MaterialIcon";
import LandingHeroDemo, { rampIn } from "@/components/landing/LandingHeroDemo";
import LandingHeroMobileDemo from "@/components/landing/LandingHeroMobileDemo";

// 랜딩페이지 25차(2026-08). Hero copy(위, white 배경)와 product demo(아래) 사이를
// 배경색으로도 분리했다 — demo를 감싼 카드 뒤에 작은 halo를 붙이는 대신, demo 영역
// 자체를 페이지 폭 전체를 쓰는 독립 section으로 빼고 그 section에 white→JobCal blue
// 톤→lavender→JobCal blue→white 순서의 세로 gradient를 입혔다(SECTION_GRADIENT, 위아래
// 모두 white로 끝나므로 Hero copy 쪽과 바로 아래 Moment 1 쪽 모두 흰 배경으로 자연스럽게
// 이어진다). 색의 "hump" 구간을 넓게(22%~80%) 잡고 색상 자체도 24차보다 조금 더
// 진하게(#dde7ff/#d6cdf7) 해서 product stage 전체가 은은한 atmosphere를 갖게 했다 —
// 카드 장식이 아니라 section 전체의 분위기여야 한다는 요청. 이 section은
// `left-1/2 w-screen -translate-x-1/2`로 부모의 max-w-[1400px] 제약을 벗어나 뷰포트
// 전체 폭을 쓴다. gradient의 opacity는 SECTION_BG_IN 구간에서 progress에 따라 0→1로
// 올라간다 — 초반(순수 메일 화면)에는 흰 배경 그대로였다가 AI가 개입하는 시점부터
// 배경이 물든다.
//
// copy fade는 23차와 동일하게 opacity만 사용(translateY 없음) — "텍스트가 위로 밀려
// 나가며 사라진다"가 아니라 "제품 화면이 커지면서 카피가 제자리에서 뒤로 사라진다"는
// 느낌. scroll progress 계산은 이 컴포넌트(부모)에서 하고 LandingHeroDemo에는 prop으로만
// 내려준다(자체 scroll 리스너 없음, 리스너 중복 방지) — headline fade와 demo 확장이
// 정확히 같은 타이밍에 맞아야 하기 때문. Hero 전체 높이는 min-h-[125vh]로 110~140vh
// 범위 안에 두고, SCROLL_RANGE_PX(짧은 고정 거리)만큼 스크롤하면 copy fade-out + demo
// 확장이 모두 끝난다 — sticky/300vh track 없음, 사용자를 여러 화면 동안 붙잡지 않는다.
// copy는 opacity만 낮추고 레이아웃 높이는 그대로 유지한다(높이를 접으면 데모 위치가
// 위로 튀는 layout shift가 생기므로). 완전히 사라진 뒤에는 pointer-events를 꺼서
// 투명해진 버튼을 실수로 누르지 못하게 했다. prefers-reduced-motion에서는 copy를 항상
// 보이게(opacity 1) 유지하고, 데모/배경 section 모두 progress=1(확장 완료 상태)을 받아
// 정적으로 렌더링한다.
//
// 50차(2026-08): "스크롤 값이 요소에 너무 직접 반응해서 뻑뻑하다"는 피드백으로
// raw scroll progress를 그대로 쓰던 것을 rAF 기반의 smoothed progress로
// 바꿨다. 지속 실행되는 rAF 루프가 매 프레임 `window.scrollY`를 직접 읽어
// target을 구하고, `current += (target - current) * (1 - e^(-dt/SMOOTH_TAU_MS))`
// 식(프레임 레이트에 무관한 지수 감쇠 보간, dt는 실제 경과 ms)으로 current를
// target에 접근시킨다. Attio류의 "스크롤에 붙지만 살짝 관성이 있는" 느낌을
// 위해 spring/bounce가 아니라 순수 지수 감쇠만 쓴다(오버슈트 없음 = elastic
// 없음). SMOOTH_TAU_MS(약 90ms)가 관성의 "무게감"을 결정 — 너무 크면
// 끈적하게 늘어지고 너무 작으면 사실상 raw progress와 다를 게 없어진다.
// diff가 SMOOTH_EPSILON 이하로 수렴하면 루프를 멈춰(무한 rAF 낭비 방지)
// 'scroll' 이벤트가 다시 올 때만 깨운다 — 스크롤이 멈추면 한두 프레임 안에
// 빠르게 target에 수렴하고 조용해진다.
// (처음엔 별도 scroll 핸들러가 target을 state로 넘겨주는 2단 구조였는데,
// 트랙패드로 빠르게 스크롤해 정확히 맨 위로 되돌아오는 케이스를 실제
// 브라우저에서 테스트하다가 그 target이 "마지막 scroll 이벤트가 읽은 값"에
// 미묘하게 멈춰서(브라우저가 최종 정착 프레임에 scroll 이벤트를 한 번 더
// 안 쏴줄 때가 있다) 완전히 0으로 안 돌아오고 아주 옅게 남는 걸 발견했다 —
// ease-out cubic이 t≈0 부근에서 기울기가 가팔라(도함수=3) 그 미세한 잔여값을
// 오히려 눈에 띄게 확대해버렸다. 그래서 중간 state를 없애고 rAF 루프 자신이
// 매 프레임 window.scrollY라는 유일한 진실 소스를 직접 읽게 바꿔 근본적으로
// 없앴다 — 'scroll' 이벤트는 이제 루프가 멈춰 있을 때 "깨우는" 역할만 한다.)
// LandingHeroDemo에 내려주는 `progress`, Hero copy fade(copyFadeT)와 배경
// fade(sectionBgOpacity) 모두 이 하나의 smoothed progress를 공유하므로
// "카피 fade → scene 확장 → 01~04 등장 → workflow line"이 전부 같은
// 리듬으로 움직인다. prefers-reduced-motion에서는 이 루프 자체를 시작하지
// 않고 기존처럼 progress=1 정적 상태를 유지한다.
const SCROLL_RANGE_PX = 420;
const SMOOTH_TAU_MS = 90;
const SMOOTH_EPSILON = 0.0004;
// diff가 SMOOTH_EPSILON 이하로 "보이는" 시점부터 이 시간(ms)만큼은 'scroll'
// 이벤트 없이도 계속 window.scrollY를 직접 재확인한다 — 관성 스크롤의 마지막
// 정착 프레임이 이벤트를 안 쏴줄 때를 대비한 안전장치(아래 tickRef 주석 참고).
const SMOOTH_SETTLE_GRACE_MS = 220;
const COPY_FADE_IN: [number, number] = [0, 0.55];
const SECTION_BG_IN: [number, number] = [0.05, 0.4];
// 46차(2026-08): 레퍼런스(밝고 깨끗한 SaaS 톤의 workflow scene 배경)에 맞춰
// 단순 세로 gradient 대신 여러 radial glow를 겹쳤다 — 오른쪽 위에 옅은
// cyan, 왼쪽 아래에 lavender, 중앙에 부드러운 blue bloom. 전부 아주 낮은
// opacity라 dark/neon 느낌 없이 여전히 흰 배경에 가깝다. 이 상수를 쓰는
// opacity 페이드 로직(SECTION_BG_IN 등)은 그대로 유지된다.
const SECTION_GRADIENT = [
  "radial-gradient(1100px 650px at 88% 20%, rgba(103,232,249,0.22) 0%, rgba(103,232,249,0) 60%)",
  "radial-gradient(900px 750px at 15% 92%, rgba(196,181,253,0.34) 0%, rgba(196,181,253,0) 65%)",
  "radial-gradient(820px 520px at 52% 55%, rgba(221,231,255,0.55) 0%, rgba(221,231,255,0) 70%)",
  "linear-gradient(180deg, #ffffff 0%, #eef2ff 20%, #e4e9fb 50%, #eef2ff 80%, #ffffff 100%)",
].join(", ");

export default function LandingHero() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();

  const [smoothProgress, setSmoothProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  // 이 지속 실행 rAF 루프가 매 프레임 window.scrollY를 직접 읽어 target을
  // 구하고, smoothProgress를 그 target에 지수적으로 접근시킨다 — spring/
  // elastic 없이 순수 감쇠만 써서 "붙지만 살짝 관성 있는" 느낌을 낸다.
  // (구현 노트: 처음엔 scroll 이벤트 핸들러가 별도 state로 target을
  // 넘겨주는 구조였는데, 실제 브라우저에서 트랙패드로 빠르게 스크롤해
  // 정확히 0으로 되돌아오는 케이스를 테스트하다 그 target이 "마지막
  // scroll 이벤트 시점의 값"에 미묘하게 멈춰서(브라우저가 최종 정착
  // 프레임에 scroll 이벤트를 한 번 더 안 쏴줄 때가 있음) 완전히 0으로
  // 수렴하지 못하고 아주 옅게 남아있는 게 보였다 — ease-out 곡선이 초반
  // 기울기가 가팔라서(t≈0 부근에서 도함수=3) 그 미세한 잔여값을 오히려
  // 눈에 띄게 확대해 버렸다. 그래서 중간 state를 없애고, 이 루프 자신이
  // 매 프레임 window.scrollY라는 유일한 진실 소스를 직접 읽게 바꿔
  // 근본적으로 없앴다 — 'scroll' 이벤트는 이제 그냥 "루프를 깨우는"
  // 역할만 한다.)
  const smoothRef = useRef(0);
  const smoothRafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const convergedSinceRef = useRef<number | null>(null);
  const tickRef = useRef<(now: number) => void>(() => {});

  useEffect(() => {
    tickRef.current = (now: number) => {
      const target = Math.min(1, Math.max(0, window.scrollY / SCROLL_RANGE_PX));
      const last = lastTsRef.current ?? now;
      const dt = Math.min(now - last, 48);
      lastTsRef.current = now;
      const factor = 1 - Math.exp(-dt / SMOOTH_TAU_MS);
      const next = smoothRef.current + (target - smoothRef.current) * factor;
      smoothRef.current = next;
      setSmoothProgress(next);
      if (Math.abs(target - next) > SMOOTH_EPSILON) {
        convergedSinceRef.current = null;
        smoothRafRef.current = requestAnimationFrame(tickRef.current);
        return;
      }
      // 값 자체는 수렴했지만, 관성 스크롤의 마지막 정착 프레임은 'scroll'
      // 이벤트를 안 쏴줄 때가 있어(실측으로 확인) window.scrollY가 여기서
      // 몇 프레임 더 조용히 움직일 수 있다. 그래서 수렴한 즉시 멈추지 않고
      // SMOOTH_SETTLE_GRACE_MS 동안은 이벤트 없이도 계속 이 루프에서
      // window.scrollY를 직접 다시 확인한다 — 그동안 값이 실제로 더
      // 움직이면 위 분기로 다시 빠지고, 끝까지 그대로면 그때 완전히 멈춘다.
      if (convergedSinceRef.current == null) convergedSinceRef.current = now;
      if (now - convergedSinceRef.current < SMOOTH_SETTLE_GRACE_MS) {
        smoothRafRef.current = requestAnimationFrame(tickRef.current);
        return;
      }
      smoothRef.current = target;
      setSmoothProgress(target);
      smoothRafRef.current = null;
      lastTsRef.current = null;
      convergedSinceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    function wake() {
      if (smoothRafRef.current == null) {
        lastTsRef.current = null;
        smoothRafRef.current = requestAnimationFrame(tickRef.current);
      }
    }

    window.addEventListener("scroll", wake, { passive: true });
    // 'scroll' 이벤트만으로는 부족할 때가 있다 — 빠른 flick으로 스크롤한
    // 뒤 브라우저가 관성 감속의 "마지막 한 프레임"에는 scroll 이벤트를 더
    // 안 쏴줄 때가 있어서, 그 시점에 루프가 이미 수렴·정지해 있으면
    // window.scrollY가 그 뒤에 최종 위치로 조금 더 움직여도 아무도 루프를
    // 다시 깨우지 못해 아주 옅은 잔여값에 멈춰 있는 걸 실제로 확인했다.
    // 'scrollend'(스크롤이 완전히 멈췄을 때 정확히 한 번 발생)를 추가로
    // 걸어 그 마지막 정착 프레임을 반드시 한 번 더 깨우도록 보강했다.
    window.addEventListener("scrollend", wake, { passive: true });
    wake();

    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("scrollend", wake);
      if (smoothRafRef.current != null) {
        cancelAnimationFrame(smoothRafRef.current);
        smoothRafRef.current = null;
      }
    };
  }, [reducedMotion]);

  const progress = reducedMotion ? 1 : smoothProgress;
  const copyFadeT = rampIn(progress, COPY_FADE_IN[0], COPY_FADE_IN[1]);
  const copyOpacity = reducedMotion ? 1 : 1 - copyFadeT;
  const sectionBgOpacity = reducedMotion ? 1 : rampIn(progress, SECTION_BG_IN[0], SECTION_BG_IN[1]);

  return (
    // 53차(2026-08): "Hero copy 전체 그룹을 아래로" 요청으로 상단 여백을
    // pt-40(160px)→pt-48(192px)로 늘렸다. 54차: 그 뒤 "화면 전체 밀도가
    // 낮다/이메일 UI를 더 위로" 요청이 이어져 pt-48(192px)→pt-36(144px)로
    // 다시 줄였다 — nav 바로 아래 붙지 않을 정도의 여백은 유지하되,
    // 그룹 전체(eyebrow~CTA)가 다시 조금 위로 올라오게 했다(그룹 내부 각
    // 요소의 상대 간격은 그대로).
    <header className="relative mx-auto min-h-[125vh] max-w-[1400px] px-6 pt-36 md:px-12">
      <div
        className="text-center"
        style={{
          opacity: copyOpacity,
          pointerEvents: copyOpacity < 0.05 ? "none" : "auto",
        }}
      >
        <p className="mb-5 text-[13px] font-[500] tracking-[0.08em] text-primary-navy uppercase">
          {t("landing.hero.eyebrow")}
        </p>
        {/* 53차: 제목/설명을 "약간"/"조금" 키웠고(38/56px→40/60px, 18/21px→
            19/23px), 54차: "반드시 「、」에서 줄바꿈"하라는 요청으로 제목을
            한 문자열이 아니라 titleLine1/titleLine2 두 i18n 키 + 명시적
            <br/>로 나눴다(뷰포트 폭에 따라 우연히 다른 지점에서 꺾이는 걸
            방지, 항상 이 두 줄로 고정). 두 줄이 "하나의 강한 headline
            block"처럼 보이도록 크기를 한 번 더 키우고(40/60→42/64px)
            line-height를 타이트하게(1.25→1.1) 좁혔다. 아래 간격(mb-4→
            mb-3)도 살짝 줄여 subcopy와 더 붙어 보이게 했다 — subcopy/
            CTA 자체의 크기·디자인은 53차 그대로 손대지 않았다. 커진
            폰트에서 titleLine2(한국어 "더 이상 정리하지 않아도 됩니다.")가
            max-w-3xl(768px)에서는 자체적으로 다시 2줄로 꺾여 총 3줄이
            되는 문제가 있어 max-w-4xl(896px)로 넓혔다 — 실측 결과 이
            폭부터 ko가 정확히 2줄로 고정된다. 일본어(줄이 짧음)는 어차피
            중앙정렬이라 폭을 넓혀도 보이는 모양이 그대로다.
            61차: 모바일(390px)/태블릿(768px) 반응형 — 기존엔 sm(640px)부터
            바로 데스크톱 최종 크기(64/23px)로 뛰어서, 정확히 768px(태블릿
            요청 기준폭)에서 titleLine2(한국어 "더 이상 정리하지 않아도
            됩니다.")가 max-w-4xl(896px)보다 좁은 실제 뷰포트 폭에 눌려
            자체적으로 다시 줄바꿈되는 문제가 있었다. sm:64px였던 값을
            lg:64px로 밀고 그 사이(640~1023px)에 태블릿 전용 중간 크기를
            새로 넣었다 — lg(1024px) 이상, 즉 데스크톱 실제 테스트 폭
            (이 세션 내내 1024px 이상)에서는 결과가 이전과 완전히 동일하다.
            break-keep은 그대로 두되(desktop처럼 titleLine1/2 각 줄 자체는
            항상 하나의 의미 단위라 유지), 혹시 아주 좁은 폭에서 그래도 안
            들어가면 잘리지 않고 자연스럽게 다시 줄바꿈되도록(clip 절대
            금지) break-words를 안전장치로 더했다. */}
        <h1 className="mx-auto mb-3 max-w-4xl text-[27px] leading-[1.2] font-[500] tracking-tight break-words text-neutral-900 sm:text-[48px] lg:break-keep lg:text-[64px] lg:leading-[1.1]">
          {t("landing.hero.titleLine1")}
          <br />
          {t("landing.hero.titleLine2")}
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-[16px] leading-[1.6] break-words text-neutral-500 sm:text-[19px] lg:break-keep lg:text-[23px]">
          {t("landing.hero.subline")}
        </p>
        {/* 54차: CTA 자체(버튼 크기/색/문구)는 그대로 두고, 아래쪽 여백만
            mb-16(64px)→mb-10(40px)로 줄여 이메일 UI를 더 끌어올렸다. */}
        <div className="mb-10 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push(toPublicPageHref(locale, "/signup"))}
            className="flex items-center justify-center gap-2 rounded-stitch-2xl bg-primary-navy px-6 py-3 text-[14px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-all hover:bg-[#152c6e]"
          >
            {t("landing.hero.getStarted")}
            <MaterialIcon name="arrow_forward" size={16} />
          </button>
          <button
            type="button"
            onClick={() => router.push(toPublicPageHref(locale, "/login"))}
            className="rounded-stitch-2xl border border-neutral-200 bg-white px-6 py-3 text-[14px] font-[400] text-neutral-800 transition-all hover:border-neutral-300 hover:bg-neutral-50"
          >
            {t("landing.hero.login")}
          </button>
        </div>
      </div>

      {/* 53차: "카피와 이메일 UI 사이 빈 공간이 과도하다"는 피드백으로
          pt-56(224px)→pt-20(80px)로 크게 줄였다. 54차: 그 뒤에도 "화면
          전체가 휑해 보인다"/"이메일 본문이 첫 화면에 더 보이게" 피드백이
          이어져 pt-20(80px)→pt-8(32px)→pt-3(12px)로 두 번 더 줄이고,
          위 CTA의 mb-16(64px)→mb-10(40px)와 header의 pt-48(192px)→
          pt-36(144px)까지 함께 줄였다. 55차: 이번엔 반대로 "CTA 바로
          아래에 너무 붙어 있다"는 피드백 — CTA(mb-10)와 header(pt-36)는
          그대로 두고 이 gap만 pt-3(12px)→pt-10(40px)로 살짝 늘렸다.
          headline/subcopy/CTA 디자인 자체는 안 건드리면서 "Hero copy →
          CTA → 적당한 여백 → 이메일 UI" 구성이 되도록 최소한만 조정한
          값 — 늘린 뒤에도 rest 상태 이메일 카드의 제목·보낸사람·본문
          일부가 첫 뷰포트 안에 그대로 보이는지 실측 확인했다. 이 wrapper는
          스크롤 후 workflow scene도 같이 담고 있지만, workflow 쪽
          카피(eyebrow+제목)는 mailResizeT로 opacity 0에서 시작해 이
          시점엔 아직 안 보이고, row 내부 카드들의 상대 위치·간격
          (CARD_Y_OFFSET 등)도 전혀 안 바뀌므로 — 이 padding을 늘리면
          rest 상태와 스크롤된 workflow scene 전체가 함께 아주 살짝
          아래로 이동할 뿐, "4-card workflow의 크기/위치/디자인"(카드끼리의
          상대적 배치) 자체는 그대로다. */}
      <div className="relative left-1/2 w-screen -translate-x-1/2 px-6 pt-10 pb-28 md:px-12">
        {/* 52차(Safari 성능): 이 배경은 뷰포트 전체 폭의 큰 radial-gradient
            3겹 + 세로 gradient라 paint 자체가 무겁다 — opacity가 실제로
            바뀌는 SECTION_BG_IN 구간(스크롤 초반)뿐 아니라 그 이후로도
            progress가 계속 바뀌며 이 컴포넌트가 매 프레임 재렌더링되므로,
            will-change: opacity로 별도 compositing layer로 미리 승격해둬
            opacity 변화가 있을 때마다 이 무거운 gradient를 다시 paint하지
            않고 GPU 레이어 합성만으로 처리되게 했다. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: SECTION_GRADIENT, opacity: sectionBgOpacity, willChange: "opacity" }}
        />
        {/* 61차: "데스크톱 4-card 가로 workflow를 모바일에 그대로 축소하지
            말고, 세로 workflow로 재배치하라"는 요청 — LandingHeroDemo(데스크톱,
            progress 픽셀 단위로 카드 위치/스케일을 계산하는 scroll-hijack
            구조)는 절대 수정하지 않고 그대로 두되 lg 미만에서만 안 보이게
            했고, 완전히 새로운 LandingHeroMobileDemo(세로로 쌓인 4단계 +
            ScrollReveal로 단순화한 등장)를 lg 미만에서만 보이게 별도로
            추가했다. 데스크톱(lg, 1024px) 이상에서는 지금까지와 동일하게
            LandingHeroDemo만 렌더링·표시된다. */}
        <div className="hidden lg:block">
          <LandingHeroDemo progress={progress} />
        </div>
        <div className="lg:hidden">
          <LandingHeroMobileDemo />
        </div>
      </div>
    </header>
  );
}
