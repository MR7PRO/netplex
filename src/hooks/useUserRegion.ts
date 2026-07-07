import { useCallback, useEffect, useState } from "react";

const KEY = "netplex_user_region";

/** Persisted region preference for the "قريب مني" filter. */
export function useUserRegion() {
  const [region, setRegionState] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem(KEY) || "";
  });

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setRegionState(e.newValue || "");
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setRegion = useCallback((r: string) => {
    if (r) localStorage.setItem(KEY, r);
    else localStorage.removeItem(KEY);
    setRegionState(r);
  }, []);

  return { region, setRegion };
}
