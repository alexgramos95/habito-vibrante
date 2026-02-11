import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { summary, streak, todayProgress } = await req.json();

    const systemPrompt = `You are a behavioral psychology coach for a habit tracking app called becoMe. 
Your role is to give ONE specific, actionable insight (max 2 sentences) in Portuguese (PT-PT).
Be warm, specific, and reference the user's actual habit data.
Focus on: habit stacking, identity-based change, reducing friction, celebrating small wins.
Never be generic. Never use clichés. Be the kind of therapist who truly sees the person.
Output ONLY the tip text, nothing else.`;

    const userMsg = `Dados do utilizador:
${summary}
Streak atual: ${streak} dias
Progresso hoje: ${todayProgress}%

Dá um insight personalizado baseado nestes dados.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("[Coach] AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const tip = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(
      JSON.stringify({ tip }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[Coach] Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
