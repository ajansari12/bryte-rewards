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
    // Verify shared webhook secret
    const secret = Deno.env.get("DIGEST_WEBHOOK_SECRET");
    if (secret) {
      const auth = req.headers.get("Authorization") ?? "";
      const token = auth.replace("Bearer ", "");
      if (token !== secret) {
        return new Response(JSON.stringify({ message: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ message: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    // Fetch all digest recipients with their email from auth.users
    const { data: digestUsers, error: usersErr } = await supabase
      .from("users")
      .select("id, org_id, display_name, notification_prefs")
      .filter("notification_prefs->>email_digest", "eq", "true");
    if (usersErr) throw usersErr;

    if (!digestUsers || digestUsers.length === 0) {
      return new Response(JSON.stringify({ orgs_processed: 0, emails_sent: 0, errors: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get auth emails via admin API
    const { data: { users: authUsers }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) throw authErr;
    const emailMap: Record<string, string> = {};
    for (const u of authUsers ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }

    // Group digest users by org
    const byOrg: Record<string, typeof digestUsers> = {};
    for (const u of digestUsers) {
      if (!byOrg[u.org_id]) byOrg[u.org_id] = [];
      byOrg[u.org_id].push(u);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    for (const [orgId, members] of Object.entries(byOrg)) {
      // Fetch org name
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle();
      const orgName: string = org?.name ?? "Your Organisation";

      // Fetch top recognitions for this org in the last 7 days
      const { data: recs } = await supabase
        .from("recognitions")
        .select(`
          id, message, points, created_at,
          sender:users!sender_id(display_name),
          recipient:users!recipient_id(display_name),
          value:values(name)
        `)
        .eq("org_id", orgId)
        .gte("created_at", since)
        .order("points", { ascending: false })
        .limit(5);

      // Fetch new badges awarded this week
      const { data: newBadges } = await supabase
        .from("user_badges")
        .select("awarded_at, user:users!user_id(display_name), badge:badges!badge_id(name, icon)")
        .eq("users.org_id", orgId)
        .gte("awarded_at", since)
        .limit(5);

      // Build leaderboard: aggregate points by recipient
      const { data: allRecs } = await supabase
        .from("recognitions")
        .select("recipient_id, points, recipient:users!recipient_id(display_name, org_id)")
        .eq("org_id", orgId)
        .gte("created_at", since);

      const totals: Record<string, { name: string; points: number }> = {};
      for (const r of allRecs ?? []) {
        const rec = r as any;
        const rid = rec.recipient_id;
        const name = rec.recipient?.display_name ?? "Unknown";
        if (!totals[rid]) totals[rid] = { name, points: 0 };
        totals[rid].points += rec.points ?? 0;
      }
      const leaderboard = Object.values(totals)
        .sort((a, b) => b.points - a.points)
        .slice(0, 5);

      const totalRecs = allRecs?.length ?? 0;
      const weekLabel = new Date().toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

      // Send one email per member
      for (const member of members) {
        const email = emailMap[member.id];
        if (!email) continue;
        const firstName = member.display_name.split(" ")[0];
        const html = buildDigestHtml({
          firstName,
          orgName,
          weekLabel,
          totalRecs,
          recs: (recs ?? []) as any[],
          leaderboard,
          newBadges: (newBadges ?? []) as any[],
        });

        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Bryte <digest@bryte.app>",
              to: email,
              subject: `Your weekly recognition digest — ${orgName}`,
              html,
            }),
          });
          if (!res.ok) {
            const errText = await res.text();
            errors.push(`${email}: ${errText}`);
          } else {
            emailsSent++;
          }
        } catch (e) {
          errors.push(`${email}: ${e instanceof Error ? e.message : "send failed"}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ orgs_processed: Object.keys(byOrg).length, emails_sent: emailsSent, errors }),
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

interface DigestParams {
  firstName: string;
  orgName: string;
  weekLabel: string;
  totalRecs: number;
  recs: Array<{ message: string; points: number; created_at: string; sender: any; recipient: any; value: any }>;
  leaderboard: Array<{ name: string; points: number }>;
  newBadges: Array<{ awarded_at: string; user: any; badge: any }>;
}

function buildDigestHtml(p: DigestParams): string {
  const recItems = p.recs.map(r => {
    const sender = r.sender?.display_name ?? "Someone";
    const recipient = r.recipient?.display_name ?? "a teammate";
    const value = r.value?.name ? `<span style="display:inline-block;background:#F5EDD6;color:#8B6914;border-radius:4px;padding:2px 8px;font-size:11px;margin-bottom:6px;">${r.value.name}</span><br>` : "";
    const snippet = (r.message ?? "").slice(0, 120) + ((r.message?.length ?? 0) > 120 ? "…" : "");
    return `
      <div style="padding:14px 16px;margin-bottom:10px;background:#F9F6F0;border-radius:8px;border-left:3px solid #C2882D;">
        ${value}
        <div style="font-size:13px;line-height:1.5;font-style:italic;color:#4A3728;">"${snippet}"</div>
        <div style="font-size:11px;color:#8C7B74;margin-top:6px;">${sender} → ${recipient} · +${r.points} pts</div>
      </div>`;
  }).join("");

  const leaderRows = p.leaderboard.map((e, i) => `
    <tr>
      <td style="padding:8px 12px;font-family:monospace;color:#8B6914;font-weight:700;">#${i + 1}</td>
      <td style="padding:8px 12px;color:#1C1410;font-weight:${i === 0 ? "700" : "500"};">${e.name}</td>
      <td style="padding:8px 12px;font-family:monospace;color:#C2882D;font-weight:700;text-align:right;">${e.points.toLocaleString()} pts</td>
    </tr>`).join("");

  const badgeItems = p.newBadges.length > 0
    ? p.newBadges.map(b => {
        const who = b.user?.display_name ?? "A teammate";
        const icon = b.badge?.icon ?? "🏅";
        const name = b.badge?.name ?? "Badge";
        return `<div style="display:inline-block;margin:4px 6px;padding:8px 14px;background:#F0F7F0;border:1px solid #A8C5A0;border-radius:20px;font-size:12px;color:#2D5A27;">${icon} <strong>${who}</strong> earned ${name}</div>`;
      }).join("")
    : "<div style='color:#8C7B74;font-size:13px;font-style:italic;'>No new badges this week.</div>";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EDE6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:32px auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E8E0D5;">

    <!-- Header -->
    <div style="background:#1C1410;padding:28px 32px;">
      <div style="font-family:Georgia,serif;color:#FAF6EF;font-size:26px;font-weight:700;letter-spacing:-0.02em;">
        Bryte<span style="color:#C2882D;">.</span>
        <span style="font-style:italic;font-weight:300;font-size:18px;color:rgba(250,246,239,0.6);margin-left:4px;">Weekly Digest</span>
      </div>
      <div style="margin-top:6px;font-size:11px;color:rgba(250,246,239,0.5);letter-spacing:0.04em;text-transform:uppercase;">
        ${p.orgName} · Week of ${p.weekLabel}
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#C2882D,#E8C56A,transparent);"></div>

    <!-- Body -->
    <div style="padding:28px 32px;">
      <p style="font-size:15px;color:#1C1410;line-height:1.6;margin:0 0 24px;">
        Hi ${p.firstName} — here's what happened on your team wall this week. ✦
      </p>

      <!-- Stats -->
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:28px;">
        <div style="text-align:center;padding:16px;background:#F9F6F0;border-radius:8px;">
          <div style="font-family:monospace;font-size:26px;font-weight:700;color:#C2882D;">${p.totalRecs}</div>
          <div style="font-size:11px;color:#8C7B74;margin-top:4px;text-transform:uppercase;letter-spacing:0.04em;">recognitions</div>
        </div>
        <div style="text-align:center;padding:16px;background:#F9F6F0;border-radius:8px;">
          <div style="font-family:monospace;font-size:26px;font-weight:700;color:#2D5A27;">${p.leaderboard.length}</div>
          <div style="font-size:11px;color:#8C7B74;margin-top:4px;text-transform:uppercase;letter-spacing:0.04em;">on leaderboard</div>
        </div>
      </div>

      <!-- Highlights -->
      ${p.recs.length > 0 ? `
      <div style="margin-bottom:28px;">
        <div style="font-size:10px;letter-spacing:0.08em;color:#8C7B74;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #E8E0D5;">
          This week's highlights
        </div>
        ${recItems}
      </div>` : ""}

      <!-- Leaderboard -->
      ${p.leaderboard.length > 0 ? `
      <div style="margin-bottom:28px;">
        <div style="font-size:10px;letter-spacing:0.08em;color:#8C7B74;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #E8E0D5;">
          Weekly leaderboard
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${leaderRows}
        </table>
      </div>` : ""}

      <!-- Badges -->
      <div style="margin-bottom:28px;">
        <div style="font-size:10px;letter-spacing:0.08em;color:#8C7B74;text-transform:uppercase;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #E8E0D5;">
          New badges earned
        </div>
        ${badgeItems}
      </div>

      <!-- CTA -->
      <div style="text-align:center;padding-top:24px;border-top:1px solid #E8E0D5;">
        <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "bryte.app") ?? "#"}"
           style="display:inline-block;padding:12px 28px;background:#C2882D;color:#1C1410;border-radius:20px;font-weight:700;font-size:14px;text-decoration:none;">
          View full wall →
        </a>
        <p style="font-size:11px;color:#8C7B74;margin-top:16px;line-height:1.6;">
          You're receiving this because weekly digest is enabled in your Bryte profile.<br>
          <a href="#" style="color:#8C7B74;">Unsubscribe</a> · <a href="#" style="color:#8C7B74;">Email preferences</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
