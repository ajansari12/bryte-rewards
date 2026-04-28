import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function generateFulfillmentCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[arr[i] % chars.length];
  }
  return code;
}

function buildFulfillmentEmail(params: {
  firstName: string;
  rewardTitle: string;
  rewardBrand: string;
  rewardDenom: string;
  fulfillmentCode: string;
  pointsSpent: number;
}): string {
  const { firstName, rewardTitle, rewardBrand, rewardDenom, fulfillmentCode, pointsSpent } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EDE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:520px;margin:32px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E0D5;">
    <div style="background:#1C1410;padding:28px 32px;">
      <div style="font-family:Georgia,serif;color:#FAF6EF;font-size:26px;font-weight:700;letter-spacing:-0.02em;">
        Bryte<span style="color:#C2882D;">.</span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:rgba(250,246,239,0.5);letter-spacing:0.04em;text-transform:uppercase;">
        Reward Fulfillment
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#C2882D,#E8C56A,transparent);"></div>
    <div style="padding:32px;">
      <p style="font-size:15px;color:#1C1410;line-height:1.6;margin:0 0 24px;">
        Hi ${firstName}, your reward is ready to use!
      </p>
      <div style="background:#F9F6F0;border-radius:10px;padding:24px;margin-bottom:24px;border:1px solid #E8E0D5;">
        <div style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;color:#8C7B74;margin-bottom:8px;">Your reward</div>
        <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:#1C1410;margin-bottom:4px;">${rewardTitle}</div>
        ${rewardBrand ? `<div style="font-size:13px;color:#8C7B74;">${rewardBrand}${rewardDenom ? ` · ${rewardDenom}` : ""}</div>` : ""}
        <div style="font-size:12px;color:#C2882D;margin-top:8px;font-family:monospace;">${pointsSpent.toLocaleString()} pts redeemed</div>
      </div>
      <div style="background:linear-gradient(135deg,#1C1410,#2D1F14);border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(250,246,239,0.5);margin-bottom:12px;">Fulfillment code</div>
        <div style="font-family:monospace;font-size:22px;font-weight:700;color:#E8C56A;letter-spacing:0.12em;">${fulfillmentCode}</div>
        <div style="font-size:11px;color:rgba(250,246,239,0.4);margin-top:10px;">Keep this code safe — it can only be used once.</div>
      </div>
      <p style="font-size:13px;color:#8C7B74;line-height:1.6;margin:0;">
        Questions? Reply to this email or reach out to your Bryte admin.
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #E8E0D5;text-align:center;">
      <p style="font-size:11px;color:#8C7B74;margin:0;">You earned this. Enjoy it. ✦</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller is manager/admin
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } }, auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: { user }, error: authErr } = await anonClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: callerUser } = await supabase
      .from("users")
      .select("id, org_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerUser || !["manager", "admin"].includes(callerUser.role)) {
      return new Response(JSON.stringify({ message: "manager or admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { redemption_id: string };
    const { redemption_id } = body;
    if (!redemption_id) {
      return new Response(JSON.stringify({ message: "redemption_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch redemption with user + reward details
    const { data: redemption, error: redemptionErr } = await supabase
      .from("redemptions")
      .select("*, reward:rewards(title, brand, denom, points), user:users!user_id(id, display_name, org_id)")
      .eq("id", redemption_id)
      .maybeSingle();

    if (redemptionErr) throw redemptionErr;
    if (!redemption) {
      return new Response(JSON.stringify({ message: "redemption not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure the redemption belongs to the caller's org
    const redemptionUser = redemption.user as any;
    if (redemptionUser?.org_id !== callerUser.org_id) {
      return new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fulfillmentCode = generateFulfillmentCode();
    const reward = redemption.reward as any;

    // Get recipient email
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(redemptionUser.id);
    const recipientEmail = authUser?.email;

    // Send fulfillment email if Resend is configured and we have an email
    if (resendKey && recipientEmail) {
      const firstName = (redemptionUser.display_name as string).split(" ")[0];
      const html = buildFulfillmentEmail({
        firstName,
        rewardTitle: reward?.title ?? "Reward",
        rewardBrand: reward?.brand ?? "",
        rewardDenom: reward?.denom ?? "",
        fulfillmentCode,
        pointsSpent: redemption.points_spent,
      });

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Bryte Rewards <rewards@bryte.app>",
          to: recipientEmail,
          subject: `Your reward is ready: ${reward?.title ?? "Reward"}`,
          html,
        }),
      });
    }

    // Mark redemption as fulfilled
    const { error: updateErr } = await supabase
      .from("redemptions")
      .update({
        status: "fulfilled",
        processed_at: new Date().toISOString(),
        processed_by: callerUser.id,
      })
      .eq("id", redemption_id);

    if (updateErr) throw updateErr;

    return new Response(
      JSON.stringify({ ok: true, fulfillment_code: fulfillmentCode, email_sent: !!(resendKey && recipientEmail) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal error";
    return new Response(JSON.stringify({ message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
