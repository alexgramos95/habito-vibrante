import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Map price IDs to plan names
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1Sov5zPEplRqsp5If0ew4t8x": "monthly",
  "price_1SovF8PEplRqsp5IPMsfrtOm": "yearly",
  "price_1SovG2PEplRqsp5I52kZ77Vl": "lifetime",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR: STRIPE_SECRET_KEY not set");
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  // deno-lint-ignore no-explicit-any
  const supabaseClient: any = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Read raw body BEFORE any other parsing for signature verification
    const payload = await req.text();
    let event: Stripe.Event;

    // Verify signature if webhook secret is configured
    if (webhookSecret) {
      const sig = req.headers.get("stripe-signature");
      if (!sig) {
        logStep("ERROR: No stripe-signature header");
        return new Response(JSON.stringify({ error: "No signature" }), { status: 400 });
      }
      
      logStep("Verifying signature", { 
        hasSignature: !!sig, 
        payloadLength: payload.length,
        secretPrefix: webhookSecret.startsWith("whsec_") ? "whsec_" : "unknown"
      });
      
      try {
        // Use constructEventAsync for Deno/SubtleCrypto compatibility
        event = await stripe.webhooks.constructEventAsync(payload, sig, webhookSecret);
        logStep("Signature verified", { eventType: event.type });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logStep("ERROR: Signature verification failed", { error: message });
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
      }
    } else {
      // No webhook secret - parse event without verification (TEMPORARY)
      logStep("WARNING: No STRIPE_WEBHOOK_SECRET - skipping signature verification");
      event = JSON.parse(payload) as Stripe.Event;
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseClient, stripe, session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(supabaseClient, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabaseClient, stripe, subscription);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Invoice payment succeeded", { invoiceId: invoice.id, customerId: invoice.customer });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabaseClient, stripe, invoice);
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        logStep("Payment intent succeeded", { paymentIntentId: paymentIntent.id });
        break;
      }
      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR processing webhook", { error: message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// deno-lint-ignore no-explicit-any
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  logStep("Checkout completed", { sessionId: session.id, mode: session.mode, customerId: session.customer });

  const customerId = session.customer as string;
  const customerEmail = session.customer_email || session.customer_details?.email;

  if (!customerEmail && !customerId) {
    logStep("ERROR: No customer email or ID");
    return;
  }

  // Get user by email
  let userId: string | null = null;
  if (customerEmail) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u: { email: string }) => u.email === customerEmail);
    if (user) {
      userId = user.id;
      logStep("Found user by email", { userId, email: customerEmail });
    }
  }

  if (!userId) {
    // Try to find by existing stripe_customer_id
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();
    
    if (existingSub) {
      userId = existingSub.user_id;
      logStep("Found user by stripe_customer_id", { userId, customerId });
    }
  }

  if (!userId) {
    logStep("ERROR: Could not find user for checkout", { customerEmail, customerId });
    return;
  }

  if (session.mode === "subscription" && session.subscription) {
    // Subscription checkout - fetch subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await updateSubscriptionInDb(supabase, userId, customerId, subscription);
  } else if (session.mode === "payment") {
    // Lifetime one-time payment
    logStep("Lifetime payment completed", { userId, customerId });
    
    const { error } = await supabase
      .from("subscriptions")
      .upsert({
        user_id: userId,
        stripe_customer_id: customerId,
        plan: "pro",
        purchase_plan: "lifetime",
        status: "active",
        current_period_end: null,
        purchase_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (error) {
      logStep("ERROR updating lifetime subscription", { error: error.message });
    } else {
      logStep("Lifetime subscription activated", { userId });
    }
  }
}

// deno-lint-ignore no-explicit-any
async function handleSubscriptionUpdate(supabase: any, stripe: Stripe, subscription: Stripe.Subscription) {
  logStep("Subscription update", { subscriptionId: subscription.id, status: subscription.status });

  const customerId = subscription.customer as string;
  
  // Find user by stripe_customer_id
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!existingSub) {
    // Try to find by customer email
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      logStep("ERROR: Customer was deleted", { customerId });
      return;
    }
    
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u: { email: string }) => u.email === customer.email);
    
    if (!user) {
      logStep("ERROR: Could not find user for subscription update", { customerId, email: customer.email });
      return;
    }
    
    await updateSubscriptionInDb(supabase, user.id, customerId, subscription);
  } else {
    await updateSubscriptionInDb(supabase, existingSub.user_id, customerId, subscription);
  }
}

// deno-lint-ignore no-explicit-any
async function handleSubscriptionDeleted(supabase: any, _stripe: Stripe, subscription: Stripe.Subscription) {
  logStep("Subscription deleted", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;
  
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id, purchase_plan")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!existingSub) {
    logStep("No subscription found to delete", { customerId });
    return;
  }

  // Don't downgrade lifetime users
  if (existingSub.purchase_plan === "lifetime") {
    logStep("Skipping delete for lifetime user", { userId: existingSub.user_id });
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      stripe_subscription_id: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", existingSub.user_id);

  if (error) {
    logStep("ERROR updating deleted subscription", { error: error.message });
  } else {
    logStep("Subscription canceled", { userId: existingSub.user_id });
  }
}

// deno-lint-ignore no-explicit-any
async function handlePaymentFailed(supabase: any, _stripe: Stripe, invoice: Stripe.Invoice) {
  logStep("Payment failed", { invoiceId: invoice.id, customerId: invoice.customer });

  const customerId = invoice.customer as string;
  
  const { data: existingSub } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (existingSub) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", existingSub.user_id);

    if (error) {
      logStep("ERROR updating payment failed status", { error: error.message });
    } else {
      logStep("Marked subscription as past_due", { userId: existingSub.user_id });
    }
  }
}

// deno-lint-ignore no-explicit-any
async function updateSubscriptionInDb(supabase: any, userId: string, customerId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  const purchasePlan = priceId ? PRICE_TO_PLAN[priceId] || "monthly" : "monthly";
  
  const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  
  const updateData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan: subscription.status === "active" || subscription.status === "trialing" ? "pro" : "free",
    purchase_plan: purchasePlan,
    status: subscription.status,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  logStep("Updating subscription in DB", { userId, status: subscription.status, purchasePlan, currentPeriodEnd });

  const { error } = await supabase
    .from("subscriptions")
    .upsert(updateData, { onConflict: "user_id" });

  if (error) {
    logStep("ERROR upserting subscription", { error: error.message });
  } else {
    logStep("Subscription updated successfully", { userId, plan: updateData.plan });
  }
}
