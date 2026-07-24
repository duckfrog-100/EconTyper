import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영어필사 차곡차곡 | 영어 문장 필사 연습",
  description: "원하는 영어 글을 문장별로 필사하고 한국어 해석과 단어 뜻을 확인하는 영어 학습 사이트입니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
