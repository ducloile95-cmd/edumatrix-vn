import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { ToastProvider } from "@/components/feedback/ToastProvider";
import { ConfirmProvider } from "@/components/feedback/ConfirmProvider";
import { AppearanceProvider } from "@/features/preferences/AppearanceContext";
import { QueryCacheUserBoundary } from "@/app/QueryCacheUserBoundary";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Danh muc it doi; mutation da invalidateQueries nen cache 10 phut khong lam du lieu cu (A14, dot 2).
            staleTime: 10 * 60_000,
            gcTime: 30 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <AppearanceProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider><QueryCacheUserBoundary />{children}</AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </AppearanceProvider>
  );
}
