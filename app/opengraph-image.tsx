import { ImageResponse } from "next/og";

export const alt = "JobCal — 就活メールを、もう整理しなくていい。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 랜딩페이지 Hero(components/landing/LandingHero.tsx)와 SiteHeader가 쓰는 팔레트만
// 그대로 재사용한다 — primary-navy(#1e3a8a)/primary(#2563eb), 배경은 SECTION_GRADIENT의
// 흰색↔옅은 블루/라벤더 톤(#eef2ff/#e4e9fb)을 단순 선형 그라데이션으로만 옮겼다(radial
// glow 등 장식은 넣지 않음). 로고 아이콘은 app/icon.svg의 캘린더 마크를 그대로 재현한
// 것이다(파일을 import하지 않고 동일한 path 데이터를 인라인 SVG로 옮김 — ImageResponse가
// 외부 이미지 파일 로드를 지원하지 않아서다). 폰트는 별도 fetch 없이 ImageResponse
// 기본 폰트를 그대로 쓴다 — 실제 렌더링 테스트로 일본어 글리프가 정상 출력됨을 확인했다.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          background: "linear-gradient(180deg, #ffffff 0%, #eef2ff 35%, #e4e9fb 65%, #ffffff 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#2563eb",
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 2v4" />
              <path d="M16 2v4" />
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <path d="M3 10h18" />
              <path d="M8 14h.01" />
              <path d="M12 14h.01" />
              <path d="M16 14h.01" />
              <path d="M8 18h.01" />
              <path d="M12 18h.01" />
              <path d="M16 18h.01" />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 52,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: "#1e3a8a",
            }}
          >
            JobCal
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "0.08em",
            color: "#1e3a8a",
          }}
        >
          JobCal AI
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 32,
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            color: "#171717",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex" }}>就活メールを、</div>
          <div style={{ display: "flex" }}>もう整理しなくていい。</div>
        </div>
      </div>
    ),
    size
  );
}
