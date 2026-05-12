import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Deprecated. Recognition-received notifications are now produced by the
// `notify_on_recognition_insert` SQL trigger (migration 016). This endpoint
// is a no-op so a lingering Database Webhook does not create duplicate rows.
Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      deprecated: true,
      message:
        "Handled by notify_on_recognition_insert trigger in the database. This endpoint is a no-op.",
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
