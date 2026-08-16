import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CDE Quest",
  description: "A co-op habit quest for two players.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#150b20" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/api/icon?size=64" />
        <link rel="apple-touch-icon" href="/api/icon?size=180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CDE Quest" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
