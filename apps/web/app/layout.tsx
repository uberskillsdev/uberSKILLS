import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import "@/styles/globals.css";
import { NavBar } from "@/components/nav-bar";

export const metadata: Metadata = {
  title: "UberSkillz",
  description: "Design, test, and deploy Claude Code Agent Skills",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
