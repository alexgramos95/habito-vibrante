import { useState, useEffect } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { PWA_COPY } from "@/config/copy";
import { cn } from "@/lib/utils";

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

    const handleControllerChange = () => {
      // New service worker activated, reload the page
      window.location.reload();
    };

    const checkForUpdates = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration) return;

        // Check if there's already a waiting worker
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setShowUpdateToast(true);
          return;
        }

        // Listen for new updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdateToast(true);
            }
          });
        });
      } catch (error) {
        console.error("[PWA] Update check failed:", error);
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);
    checkForUpdates();

    // Check for updates every 60 seconds
    const interval = setInterval(checkForUpdates, 60000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      clearInterval(interval);
    };
  }, []);

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
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
