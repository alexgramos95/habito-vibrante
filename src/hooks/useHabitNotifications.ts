import { useEffect, useCallback, useRef } from "react";
import { Habit } from "@/data/types";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Combined notification system that uses:
 * 1. Web Push (background) when available and subscribed
 * 2. Local notifications (in-app) as fallback
 */
export function useHabitNotifications(habits: Habit[]) {
  const { toast } = useToast();
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const pushNotifications = usePushNotifications(userId);
  
  const scheduledTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastFiredRef = useRef<Map<string, string>>(new Map());

  // Check if notifications are supported
  const isSupported = typeof window !== "undefined" && "Notification" in window;

  // Show a local notification (fallback for in-app mode)
  const showLocalNotification = useCallback((habit: Habit) => {
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
        tag: `habit-${habit.id}`,
        requireInteraction: false,
        silent: false,
      });

      lastFiredRef.current.set(habit.id, today);
      console.log(`[Notifications] Fired local notification for: ${habit.nome}`);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error("[Notifications] Error showing notification:", error);
    }
  }, [isSupported]);

  // Calculate milliseconds until a specific time today
  const getMsUntilTime = useCallback((timeStr: string): number | null => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
    
    const [hours, minutes] = timeStr.split(":").map(Number);
    const now = new Date();
    const target = new Date();
    
    target.setHours(hours, minutes, 0, 0);
    
    if (target <= now) {
      return null;
    }
    
    return target.getTime() - now.getTime();
  }, []);

  // Check if habit should show today based on scheduledDays
  const shouldShowToday = useCallback((habit: Habit): boolean => {
    if (!habit.active) return false;
    if (!habit.scheduledTime) return false;
    if (habit.reminderEnabled === false) return false;
    
    const today = new Date().getDay();
    
    if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
      return true;
    }
    
    return habit.scheduledDays.includes(today);
  }, []);

  // Clear all scheduled timeouts
  const clearAllScheduled = useCallback(() => {
    scheduledTimeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
    scheduledTimeoutsRef.current.clear();
  }, []);

  // Schedule local notifications (in-app fallback)
  const scheduleLocalNotifications = useCallback(() => {
    // Only use local notifications if:
    // 1. Push is not available/subscribed (fallback mode)
    // 2. AND we have permission
    if (pushNotifications.mode === 'background' && pushNotifications.isSubscribed) {
      console.log("[Notifications] Using background push, skipping local scheduling");
      return;
    }

    if (!isSupported || Notification.permission !== "granted") {
      console.log("[Notifications] Permission not granted, skipping local schedule");
      return;
    }

    clearAllScheduled();
    const today = new Date().toISOString().split("T")[0];

    habits.forEach((habit) => {
      if (!shouldShowToday(habit)) return;
      if (!habit.scheduledTime) return;
      if (lastFiredRef.current.get(habit.id) === today) return;

      const msUntil = getMsUntilTime(habit.scheduledTime);
      
      if (msUntil !== null && msUntil > 0) {
        const timeout = setTimeout(() => {
          showLocalNotification(habit);
          scheduledTimeoutsRef.current.delete(habit.id);
        }, msUntil);
        
        scheduledTimeoutsRef.current.set(habit.id, timeout);
        
        const minutesUntil = Math.round(msUntil / 60000);
        console.log(`[Notifications] Scheduled local: ${habit.nome} at ${habit.scheduledTime} (in ${minutesUntil} minutes)`);
      }
    });
  }, [habits, pushNotifications.mode, pushNotifications.isSubscribed, isSupported, shouldShowToday, getMsUntilTime, showLocalNotification, clearAllScheduled]);

  // Re-schedule when habits change or when page becomes visible
  useEffect(() => {
    scheduleLocalNotifications();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[Notifications] Page visible, rescheduling local...");
        scheduleLocalNotifications();
      }
    };

    const scheduleNextDayReset = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 5, 0);
      
      const msUntilMidnight = tomorrow.getTime() - now.getTime();
      
      return setTimeout(() => {
        console.log("[Notifications] New day, clearing fired cache");
        lastFiredRef.current.clear();
        scheduleLocalNotifications();
        scheduleNextDayReset();
      }, msUntilMidnight);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const midnightTimeout = scheduleNextDayReset();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(midnightTimeout);
      clearAllScheduled();
    };
  }, [scheduleLocalNotifications, clearAllScheduled]);

  return {
    ...pushNotifications,
    isLocalSupported: isSupported,
    scheduleLocalNotifications,
  };
}
