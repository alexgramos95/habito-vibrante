import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trial duration: 7 days (168 hours)
const TRIAL_DURATION_HOURS = 168;

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Safe error mapping
const getSafeErrorMessage = (rawMessage: string): string => {
  const errorMappings: Record<string, string> = {
    "STRIPE_SECRET_KEY is not set": "Payment service unavailable",
    "No authorization header": "Authentication required",
    "Authentication error": "Invalid credentials",
    "User not authenticated": "Please sign in to continue",
  };
  
  for (const [key, safeMessage] of Object.entries(errorMappings)) {
    if (rawMessage.includes(key)) {
      return safeMessage;
    }
  }
  return "An error occurred. Please try again.";
};

// Safe ISO date converter
const toIsoSafe = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // ==========================================
    // STEP 0: Check DB FIRST for existing PRO status (set by webhook)
    // This is the most reliable source since webhooks update it directly
    // ==========================================
    const { data: existingSubData } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingSubData) {
      logStep("DB row found for user", { 
        userId: user.id, 
        plan: existingSubData.plan, 
        status: existingSubData.status,
        stripe_customer_id: existingSubData.stripe_customer_id,
        stripe_subscription_id: existingSubData.stripe_subscription_id
      });

      // If DB says PRO and has Stripe IDs, trust it (webhook is source of truth)
      if (existingSubData.plan === 'pro' && 
          (existingSubData.status === 'active' || existingSubData.status === 'trialing') &&
          (existingSubData.stripe_customer_id || existingSubData.purchase_plan === 'lifetime')) {
        logStep("PRO status found in DB - returning PRO immediately", { 
          userId: user.id, 
          purchasePlan: existingSubData.purchase_plan,
          source: 'database'
        });
        return new Response(JSON.stringify({
          plan: 'pro',
          stripeStatus: existingSubData.status,
          subscriptionEnd: existingSubData.current_period_end,
          productId: null,
          purchasePlan: existingSubData.purchase_plan,
          trialEndsAt: null,
          subscribed: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // ==========================================
    // STEP 1: Check for active Stripe subscription by email
    // ==========================================
    let stripeCustomerId: string | null = null;
    
    // First, try to find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
      logStep("Found Stripe customer by email", { customerId: stripeCustomerId, email: user.email });
    } else if (existingSubData?.stripe_customer_id) {
      // Fallback: use stripe_customer_id from DB if email lookup fails
      stripeCustomerId = existingSubData.stripe_customer_id;
      logStep("Using Stripe customer ID from DB", { customerId: stripeCustomerId });
    }
    
    if (stripeCustomerId) {
      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "active",
        limit: 1,
      });
      
      // Also check for trialing subscriptions
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "trialing",
        limit: 1,
      });

      const activeSubscription = subscriptions.data[0] || trialingSubscriptions.data[0];

      if (activeSubscription) {
        const subscriptionEnd = activeSubscription.current_period_end 
          ? new Date(activeSubscription.current_period_end * 1000).toISOString() 
          : null;
        const productId = activeSubscription.items.data[0]?.price?.product as string;
        const interval = activeSubscription.items.data[0]?.price?.recurring?.interval;
        const purchasePlan = interval === 'year' ? 'yearly' : 'monthly';
        
        logStep("Active Stripe subscription found - returning PRO", { 
          subscriptionId: activeSubscription.id, 
          status: activeSubscription.status,
          productId, 
          purchasePlan 
        });

        // Update DB to reflect PRO status (do NOT touch trial fields)
        await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            plan: 'pro',
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: activeSubscription.id,
            purchase_plan: purchasePlan,
            current_period_end: subscriptionEnd,
            status: activeSubscription.status,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
          plan: 'pro',
          stripeStatus: activeSubscription.status,
          subscriptionEnd,
          productId,
          purchasePlan,
          trialEndsAt: null,
          subscribed: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check for lifetime purchase (one-time payment)
      const payments = await stripe.paymentIntents.list({
        customer: stripeCustomerId,
        limit: 10,
      });
      
      const successfulLifetime = payments.data.find((p: { status: string; metadata?: { price_type?: string } }) => 
        p.status === 'succeeded' && p.metadata?.price_type === 'lifetime'
      );
      
      if (successfulLifetime) {
        logStep("Lifetime purchase found - returning PRO", { paymentId: successfulLifetime.id });

        // Update DB to reflect lifetime PRO (do NOT touch trial fields)
        await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: user.id,
            plan: 'pro',
            stripe_customer_id: stripeCustomerId,
            purchase_plan: 'lifetime',
            status: 'active',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        return new Response(JSON.stringify({
          plan: 'pro',
          stripeStatus: 'lifetime',
          subscriptionEnd: null,
          productId: null,
          purchasePlan: 'lifetime',
          trialEndsAt: null,
          subscribed: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    logStep("No active Stripe subscription found, checking trial status in DB");

    // ==========================================
    // STEP 2: No Stripe PRO - Check trial status in database
    // Use existingSubData that was already fetched at the start
    // ==========================================
    const subData = existingSubData;
    const now = new Date();

    // Log existing data for debugging
    logStep("Using previously fetched DB row", { 
      userId: user.id,
      hasRow: !!subData,
      trial_start_date: subData?.trial_start_date ?? 'NULL',
      trial_end_date: subData?.trial_end_date ?? 'NULL',
      plan: subData?.plan ?? 'NULL',
      status: subData?.status ?? 'NULL'
    });

    // ==========================================
    // CASE A: Row exists in database
    // ==========================================
    if (subData) {
      // PRO check was already done at the top, so skip it here
      
      // ========== CRITICAL CHECK ==========
      // If trial_start_date OR trial_end_date have ANY value, NEVER overwrite them
      const trialStartExists = subData.trial_start_date !== null && subData.trial_start_date !== undefined;
      const trialEndExists = subData.trial_end_date !== null && subData.trial_end_date !== undefined;
      const hasAnyTrialDate = trialStartExists || trialEndExists;
      
      logStep("Trial date check", {
        userId: user.id,
        trialStartExists,
        trialEndExists,
        hasAnyTrialDate,
        rawTrialStart: subData.trial_start_date,
        rawTrialEnd: subData.trial_end_date
      });
      
      if (hasAnyTrialDate) {
        // Trial was created before - ONLY read, NEVER write to these fields
        const trialEnd = subData.trial_end_date ? new Date(subData.trial_end_date) : null;
        const trialStart = subData.trial_start_date ? new Date(subData.trial_start_date) : null;
        const trialEndValid = trialEnd && !isNaN(trialEnd.getTime());
        const isTrialActive = trialEndValid && now < trialEnd;

        logStep("Trial dates found - read only mode", {
          userId: user.id,
          trialStart: subData.trial_start_date,
          trialEnd: subData.trial_end_date,
          trialEndValid,
          isTrialActive,
          nowISO: now.toISOString(),
          actionTaken: 'READ_ONLY'
        });

        if (isTrialActive) {
          // Trial still active -> return TRIAL
          logStep("Trial still active - returning TRIAL", { 
            userId: user.id, 
            trialEndsAt: trialEnd!.toISOString(),
            minutesRemaining: Math.round((trialEnd!.getTime() - now.getTime()) / 60000)
          });

          return new Response(JSON.stringify({
            plan: 'trial',
            stripeStatus: null,
            subscriptionEnd: null,
            productId: null,
            purchasePlan: null,
            trialEndsAt: toIsoSafe(trialEnd),
            trialStartedAt: toIsoSafe(trialStart),
            subscribed: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        // Trial expired or invalid -> return FREE (do NOT recreate trial)
        logStep("Trial expired - returning FREE", { 
          userId: user.id, 
          trialEndedAt: subData.trial_end_date,
          actionTaken: 'RETURN_FREE_TRIAL_EXPIRED'
        });

        // Only update plan/status if needed, NEVER touch trial dates
        if (subData.plan !== 'free' || subData.status !== 'trial_expired') {
          const { error: updateError } = await supabaseClient
            .from('subscriptions')
            .update({ 
              plan: 'free', 
              status: 'trial_expired',
              updated_at: now.toISOString() 
            })
            .eq('user_id', user.id);
          
          logStep("Updated plan to FREE", { updateError: updateError?.message ?? null });
        }

        return new Response(JSON.stringify({
          plan: 'free',
          stripeStatus: null,
          subscriptionEnd: null,
          productId: null,
          purchasePlan: null,
          trialEndsAt: toIsoSafe(trialEnd),
          trialStartedAt: toIsoSafe(trialStart),
          trialExpired: true,
          subscribed: false,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // ========== CREATE TRIAL (only if BOTH dates are null) ==========
      logStep("No trial dates exist - creating trial ONCE", { 
        userId: user.id,
        actionTaken: 'CREATE_TRIAL'
      });
      
      const trialEnd = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);
      const trialEndIso = trialEnd.toISOString();
      const nowIso = now.toISOString();
      
      // Use UPSERT with explicit values
      const { data: upsertResult, error: upsertError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'trial',
          trial_start_date: nowIso,
          trial_end_date: trialEndIso,
          status: 'trial_active',
          updated_at: nowIso,
        }, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();

      logStep("Trial UPSERT executed", { 
        userId: user.id, 
        trialStartedAt: nowIso,
        trialEndsAt: trialEndIso,
        upsertError: upsertError?.message ?? null,
        upsertErrorCode: upsertError?.code ?? null,
        upsertResult: upsertResult ? 'success' : 'no data returned'
      });

      // Verify the write worked by reading back
      const { data: verifyData, error: verifyError } = await supabaseClient
        .from('subscriptions')
        .select('trial_start_date, trial_end_date, plan')
        .eq('user_id', user.id)
        .single();
      
      logStep("Verification read after upsert", {
        userId: user.id,
        verifyTrialStart: verifyData?.trial_start_date ?? 'NULL',
        verifyTrialEnd: verifyData?.trial_end_date ?? 'NULL',
        verifyPlan: verifyData?.plan ?? 'NULL',
        verifyError: verifyError?.message ?? null
      });

      return new Response(JSON.stringify({
        plan: 'trial',
        stripeStatus: null,
        subscriptionEnd: null,
        productId: null,
        purchasePlan: null,
        trialEndsAt: trialEndIso,
        trialStartedAt: nowIso,
        subscribed: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ==========================================
    // CASE B: No subscription row exists - create new with trial
    // ==========================================
    logStep("No subscription row found - inserting new row with trial", { 
      userId: user.id,
      actionTaken: 'INSERT_NEW_ROW'
    });
    
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);
    const trialEndIso = trialEnd.toISOString();
    const nowIso = now.toISOString();
    
    const { data: insertData, error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'trial',
        trial_start_date: nowIso,
        trial_end_date: trialEndIso,
        status: 'trial_active',
      })
      .select();

    logStep("Insert result", { 
      userId: user.id,
      insertError: insertError?.message ?? null,
      insertErrorCode: insertError?.code ?? null,
      insertData: insertData ? 'success' : 'no data'
    });

    // If insert failed (row might exist from trigger), try to handle it
    if (insertError) {
      logStep("Insert failed - checking if row was created by trigger", { 
        error: insertError.message 
      });
      
      // Re-fetch the row
      const { data: existingRow, error: fetchError } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      logStep("Re-fetched row after insert failure", {
        userId: user.id,
        hasRow: !!existingRow,
        trialStart: existingRow?.trial_start_date ?? 'NULL',
        trialEnd: existingRow?.trial_end_date ?? 'NULL',
        fetchError: fetchError?.message ?? null
      });

      if (existingRow) {
        // Check if it already has trial dates
        if (existingRow.trial_start_date || existingRow.trial_end_date) {
          // Already has trial - return based on dates
          const existingEnd = existingRow.trial_end_date ? new Date(existingRow.trial_end_date) : null;
          const existingStart = existingRow.trial_start_date ? new Date(existingRow.trial_start_date) : null;
          const isActive = existingEnd && !isNaN(existingEnd.getTime()) && now < existingEnd;
          
          logStep("Row has trial dates - not overwriting", { 
            userId: user.id,
            isActive,
            actionTaken: 'READ_ONLY_AFTER_INSERT_FAIL'
          });
          
          return new Response(JSON.stringify({
            plan: isActive ? 'trial' : 'free',
            stripeStatus: null,
            subscriptionEnd: null,
            productId: null,
            purchasePlan: null,
            trialEndsAt: toIsoSafe(existingEnd),
            trialStartedAt: toIsoSafe(existingStart),
            trialExpired: !isActive,
            subscribed: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
        
        // Row exists but no trial dates - update to add trial
        logStep("Row exists without trial dates - updating", { userId: user.id });
        
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .update({
            plan: 'trial',
            trial_start_date: nowIso,
            trial_end_date: trialEndIso,
            status: 'trial_active',
            updated_at: nowIso,
          })
          .eq('user_id', user.id);
        
        logStep("Update after insert fail result", { 
          updateError: updateError?.message ?? null 
        });
      }
    }

    logStep("New trial created successfully", { 
      userId: user.id, 
      trialStartedAt: nowIso,
      trialEndsAt: trialEndIso 
    });

    return new Response(JSON.stringify({
      plan: 'trial',
      stripeStatus: null,
      subscriptionEnd: null,
      productId: null,
      purchasePlan: null,
      trialEndsAt: trialEndIso,
      trialStartedAt: nowIso,
      subscribed: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: rawMessage });
    const safeMessage = getSafeErrorMessage(rawMessage);
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
