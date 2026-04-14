import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCP Voice Agent",
  description: "语音驱动的 MCP 智能助手",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
