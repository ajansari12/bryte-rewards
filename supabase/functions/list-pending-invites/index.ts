import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PendingInvite {
  id: string;
  email: string;
  invited_at: string | null;
  role: string | null;
}

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

    if (!caller || caller.role !== "admin") {
      return new Response(JSON.stringify({ message: "admin required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect auth users whose metadata points at this org and who have not
    // yet been inserted into public.users (i.e. never completed signup/onboarding).
    const { data: members } = await supabase
      .from("users")
      .select("id")
      .eq("org_id", caller.org_id);
    const memberIds = new Set((members ?? []).map(m => m.id));

    const perPage = 1000;
    const pending: PendingInvite[] = [];
    for (let page = 1; ; page++) {
      const { data, error: listErr } = await supabase.auth.admin.listUsers({ page, perPage });
      if (listErr) throw listErr;
      const batch = data.users ?? [];
      for (const u of batch) {
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
        if (meta.org_id !== caller.org_id) continue;
        if (memberIds.has(u.id)) continue;
        pending.push({
          id: u.id,
          email: u.email ?? "",
          invited_at: u.invited_at ?? u.created_at ?? null,
          role: typeof meta.role === "string" ? meta.role : null,
        });
      }
      if (batch.length < perPage) break;
    }

    pending.sort((a, b) => (b.invited_at ?? "").localeCompare(a.invited_at ?? ""));

    return new Response(JSON.stringify({ invites: pending }), {
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
