import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const planFromProduct = (id: string): string =>
  id.includes("lifetime") ? "lifetime" : id.includes("year") || id.includes("annual") ? "yearly" : "monthly";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  const got = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || got !== expected) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const ev = body?.event;
  if (!ev?.type) return json({ error: "Missing event" }, 400);

  const userId: string | undefined = [ev.app_user_id, ev.original_app_user_id, ...(ev.aliases ?? [])]
    .find((id: unknown) => typeof id === "string" && UUID.test(id));
  if (!userId) return json({ ok: true, skipped: "no user id" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const productId: string = ev.product_id ?? "";
  const purchasePlan = planFromProduct(productId);
  const periodEnd = ev.expiration_at_ms ? new Date(ev.expiration_at_ms).toISOString() : null;
  const now = new Date().toISOString();

  const activeTypes = ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION", "NON_RENEWING_PURCHASE", "TRANSFER"];
  let update: Record<string, unknown> | null = null;

  if (activeTypes.includes(ev.type)) {
    update = {
      plan: "pro", status: "active", purchase_plan: purchasePlan,
      current_period_end: purchasePlan === "lifetime" ? null : periodEnd,
      google_purchase_token: ev.original_transaction_id ?? ev.transaction_id ?? "revenuecat",
      purchase_date: ev.purchased_at_ms ? new Date(ev.purchased_at_ms).toISOString() : now,
    };
  } else if (ev.type === "CANCELLATION") {
    update = { status: "canceled", current_period_end: periodEnd }; // keeps pro until expiration
  } else if (ev.type === "EXPIRATION") {
    update = { plan: "free", status: "expired", google_purchase_token: null };
  } else if (ev.type === "BILLING_ISSUE") {
    update = { status: "past_due" };
  }

  if (update) {
    const { error } = await supabase.from("subscriptions")
      .upsert({ user_id: userId, ...update, updated_at: now }, { onConflict: "user_id" });
    if (error) { console.error("[RC-WEBHOOK] upsert failed", error.message); return json({ error: "DB error" }, 500); }
  }

  await supabase.from("revenue_events").insert({
    user_id: userId, event_type: ev.type, plan: purchasePlan,
    amount_cents: typeof ev.price === "number" ? Math.round(ev.price * 100) : null,
    currency: (ev.currency ?? "eur").toLowerCase(), status: update?.status as string ?? null,
    raw: { id: ev.id, product_id: productId, store: ev.store },
  });

  return json({ ok: true });
});
