"use client";

import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { redirectToLogin } from "@/lib/auth/redirect-to-login";

function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: number; code?: string };
  return e.status === 401 || e.code === "PGRST301";
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error) => {
            if (isAuthError(error)) redirectToLogin();
          },
        }),
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
