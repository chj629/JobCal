"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useT } from "@/lib/locale-context";
import { toPublicPageHref, usePublicPageLanguageHrefs } from "@/lib/i18n/publicLocalePaths";
import SiteHeader from "@/components/ui/SiteHeader";

// docs/stitch/랜딩페이지/screen.png 상단 고정 네비게이션.
// 60차: 랜딩 본문(Hero AI workflow, Dashboard/Calendar/Companies showcase)이 이미
// 기능을 충분히 보여주므로 별도 "기능"/"JobCal AI" 메뉴 링크(#features/#ai 앵커)는
// 제거했다 — 로그인/시작하기 버튼과 언어 전환만 남긴 심플한 Header. 로그인/회원가입
// 이동은 기존 기능(useRouter push)을 그대로 재사용한다. 언어 전환은 SiteHeader가
// 항상 맨 오른쪽에 직접 렌더링하므로(로고~언어 전환 위치를 모든 화면에서 동일하게
// 유지하기 위해) 여기서는 렌더링하지 않는다 — 이 버튼들은 SiteHeader의 children으로,
// 로고와 언어 전환 "사이"에만 놓인다.
// 61차: 모바일(390px) 반응형 대응 — 이전엔 375/430px에서 로고+버튼+언어전환이
// 폭을 초과해 이 그룹 전체를 sm(640px) 미만에서 숨기고 Hero 자체 CTA에 기능을
// 위임했다. 이번 요청은 "로고/로그인/시작하기/언어전환 구조를 유지"이므로 숨기는
// 대신 SiteHeader에 compactOnMobile을 켜(로고~버튼~언어전환 gap이 sm 미만에서
// 좁아지고 언어전환도 축약형(KO/JA)으로 바뀜) 넉넉한 여백을 확보하고, 그 안에서
// 이 버튼들 자체도 sm 미만에서만 gap/padding/폰트를 살짝 줄였다(버튼의 색/모양/
// 문구는 전혀 안 바꿈 — "버튼 디자인은 유지, 간격만 축소"). sm(640px) 이상(태블릿
// 768px 포함)·데스크톱은 전부 기존 값 그대로다.
export default function LandingNav() {
  const t = useT();
  const router = useRouter();
  const { locale } = useLocale();
  // LandingNav는 랜딩(/, /ko)뿐 아니라 /pricing, /ko/pricing에서도 재사용된다 — 언어
  // 전환 대상은 하드코딩된 맵이 아니라 현재 URL로부터 계산해야, /pricing에서 언어를
  // 바꿔도 "/"(랜딩)가 아니라 "/ko/pricing"으로 이동한다.
  const languageHrefs = usePublicPageLanguageHrefs();
  const homeHref = toPublicPageHref(locale, "/");
  const pricingHref = toPublicPageHref(locale, "/pricing");

  return (
    <SiteHeader compactOnMobile languageHrefs={languageHrefs} homeHref={homeHref}>
      <div className="flex items-center gap-2 sm:gap-5">
        <Link
          href={pricingHref}
          className="whitespace-nowrap text-[12px] font-[400] text-neutral-900 transition-colors hover:text-primary-navy sm:text-[13px]"
        >
          {t("landing.nav.pricing")}
        </Link>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="whitespace-nowrap text-[12px] font-[400] text-neutral-900 transition-colors hover:text-primary-navy sm:text-[13px]"
        >
          {t("landing.nav.login")}
        </button>
        <button
          type="button"
          onClick={() => router.push("/signup")}
          className="whitespace-nowrap rounded-stitch-2xl bg-primary-navy px-3 py-1.5 text-[12px] font-[400] text-white shadow-[0_2px_10px_rgba(30,58,138,0.15)] transition-colors hover:bg-[#152c6e] sm:px-5 sm:py-2 sm:text-[13px]"
        >
          {t("landing.nav.getStarted")}
        </button>
      </div>
    </SiteHeader>
  );
}
