import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Habit {
  id: string;
  nome: string;
  categoria?: string;
  active: boolean;
  scheduledTime?: string;
  scheduledDays?: number[];
  reminderEnabled?: boolean;
}

interface DailyLog {
  habitId: string;
  date: string; // YYYY-MM-DD
  done: boolean;
}

// Re-send reminders at these minute offsets after the scheduled time.
// The cron runs every minute, so we check whether "now" matches scheduled+offset.
// 0 = original; 2 & 5 = follow-ups if the habit is still not completed.
const REMINDER_OFFSETS_MIN = [0, 2, 5];

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone?: string;
}

/**
 * Get the current time in a given IANA timezone.
 * Returns { hour, minute, dayOfWeek, dateISO } in that timezone.
 */
function getTimeInTimezone(tz: string): { hour: number; minute: number; dayOfWeek: number; dateISO: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
    const hour = parseInt(get('hour') || '0', 10);
    const minute = parseInt(get('minute') || '0', 10);
    const weekdayStr = get('weekday') || 'Mon';
    const year = get('year');
    const month = get('month');
    const day = get('day');
    const dateISO = `${year}-${month}-${day}`;

    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6,
    };
    const dayOfWeek = dayMap[weekdayStr] ?? 0;

    return { hour, minute, dayOfWeek, dateISO };
  } catch {
    const now = new Date();
    const dateISO = now.toISOString().slice(0, 10);
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), dayOfWeek: now.getUTCDay(), dateISO };
  }
}

/**
 * Returns the offset (minutes) matching "now" against the scheduled HH:MM,
 * or null if none. E.g. scheduled 07:00 and now 07:02 → 2.
 */
function matchingOffset(scheduledHour: number, scheduledMinute: number, nowHour: number, nowMinute: number): number | null {
  const scheduledTotal = scheduledHour * 60 + scheduledMinute;
  const nowTotal = nowHour * 60 + nowMinute;
  const diff = nowTotal - scheduledTotal;
  if (diff < 0) return null;
  return REMINDER_OFFSETS_MIN.includes(diff) ? diff : null;
}

async function sendPushNotification(
  supabaseUrl: string,
  serviceRoleKey: string,
  subscription: PushSubscription,
  payload: object
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        payload,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      return result.success === true;
    } else {
      const text = await response.text();
      console.error(`[PUSH] Failed to send: ${response.status} - ${text}`);
      return false;
    }
  } catch (error) {
    console.error(`[PUSH] Error:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with push subscriptions (including timezone)
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth, timezone');

    if (subError) throw new Error(`Failed to fetch subscriptions: ${subError.message}`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group subscriptions by user, pick timezone from first subscription
    const userTimezones = new Map<string, string>();
    for (const sub of subscriptions) {
      if (!userTimezones.has(sub.user_id) && sub.timezone) {
        userTimezones.set(sub.user_id, sub.timezone);
      }
    }

    const userIds = [...new Set(subscriptions.map((s: PushSubscription) => s.user_id))];
    console.log(`[REMINDERS] Found ${userIds.length} users with ${subscriptions.length} subscriptions`);

    // Get user_data for these users (habits + dailyLogs to know what is already done)
    const { data: userData, error: dataError } = await supabase
      .from('user_data')
      .select('user_id, habits, daily_logs')
      .in('user_id', userIds);

    if (dataError) throw new Error(`Failed to fetch user data: ${dataError.message}`);

    let totalSent = 0;
    const notifications: { userId: string; habitId: string; habitName: string; category?: string; offset: number }[] = [];

    for (const user of (userData || [])) {
      const habits: Habit[] = user.habits || [];
      const dailyLogs: DailyLog[] = user.daily_logs || [];
      const tz = userTimezones.get(user.user_id) || 'UTC';
      const { hour: localHour, minute: localMinute, dayOfWeek: localDay, dateISO: localDate } = getTimeInTimezone(tz);

      // Build a quick lookup: which habits are already done today?
      const doneTodayHabitIds = new Set(
        dailyLogs
          .filter(log => log.date === localDate && log.done)
          .map(log => log.habitId)
      );

      console.log(`[REMINDERS] User ${user.user_id.substring(0, 8)}... tz=${tz} localTime=${localHour}:${String(localMinute).padStart(2, '0')} day=${localDay} date=${localDate}, habits=${habits.length}, doneToday=${doneTodayHabitIds.size}`);

      for (const habit of habits) {
        if (!habit.active || !habit.scheduledTime || habit.reminderEnabled === false) continue;

        const [scheduledHour, scheduledMinute] = habit.scheduledTime.split(':').map(Number);

        const offset = matchingOffset(scheduledHour, scheduledMinute, localHour, localMinute);
        if (offset === null) continue;

        const scheduledDays = habit.scheduledDays || [];
        const dayMatches = scheduledDays.length === 0 || scheduledDays.includes(localDay);
        if (!dayMatches) {
          console.log(`[REMINDERS]   "${habit.nome}" day mismatch: today=${localDay} scheduled=${JSON.stringify(scheduledDays)}`);
          continue;
        }

        // Skip follow-ups (offset > 0) if already completed today
        if (offset > 0 && doneTodayHabitIds.has(habit.id)) {
          console.log(`[REMINDERS]   "${habit.nome}" already done today, skip +${offset}min follow-up`);
          continue;
        }

        notifications.push({
          userId: user.user_id,
          habitId: habit.id,
          habitName: habit.nome,
          category: habit.categoria,
          offset,
        });
        console.log(`[REMINDERS] ✅ "${habit.nome}" due for user ${user.user_id.substring(0, 8)}... (offset +${offset}min)`);
      }
    }

    console.log(`[REMINDERS] Found ${notifications.length} habits to notify`);

    for (const notification of notifications) {
      try {
        const userSubs = subscriptions.filter((s: PushSubscription) => s.user_id === notification.userId);
        if (!userSubs || userSubs.length === 0) continue;

        const isFollowUp = notification.offset > 0;
        const title = isFollowUp
          ? `becoMe: ${notification.habitName} (lembrete)`
          : `becoMe: ${notification.habitName}`;
        const body = isFollowUp
          ? `Ainda não marcaste — ${notification.offset} min depois da hora.`
          : (notification.category
              ? `Time for your ${notification.category.toLowerCase()} habit!`
              : 'Time for your habit!');

        const payload = {
          title,
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          // Use unique tag per offset so the OS doesn't replace the previous one silently
          tag: `habit-reminder-${notification.habitId}-${notification.offset}`,
          data: { type: 'habit-reminder', habitId: notification.habitId, habitName: notification.habitName, offset: notification.offset },
        };

        for (const sub of userSubs) {
          const success = await sendPushNotification(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, sub, payload);
          if (success) totalSent++;
        }
      } catch (error) {
        console.error(`[REMINDERS] Error processing notification:`, error);
      }
    }

    console.log(`[REMINDERS] Sent ${totalSent} notifications`);

    return new Response(
      JSON.stringify({ success: true, checked: userData?.length || 0, habitsMatched: notifications.length, sent: totalSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[REMINDERS] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
