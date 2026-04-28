import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Verify Slack request signature
async function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  sig: string,
  signingSecret: string
): Promise<boolean> {
  const baseString = `v0:${timestamp}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  const computed =
    "v0=" +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  if (computed.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}

// Parse: /recognize @DisplayName for #ValueName: message text
// Also accepts: /recognize @DisplayName: message text (no value)
function parseCommand(text: string): { recipientName: string; valueName: string | null; message: string } | null {
  const cleaned = text.trim();
  // Strip leading @
  const withoutAt = cleaned.startsWith("@") ? cleaned.slice(1) : cleaned;

  // Try pattern: Name for #Value: message
  const fullMatch = withoutAt.match(/^(.+?)\s+for\s+#(\S+):?\s+(.+)$/i);
  if (fullMatch) {
    return {
      recipientName: fullMatch[1].trim(),
      valueName: fullMatch[2].trim(),
      message: fullMatch[3].trim(),
    };
  }

  // Try pattern: Name: message (no value)
  const shortMatch = withoutAt.match(/^(.+?):\s+(.+)$/);
  if (shortMatch) {
    return {
      recipientName: shortMatch[1].trim(),
      valueName: null,
      message: shortMatch[2].trim(),
    };
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const signingSecret = Deno.env.get("SLACK_SIGNING_SECRET");
    const rawBody = await req.text();

    // Verify Slack signature if secret is configured
    if (signingSecret) {
      const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
      const sig = req.headers.get("x-slack-signature") ?? "";

      // Reject stale requests (>5 min)
      const now = Math.floor(Date.now() / 1000);
      if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
        return new Response(JSON.stringify({ response_type: "ephemeral", text: "Request expired." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!(await verifySlackSignature(rawBody, timestamp, sig, signingSecret))) {
        return new Response(JSON.stringify({ response_type: "ephemeral", text: "Invalid signature." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Parse URL-encoded Slack payload
    const params = new URLSearchParams(rawBody);
    const text = params.get("text") ?? "";
    const slackUserId = params.get("user_id") ?? "";
    const teamId = params.get("team_id") ?? "";

    const parsed = parseCommand(text);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: "Usage: `/recognize @Name for #value: Your message` or `/recognize @Name: Your message`",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find org by Slack team_id stored in integrations.config_json
    const { data: integration } = await supabase
      .from("integrations")
      .select("org_id, config_json")
      .eq("kind", "slack")
      .maybeSingle();

    // Find the org whose slack integration matches this team_id
    const { data: integrations } = await supabase
      .from("integrations")
      .select("org_id, config_json")
      .eq("kind", "slack");

    const matchedIntegration = (integrations ?? []).find(
      (i: any) => i.config_json?.team_id === teamId
    );

    if (!matchedIntegration) {
      return new Response(
        JSON.stringify({ response_type: "ephemeral", text: "This Slack workspace is not connected to Bryte." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orgId: string = matchedIntegration.org_id;

    // Find sender by slack_user_id in users or by display_name match
    const { data: orgUsers } = await supabase
      .from("users")
      .select("id, display_name, role")
      .eq("org_id", orgId);

    const allUsers = orgUsers ?? [];

    // Try to find sender by slack_user_id (stored in a future field), fall back to first admin
    // For now: we look for user whose display_name matches the Slack user's real name
    // The integration can store a slack_user_id → bryte_user_id map in config_json
    const userMap: Record<string, string> = (matchedIntegration.config_json?.user_map ?? {}) as Record<string, string>;
    let senderId: string | null = userMap[slackUserId] ?? null;

    if (!senderId) {
      // Fall back to finding an admin for the org
      const admin = allUsers.find((u: any) => u.role === "admin");
      senderId = admin?.id ?? allUsers[0]?.id ?? null;
    }

    if (!senderId) {
      return new Response(
        JSON.stringify({ response_type: "ephemeral", text: "Could not identify sender in Bryte." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find recipient by display_name (case-insensitive)
    const recipientNameLower = parsed.recipientName.toLowerCase();
    const recipient = allUsers.find(
      (u: any) => u.display_name.toLowerCase() === recipientNameLower ||
        u.display_name.toLowerCase().startsWith(recipientNameLower)
    );

    if (!recipient) {
      return new Response(
        JSON.stringify({
          response_type: "ephemeral",
          text: `Could not find teammate "${parsed.recipientName}" in Bryte. Check their display name.`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find value by name if provided
    let valueId: string | null = null;
    let valuePoints = 30;
    if (parsed.valueName) {
      const { data: values } = await supabase
        .from("values")
        .select("id, name, points")
        .eq("org_id", orgId);
      const match = (values ?? []).find(
        (v: any) => v.name.toLowerCase() === parsed.valueName!.toLowerCase()
      );
      if (match) {
        valueId = match.id;
        valuePoints = match.points;
      }
    }

    // Insert recognition
    const { error: recErr } = await supabase.from("recognitions").insert({
      org_id: orgId,
      sender_id: senderId,
      recipient_id: recipient.id,
      value_id: valueId,
      message: parsed.message,
      points: valuePoints,
      type: "public",
    });

    if (recErr) throw recErr;

    const valueText = parsed.valueName ? ` for *${parsed.valueName}*` : "";
    return new Response(
      JSON.stringify({
        response_type: "in_channel",
        text: `Recognition sent! ✦ <@${slackUserId}> recognised *${recipient.display_name}*${valueText}: "${parsed.message}" (+${valuePoints} pts)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "internal error";
    return new Response(
      JSON.stringify({ response_type: "ephemeral", text: `Error: ${message}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
