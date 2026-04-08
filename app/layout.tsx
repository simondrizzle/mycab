import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "新加坡打车比价",
  description: "一个简单的打车比价网页"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
