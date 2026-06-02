import { toast as sonnerToast, type ExternalToast } from "sonner";

/**
 * Branded toast wrapper for NetPlex.
 * - Success: green tone, check icon
 * - Error: red (brand) tone, alert icon
 * - Info: neutral, info icon
 * - Warning: amber, alert icon
 *
 * Built on sonner so the existing <Sonner /> Toaster in App.tsx handles rendering.
 */
type ToastOptions = Omit<ExternalToast, "icon">;

export const brandToast = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, options);
  },
  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, options);
  },
  info(message: string, options?: ToastOptions) {
    return sonnerToast.info ? sonnerToast.info(message, options) : sonnerToast(message, options);
  },
  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning
      ? sonnerToast.warning(message, options)
      : sonnerToast(message, options);
  },
  message(message: string, options?: ToastOptions) {
    return sonnerToast(message, options);
  },
};
