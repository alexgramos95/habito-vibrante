import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for debugging
const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Input validation schema
const CheckoutSchema = z.object({
  priceType: z.enum(["monthly", "yearly", "lifetime"]),
});

// Safe error mapping - maps internal errors to user-safe messages
const getSafeErrorMessage = (rawMessage: string): string => {
  const errorMappings: Record<string, string> = {
    "STRIPE_SECRET_KEY is not set": "Payment service unavailable",
    "No authorization header": "Authentication required",
    "Authentication error": "Invalid credentials",
    "User not authenticated": "Please sign in to continue",
    "Invalid input": "Invalid request data",
  };
  
  for (const [key, safeMessage] of Object.entries(errorMappings)) {
    if (rawMessage.includes(key)) {
      return safeMessage;
    }
  }
  return "An error occurred. Please try again.";
};

// Price IDs - REPLACE with your actual Stripe price IDs
const PRICE_IDS = {
  monthly: "prod_TmU4geRW1u9g0S", // Replace with actual price ID
  yearly: "prod_TmUDYi3kN4xKAk", // Replace with actual price ID
  lifetime: "prod_TmUEwnKdigDaEP", // Replace with actual price ID (one-time)
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

    // Get and validate request body
    const rawBody = await req.json();
    const parseResult = CheckoutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new Error(`Invalid input: ${parseResult.error.issues.map(i => i.message).join(", ")}`);
    }
    const { priceType } = parseResult.data;
    logStep("Request body validated", { priceType });

    // For now, use placeholder - in production replace with actual price IDs
    let priceId = PRICE_IDS[priceType];
    let mode: "subscription" | "payment" = priceType === "lifetime" ? "payment" : "subscription";
    const isSubscription = priceType === "monthly";

    // If placeholder, we'll still proceed but log warning
    if (priceId.includes("PLACEHOLDER")) {
      logStep("WARNING: Using placeholder price ID - replace with actual Stripe price IDs");
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");

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

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    const origin = req.headers.get("origin") || "https://become.app";

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        price_type: priceType,
      },
      ...(isSubscription && {
        subscription_data: {
          // aqui defines o período de trial (em dias)
          trial_period_days: 7, // ou 2, se quiseres alinhar com o que tens agora
        },
      }),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: rawMessage });
    const safeMessage = getSafeErrorMessage(rawMessage);
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
