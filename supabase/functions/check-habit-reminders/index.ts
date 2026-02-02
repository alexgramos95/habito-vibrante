import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

interface UserData {
  user_id: string;
  habits: Habit[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current time
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0 = Sunday

    console.log(`[REMINDERS] Checking habits at ${currentHour}:${currentMinute} UTC, day ${currentDay}`);

    // Get all users with push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .order('user_id');

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, checked: 0, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique user IDs
    const userIds = [...new Set(subscriptions.map(s => s.user_id))];
    console.log(`[REMINDERS] Found ${userIds.length} users with push subscriptions`);

    // Get user_data for these users
    const { data: userData, error: dataError } = await supabase
      .from('user_data')
      .select('user_id, habits')
      .in('user_id', userIds);

    if (dataError) {
      throw new Error(`Failed to fetch user data: ${dataError.message}`);
    }

    let totalSent = 0;
    const notifications: { userId: string; habitName: string }[] = [];

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
        notifications.push({ userId: user.user_id, habitName: habit.nome });
        console.log(`[REMINDERS] Habit "${habit.nome}" due for user ${user.user_id}`);
      }
    }

    // Send notifications
    for (const notification of notifications) {
      try {
        // Get user's push subscriptions
        const { data: userSubs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', notification.userId);

        if (!userSubs || userSubs.length === 0) continue;

        // Send to all user's devices
        for (const sub of userSubs) {
          try {
            const pushPayload = JSON.stringify({
              title: `becoMe: ${notification.habitName}`,
              body: 'Time for your habit!',
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `habit-reminder-${notification.habitName}`,
              data: { type: 'habit-reminder', habitName: notification.habitName },
            });

            await fetch(sub.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/octet-stream',
                'TTL': '86400',
              },
              body: pushPayload,
            });

            totalSent++;
          } catch (pushError) {
            console.error(`[REMINDERS] Failed to send push:`, pushError);
          }
        }
      } catch (error) {
        console.error(`[REMINDERS] Error processing notification:`, error);
      }
    }

    console.log(`[REMINDERS] Checked ${userData?.length || 0} users, sent ${totalSent} notifications`);

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
