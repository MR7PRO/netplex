import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "netplex_chunk_reload";

/**
 * `React.lazy` wrapper that recovers from stale-deployment chunk errors
 * ("Failed to fetch dynamically imported module"). When a new build ships,
 * the old index bundle still references chunk hashes that no longer exist;
 * a single hard reload picks up the fresh manifest. Guarded by sessionStorage
 * so we never loop if the chunk is genuinely missing.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (err) {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Keep Suspense pending while the page reloads.
        return new Promise<never>(() => {});
      }
      throw err;
    }
  });
}
