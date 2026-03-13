import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@/styles/globals.css";
import { ThemeProvider } from "@uberskills/ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uberskills.dev";
const title = "uberSKILLS — Design, Test, and Deploy Agent Skills";
const description =
  "Open-source visual workbench for building Agent Skills. Create with AI, test across models, and deploy to Claude Code, GitHub Copilot, Cursor, Windsurf, and more with one click.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/uberSKILLS_icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    title,
    description,
    siteName: "uberSKILLS",
    images: [
      {
        url: "/uberskills-opengraph.png",
        width: 1200,
        height: 630,
        alt: "uberSKILLS — Design, Test, and Deploy Agent Skills",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/uberskills-opengraph.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_URL || "https://cloud.umami.is/script.js"}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
