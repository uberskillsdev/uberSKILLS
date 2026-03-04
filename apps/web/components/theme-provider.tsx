"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Theme provider wrapping next-themes. Manages light/dark/system themes
 * via the "dark" class on <html>, reads from localStorage for SSR-safe
 * persistence, and detects system preference via matchMedia.
 *
 * - attribute="class" applies theme via <html class="dark">
 * - defaultTheme="light" ensures no FOUC on first load
 * - enableSystem allows matchMedia('prefers-color-scheme: dark') detection
 * - disableTransitionOnChange prevents flash during theme switch
 */
export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
