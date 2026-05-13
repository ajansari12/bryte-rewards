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

    // Dedup: check if this email is already a member of the org
    const normalizedEmail = String(email).trim().toLowerCase();
    const perPage = 1000;
    let existingUserId: string | null = null;
    for (let page = 1; ; page++) {
      const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
      if (listErr) throw listErr;
      const batch = data.users ?? [];
      const hit = batch.find(u => (u.email ?? "").toLowerCase() === normalizedEmail);
      if (hit) { existingUserId = hit.id; break; }
      if (batch.length < perPage) break;
    }

    if (existingUserId) {
      const { data: existingMember } = await supabase
        .from("users")
        .select("id, org_id")
        .eq("id", existingUserId)
        .maybeSingle();
      if (existingMember && existingMember.org_id === org_id) {
        return new Response(
          JSON.stringify({ id: existingUserId, already_member: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Email is registered to a different organization. Auth.users has a global
      // unique-email constraint, so we can't re-invite. Surface a clear, actionable error.
      if (existingMember && existingMember.org_id !== org_id) {
        return new Response(
          JSON.stringify({
            code: "email_in_use_other_org",
            message: "That email is already registered to another organization. Please use a different work email for this teammate.",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Auth user exists but no public.users row — likely a stale invite. Add them to this org.
      const { error: insertErr } = await supabase
        .from("users")
        .insert({ id: existingUserId, org_id, role, email: normalizedEmail });
      if (insertErr) throw insertErr;
      return new Response(
        JSON.stringify({ id: existingUserId, attached_existing: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invite via Supabase Auth Admin (org_id + role travel via user_metadata
    // and are picked up by the on_auth_user_created trigger to create public.users).
    const { data: invite, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: { org_id, role },
    });
    if (inviteErr) {
      const msg = (inviteErr.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered")) {
        return new Response(
          JSON.stringify({
            code: "email_in_use_other_org",
            message: "That email is already registered. Please use a different work email for this teammate.",
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw inviteErr;
    }

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
