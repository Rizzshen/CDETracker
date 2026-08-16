import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CDE Tracker",
  description: "Code. Drive. Exercise. Every day, together.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
