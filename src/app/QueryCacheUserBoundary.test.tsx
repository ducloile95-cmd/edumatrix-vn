// @vitest-environment jsdom

import { cleanup } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { QueryCacheUserBoundary } from "@/app/QueryCacheUserBoundary";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderWithQueryClient } from "@/test/renderWithQueryClient";

const authState = vi.hoisted(() => ({ value: { firebaseUser: null as null | { uid: string } } }));
vi.mock("@/features/auth/hooks/useAuth", () => ({ useAuth: () => authState.value }));

afterEach(cleanup);

describe("QueryCacheUserBoundary", () => {
  test("drops cached data when the signed-in account signs out or changes", () => {
    authState.value = { firebaseUser: { uid: "teacher-a" } };
    const { queryClient, rerender } = renderWithQueryClient(<QueryCacheUserBoundary />);
    queryClient.setQueryData(["classes"], [{ id: "class-of-a" }]);

    authState.value = { firebaseUser: { uid: "teacher-a" } };
    rerender(<QueryClientProvider client={queryClient}><QueryCacheUserBoundary /></QueryClientProvider>);
    expect(queryClient.getQueryData(["classes"])).toEqual([{ id: "class-of-a" }]);

    authState.value = { firebaseUser: null };
    rerender(<QueryClientProvider client={queryClient}><QueryCacheUserBoundary /></QueryClientProvider>);
    expect(queryClient.getQueryData(["classes"])).toBeUndefined();
  });

  test("keeps the cache on the first sign-in of the tab", () => {
    authState.value = { firebaseUser: null };
    const { queryClient, rerender } = renderWithQueryClient(<QueryCacheUserBoundary />);
    queryClient.setQueryData(["settings", "academic"], { ok: true });

    authState.value = { firebaseUser: { uid: "admin-1" } };
    rerender(<QueryClientProvider client={queryClient}><QueryCacheUserBoundary /></QueryClientProvider>);
    expect(queryClient.getQueryData(["settings", "academic"])).toEqual({ ok: true });
  });
});
