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
 * Returns { hour, minute, dayOfWeek } in that timezone.
 */
function getTimeInTimezone(tz: string): { hour: number; minute: number; dayOfWeek: number } {
  try {
    const now = new Date();
    // Use Intl to get components in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value ?? '0', 10);
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value ?? '0', 10);
    const weekdayStr = parts.find(p => p.type === 'weekday')?.value ?? 'Mon';
    
    const dayMap: Record<string, number> = {
      'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6,
    };
    const dayOfWeek = dayMap[weekdayStr] ?? 0;
    
    return { hour, minute, dayOfWeek };
  } catch {
    // Fallback to UTC if timezone is invalid
    const now = new Date();
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes(), dayOfWeek: now.getUTCDay() };
  }
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

    // Get user_data for these users
    const { data: userData, error: dataError } = await supabase
      .from('user_data')
      .select('user_id, habits')
      .in('user_id', userIds);

    if (dataError) throw new Error(`Failed to fetch user data: ${dataError.message}`);

    let totalSent = 0;
    const notifications: { userId: string; habitName: string; category?: string }[] = [];

    for (const user of (userData || [])) {
      const habits: Habit[] = user.habits || [];
      const tz = userTimezones.get(user.user_id) || 'UTC';
      const { hour: localHour, minute: localMinute, dayOfWeek: localDay } = getTimeInTimezone(tz);

      console.log(`[REMINDERS] User ${user.user_id.substring(0, 8)}... tz=${tz} localTime=${localHour}:${String(localMinute).padStart(2, '0')} day=${localDay}, habits=${habits.length}`);

      for (const habit of habits) {
        if (!habit.active || !habit.scheduledTime || habit.reminderEnabled === false) continue;

        const [scheduledHour, scheduledMinute] = habit.scheduledTime.split(':').map(Number);

        // Compare against user's LOCAL time
        const timeMatches = scheduledHour === localHour && scheduledMinute === localMinute;
        
        console.log(`[REMINDERS]   Habit "${habit.nome}" scheduled=${habit.scheduledTime} vs local=${String(localHour).padStart(2,'0')}:${String(localMinute).padStart(2,'0')} match=${timeMatches}`);
        
        if (!timeMatches) continue;

        const scheduledDays = habit.scheduledDays || [];
        const dayMatches = scheduledDays.length === 0 || scheduledDays.includes(localDay);
        if (!dayMatches) {
          console.log(`[REMINDERS]   Day mismatch: today=${localDay} scheduled=${JSON.stringify(scheduledDays)}`);
          continue;
        }

        notifications.push({ userId: user.user_id, habitName: habit.nome, category: habit.categoria });
        console.log(`[REMINDERS] ✅ Habit "${habit.nome}" due for user ${user.user_id.substring(0, 8)}...`);
      }
    }

    console.log(`[REMINDERS] Found ${notifications.length} habits to notify`);

    for (const notification of notifications) {
      try {
        const userSubs = subscriptions.filter((s: PushSubscription) => s.user_id === notification.userId);
        if (!userSubs || userSubs.length === 0) continue;

        const payload = {
          title: `becoMe: ${notification.habitName}`,
          body: notification.category
            ? `Time for your ${notification.category.toLowerCase()} habit!`
            : 'Time for your habit!',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `habit-reminder-${notification.habitName}`,
          data: { type: 'habit-reminder', habitName: notification.habitName },
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
