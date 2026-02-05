import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Safe epoch-seconds to ISO converter (returns null for invalid/missing values)
const toIsoFromSeconds = (s?: number | null): string | null => {
  if (typeof s === 'number' && Number.isFinite(s) && s > 0) {
    return new Date(s * 1000).toISOString();
  }
  return null;
};

// Map price IDs to plan names - JANUARY 2026 (UPDATED)
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SvNnvPEplRqsp5IM3Q8fFXr": "monthly",  // €7.99/month
  "price_1SvNpwPEplRqsp5IyW3A5VZv": "yearly",   // €59.99/year
  "price_1SvNtBPEplRqsp5IhDXGblEB": "lifetime", // €149 one-time
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

    // Wrap per-event processing in try/catch - always return 200 after signature passes
    try {
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
        case "invoice.paid":
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          await handleInvoicePaid(supabaseClient, stripe, invoice);
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
    } catch (processingError) {
      // Log processing error but still return 200 (signature was valid)
      const message = processingError instanceof Error ? processingError.message : String(processingError);
      logStep("ERROR processing event (non-fatal)", { eventType: event.type, error: message });
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

/**
 * Resolve userId from multiple sources (priority order):
 * 1. client_reference_id (most reliable - set at checkout)
 * 2. metadata.userId or metadata.user_id
 * 3. Fallback to email lookup
 */
// deno-lint-ignore no-explicit-any
async function resolveUserId(supabase: any, stripe: Stripe, options: {
  clientReferenceId?: string | null;
  metadata?: Record<string, string> | null;
  customerId?: string | null;
  customerEmail?: string | null;
}): Promise<string | null> {
  const { clientReferenceId, metadata, customerId, customerEmail } = options;

  // 1. Try client_reference_id first (set in create-checkout)
  if (clientReferenceId) {
    logStep("Found userId from client_reference_id", { userId: clientReferenceId });
    return clientReferenceId;
  }

  // 2. Try metadata
  const metadataUserId = metadata?.userId || metadata?.user_id;
  if (metadataUserId) {
    logStep("Found userId from metadata", { userId: metadataUserId });
    return metadataUserId;
  }

  // 3. Try to find by stripe_customer_id in our DB
  if (customerId) {
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .single();
    
    if (existingSub?.user_id) {
      logStep("Found userId from stripe_customer_id", { userId: existingSub.user_id, customerId });
      return existingSub.user_id;
    }
  }

  // 4. Try to find by email
  let email = customerEmail;
  if (!email && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer.deleted && customer.email) {
        email = customer.email;
      }
    } catch {
      logStep("Could not retrieve customer", { customerId });
    }
  }

  if (email) {
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find((u: { email: string }) => u.email === email);
    if (user) {
      logStep("Found userId by email lookup", { userId: user.id, email });
      return user.id;
    }
  }

  logStep("Could not resolve userId", { clientReferenceId, customerId, customerEmail: email });
  return null;
}

// deno-lint-ignore no-explicit-any
async function handleCheckoutCompleted(supabase: any, stripe: Stripe, session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  
  logStep("Checkout completed", { 
    sessionId: session.id, 
    mode: session.mode, 
    customerId,
    clientReferenceId: session.client_reference_id,
    hasMetadata: !!session.metadata
  });

  const userId = await resolveUserId(supabase, stripe, {
    clientReferenceId: session.client_reference_id,
    metadata: session.metadata as Record<string, string> | null,
    customerId,
    customerEmail: session.customer_email || session.customer_details?.email,
  });

  if (!userId) {
    logStep("ERROR: Could not find user for checkout");
    return;
  }

  if (session.mode === "subscription" && session.subscription) {
    // Subscription checkout - fetch subscription details
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await upsertSubscription(supabase, userId, customerId, subscription);
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
  const customerId = subscription.customer as string;
  
  logStep("Subscription update", { 
    subscriptionId: subscription.id, 
    status: subscription.status,
    customerId,
    hasMetadata: !!subscription.metadata
  });

  const userId = await resolveUserId(supabase, stripe, {
    metadata: subscription.metadata as Record<string, string> | null,
    customerId,
  });

  if (!userId) {
    logStep("ERROR: Could not find user for subscription update");
    return;
  }

  await upsertSubscription(supabase, userId, customerId, subscription);
}

// deno-lint-ignore no-explicit-any
async function handleInvoicePaid(supabase: any, stripe: Stripe, invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string | null;
  
  logStep("Invoice paid", { 
    invoiceId: invoice.id, 
    customerId,
    subscriptionId,
    total: invoice.total,
    amountPaid: invoice.amount_paid,
    status: invoice.status
  });

  // Only process subscription invoices
  if (!subscriptionId) {
    logStep("Invoice not for subscription, skipping", { invoiceId: invoice.id });
    return;
  }

  // Fetch the subscription to get its current status
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  logStep("Invoice subscription status", { 
    subscriptionId,
    subscriptionStatus: subscription.status,
    invoiceTotal: invoice.total,
    invoiceAmountPaid: invoice.amount_paid
  });

  const userId = await resolveUserId(supabase, stripe, {
    metadata: subscription.metadata as Record<string, string> | null,
    customerId,
  });

  if (!userId) {
    logStep("ERROR: Could not find user for invoice");
    return;
  }

  // Update subscription - this handles €0 promos correctly since we check subscription.status, not invoice amount
  await upsertSubscription(supabase, userId, customerId, subscription);
}

// deno-lint-ignore no-explicit-any
async function handleSubscriptionDeleted(supabase: any, _stripe: Stripe, subscription: Stripe.Subscription) {
  logStep("Subscription deleted", { subscriptionId: subscription.id });

  const customerId = subscription.customer as string;
  
  // First try to find by stripe_subscription_id (more accurate)
  let existingSub;
  const { data: subById } = await supabase
    .from("subscriptions")
    .select("user_id, purchase_plan")
    .eq("stripe_subscription_id", subscription.id)
    .single();
  
  if (subById) {
    existingSub = subById;
  } else {
    // Fallback to customer_id
    const { data: subByCustomer } = await supabase
      .from("subscriptions")
      .select("user_id, purchase_plan")
      .eq("stripe_customer_id", customerId)
      .single();
    existingSub = subByCustomer;
  }

  if (!existingSub) {
    logStep("No subscription found to delete", { customerId, subscriptionId: subscription.id });
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

/**
 * Upsert subscription by user_id (primary) with stripe_subscription_id for idempotency
 * Sets plan='pro' when subscription status is 'active' or 'trialing', regardless of payment amount
 * PRO status ALWAYS takes priority over trial status
 */
// deno-lint-ignore no-explicit-any
async function upsertSubscription(supabase: any, userId: string, customerId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price?.id;
  const purchasePlan = priceId ? PRICE_TO_PLAN[priceId] || "monthly" : "monthly";
  
  // Use safe timestamp conversion - null if missing/invalid
  const currentPeriodEnd = toIsoFromSeconds(subscription.current_period_end);
  const trialEnd = toIsoFromSeconds(subscription.trial_end);
  
  // Determine plan based on subscription status, NOT payment amount
  // This correctly handles 100% promo code subscriptions with €0 invoices
  const isActivePlan = subscription.status === "active" || subscription.status === "trialing";
  const plan = isActivePlan ? "pro" : "free";
  const status = isActivePlan ? "active" : subscription.status;

  logStep("Upserting subscription", { 
    userId, 
    customerId,
    subscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    isActivePlan,
    plan,
    status,
    purchasePlan, 
    currentPeriodEnd,
    hasTrialEnd: !!trialEnd
  });

  // Build update data - PRO always overwrites trial
  const updateData: Record<string, unknown> = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    purchase_plan: purchasePlan,
    status,
    current_period_end: currentPeriodEnd,
    updated_at: new Date().toISOString(),
  };

  // Don't overwrite trial dates if becoming PRO - keep them for history
  if (trialEnd) {
    updateData.trial_end_date = trialEnd;
  }

  // Upsert by user_id to avoid duplicates
  const { error } = await supabase
    .from("subscriptions")
    .upsert(updateData, { onConflict: "user_id" });

  if (error) {
    logStep("ERROR upserting subscription", { error: error.message });
  } else {
    logStep("Subscription upserted successfully", { userId, plan, status });
  }
}
