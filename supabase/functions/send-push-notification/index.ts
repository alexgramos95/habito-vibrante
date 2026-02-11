import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { 
  ApplicationServer,
  type PushSubscription as WebPushSubscription
} from "jsr:@negrel/webpush@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

interface SubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// URL-safe base64 decode
function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - base64.length % 4) % 4;
  base64 += '='.repeat(padding);
  
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Create application server from base64url VAPID keys
async function createAppServer(publicKeyB64: string, privateKeyB64: string): Promise<ApplicationServer> {
  // Decode base64url keys to raw bytes
  const publicKeyRaw = base64UrlDecode(publicKeyB64);
  const privateKeyRaw = base64UrlDecode(privateKeyB64);

  // Import keys as CryptoKey - use .buffer to get ArrayBuffer
  const publicKey = await crypto.subtle.importKey(
    'raw',
    publicKeyRaw.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyRaw.buffer as ArrayBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign']
  );

  const keyPair: CryptoKeyPair = { publicKey, privateKey };

  return new ApplicationServer({
    keys: keyPair,
    vapidKeys: keyPair,
    contactInformation: 'mailto:support@become.app',
  });
}

serve(async (req) => {
  // Handle CORS
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
      // Validate as user JWT
      const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authenticatedUserId = claimsData.claims.sub as string;
    }

    // Create application server with stored VAPID keys
    const appServer = await createAppServer(VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { userId, subscription, payload }: { 
      userId?: string; 
      subscription?: SubscriptionInput;
      payload: PushPayload;
    } = body;

    if (!payload || !payload.title) {
      throw new Error('Payload with title is required');
    }

    // --- Authorization ---
    // Non-service-role callers can only send to themselves
    if (!isServiceRole) {
      if (userId && userId !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Cannot send notifications for other users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // If no userId specified, scope to authenticated user
      if (!userId && !subscription) {
        return new Response(
          JSON.stringify({ error: 'userId or subscription required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    let subscriptionsToSend: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];

    // If subscription is provided directly, use it
    if (subscription) {
      subscriptionsToSend = [{
        id: 'direct',
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }];
    } else {
      // Get subscriptions from database
      const targetUserId = isServiceRole ? userId : authenticatedUserId;
      let query = supabase.from('push_subscriptions').select('*');
      if (targetUserId) {
        query = query.eq('user_id', targetUserId);
      }
      
      const { data: subscriptions, error: subError } = await query;
      
      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
      }

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
        // Create subscriber for this subscription
        const webPushSub: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        
        const subscriber = appServer.subscribe(webPushSub);

        // Send the notification
        await subscriber.pushTextMessage(pushPayload, {
          ttl: 86400, // 24 hours
        });

        sent++;
        console.log(`[PUSH] Sent to ${sub.endpoint.substring(0, 50)}...`);
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PUSH] Error sending to ${sub.id}:`, errorMessage);
        
        // If subscription is expired/invalid, remove it (only for db entries)
        if (sub.id !== 'direct' && (errorMessage.includes('410') || errorMessage.includes('404') || errorMessage.includes('Gone'))) {
          console.log(`[PUSH] Removing invalid subscription: ${sub.id}`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    }

    console.log(`[PUSH] Sent: ${sent}, Failed: ${failed}`);

    return new Response(
      JSON.stringify({ 
        success: sent > 0, 
        sent, 
        failed,
        total: subscriptionsToSend.length 
      }),
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
