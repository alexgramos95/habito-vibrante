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
  console.log(`[RESTORE-PURCHASES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { platform } = body; // 'stripe', 'apple', 'google'

    if (platform === 'stripe') {
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: "No purchases found for this email" 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const customerId = customers.data[0].id;
      
      // Check for active subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        const interval = sub.items.data[0]?.price?.recurring?.interval;
        const purchasePlan = interval === 'year' ? 'yearly' : 'monthly';
        
        await supabaseClient
          .from('subscriptions')
          .update({
            plan: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            purchase_plan: purchasePlan,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            status: 'active',
          })
          .eq('user_id', user.id);

        logStep("Stripe subscription restored", { subscriptionId: sub.id });
        
        return new Response(JSON.stringify({
          success: true,
          platform: 'stripe',
          plan: 'pro',
          purchase_plan: purchasePlan,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check for lifetime purchase
      const payments = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 20,
      });
      
      const lifetimePurchase = payments.data.find((p: { status: string; metadata?: { price_type?: string }; created: number }) => 
        p.status === 'succeeded' && p.metadata?.price_type === 'lifetime'
      );

      if (lifetimePurchase) {
        await supabaseClient
          .from('subscriptions')
          .update({
            plan: 'pro',
            stripe_customer_id: customerId,
            purchase_plan: 'lifetime',
            purchase_date: new Date(lifetimePurchase.created * 1000).toISOString(),
            status: 'active',
          })
          .eq('user_id', user.id);

        logStep("Stripe lifetime purchase restored");
        
        return new Response(JSON.stringify({
          success: true,
          platform: 'stripe',
          plan: 'pro',
          purchase_plan: 'lifetime',
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ 
        success: false, 
        message: "No active subscription or lifetime purchase found" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (platform === 'apple') {
      // Apple IAP restore stub
      logStep("Apple restore requested - stub implementation");
      return new Response(JSON.stringify({
        success: false,
        message: "Apple IAP restore not yet implemented. Please restore from your iOS device.",
        stub: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (platform === 'google') {
      // Google Play restore stub
      logStep("Google restore requested - stub implementation");
      return new Response(JSON.stringify({
        success: false,
        message: "Google Play restore not yet implemented. Please restore from your Android device.",
        stub: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else {
      throw new Error("Invalid platform. Use 'stripe', 'apple', or 'google'");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in restore-purchases", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
