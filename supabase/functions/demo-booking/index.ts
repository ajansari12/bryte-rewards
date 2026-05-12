import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const rateLimited = checkRateLimit(req);
  if (rateLimited) return rateLimited;

  try {
    if (req.method !== "POST") return json({ message: "Method not allowed" }, 405);

    const body = await req.json();
    const { first_name, last_name, work_email, company, team_size, preferred_date, preferred_time, message } = body;

    if (!work_email || !first_name || !last_name) {
      return json({ message: "first_name, last_name and work_email are required" }, 400);
    }

    // Basic email shape check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(work_email)) {
      return json({ message: "Invalid email address" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: dbError } = await supabase.from("demo_requests").insert({
      first_name,
      last_name,
      work_email,
      company: company ?? "",
      team_size: team_size ?? "",
      preferred_date: preferred_date ?? null,
      preferred_time: preferred_time ?? null,
      message: message ?? null,
    });

    if (dbError) {
      console.error("demo_requests insert error:", dbError);
      return json({ message: "Failed to save request" }, 500);
    }

    // Send notification email via Resend (non-blocking — failure doesn't affect 200 response)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      EdgeRuntime.waitUntil(
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Bryte Rewards <noreply@bryte.app>",
            to: ["demos@bryte.app"],
            subject: `New demo request — ${first_name} ${last_name} (${company})`,
            html: `
              <p><strong>Name:</strong> ${first_name} ${last_name}</p>
              <p><strong>Email:</strong> ${work_email}</p>
              <p><strong>Company:</strong> ${company}</p>
              <p><strong>Team size:</strong> ${team_size}</p>
              <p><strong>Preferred date:</strong> ${preferred_date ?? "Not specified"}</p>
              <p><strong>Preferred time:</strong> ${preferred_time ?? "Not specified"}</p>
              <p><strong>Message:</strong> ${message ?? "—"}</p>
            `,
          }),
        }).catch((err) => console.error("Resend notification failed:", err))
      );
    }

    return json({ success: true });
  } catch (err) {
    console.error("demo-booking error:", err);
    return json({ message: "Internal server error" }, 500);
  }
});
