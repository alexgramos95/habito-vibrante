import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    // Check for customer in Stripe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, returning unsubscribed state");
      
      // Check database for subscription status (for trial/local status)
      const { data: subData } = await supabaseClient
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (subData && subData.plan === 'trial') {
        const trialEnd = subData.trial_end_date ? new Date(subData.trial_end_date) : null;
        const isTrialActive = trialEnd && trialEnd > new Date();
        
        return new Response(JSON.stringify({
          subscribed: false,
          plan: isTrialActive ? 'trial' : 'free',
          trial_end: subData.trial_end_date,
          product_id: null,
          subscription_end: null,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      return new Response(JSON.stringify({
        subscribed: false,
        plan: 'free',
        product_id: null,
        subscription_end: null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check for active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    let hasActiveSub = subscriptions.data.length > 0;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let purchasePlan: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      productId = subscription.items.data[0]?.price?.product as string;
      
      // Determine plan type from interval
      const interval = subscription.items.data[0]?.price?.recurring?.interval;
      purchasePlan = interval === 'year' ? 'yearly' : 'monthly';
      
      logStep("Active subscription found", { subscriptionId: subscription.id, productId, purchasePlan });
    } else {
      // Check for lifetime purchase (one-time payment)
      const payments = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 10,
      });
      
      const successfulLifetime = payments.data.find((p: { status: string; metadata?: { price_type?: string } }) => 
        p.status === 'succeeded' && p.metadata?.price_type === 'lifetime'
      );
      
      if (successfulLifetime) {
        hasActiveSub = true;
        purchasePlan = 'lifetime';
        logStep("Lifetime purchase found", { paymentId: successfulLifetime.id });
      } else {
        logStep("No active subscription or lifetime purchase found");
      }
    }

    // Update subscription in database
    if (hasActiveSub) {
      await supabaseClient
        .from('subscriptions')
        .update({
          plan: 'pro',
          stripe_customer_id: customerId,
          purchase_date: new Date().toISOString(),
          purchase_plan: purchasePlan,
          current_period_end: subscriptionEnd,
          status: 'active',
        })
        .eq('user_id', user.id);
      logStep("Database subscription updated to pro");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan: hasActiveSub ? 'pro' : 'free',
      product_id: productId,
      subscription_end: subscriptionEnd,
      purchase_plan: purchasePlan,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
