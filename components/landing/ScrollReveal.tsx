"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// 56차: Dashboard/Calendar/Companies/Final CTA 쇼케이스 섹션 공용 스크롤 reveal.
// "아주 약한 fade/translate 정도만" 요청대로, opacity 0→1 + translateY 16px→0의
// 미세한 전환만 준다(Hero의 스크롤 연동 애니메이션과는 완전히 별개의 가벼운 장치).
// prefers-reduced-motion은 app/globals.css의 전역 규칙이 transition-duration을
// 이미 거의 0으로 낮춰주므로 여기서 따로 처리하지 않는다.
export default function ScrollReveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -80px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={
        "transition-[opacity,transform] duration-700 ease-out " +
        (visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0") +
        (className ? ` ${className}` : "")
      }
    >
      {children}
    </div>
  );
}
