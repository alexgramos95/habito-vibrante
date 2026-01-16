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

        // Update DB to reflect PRO status
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

        // Update DB to reflect lifetime PRO
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

    logStep("No active Stripe subscription found, checking trial status");

    // STEP 2: No active Stripe subscription - check trial status in database
    const { data: subData, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const now = new Date();

    // CASE A: Subscription row exists
    if (subData && !subError) {
      // Check if PRO was set by webhook (e.g., €0 promo)
      if (subData.plan === 'pro' && subData.status === 'active') {
        logStep("PRO status found in DB", { userId: user.id, purchasePlan: subData.purchase_plan });
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

      // Check if trial was ever started
      if (subData.trial_start_date || subData.trial_end_date) {
        const trialEnd = subData.trial_end_date ? new Date(subData.trial_end_date) : null;
        
        if (trialEnd && !isNaN(trialEnd.getTime())) {
          if (now < trialEnd) {
            // Trial still active
            logStep("Trial still active", { 
              userId: user.id, 
              trialEndsAt: trialEnd.toISOString(),
              minutesRemaining: Math.round((trialEnd.getTime() - now.getTime()) / 60000)
            });

            return new Response(JSON.stringify({
              plan: 'trial',
              stripeStatus: null,
              subscriptionEnd: null,
              productId: null,
              purchasePlan: null,
              trialEndsAt: toIsoSafe(trialEnd),
              trialStartedAt: toIsoSafe(subData.trial_start_date),
              subscribed: false,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          } else {
            // Trial expired
            logStep("Trial expired", { 
              userId: user.id, 
              trialEndedAt: trialEnd.toISOString() 
            });

            // Ensure plan is set to free in DB
            if (subData.plan !== 'free') {
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
              trialStartedAt: toIsoSafe(subData.trial_start_date),
              trialExpired: true,
              subscribed: false,
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }

      // User exists but never started trial - create trial now
      logStep("User exists but no trial started, creating trial", { userId: user.id });
      
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

    // CASE B: No subscription row exists - create new user with trial
    logStep("No subscription row found, creating new trial", { userId: user.id });
    
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
      logStep("Error inserting subscription, may already exist", { error: insertError.message });
      // Try update instead (row might have been created by trigger)
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
    }

    logStep("New trial created", { 
      userId: user.id, 
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
