import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const CheckoutSchema = z.object({
  priceType: z.enum(["monthly", "yearly", "lifetime"]),
});

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

// ACTUAL STRIPE PRICE IDS - JANUARY 2026 (UPDATED)
const PRICE_IDS: Record<string, string> = {
  monthly: "price_1SvNnvPEplRqsp5IM3Q8fFXr",   // €7.99/month
  yearly: "price_1SvNpwPEplRqsp5IyW3A5VZv",    // €59.99/year
  lifetime: "price_1SvNtBPEplRqsp5IhDXGblEB",  // €149 one-time
};

// Site URL for redirects
const SITE_URL = Deno.env.get("SITE_URL") || "https://becomeme.lovable.app";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const rawBody = await req.json();
    const parseResult = CheckoutSchema.safeParse(rawBody);
    if (!parseResult.success) {
      throw new Error(`Invalid input: ${parseResult.error.issues.map(i => i.message).join(", ")}`);
    }
    const { priceType } = parseResult.data;
    logStep("Request body validated", { priceType });

    const priceId = PRICE_IDS[priceType];
    const mode: "subscription" | "payment" = priceType === "lifetime" ? "payment" : "subscription";
    
    logStep("Using price", { priceId, mode });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
    }

    // Create checkout session with client_reference_id for robust user mapping
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id, // PRIMARY user mapping
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode,
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/app?checkout=success`,
      cancel_url: `${SITE_URL}/decision?checkout=cancelled`,
      metadata: {
        userId: user.id, // Also in metadata for redundancy
        user_id: user.id,
        price_type: priceType,
      },
    };

    // Add subscription metadata for webhooks
    if (mode === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          userId: user.id,
          user_id: user.id,
          price_type: priceType,
        },
      };
    }

    // Add payment intent metadata for lifetime purchases
    if (mode === "payment") {
      sessionParams.payment_intent_data = {
        metadata: {
          userId: user.id,
          user_id: user.id,
          price_type: priceType,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    logStep("Checkout session created", { 
      sessionId: session.id, 
      clientReferenceId: session.client_reference_id,
      url: session.url 
    });

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
