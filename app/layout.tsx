import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영어필사차곡차곡 | 영어 문장 필사 연습",
  description: "영어 기사와 문장을 직접 필사하고, 단어장·복습·타자 게임으로 학습을 이어가는 무료 영어 학습 웹앱",
  applicationName: "영어필사차곡차곡",
  keywords: ["영어 필사", "영어 학습", "타자 연습", "영어 단어장", "영어 복습", "속타 게임"],
  openGraph: {
    title: "영어필사차곡차곡 | 영어 문장 필사 연습",
    description: "영어 기사와 문장을 직접 필사하고, 단어장·복습·타자 게임으로 학습을 이어가는 무료 영어 학습 웹앱",
    locale: "ko_KR",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}