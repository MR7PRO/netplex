import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeaderInstallButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed (standalone) → hide
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore iOS Safari
      window.navigator.standalone === true;
    if (standalone) return;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    // iOS Safari has no beforeinstallprompt — show button anyway so user gets instructions
    if (isIOS) {
      setShow(true);
      return;
    }

    // Android / desktop Chrome: only show after beforeinstallprompt fires
    const handler = (e: Event) => {
      e.preventDefault();
      // Stash globally so /install page can reuse it
      (window as any).__deferredInstallPrompt = e;
      setShow(true);
    };
    const installedHandler = () => setShow(false);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    // If we already captured it earlier
    if ((window as any).__deferredInstallPrompt && isAndroid) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  if (!show || location.pathname === "/install") return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="md:hidden text-primary"
      onClick={() => navigate("/install")}
      title="ثبّت التطبيق"
      aria-label="ثبّت التطبيق"
    >
      <Download className="h-5 w-5" />
    </Button>
  );
};

export default HeaderInstallButton;
