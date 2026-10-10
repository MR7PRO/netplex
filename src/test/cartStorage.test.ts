import { describe, it, expect } from "vitest";
import { cartStorageKey } from "@/contexts/CartContext";

describe("cart storage isolation", () => {
  it("uses a different cart for each account", () => {
    expect(cartStorageKey("user-a")).not.toBe(cartStorageKey("user-b"));
  });
  it("keeps the guest cart separate from signed-in carts", () => {
    expect(cartStorageKey(null)).toBe("netplex-cart:guest");
    expect(cartStorageKey("user-a")).not.toBe(cartStorageKey(null));
  });
});
