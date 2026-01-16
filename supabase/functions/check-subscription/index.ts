import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Trial duration in hours
const TRIAL_DURATION_HOURS = 48;

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

    // STEP 1: Check for active Stripe subscription first (PRO always takes priority)
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length > 0) {
      const customerId = customers.data[0].id;
      logStep("Found Stripe customer", { customerId });

      // Check for active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
      
      // Also check for trialing subscriptions
      const trialingSubscriptions = await stripe.subscriptions.list({
        customer: customerId,
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
            stripe_customer_id: customerId,
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
        customer: customerId,
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
            stripe_customer_id: customerId,
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

    // STEP 2: No active Stripe subscription - check trial status in database
    const { data: subData, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();

    // Log existing trial data for debugging
    logStep("Existing subscription row check", { 
      userId: user.id,
      hasRow: !!subData,
      existingTrialStartDate: subData?.trial_start_date ?? null,
      existingTrialEndDate: subData?.trial_end_date ?? null,
      existingPlan: subData?.plan ?? null,
      existingStatus: subData?.status ?? null,
      dbError: subError?.message ?? null
    });

    // CASE A: Subscription row exists
    if (subData && !subError) {
      // Check if PRO was set by webhook (e.g., €0 promo)
      if (subData.plan === 'pro' && (subData.status === 'active' || subData.status === 'trialing')) {
        logStep("PRO status found in DB - returning PRO", { userId: user.id, purchasePlan: subData.purchase_plan });
        return new Response(JSON.stringify({
          plan: 'pro',
          stripeStatus: subData.status,
          subscriptionEnd: subData.current_period_end,
          productId: null,
          purchasePlan: subData.purchase_plan,
          trialEndsAt: null,
          subscribed: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // ========== CRITICAL FIX ==========
      // Check if trial dates exist - if they do, NEVER recreate them
      const hasTrialDates = subData.trial_start_date || subData.trial_end_date;
      
      if (hasTrialDates) {
        // Trial was already created before - only READ, never WRITE
        const trialStartStr = subData.trial_start_date;
        const trialEndStr = subData.trial_end_date;
        const trialEnd = trialEndStr ? new Date(trialEndStr) : null;
        const trialStart = trialStartStr ? new Date(trialStartStr) : null;

        logStep("Trial dates exist - checking validity", {
          userId: user.id,
          trialStartDate: trialStartStr,
          trialEndDate: trialEndStr,
          trialEndValid: trialEnd ? !isNaN(trialEnd.getTime()) : false,
          actionTaken: 'READ_ONLY'
        });

        // If trial_end_date is valid and in the future -> TRIAL
        if (trialEnd && !isNaN(trialEnd.getTime()) && now < trialEnd) {
          logStep("Trial still active - returning TRIAL", { 
            userId: user.id, 
            trialEndsAt: trialEnd.toISOString(),
            minutesRemaining: Math.round((trialEnd.getTime() - now.getTime()) / 60000),
            actionTaken: 'NONE'
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

        // Trial expired or invalid date -> FREE (do NOT recreate trial)
        logStep("Trial expired or invalid - returning FREE", { 
          userId: user.id, 
          trialEndedAt: trialEndStr,
          actionTaken: 'UPDATE_STATUS_ONLY'
        });

        // Only update plan/status, NEVER touch trial dates
        if (subData.plan !== 'free' || subData.status !== 'trial_expired') {
          await supabaseClient
            .from('subscriptions')
            .update({ 
              plan: 'free', 
              status: 'trial_expired',
              updated_at: now.toISOString() 
            })
            .eq('user_id', user.id);
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

      // User row exists but trial was NEVER started (both dates are null)
      // This is the ONLY case where we create trial for an existing row
      logStep("User exists but NO trial dates - creating trial ONCE", { 
        userId: user.id,
        actionTaken: 'CREATE_TRIAL'
      });
      
      const trialEnd = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);
      
      await supabaseClient
        .from('subscriptions')
        .update({
          plan: 'trial',
          trial_start_date: now.toISOString(),
          trial_end_date: trialEnd.toISOString(),
          status: 'trial_active',
          updated_at: now.toISOString(),
        })
        .eq('user_id', user.id);

      logStep("Trial created for existing user", { 
        userId: user.id, 
        trialStartedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString() 
      });

      return new Response(JSON.stringify({
        plan: 'trial',
        stripeStatus: null,
        subscriptionEnd: null,
        productId: null,
        purchasePlan: null,
        trialEndsAt: trialEnd.toISOString(),
        trialStartedAt: now.toISOString(),
        subscribed: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // CASE B: No subscription row exists at all - create new user with trial
    logStep("No subscription row found - creating new row with trial", { 
      userId: user.id,
      actionTaken: 'INSERT_NEW_ROW_WITH_TRIAL'
    });
    
    const trialEnd = new Date(now.getTime() + TRIAL_DURATION_HOURS * 60 * 60 * 1000);
    
    const { error: insertError } = await supabaseClient
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'trial',
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
        status: 'trial_active',
      });

    if (insertError) {
      logStep("Insert failed - row may exist (trigger), attempting conditional update", { 
        error: insertError.message 
      });
      
      // Row might have been created by trigger - check if it has trial dates
      const { data: existingRow } = await supabaseClient
        .from('subscriptions')
        .select('trial_start_date, trial_end_date')
        .eq('user_id', user.id)
        .single();

      // ONLY set trial dates if they don't exist
      if (!existingRow?.trial_start_date && !existingRow?.trial_end_date) {
        await supabaseClient
          .from('subscriptions')
          .update({
            plan: 'trial',
            trial_start_date: now.toISOString(),
            trial_end_date: trialEnd.toISOString(),
            status: 'trial_active',
            updated_at: now.toISOString(),
          })
          .eq('user_id', user.id);
        
        logStep("Updated existing row with trial dates", { userId: user.id });
      } else {
        logStep("Row already has trial dates - NOT overwriting", { 
          userId: user.id,
          existingTrialStart: existingRow?.trial_start_date,
          existingTrialEnd: existingRow?.trial_end_date
        });
        
        // Return the existing trial data
        const existingEnd = existingRow?.trial_end_date ? new Date(existingRow.trial_end_date) : null;
        const existingStart = existingRow?.trial_start_date ? new Date(existingRow.trial_start_date) : null;
        
        if (existingEnd && !isNaN(existingEnd.getTime()) && now < existingEnd) {
          return new Response(JSON.stringify({
            plan: 'trial',
            stripeStatus: null,
            subscriptionEnd: null,
            productId: null,
            purchasePlan: null,
            trialEndsAt: toIsoSafe(existingEnd),
            trialStartedAt: toIsoSafe(existingStart),
            subscribed: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } else {
          return new Response(JSON.stringify({
            plan: 'free',
            stripeStatus: null,
            subscriptionEnd: null,
            productId: null,
            purchasePlan: null,
            trialEndsAt: toIsoSafe(existingEnd),
            trialStartedAt: toIsoSafe(existingStart),
            trialExpired: true,
            subscribed: false,
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    logStep("New trial created successfully", { 
      userId: user.id, 
      trialStartedAt: now.toISOString(),
      trialEndsAt: trialEnd.toISOString() 
    });

    return new Response(JSON.stringify({
      plan: 'trial',
      stripeStatus: null,
      subscriptionEnd: null,
      productId: null,
      purchasePlan: null,
      trialEndsAt: trialEnd.toISOString(),
      trialStartedAt: now.toISOString(),
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
