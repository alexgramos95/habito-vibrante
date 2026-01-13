import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-DATA] ${step}${detailsStr}`);
};

// Input validation schemas
const SyncDataSchema = z.object({
  habits: z.array(z.unknown()).optional(),
  trackerEntries: z.array(z.unknown()).optional(),
  trackers: z.array(z.unknown()).optional(),
  reflections: z.array(z.unknown()).optional(),
  futureSelfEntries: z.array(z.unknown()).optional(),
  investmentGoals: z.array(z.unknown()).optional(),
  shoppingItems: z.array(z.unknown()).optional(),
  gamification: z.record(z.unknown()).optional(),
});

const SyncRequestSchema = z.object({
  action: z.enum(["upload", "download"]),
  data: SyncDataSchema.optional(),
});

// Safe error mapping
const getSafeErrorMessage = (rawMessage: string): string => {
  const errorMappings: Record<string, string> = {
    "No authorization header": "Authentication required",
    "Authentication error": "Invalid credentials",
    "User not authenticated": "Please sign in to continue",
    "Sync requires Pro": "Upgrade to Pro for cloud sync",
    "Invalid input": "Invalid request data",
    "Sync upload failed": "Failed to save data. Please try again.",
    "Sync download failed": "Failed to load data. Please try again.",
  };
  
  for (const [key, safeMessage] of Object.entries(errorMappings)) {
    if (rawMessage.includes(key)) {
      return safeMessage;
    }
  }
  return "An error occurred. Please try again.";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Check if user has pro subscription
    const { data: subData } = await supabaseClient
      .from('subscriptions')
      .select('plan')
      .eq('user_id', user.id)
      .single();

    if (!subData || subData.plan !== 'pro') {
      throw new Error("Sync requires Pro subscription");
    }
    logStep("Pro subscription verified");

    // Validate input
    const rawBody = await req.json();
    const parseResult = SyncRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new Error(`Invalid input: ${parseResult.error.issues.map(i => i.message).join(", ")}`);
    }
    const { action, data } = parseResult.data;
    logStep("Request validated", { action });

    if (action === 'upload') {
      if (!data) {
        throw new Error("Invalid input: data is required for upload");
      }
      
      // Upload local data to cloud
      const { error: upsertError } = await supabaseClient
        .from('user_data')
        .upsert({
          user_id: user.id,
          habits: data.habits || [],
          tracker_logs: data.trackerEntries || [],
          trackers: data.trackers || [],
          daily_reflections: data.reflections || [],
          future_self_entries: data.futureSelfEntries || [],
          investment_goals: data.investmentGoals || [],
          shopping_items: data.shoppingItems || [],
          gamification: data.gamification || {},
          synced_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (upsertError) throw new Error(`Sync upload failed: ${upsertError.message}`);
      logStep("Data uploaded successfully");

      return new Response(JSON.stringify({ success: true, action: 'uploaded' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (action === 'download') {
      // Download cloud data to local (restore)
      const { data: cloudData, error: fetchError } = await supabaseClient
        .from('user_data')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`Sync download failed: ${fetchError.message}`);
      }

      if (!cloudData) {
        logStep("No cloud data found");
        return new Response(JSON.stringify({ success: true, data: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      logStep("Data downloaded successfully", { syncedAt: cloudData.synced_at });

      return new Response(JSON.stringify({
        success: true,
        action: 'downloaded',
        data: {
          habits: cloudData.habits,
          trackerEntries: cloudData.tracker_logs,
          trackers: cloudData.trackers,
          reflections: cloudData.daily_reflections,
          futureSelfEntries: cloudData.future_self_entries,
          investmentGoals: cloudData.investment_goals,
          shoppingItems: cloudData.shopping_items,
          gamification: cloudData.gamification,
          synced_at: cloudData.synced_at,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw new Error("Invalid input: action must be 'upload' or 'download'");
    }
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in sync-data", { message: rawMessage });
    const safeMessage = getSafeErrorMessage(rawMessage);
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
