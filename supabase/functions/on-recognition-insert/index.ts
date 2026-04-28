import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json();
    // Supabase Database Webhook sends { type, table, schema, record, old_record }
    const record = body.record ?? body;

    const {
      id: recognition_id,
      org_id,
      sender_id,
      recipient_id,
      value_id,
      message,
      points,
    } = record;

    if (!recognition_id || !recipient_id) {
      return new Response(JSON.stringify({ message: "missing recognition fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch sender display_name and recipient's manager_id + notification_prefs
    const [senderRes, recipientRes] = await Promise.all([
      supabase
        .from("users")
        .select("display_name")
        .eq("id", sender_id)
        .maybeSingle(),
      supabase
        .from("users")
        .select("manager_id, notification_prefs, display_name")
        .eq("id", recipient_id)
        .maybeSingle(),
    ]);

    const senderName: string = senderRes.data?.display_name ?? "A teammate";
    const recipientName: string = recipientRes.data?.display_name ?? "your teammate";
    const managerId: string | null = recipientRes.data?.manager_id ?? null;
    const recipientPrefs = recipientRes.data?.notification_prefs ?? { in_app: true };

    // Fetch value name if present
    let valueName: string | null = null;
    if (value_id) {
      const { data: valData } = await supabase
        .from("values")
        .select("name")
        .eq("id", value_id)
        .maybeSingle();
      valueName = valData?.name ?? null;
    }

    const messageSnippet = typeof message === "string"
      ? message.slice(0, 100) + (message.length > 100 ? "…" : "")
      : "";

    const payload = {
      recognition_id,
      org_id,
      sender_name: senderName,
      recipient_name: recipientName,
      value_name: valueName,
      message_snippet: messageSnippet,
      points,
    };

    const inserts: Array<{ user_id: string; kind: string; payload_json: typeof payload }> = [];

    // Notify recipient
    if (recipientPrefs.in_app !== false) {
      inserts.push({ user_id: recipient_id, kind: "recognition", payload_json: payload });
    }

    // Notify manager if they exist and have in_app enabled
    if (managerId && managerId !== sender_id) {
      const { data: managerData } = await supabase
        .from("users")
        .select("notification_prefs")
        .eq("id", managerId)
        .maybeSingle();
      const managerPrefs = managerData?.notification_prefs ?? { in_app: true };
      if (managerPrefs.in_app !== false) {
        inserts.push({
          user_id: managerId,
          kind: "team_recognition",
          payload_json: payload,
        });
      }
    }

    if (inserts.length > 0) {
      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(inserts);
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ inserted: inserts.length }), {
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
