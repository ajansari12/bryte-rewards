import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, org_id, role = "employee" } = await req.json();
    if (!email || !org_id) {
      return new Response(JSON.stringify({ message: "email and org_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the calling user belongs to the org and has manager/admin role
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: caller } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!caller || caller.org_id !== org_id || !["manager", "admin"].includes(caller.role)) {
      return new Response(JSON.stringify({ message: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invite via Supabase Auth Admin
    const { data: invite, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { org_id, role },
    });
    if (inviteErr) throw inviteErr;

    return new Response(JSON.stringify({ id: invite.user.id }), {
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
