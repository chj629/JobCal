import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Hanken_Grotesk, DM_Sans } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
import { buildBrowserLocaleRedirectScript } from "@/lib/i18n/browserLocaleRedirectScript";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans-app",
  subsets: ["latin"],
});

// docs/stitch/ 리뉴얼 전용 폰트. 기존 --font-sans-app(Inter)는 아직 리뉴얼하지 않은 화면이
// 계속 쓰므로 그대로 두고, 리뉴얼된 화면(Sidebar/Header/Dashboard 등)에서만 이 변수를 쓴다.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

// docs/stitch/설정페이지/*는 다른 Stitch 배치(메인페이지 5개, Hanken Grotesk)와 달리
// DM Sans + 보라 계열 팔레트를 쓰는 별도 디자인이다. /settings 화면에서만 사용한다.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

// OG/Twitter 이미지는 app/opengraph-image.tsx(Next.js 파일 컨벤션)가 자동 생성한다 —
// 여기 metadata에 images 배열을 직접 나열하지 않아도 Next.js가 그 파일을 찾아
// og:image/twitter:image 메타 태그를 알아서 주입한다. twitter.card만 이미지가 있는
// 상태에 맞춰 summary_large_image로 바꾼다(card 타입은 이미지 존재만으로 자동 결정되지
// 않아 명시적으로 지정해야 한다).
const SITE_TITLE = "JobCal";
const SITE_DESCRIPTION = "就職活動の企業・選考・日程をまとめて管理できるJobCal";

export const metadata: Metadata = {
  metadataBase: new URL("https://jobcal.app"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
    languages: {
      ja: "https://jobcal.app/",
      ko: "https://jobcal.app/ko",
    },
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_TITLE,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${inter.variable} ${hankenGrotesk.variable} ${dmSans.variable} h-full antialiased`}
    >
      <head>
        {/* docs/stitch/ 리뉴얼: Stitch가 쓰는 Google Material Symbols Outlined 아이콘 폰트를
            Stitch code.html과 동일한 방식(런타임 stylesheet)으로 불러온다. Sidebar/Header가
            모든 페이지에 걸쳐 있어 전역으로 둔다. */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {/* lib/i18n/browserLocaleRedirectScript.ts 참고: beforeInteractive는 최초 문서
            로드에서만 유효해 루트 레이아웃(클라이언트 사이드 네비게이션에서 다시
            마운트되지 않는 유일한 지점)에 정확히 한 번만 둔다. 이 레이아웃은 /ko/*와
            로그인 후 보호 페이지를 포함한 모든 경로를 감싸므로, 대상이 아닌 경로에서
            아무 것도 하지 않는 책임은 스크립트 자신(현재 pathname 확인)에게 있다. */}
        <Script id="browser-locale-redirect" strategy="beforeInteractive">
          {buildBrowserLocaleRedirectScript()}
        </Script>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
