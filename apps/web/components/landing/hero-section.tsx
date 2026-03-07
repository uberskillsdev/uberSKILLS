"use client";

import { Badge, Button } from "@uberskills/ui";
import { ArrowRightIcon, GithubIcon } from "lucide-react";
import Link from "next/link";
import { InstallCommand } from "./install-command";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      {/* Dot grid background */}
      <div
        className="dot-grid pointer-events-none absolute inset-0 opacity-50"
        aria-hidden="true"
      />

      {/* Radial fade so dots don't dominate */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_80%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 text-center md:px-6">
        <Badge variant="outline" className="animate-fade-up stagger-1 mb-6">
          Open Source &mdash; MIT License
        </Badge>

        <h1
          className="animate-fade-up stagger-2 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl"
          style={{ textWrap: "balance" }}
        >
          Design, Test, and Deploy
          <br />
          Agent Skills
        </h1>

        <p
          className="animate-fade-up stagger-3 mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl"
          style={{ textWrap: "balance" }}
        >
          The visual workbench for building Agent Skills. Create with AI assistance, test across
          models, deploy with one click.
        </p>

        <div className="animate-fade-up stagger-4 mt-10">
          <InstallCommand />
        </div>

        <div className="animate-fade-up stagger-5 mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Open Dashboard
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a
              href="https://github.com/uberskillsdev/uberskills"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GithubIcon className="size-4" aria-hidden="true" />
              View on GitHub
            </a>
          </Button>
        </div>

        <div
          className="animate-fade-up mt-16 w-full max-w-4xl overflow-hidden rounded-xl border shadow-lg"
          style={{ animationDelay: "500ms" }}
        >
          <div className="flex aspect-video items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">Demo video coming soon&hellip;</p>
          </div>
        </div>
      </div>
    </section>
  );
}
