import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { PWA_COPY } from "@/config/copy";
import { cn } from "@/lib/utils";
import { forceRefreshToLatest } from "@/lib/pwaRefresh";

interface PWAUpdateToastProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export const PWAUpdateToast = ({ onUpdate, onDismiss }: PWAUpdateToastProps) => {
  const { locale } = useI18n();
  const lang = locale === "pt-PT" ? "pt" : "en";

  return (
    <div className={cn(
      "fixed bottom-20 left-4 right-4 z-50",
      "md:left-auto md:right-6 md:bottom-6 md:max-w-sm",
      "animate-fade-in-up"
    )}>
      <div className="premium-card p-4 shadow-xl border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {PWA_COPY.updateAvailable[lang]}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {PWA_COPY.updateDescription[lang]}
            </p>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={onDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-2 mt-3">
          <Button 
            size="sm" 
            onClick={onUpdate}
            className="flex-1 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {PWA_COPY.updateCTA[lang]}
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={onDismiss}
            className="text-muted-foreground"
          >
            {PWA_COPY.dismiss[lang]}
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to detect and handle PWA updates
 */
export const usePWAUpdate = () => {
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let hasReloaded = false;

    const reloadOnce = (reason: string) => {
      if (hasReloaded) return;
      hasReloaded = true;
      console.info("[PWA] Reloading after SW update:", reason);
      const url = new URL(window.location.href);
      url.searchParams.set("_swr", Date.now().toString());
      window.location.replace(url.toString());
    };

    const handleControllerChange = () => {
      reloadOnce("controllerchange");
    };

    const promoteWaiting = (registration: ServiceWorkerRegistration) => {
      const waiting = registration.waiting;
      if (!waiting) return;
      // Apply silently — no need for the user to click anything.
      try {
        waiting.postMessage({ type: "SKIP_WAITING" });
      } catch (error) {
        console.error("[PWA] Failed to post SKIP_WAITING:", error);
      }
    };

    const bindUpdateListener = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            // Show the toast as a hint, but also auto-apply.
            setWaitingWorker(newWorker);
            setShowUpdateToast(true);
            promoteWaiting(registration);
          }
        });
      });
    };

    const checkForUpdates = async () => {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration("/")) ||
          (await navigator.serviceWorker.getRegistration()) ||
          (await navigator.serviceWorker.ready.catch(() => undefined));

        if (!registration) return;

        bindUpdateListener(registration);
        await registration.update().catch(() => null);

        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdateToast(true);
          promoteWaiting(registration);
        }
      } catch (error) {
        console.error("[PWA] Update check failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    checkForUpdates();

    const interval = setInterval(checkForUpdates, 30000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      clearInterval(interval);
    };
  }, []);

  const applyUpdate = () => {
    void forceRefreshToLatest(waitingWorker);
  };

  const dismissUpdate = () => {
    setShowUpdateToast(false);
  };

  return {
    showUpdateToast,
    applyUpdate,
    dismissUpdate,
  };
};
