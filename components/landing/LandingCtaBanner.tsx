"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useT } from "@/lib/locale-context";
import Button from "@/components/ui/Button";

// 34_landingPage.png 하단 CTA 배너. 데모 보기 버튼은 이번 Step 범위에서 제외되어
// "무료로 시작하기" 버튼만 유지한다.
export default function LandingCtaBanner() {
  const t = useT();
  const router = useRouter();

  return (
    <section className="border-t border-border bg-background py-16">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center px-6 text-center">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          {t("landing.ctaBanner.title")}
        </h2>
        <p className="mt-2 text-sm text-secondary">{t("landing.ctaBanner.description")}</p>

        <div className="mt-6">
          <Button size="lg" variant="primary" onClick={() => router.push("/signup")}>
            {t("landing.ctaBanner.getStarted")}
            <ArrowRight size={18} />
          </Button>
        </div>
      </div>
    </section>
  );
}
