import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const orgId = url.searchParams.get("state"); // we pass org_id as state
    const error = url.searchParams.get("error");

    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    const redirectBase = `${appUrl}/admin?tab=integrations`;

    if (error || !code || !orgId) {
      return Response.redirect(`${redirectBase}&slack_error=${error ?? "missing_params"}`, 302);
    }

    const clientId = Deno.env.get("SLACK_CLIENT_ID");
    const clientSecret = Deno.env.get("SLACK_CLIENT_SECRET");
    if (!clientId || !clientSecret) {
      return Response.redirect(`${redirectBase}&slack_error=not_configured`, 302);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const redirectUri = `${supabaseUrl}/functions/v1/slack-oauth-callback`;

    // Exchange code for token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json() as {
      ok: boolean;
      error?: string;
      access_token: string;
      bot_user_id: string;
      team: { id: string; name: string };
      app_id: string;
    };

    if (!tokenData.ok) {
      return Response.redirect(`${redirectBase}&slack_error=${tokenData.error ?? "token_exchange_failed"}`, 302);
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Upsert integration row
    const { error: upsertErr } = await serviceClient
      .from("integrations")
      .upsert(
        {
          org_id: orgId,
          kind: "slack",
          connected_at: new Date().toISOString(),
          config_json: {
            bot_token: tokenData.access_token,
            bot_user_id: tokenData.bot_user_id,
            team_id: tokenData.team.id,
            team_name: tokenData.team.name,
            app_id: tokenData.app_id,
          },
        },
        { onConflict: "org_id,kind" }
      );

    if (upsertErr) {
      return Response.redirect(`${redirectBase}&slack_error=db_error`, 302);
    }

    return Response.redirect(`${redirectBase}&slack_connected=1`, 302);
  } catch (err: unknown) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const appUrl = Deno.env.get("APP_URL") ?? "http://localhost:5173";
    const message = err instanceof Error ? err.message : "internal_error";
    return Response.redirect(`${appUrl}/admin?tab=integrations&slack_error=${encodeURIComponent(message)}`, 302);
  }
});
