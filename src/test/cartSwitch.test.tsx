import React, { useLayoutEffect } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ user: { id: "account-a" } as { id: string } | null, loading: false }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
import { CartProvider, useCart } from "@/contexts/CartContext";

const frames: string[][] = [];
const Probe = () => {
  const { items } = useCart();
  useLayoutEffect(() => { frames.push(items.map((item) => item.id)); });
  return null;
};
const item = (id: string) => ({ id, title: id, price_ils: 10, image: null, seller_name: "test", seller_id: "test" });
afterEach(cleanup);
beforeEach(() => { localStorage.clear(); frames.length = 0; auth.user = { id: "account-a" }; auth.loading = false; });

describe("cart account switch", () => {
  it("never renders or persists A's cart under B, including the frame before effects", () => {
    localStorage.setItem("netplex-cart:account-a", JSON.stringify([item("item-a")]));
    localStorage.setItem("netplex-cart:account-b", JSON.stringify([item("item-b")]));
    const view = render(<CartProvider><Probe /></CartProvider>);
    expect(frames.at(-1)).toEqual(["item-a"]);
    frames.length = 0;
    auth.user = { id: "account-b" };
    view.rerender(<CartProvider><Probe /></CartProvider>);
    expect(frames).not.toContainEqual(["item-a"]);
    expect(frames.at(-1)).toEqual(["item-b"]);
    expect(JSON.parse(localStorage.getItem("netplex-cart:account-b") ?? "[]")).toEqual([item("item-b")]);
    expect(JSON.parse(localStorage.getItem("netplex-cart:account-a") ?? "[]")).toEqual([item("item-a")]);
  });

  it("hides signed-in items immediately while the next identity is loading", () => {
    localStorage.setItem("netplex-cart:account-a", JSON.stringify([item("item-a")]));
    const view = render(<CartProvider><Probe /></CartProvider>);
    frames.length = 0;
    auth.loading = true;
    view.rerender(<CartProvider><Probe /></CartProvider>);
    expect(frames).toEqual([[]]);
  });
});