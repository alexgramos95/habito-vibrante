import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Smartphone, X, AlertTriangle, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePushNotifications, NotificationMode } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

interface NotificationSetupProps {
  onDismiss?: () => void;
  compact?: boolean;
}

export function NotificationSetup({ onDismiss, compact = false }: NotificationSetupProps) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const {
    isSupported,
    isPushSupported,
    isIOSBrowser,
    permission,
    mode,
    isSubscribed,
    requestPermission,
    subscribeToPush,
    getStatusText,
  } = usePushNotifications(userId);

  const [isLoading, setIsLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Check if user has dismissed this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem("notification-setup-dismissed");
    if (wasDismissed === "true") {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("notification-setup-dismissed", "true");
    onDismiss?.();
  };

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      // First request permission
      const perm = await requestPermission();
      if (perm !== 'granted') {
        setIsLoading(false);
        return;
      }

      // Then subscribe to push if supported
      if (isPushSupported && userId) {
        await subscribeToPush();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Already set up and working - show compact status
  if (permission === 'granted' && (mode === 'background' || mode === 'in-app')) {
    if (compact) {
      return (
        <div className="flex items-center gap-2 text-xs">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full",
            mode === 'background' 
              ? "bg-success/10 text-success" 
              : "bg-warning/10 text-warning"
          )}>
            <BellRing className="h-3 w-3" />
            <span>{getStatusText()}</span>
          </div>
        </div>
      );
    }
    // Don't show the banner if already configured
    return null;
  }

  // Don't show if dismissed
  if (dismissed) {
    return null;
  }

  // Permission denied
  if (permission === 'denied') {
    if (compact) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
          <BellOff className="h-3 w-3" />
          <span>Blocked</span>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
            <BellOff className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-sm mb-1">Notifications blocked</h3>
            <p className="text-xs text-muted-foreground">
              You've blocked notifications. To enable reminders, allow notifications in your browser settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari (not installed as PWA)
  if (isIOSBrowser) {
    if (compact) return null;

    return (
      <div className="relative rounded-xl border border-warning/30 bg-warning/5 p-4 mb-4">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10">
            <Smartphone className="h-5 w-5 text-warning" />
          </div>
          <div className="flex-1 pr-6">
            <h3 className="font-medium text-sm mb-1">Install for notifications</h3>
            <p className="text-xs text-muted-foreground mb-3">
              On iPhone, notifications require installing the app:
            </p>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside mb-3">
              <li>Tap the Share button <span className="text-foreground">⎙</span></li>
              <li>Select "Add to Home Screen"</li>
              <li>Open the app from your home screen</li>
              <li>Enable notifications when prompted</li>
            </ol>
            <p className="text-xs text-muted-foreground italic">
              Without installation, reminders only work with the app open.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Not supported at all
  if (!isSupported) {
    if (compact) return null;
    return null;
  }

  // Default: Show enable prompt
  if (compact) return null;

  return (
    <div className="relative rounded-xl border border-primary/20 bg-primary/5 p-4 mb-4 animate-fade-in">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 p-1 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
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
            {isPushSupported 
              ? "Get notified at your scheduled times, even when the app is closed."
              : "Get notified at your scheduled times while using the app."}
          </p>
          
          <Button
            size="sm"
            onClick={handleEnableNotifications}
            disabled={isLoading}
            className="h-8 text-xs"
          >
            {isLoading ? "Enabling..." : "Enable notifications"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Status badge for settings page
export function NotificationStatusBadge() {
  const { session } = useAuth();
  const { mode, getStatusText } = usePushNotifications(session?.user?.id);

  const getIcon = () => {
    switch (mode) {
      case 'background':
        return <BellRing className="h-4 w-4" />;
      case 'in-app':
        return <Bell className="h-4 w-4" />;
      case 'denied':
        return <BellOff className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getColorClass = () => {
    switch (mode) {
      case 'background':
        return 'bg-success/10 text-success border-success/20';
      case 'in-app':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'denied':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm",
      getColorClass()
    )}>
      {getIcon()}
      <span>{getStatusText()}</span>
    </div>
  );
}

// Inline status indicator for habit cards
export function NotificationIndicator({ 
  hasTime, 
  reminderEnabled 
}: { 
  hasTime: boolean; 
  reminderEnabled?: boolean;
}) {
  const { session } = useAuth();
  const { mode, permission } = usePushNotifications(session?.user?.id);

  if (!hasTime || reminderEnabled === false) {
    return null;
  }

  // If permission not granted, show muted icon
  if (permission !== 'granted') {
    return (
      <span title="Notifications not enabled">
        <Bell className="h-3 w-3 text-muted-foreground/40 shrink-0" />
      </span>
    );
  }

  // Show icon based on mode
  if (mode === 'background') {
    return (
      <span title="Background notifications active">
        <BellRing className="h-3 w-3 text-success/70 shrink-0" />
      </span>
    );
  }

  return (
    <span title="In-app notifications only">
      <Bell className="h-3 w-3 text-warning/70 shrink-0" />
    </span>
  );
}
