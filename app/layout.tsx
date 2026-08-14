import type { Metadata } from "next";
import { Inter, Hanken_Grotesk, DM_Sans } from "next/font/google";
import { LocaleProvider } from "@/lib/locale-context";
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

export const metadata: Metadata = {
  title: "JobCal",
  description: "就職活動の企業・選考・日程をまとめて管理できるJobCal",
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
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
