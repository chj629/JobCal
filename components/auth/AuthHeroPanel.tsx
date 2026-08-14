"use client";

import { useT } from "@/lib/locale-context";
import MaterialIcon from "@/components/ui/MaterialIcon";

const HERO_FEATURES = [
  { icon: "business_center", key: "auth.signup.heroFeature1" },
  { icon: "calendar_today", key: "auth.signup.heroFeature2" },
  { icon: "auto_awesome", key: "auth.signup.heroFeature3" },
] as const;

// docs/stitch/인증플로우/*의 좌측 제품 메시지 패널(헤드라인 + 설명 + 기능 3개). 로그인과
// 회원가입 시안 모두 문구가 완전히 동일해, app/signup/page.tsx가 먼저 쓰던
// auth.signup.heroTitle 등 키를 그대로 재사용한다(같은 키를 그대로 읽어올 뿐 signup
// 페이지 자체는 건드리지 않음 — 새 "auth.hero.*" 키를 따로 만들면 같은 문구가 메시지
// 파일에 중복되므로 피한다). /login부터 이 공용 컴포넌트로 렌더링한다.
export default function AuthHeroPanel() {
  const t = useT();

  return (
    <div className="flex flex-col space-y-8 pr-0 md:pr-8">
      <div className="space-y-6">
        <h1 className="max-w-lg text-[32px] leading-[1.1] font-[400] tracking-tight whitespace-pre-line text-neutral-900 md:text-[48px]">
          {t("auth.signup.heroTitle")}
        </h1>
        <p className="max-w-lg text-[16px] leading-[1.5] whitespace-pre-line text-neutral-600">
          {t("auth.signup.heroDescription")}
        </p>
      </div>
      <ul className="space-y-4">
        {HERO_FEATURES.map(({ icon, key }) => (
          <li key={key} className="flex items-center gap-4 text-neutral-600">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dbeafe]/50 text-primary-navy">
              <MaterialIcon name={icon} size={16} />
            </span>
            <span className="text-[15px]">{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
