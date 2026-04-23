import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipeName, mealType, ingredients, locale } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: "ingredients required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lang = locale === "pt" ? "português de Portugal" : "English";
    const ingredientsList = ingredients
      .map((i: any, idx: number) => `${idx + 1}. ${i.quantity} ${i.unit} ${i.name}`)
      .join("\n");

    const systemPrompt = `You are a precise nutritionist and cooking assistant.
You MUST write FRESH preparation steps based ONLY on the exact ingredient list provided in this message.
Do NOT reuse generic templates. Do NOT mention ingredients that are not in the list.
Every ingredient in the list MUST be referenced (by name) in at least one step.
Reply ONLY with valid JSON, no markdown fences, no commentary, no prose outside JSON.
Language for the instruction text: ${lang}.`;

    const userPrompt = `Recipe name: "${recipeName}" (meal type: ${mealType}).

EXACT and COMPLETE ingredient list (this is the ONLY ground truth — ignore any prior knowledge of this recipe):
${ingredientsList}

Tasks:
1) Write 3 to 6 short, clear preparation steps that USE ALL the ingredients above coherently and IN ORDER of typical cooking flow. Each step under 140 chars.
   - Mention ingredient names explicitly (e.g. "junta a banana", "adiciona o cluster dextrin").
   - Every ingredient in the list must appear by name in at least one step.
   - Do NOT invent ingredients that are not in the list above.
2) Recalculate the TOTAL macros for the WHOLE recipe (sum of all listed ingredients combined). Be accurate per gram:
   - 30g cluster dextrin ≈ 113 kcal / 28g carbs / 0g protein / 0g fat
   - 1 banana ~120g ≈ 105 kcal / 27g carbs / 1g protein / 0g fat
   - 50g oats ≈ 190 kcal / 33g carbs / 7g protein / 3g fat
   - 1 scoop whey ~30g ≈ 120 kcal / 3g carbs / 24g protein / 2g fat
   - 200ml semi-skimmed milk ≈ 96 kcal / 10g carbs / 7g protein / 3g fat

Return JSON exactly in this shape (no extra fields, no markdown):
{
  "instructions": ["step 1", "step 2", "step 3"],
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }
}

All macro numbers must be integers (rounded). Do not omit any macro field.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiResult = await response.json();
    let content = aiResult.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);
    const instructions = Array.isArray(parsed.instructions) ? parsed.instructions : [];
    const m = parsed.macros && typeof parsed.macros === "object" ? parsed.macros : null;
    const macros = m
      ? {
          calories: Math.round(Number(m.calories) || 0),
          protein: Math.round(Number(m.protein) || 0),
          carbs: Math.round(Number(m.carbs) || 0),
          fat: Math.round(Number(m.fat) || 0),
          fiber: Math.round(Number(m.fiber) || 0),
        }
      : null;

    return new Response(JSON.stringify({ instructions, macros }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("regenerate-instructions error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
