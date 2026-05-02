"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryProvider>{children}</QueryProvider>
    </ThemeProvider>
  );
}
