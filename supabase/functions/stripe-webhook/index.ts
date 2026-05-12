import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Map Stripe price nickname/metadata to our plan slugs
function planFromStripe(sub: Record<string, unknown>): string {
  const items = (sub as any)?.items?.data ?? [];
  const nickname: string = items[0]?.price?.nickname ?? items[0]?.price?.product?.name ?? "";
  const n = nickname.toLowerCase();
  if (n.includes("enterprise")) return "enterprise";
  if (n.includes("growth") || n.includes("pro")) return "growth";
  return "free";
}

// Per-plan quarterly points pool. Keep in sync with the admin billing UI
// so plan upgrades/downgrades resize the org pool.
const PLAN_QUARTERLY_POOL: Record<string, number> = {
  free: 0,
  growth: 24000,
  enterprise: 60000,
};

async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;

  const payload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const computed = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Timing-safe compare
  if (computed.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response(JSON.stringify({ message: "STRIPE_WEBHOOK_SECRET not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const sigHeader = req.headers.get("stripe-signature") ?? "";

    if (!(await verifyStripeSignature(rawBody, sigHeader, webhookSecret))) {
      return new Response(JSON.stringify({ message: "invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = JSON.parse(rawBody) as { type: string; data: { object: Record<string, unknown> } };

    const HANDLED = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.paid",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ];
    if (!HANDLED.includes(event.type)) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Invoice events: refill the org points pool on successful payment, or
    // flag billing_status=past_due on failure. These events carry the
    // customer id but not a full subscription object.
    if (event.type.startsWith("invoice.")) {
      const inv = event.data.object as Record<string, unknown>;
      const customerId = inv["customer"] as string;
      if (!customerId) {
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: orgRow } = await supabase
        .from("organizations")
        .select("id, plan, quarterly_pool")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (!orgRow) {
        return new Response(JSON.stringify({ received: true, note: "org not linked" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (event.type === "invoice.payment_failed") {
        await supabase
          .from("organizations")
          .update({ billing_status: "past_due" })
          .eq("id", orgRow.id);
      } else {
        // invoice.paid / invoice.payment_succeeded — refill pool to plan size.
        const planPool = PLAN_QUARTERLY_POOL[orgRow.plan as string] ?? orgRow.quarterly_pool ?? 0;
        await supabase
          .from("organizations")
          .update({
            billing_status: "active",
            quarterly_pool: planPool,
            points_pool_remaining: planPool,
          })
          .eq("id", orgRow.id);
      }

      await supabase.from("billing_events").insert({
        org_id: orgRow.id,
        stripe_customer_id: customerId,
        event_type: event.type,
        plan: orgRow.plan,
        payload_json: inv,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = event.data.object as Record<string, unknown>;
    const customerId = sub["customer"] as string;
    const subscriptionId = sub["id"] as string;
    const status = sub["status"] as string;
    const currentPeriodEnd = (sub["current_period_end"] as number | undefined);
    const defaultPaymentMethod = (sub as any)?.default_payment_method;

    const plan = status === "canceled" || status === "cancelled"
      ? "free"
      : planFromStripe(sub);
    const planPool = PLAN_QUARTERLY_POOL[plan] ?? 0;
    const billingStatus = status === "past_due" ? "past_due"
      : status === "canceled" || status === "cancelled" ? "canceled"
      : "active";

    const renewalDate = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : null;

    // Fetch payment method last4 if available
    let last4: string | null = null;
    if (typeof defaultPaymentMethod === "object" && defaultPaymentMethod !== null) {
      last4 = (defaultPaymentMethod as any)?.card?.last4 ?? null;
    }

    // Find org by stripe_customer_id
    const { data: org, error: orgErr } = await supabase
      .from("organizations")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (orgErr) throw orgErr;
    if (!org) {
      // No org found yet — this can happen on first subscription.created before org is linked.
      // We store a billing_event without org_id only if we find it via metadata.
      const metadata = (sub as any)?.metadata ?? {};
      const orgIdFromMeta = metadata["org_id"] as string | undefined;
      if (!orgIdFromMeta) {
        return new Response(JSON.stringify({ message: "org not found for customer", customerId }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Link the customer to the org
      await supabase
        .from("organizations")
        .update({
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          billing_status: billingStatus,
          quarterly_pool: planPool,
          ...(renewalDate ? { renewal_date: renewalDate } : {}),
          ...(last4 ? { payment_method_last4: last4 } : {}),
        })
        .eq("id", orgIdFromMeta);

      await supabase.from("billing_events").insert({
        org_id: orgIdFromMeta,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        event_type: event.type,
        plan,
        payload_json: sub,
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update org plan + subscription info. On a plan change, resize the
    // quarterly_pool but don't clobber points_pool_remaining mid-quarter;
    // the invoice.paid handler refills on payment.
    const updatePayload: Record<string, unknown> = {
      stripe_subscription_id: subscriptionId,
      plan,
      billing_status: billingStatus,
      quarterly_pool: planPool,
    };
    if (renewalDate) updatePayload["renewal_date"] = renewalDate;
    if (last4) updatePayload["payment_method_last4"] = last4;

    const { error: updateErr } = await supabase
      .from("organizations")
      .update(updatePayload)
      .eq("id", org.id);
    if (updateErr) throw updateErr;

    // Insert billing event
    const { error: evtErr } = await supabase.from("billing_events").insert({
      org_id: org.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      event_type: event.type,
      plan,
      payload_json: sub,
    });
    if (evtErr) throw evtErr;

    return new Response(JSON.stringify({ ok: true, plan }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal error";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
