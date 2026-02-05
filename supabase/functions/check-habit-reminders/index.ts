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

interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Send a push notification using the send-push-notification edge function
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
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
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

    // Get current time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    console.log(`[REMINDERS] Checking habits at ${currentHour}:${String(currentMinute).padStart(2, '0')} UTC, day ${currentDay}`);

    // Get all users with push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[REMINDERS] No push subscriptions found');
      return new Response(
        JSON.stringify({ success: true, checked: 0, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map((s: PushSubscription) => s.user_id))];
    console.log(`[REMINDERS] Found ${userIds.length} users with ${subscriptions.length} subscriptions`);

    // Get user_data for these users
    const { data: userData, error: dataError } = await supabase
      .from('user_data')
      .select('user_id, habits')
      .in('user_id', userIds);

    if (dataError) {
      throw new Error(`Failed to fetch user data: ${dataError.message}`);
    }

    let totalSent = 0;
    const notifications: { userId: string; habitName: string; category?: string }[] = [];

    // Check each user's habits
    for (const user of (userData || [])) {
      const habits: Habit[] = user.habits || [];
      
      for (const habit of habits) {
        // Skip inactive habits or those without reminders
        if (!habit.active || !habit.scheduledTime || habit.reminderEnabled === false) {
          continue;
        }

        // Parse scheduled time (HH:MM format)
        const [scheduledHour, scheduledMinute] = habit.scheduledTime.split(':').map(Number);

        // Check if current time matches (within 1 minute window)
        // Note: This is UTC time - user's local time should be stored as UTC offset in future
        const timeMatches = scheduledHour === currentHour && scheduledMinute === currentMinute;

        if (!timeMatches) continue;

        // Check if today is a scheduled day
        const scheduledDays = habit.scheduledDays || [];
        const dayMatches = scheduledDays.length === 0 || scheduledDays.includes(currentDay);

        if (!dayMatches) continue;

        // This habit should be notified!
        notifications.push({ 
          userId: user.user_id, 
          habitName: habit.nome,
          category: habit.categoria 
        });
        console.log(`[REMINDERS] Habit "${habit.nome}" due for user ${user.user_id.substring(0, 8)}...`);
      }
    }

    console.log(`[REMINDERS] Found ${notifications.length} habits to notify`);

    // Send notifications
    for (const notification of notifications) {
      try {
        // Get user's push subscriptions
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

        // Send to all user's devices
        for (const sub of userSubs) {
          const success = await sendPushNotification(
            SUPABASE_URL,
            SUPABASE_SERVICE_ROLE_KEY,
            sub,
            payload
          );
          
          if (success) {
            totalSent++;
          }
        }
      } catch (error) {
        console.error(`[REMINDERS] Error processing notification:`, error);
      }
    }

    console.log(`[REMINDERS] Sent ${totalSent} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        checked: userData?.length || 0,
        habitsMatched: notifications.length,
        sent: totalSent 
      }),
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
