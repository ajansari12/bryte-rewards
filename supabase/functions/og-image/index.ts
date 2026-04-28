import "jsr:@supabase/functions-js/edge-runtime.d.ts";
// @ts-ignore — satori is esm-only; no types needed
import satori from "npm:satori@0.10.14";
import { Resvg } from "npm:@resvg/resvg-js@2.6.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  home:        { title: "Recognition that feels Canadian.",        subtitle: "Say the things that matter, out loud." },
  product:     { title: "Built for the people doing the work.",    subtitle: "Recognition feeds, badges, rewards — all in one platform." },
  pricing:     { title: "Straight-up pricing. In CAD.",            subtitle: "Per person. Per month. Zero cut on rewards." },
  customers:   { title: "Canadian teams who switched.",             subtitle: "Hospitality, trades, healthcare, and beyond." },
  integrations:{ title: "Works where your team already does.",     subtitle: "Slack, Teams, HRIS, SSO — set up in an afternoon." },
  security:    { title: "Your data stays in Canada.",              subtitle: "PIPEDA-compliant, SOC 2 in progress, privacy by design." },
  about:       { title: "Built in Toronto. Designed for all of us.",subtitle: "A small team with a clear mission." },
  compare:     { title: "Bryte vs Bonusly — honestly.",           subtitle: "Canadian pricing, Canadian data, no commissions." },
  blog:        { title: "The Bryte Journal.",                      subtitle: "Essays on recognition and company culture." },
  "blog-post-1":{ title: "Recognition is not a points problem.",   subtitle: "From the Bryte Rewards Journal." },
  "blog-post-2":{ title: "Running a values refresh.",              subtitle: "A practical playbook. From the Bryte Rewards Journal." },
  demo:        { title: "Book a demo.",                            subtitle: "30 minutes. One real conversation. No pitch deck." },
  roi:         { title: "What's recognition worth to you?",        subtitle: "Calculate the ROI for your team." },
  "404":       { title: "Nothing here.",                           subtitle: "But plenty back at bryte.app" },
};

// Fraunces font fetched lazily and cached in module scope
let fontData: ArrayBuffer | null = null;
async function getFont(): Promise<ArrayBuffer> {
  if (fontData) return fontData;
  const res = await fetch(
    "https://fonts.gstatic.com/s/fraunces/v31/6NUt8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAe9lKqZTnDpToK.woff2"
  );
  fontData = await res.arrayBuffer();
  return fontData;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const page = (url.searchParams.get("page") ?? "home").toLowerCase();
    const meta = PAGE_META[page] ?? PAGE_META["home"];

    const font = await getFont();

    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            width: "1200px",
            height: "630px",
            background: "#FAF6EF",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "72px 80px",
            fontFamily: "Fraunces",
            position: "relative",
          },
          children: [
            // Top strip
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                },
                children: [
                  {
                    type: "div",
                    props: {
                      style: {
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #C2882D 0%, #B8452E 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        fontSize: "22px",
                        fontWeight: "700",
                      },
                      children: ["B"],
                    },
                  },
                  {
                    type: "span",
                    props: {
                      style: { fontSize: "20px", fontWeight: "600", color: "#4A3D30", letterSpacing: "-0.01em" },
                      children: ["Bryte Rewards"],
                    },
                  },
                ],
              },
            },
            // Main content
            {
              type: "div",
              props: {
                style: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" },
                children: [
                  {
                    type: "h1",
                    props: {
                      style: {
                        fontSize: "68px",
                        fontWeight: "400",
                        color: "#1C1410",
                        lineHeight: "1.08",
                        letterSpacing: "-0.03em",
                        margin: "0",
                      },
                      children: [meta.title],
                    },
                  },
                  {
                    type: "p",
                    props: {
                      style: {
                        fontSize: "26px",
                        color: "#8C7B6B",
                        margin: "0",
                        lineHeight: "1.4",
                        fontWeight: "300",
                      },
                      children: [meta.subtitle],
                    },
                  },
                ],
              },
            },
            // Bottom bar
            {
              type: "div",
              props: {
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#BEB0A0",
                  fontSize: "15px",
                },
                children: [
                  { type: "span", props: { children: ["bryte.app"] } },
                  { type: "span", props: { style: { color: "#E8DFD0" }, children: ["·"] } },
                  { type: "span", props: { children: ["Built in Canada"] } },
                ],
              },
            },
          ],
        },
      },
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: "Fraunces", data: font, weight: 400, style: "normal" },
          { name: "Fraunces", data: font, weight: 600, style: "normal" },
          { name: "Fraunces", data: font, weight: 700, style: "normal" },
        ],
      }
    );

    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } });
    const png = resvg.render().asPng();

    return new Response(png, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("og-image error:", err);
    return new Response(JSON.stringify({ message: "Failed to generate image" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
