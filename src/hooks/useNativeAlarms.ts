import { useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, ScheduleOptions } from "@capacitor/local-notifications";
import { Habit } from "@/data/types";

/**
 * Native alarm scheduling using @capacitor/local-notifications.
 *
 * This is only active when the app runs inside the Capacitor native shell
 * (Android/iOS). On web/PWA it no-ops and the existing Web Push + local
 * setTimeout fallback in `useHabitNotifications` handles reminders.
 *
 * Strategy mirrors `check-habit-reminders` server-side reinforcement:
 * each habit gets up to 3 notifications per day (offsets 0, +2, +5 min).
 * The user dismissing the notification or completing the habit in-app
 * does NOT cancel future reinforcements automatically — the OS shows them
 * unless we proactively cancel via `cancelHabitAlarms`.
 */

const REMINDER_OFFSETS_MIN = [0, 2, 5];
const NOTIFICATION_CHANNEL_ID = "habit-alarms";

// Stable numeric ID per habit + offset (Capacitor requires int32)
function buildNotificationId(habitId: string, offsetIndex: number): number {
  // Hash habitId to a positive int, append offsetIndex (0..2)
  let hash = 0;
  for (let i = 0; i < habitId.length; i++) {
    hash = ((hash << 5) - hash + habitId.charCodeAt(i)) | 0;
  }
  // Keep it positive and leave room for offset suffix
  const base = Math.abs(hash) % 100000000;
  return base * 10 + offsetIndex;
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

function shouldScheduleHabit(habit: Habit): boolean {
  if (!habit.active) return false;
  if (!habit.scheduledTime) return false;
  if (habit.reminderEnabled === false) return false;
  if (!/^\d{2}:\d{2}$/.test(habit.scheduledTime)) return false;
  return true;
}

function getScheduledWeekdays(habit: Habit): number[] {
  // Capacitor uses 1=Sunday..7=Saturday for `on.weekday`
  // App uses 0=Sunday..6=Saturday
  if (!habit.scheduledDays || habit.scheduledDays.length === 0) {
    return [1, 2, 3, 4, 5, 6, 7]; // every day
  }
  return habit.scheduledDays.map(d => d + 1);
}

export function useNativeAlarms(habits: Habit[]) {
  const initializedRef = useRef(false);

  const ensureSetup = useCallback(async () => {
    if (!isNative() || initializedRef.current) return;
    try {
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display !== "granted") {
        const req = await LocalNotifications.requestPermissions();
        if (req.display !== "granted") {
          console.log("[NativeAlarms] Permission denied");
          return;
        }
      }
      // Create high-importance channel on Android for alarm-style alerts
      if (Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({
          id: NOTIFICATION_CHANNEL_ID,
          name: "Habit alarms",
          description: "Scheduled reminders for your habits",
          importance: 5, // IMPORTANCE_HIGH (heads-up)
          visibility: 1,
          vibration: true,
          sound: undefined, // default alarm sound
        });
      }
      initializedRef.current = true;
      console.log("[NativeAlarms] Initialized");
    } catch (err) {
      console.error("[NativeAlarms] Setup error:", err);
    }
  }, []);

  const cancelAll = useCallback(async () => {
    if (!isNative()) return;
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id })),
        });
        console.log(`[NativeAlarms] Cancelled ${pending.notifications.length} pending`);
      }
    } catch (err) {
      console.error("[NativeAlarms] Cancel error:", err);
    }
  }, []);

  const scheduleAll = useCallback(async () => {
    if (!isNative()) return;
    await ensureSetup();
    if (!initializedRef.current) return;

    await cancelAll();

    const toSchedule: ScheduleOptions["notifications"] = [];

    habits.forEach(habit => {
      if (!shouldScheduleHabit(habit)) return;
      const [hours, minutes] = habit.scheduledTime!.split(":").map(Number);
      const weekdays = getScheduledWeekdays(habit);

      REMINDER_OFFSETS_MIN.forEach((offset, idx) => {
        const totalMinutes = hours * 60 + minutes + offset;
        const onHour = Math.floor(totalMinutes / 60) % 24;
        const onMinute = totalMinutes % 60;

        weekdays.forEach(weekday => {
          toSchedule.push({
            id: buildNotificationId(habit.id + "-w" + weekday, idx),
            title: `becoMe: ${habit.nome}`,
            body: offset === 0
              ? (habit.categoria ? `Hora do teu hábito de ${habit.categoria.toLowerCase()}` : "Hora do teu hábito")
              : `Lembrete (+${offset} min): ${habit.nome}`,
            channelId: NOTIFICATION_CHANNEL_ID,
            smallIcon: "ic_stat_icon_config_sample",
            schedule: {
              on: { weekday, hour: onHour, minute: onMinute },
              allowWhileIdle: true,
            },
            extra: { habitId: habit.id, offset },
          });
        });
      });
    });

    if (toSchedule.length === 0) {
      console.log("[NativeAlarms] No habits to schedule");
      return;
    }

    try {
      // Capacitor caps at ~500 pending; chunk to be safe
      const chunkSize = 50;
      for (let i = 0; i < toSchedule.length; i += chunkSize) {
        await LocalNotifications.schedule({
          notifications: toSchedule.slice(i, i + chunkSize),
        });
      }
      console.log(`[NativeAlarms] Scheduled ${toSchedule.length} native alarms`);
    } catch (err) {
      console.error("[NativeAlarms] Schedule error:", err);
    }
  }, [habits, ensureSetup, cancelAll]);

  // Cancel any reinforcement reminders for a habit completed today
  const cancelHabitTodayReinforcements = useCallback(async (habitId: string) => {
    if (!isNative()) return;
    try {
      const today = new Date().getDay() + 1; // capacitor weekday
      const ids = [1, 2].map(idx => ({
        id: buildNotificationId(habitId + "-w" + today, idx),
      }));
      await LocalNotifications.cancel({ notifications: ids });
    } catch (err) {
      console.error("[NativeAlarms] Cancel today reinforcements error:", err);
    }
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    scheduleAll();
  }, [scheduleAll]);

  return {
    isNative: isNative(),
    scheduleAll,
    cancelAll,
    cancelHabitTodayReinforcements,
  };
}
