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
    const body = await req.json();
    const { messages, locale, planMode } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lang = locale === "pt" ? "português" : "English";

    let systemPrompt: string;

    if (planMode) {
      // Global plan mode — all ingredients summary
      const { ingredientsSummary } = body;

      systemPrompt = `You are a friendly nutritionist assistant helping with ingredient changes across an entire weekly meal plan.
Language: ${lang}.

All ingredients in the plan (with occurrence count): ${ingredientsSummary}

Help the user with:
- Replacing a specific ingredient across ALL recipes (e.g. swap oat flakes for oat flour everywhere)
- Healthier alternatives for commonly used ingredients
- Allergy-based global substitutions
- Nutritional impact of the change

IMPORTANT: When suggesting a substitution, ALWAYS include a JSON block at the END of your response with the proposed changes in this exact format:
\`\`\`substitutions
[{"original": "ingredient name", "replacement": "new ingredient name", "quantity": "new quantity or empty string to keep original", "unit": "new unit or empty string to keep original"}]
\`\`\`

For example, if replacing "Aveia em flocos" with "Farinha de aveia":
\`\`\`substitutions
[{"original": "Aveia em flocos", "replacement": "Farinha de aveia", "quantity": "", "unit": ""}]
\`\`\`

If the quantity/unit should stay the same, use empty strings.
If the user is just asking a general question without requesting a specific substitution, do NOT include the substitutions block.

Keep answers concise, practical and friendly. Always mention the approximate nutritional impact when suggesting substitutions.`;
    } else {
      // Single recipe mode
      const { recipe } = body;
      if (!recipe || !recipe.ingredients) {
        return new Response(
          JSON.stringify({ error: "Recipe data is required for single-recipe mode" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const ingredientsList = recipe.ingredients
        .map((i: any) => `${i.quantity} ${i.unit} ${i.name}`)
        .join(", ");

      systemPrompt = `You are a friendly nutritionist assistant helping with recipe ingredient questions.
Language: ${lang}.

Current recipe: "${recipe.name}"
Ingredients: ${ingredientsList}
Macros: ${recipe.macros.calories}kcal, ${recipe.macros.protein}g protein, ${recipe.macros.carbs}g carbs, ${recipe.macros.fat}g fat

Help the user with:
- Ingredient substitutions (allergies, preferences, availability)
- Healthier alternatives
- Portion adjustments
- Nutritional impact of changes

IMPORTANT: When suggesting substitutions, ALWAYS include a JSON block at the END of your response with the proposed changes in this exact format:
\`\`\`substitutions
[{"original": "ingredient name", "replacement": "new ingredient name", "quantity": "new quantity", "unit": "new unit"}]
\`\`\`

For example, if replacing milk with oat milk:
\`\`\`substitutions
[{"original": "Leite", "replacement": "Bebida de aveia", "quantity": "200", "unit": "ml"}]
\`\`\`

If the user is just asking a general question without requesting a specific substitution, do NOT include the substitutions block.

Keep answers concise, practical and friendly. Always mention the approximate nutritional impact when suggesting substitutions.`;
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: aiMessages,
        }),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
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
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse substitutions block if present
    let substitutions = null;
    const subMatch = content.match(/```substitutions\s*\n([\s\S]*?)\n```/);
    if (subMatch) {
      try {
        substitutions = JSON.parse(subMatch[1]);
      } catch (_) {
        // ignore parse errors
      }
    }

    // Clean content: remove the substitutions code block from the visible text
    const cleanContent = content.replace(/```substitutions\s*\n[\s\S]*?\n```/, "").trim();

    return new Response(JSON.stringify({ reply: cleanContent, substitutions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("recipe-chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get response" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
