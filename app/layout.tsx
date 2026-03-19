import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GamerStats",
  description: "Social stats dashboard for gamers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[#0f0f13] text-[#e8e8f0]">{children}</body>
    </html>
  );
}
