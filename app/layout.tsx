import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconTyper | 경제 영어 필사",
  description: "경제 뉴스와 영어 지문을 문장별로 직접 타이핑하며 학습하는 필사 연습 사이트입니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
