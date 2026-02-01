import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotificationPermissionBannerProps {
  permission: NotificationPermission;
  isSupported: boolean;
  onRequestPermission: () => Promise<NotificationPermission>;
}

export const NotificationPermissionBanner = ({
  permission,
  isSupported,
  onRequestPermission,
}: NotificationPermissionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Check if user has dismissed this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("notification-banner-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  // Don't show if:
  // - Not supported
  // - Already granted
  // - Already denied (can't ask again)
  // - User dismissed this session
  if (!isSupported || permission === "granted" || permission === "denied" || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("notification-banner-dismissed", "true");
  };

  const handleEnable = async () => {
    setIsRequesting(true);
    await onRequestPermission();
    setIsRequesting(false);
  };

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 animate-fade-in">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium text-sm mb-1">Enable reminders</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Get notified at your scheduled times so you never miss a habit.
          </p>
          
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isRequesting}
            className="h-8 text-xs"
          >
            {isRequesting ? "Enabling..." : "Enable notifications"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Small inline indicator for notification status
export const NotificationStatusBadge = ({
  permission,
  isSupported,
}: {
  permission: NotificationPermission;
  isSupported: boolean;
}) => {
  if (!isSupported) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs",
        permission === "granted"
          ? "bg-success/10 text-success"
          : permission === "denied"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground"
      )}
    >
      {permission === "granted" ? (
        <>
          <Bell className="h-3 w-3" />
          <span>Reminders on</span>
        </>
      ) : permission === "denied" ? (
        <>
          <BellOff className="h-3 w-3" />
          <span>Blocked</span>
        </>
      ) : (
        <>
          <Bell className="h-3 w-3" />
          <span>Reminders off</span>
        </>
      )}
    </div>
  );
};
