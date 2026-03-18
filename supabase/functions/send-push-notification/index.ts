import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
    const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    webpush.setVapidDetails(
      'mailto:support@become.app',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // --- Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

    let authenticatedUserId: string | null = null;

    if (!isServiceRole) {
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authenticatedUserId = user.id;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { userId, subscription, payload }: {
      userId?: string;
      subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
      payload: PushPayload;
    } = body;

    if (!payload || !payload.title) {
      throw new Error('Payload with title is required');
    }

    // Non-service-role callers can only send to themselves
    if (!isServiceRole) {
      if (userId && userId !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Cannot send notifications for other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!userId && !subscription) {
        return new Response(
          JSON.stringify({ error: 'userId or subscription required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let subscriptionsToSend: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];

    if (subscription) {
      subscriptionsToSend = [{
        id: 'direct',
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }];
    } else {
      const targetUserId = isServiceRole ? userId : authenticatedUserId;
      let query = supabase.from('push_subscriptions').select('*');
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }

      const { data: subscriptions, error: subError } = await query;
      if (subError) throw new Error(`Failed to fetch subscriptions: ${subError.message}`);

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      subscriptionsToSend = subscriptions;
    }

    console.log(`[PUSH] Sending to ${subscriptionsToSend.length} subscription(s)`);

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag,
      data: payload.data,
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptionsToSend) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };

        await webpush.sendNotification(pushSubscription, pushPayload, { TTL: 86400 });
        sent++;
        console.log(`[PUSH] Sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (error: any) {
        failed++;
        console.error(`[PUSH] Error sending to ${sub.id}:`, error?.message || error);

        // Remove expired/invalid subscriptions
        if (sub.id !== 'direct' && (error?.statusCode === 410 || error?.statusCode === 404)) {
          console.log(`[PUSH] Removing invalid subscription: ${sub.id}`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    console.log(`[PUSH] Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ success: sent > 0, sent, failed, total: subscriptionsToSend.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[PUSH] Error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
