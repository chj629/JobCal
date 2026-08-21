import { ImageResponse } from "next/og";

export const alt = "JobCal — 취업 메일을, 더 이상 정리하지 않아도 됩니다.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// app/opengraph-image.tsx(일본어 랜딩 OG 이미지)와 디자인/레이아웃/색상/크기가 완전히
// 동일하다 — 유일한 차이는 헤드라인 두 줄뿐이며, messages/ko.json의 기존 번역
// (landing.hero.titleLine1/titleLine2, /ko 랜딩 화면에 실제로 쓰이는 것과 동일한 문구)을
// 그대로 옮긴 것이라 새로 지어낸 카피가 아니다. ImageResponse는 외부 파일을 로드하지
// 못해 로고 SVG와 팔레트 값을 원본 파일과 동일하게 다시 인라인했다.
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
          <div style={{ display: "flex" }}>취업 메일을,</div>
          <div style={{ display: "flex" }}>더 이상 정리하지 않아도 됩니다.</div>
        </div>
      </div>
    ),
    size
  );
}
