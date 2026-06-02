/**
 * Lightweight haptic feedback via the Vibration API.
 * Silently no-ops on devices/browsers without support (desktop, iOS Safari, etc.).
 */
type HapticPattern = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [12, 40, 12],
  warning: [20, 60, 20],
  error: [30, 50, 30, 50, 30],
};

export function haptic(pattern: HapticPattern = "light"): void {
  if (typeof navigator === "undefined") return;
  const vibrate = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate;
  if (typeof vibrate !== "function") return;
  try {
    vibrate.call(navigator, PATTERNS[pattern]);
  } catch {
    // ignore — non-fatal
  }
}
