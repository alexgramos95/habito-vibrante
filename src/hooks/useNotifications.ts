import { useEffect, useCallback, useRef } from "react";
import { Habit } from "@/data/types";
import { useToast } from "@/hooks/use-toast";

interface NotificationState {
  permission: NotificationPermission;
  supported: boolean;
}

/**
 * Hook to manage habit reminder notifications.
 * Handles permission requests, scheduling, and firing notifications at the right time.
 */
export const useNotifications = (habits: Habit[]) => {
  const { toast } = useToast();
  const scheduledTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastFiredRef = useRef<Map<string, string>>(new Map()); // habitId -> date to prevent duplicates
  
  // Check if notifications are supported
  const isSupported = typeof window !== "undefined" && "Notification" in window;
  
  // Get current permission status
  const getPermission = useCallback((): NotificationPermission => {
    if (!isSupported) return "denied";
    return Notification.permission;
  }, [isSupported]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications.",
        variant: "destructive",
      });
      return "denied";
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === "granted") {
        toast({
          title: "Notifications enabled",
          description: "You'll receive reminders for your habits.",
        });
      } else if (permission === "denied") {
        toast({
          title: "Notifications blocked",
          description: "Enable notifications in your browser settings.",
          variant: "destructive",
        });
      }
      
      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  }, [isSupported, toast]);

  // Show a notification
  const showNotification = useCallback((habit: Habit) => {
    if (!isSupported || Notification.permission !== "granted") return;
    
    const today = new Date().toISOString().split("T")[0];
    const lastFired = lastFiredRef.current.get(habit.id);
    
    // Prevent duplicate notifications for the same habit on the same day
    if (lastFired === today) {
      console.log(`[Notifications] Already fired for ${habit.nome} today`);
      return;
    }
    
    try {
      const notification = new Notification(`becoMe: ${habit.nome}`, {
        body: habit.categoria 
          ? `Time for your ${habit.categoria.toLowerCase()} habit`
          : "Time for your habit",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: `habit-${habit.id}`, // Prevents duplicate notifications
        requireInteraction: false,
        silent: false,
      });

      lastFiredRef.current.set(habit.id, today);
      console.log(`[Notifications] Fired notification for: ${habit.nome} at ${new Date().toLocaleTimeString()}`);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error("[Notifications] Error showing notification:", error);
    }
  }, [isSupported]);

  // Calculate milliseconds until a specific time today (or tomorrow if time has passed)
  const getMsUntilTime = useCallback((timeStr: string): number | null => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    
    target.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, don't schedule (will check again tomorrow)
    if (target <= now) {
      return null;
    }
    
    return target.getTime() - now.getTime();
  }, []);

  // Check if habit should show today based on scheduledDays
  const shouldShowToday = useCallback((habit: Habit): boolean => {
    if (!habit.active) return false;
    if (!habit.scheduledTime) return false;
    
    // If reminderEnabled is explicitly false, don't notify
    if (habit.reminderEnabled === false) return false;
    
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    
    // If no specific days set, show every day
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    
    return habit.scheduledDays.includes(today);
  }, []);

  // Clear all scheduled timeouts
  const clearAllScheduled = useCallback(() => {
    scheduledTimeoutsRef.current.forEach((timeout, habitId) => {
      clearTimeout(timeout);
      console.log(`[Notifications] Cleared timeout for habit: ${habitId}`);
    });
    scheduledTimeoutsRef.current.clear();
  }, []);

  // Schedule notifications for all habits
  const scheduleNotifications = useCallback(() => {
    if (!isSupported || Notification.permission !== "granted") {
      console.log("[Notifications] Permission not granted, skipping schedule");
      return;
    }

    // Clear existing schedules
    clearAllScheduled();

    const today = new Date().toISOString().split("T")[0];

    habits.forEach((habit) => {
      if (!shouldShowToday(habit)) return;
      if (!habit.scheduledTime) return;
      
      // Skip if already fired today
      if (lastFiredRef.current.get(habit.id) === today) {
        console.log(`[Notifications] ${habit.nome} already fired today, skipping`);
        return;
      }

      const msUntil = getMsUntilTime(habit.scheduledTime);
      
      if (msUntil !== null && msUntil > 0) {
        const timeout = setTimeout(() => {
          showNotification(habit);
          scheduledTimeoutsRef.current.delete(habit.id);
        }, msUntil);
        
        scheduledTimeoutsRef.current.set(habit.id, timeout);
        
        const minutesUntil = Math.round(msUntil / 60000);
        console.log(`[Notifications] Scheduled: ${habit.nome} at ${habit.scheduledTime} (in ${minutesUntil} minutes)`);
      }
    });
  }, [isSupported, habits, shouldShowToday, getMsUntilTime, showNotification, clearAllScheduled]);

  // Re-schedule when habits change or when page becomes visible
  useEffect(() => {
    scheduleNotifications();

    // Handle visibility change (reschedule when user returns to app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Notifications] Page visible, rescheduling...");
        scheduleNotifications();
      }
    };

    // Reschedule at midnight for new day
    const scheduleNextDayReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 5, 0); // 5 seconds after midnight
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        console.log("[Notifications] New day, clearing fired cache and rescheduling");
        lastFiredRef.current.clear();
        scheduleNotifications();
        scheduleNextDayReset(); // Schedule for next day
      }, msUntilMidnight);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const midnightTimeout = scheduleNextDayReset();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(midnightTimeout);
      clearAllScheduled();
    };
  }, [scheduleNotifications, clearAllScheduled]);

  // Debug: Log current state
  useEffect(() => {
    if (isSupported) {
      console.log("[Notifications] Status:", {
        supported: true,
        permission: Notification.permission,
        habitsWithTime: habits.filter(h => h.scheduledTime && h.active).length,
        scheduledCount: scheduledTimeoutsRef.current.size,
      });
    }
  }, [habits, isSupported]);

  return {
    isSupported,
    permission: getPermission(),
    requestPermission,
    scheduleNotifications,
    showNotification,
  };
};

export type { NotificationState };
