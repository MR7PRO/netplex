import React, { useLayoutEffect } from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({
  listener: null as null | ((event: string, session: unknown) => void),
  lookup: vi.fn(),
  removeAllChannels: vi.fn(),
  auth: { user: { id: "account-a" }, loading: false } as { user: { id: string } | null; loading: boolean },
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: {
    onAuthStateChange: (listener: typeof mocks.listener) => {
      mocks.listener = listener;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    },
    getSession: async () => ({ data: { session: null } }),
    signOut: async () => ({ error: null }),
  },
  from: (table: string) => ({ select: () => ({ eq: (_column: string, id: string) => ({
    maybeSingle: () => mocks.lookup(table, id),
  }) }) }),
  removeAllChannels: mocks.removeAllChannels,
} }));

import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const session = (id: string) => ({ user: { id } }) as Session;
const AuthProbe = () => {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  return <div>
    <output data-testid="identity">{loading ? "loading" : `${user?.id ?? "guest"}:${profile?.id ?? "none"}:${isAdmin}`}</output>
    <button onClick={() => void signOut()}>Sign out</button>
  </div>;
};

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.lookup.mockImplementation(async (table: string, id: string) => ({
    data: table === "profiles" ? { id, name: id } : table === "user_roles" ? { role: "user" } : null,
  }));
});

describe("identity response isolation", () => {
  it("never restores account A's delayed admin role after account B signs in", async () => {
    let resolveA: ((result: { data: { id: string; name: string } }) => void) | undefined;
    const delayed = new Promise<{ data: { id: string; name: string } }>((resolve) => { resolveA = resolve; });
    mocks.lookup.mockImplementation(async (table: string, id: string) => {
      if (table === "profiles" && id === "account-a") return delayed;
      return { data: table === "profiles" ? { id, name: id } : table === "user_roles" ? { role: id === "account-a" ? "admin" : "user" } : null };
    });
    render(<QueryClientProvider client={new QueryClient()}><AuthProvider><AuthProbe /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("guest:none:false"));
    act(() => mocks.listener?.("SIGNED_IN", session("account-a")));
    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledWith("profiles", "account-a"));
    act(() => mocks.listener?.("SIGNED_IN", session("account-b")));
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("account-b:account-b:false"));
    await act(async () => { resolveA?.({ data: { id: "account-a", name: "A" } }); });
    expect(screen.getByTestId("identity")).toHaveTextContent("account-b:account-b:false");
  });

  it("clears cached queries, realtime and guest/private browsing data on logout", async () => {
    const client = new QueryClient();
    render(<QueryClientProvider client={client}><AuthProvider><AuthProbe /></AuthProvider></QueryClientProvider>);
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("guest:none:false"));
    act(() => mocks.listener?.("SIGNED_IN", session("account-a")));
    await waitFor(() => expect(screen.getByTestId("identity")).toHaveTextContent("account-a:account-a:false"));
    client.setQueryData(["private-messages"], [{ id: "private" }]);
    localStorage.setItem("netplex_recently_viewed", "private");
    localStorage.setItem("netplex-cart:guest", "private");
    await act(async () => screen.getByRole("button", { name: "Sign out" }).click());
    expect(client.getQueryData(["private-messages"])).toBeUndefined();
    expect(mocks.removeAllChannels).toHaveBeenCalled();
    expect(localStorage.getItem("netplex_recently_viewed")).toBeNull();
    expect(localStorage.getItem("netplex-cart:guest")).toBeNull();
    expect(screen.getByTestId("identity")).toHaveTextContent("guest:none:false");
  });
});