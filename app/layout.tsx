import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EconTyper",
  description: "Practice economic English by typing real articles and focused lessons.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
