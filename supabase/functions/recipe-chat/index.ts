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

    const NAMING_RULES = `
INGREDIENT NAMING RULES (CRITICAL — apply to every "name" / "replacement" you output):
- Use GENERIC, simple names. Never specify variety, brand, or sub-type.
- "massa" (NOT "massa esparguete", "esparguete", "penne", "fusilli", "macarrão", "spaghetti")
- "arroz" (NOT "arroz basmati", "arroz integral", "arroz agulha", "jasmine")
- "leite" (NOT "leite meio-gordo", "leite de amêndoa", "leite de aveia", "almond milk")
- "mel" (NOT "mel de eucalipto", "mel de rosmaninho", "raw honey")
- "iogurte" (NOT "iogurte grego", "iogurte natural 0%", "skyr") — exceto se o utilizador pedir explicitamente
- "pão" (NOT "pão integral", "pão de centeio", "pão de forma")
- "queijo" (NOT "queijo flamengo", "queijo cottage", "queijo da serra")
- "azeite" (NOT "azeite extra virgem", "azeite virgem")
- If the USER explicitly mentions a specific variety in their request, you may keep that exact word — but never invent sub-types on your own.
- Goal: keep ingredient names short and recognizable, like a basic shopping list.
`;

    let systemPrompt: string;

    if (planMode) {
      // Global plan mode — supports both substitutions and additions, optionally filtered by meal type
      const { ingredientsSummary, mealTypes } = body;
      const mealTypesList = Array.isArray(mealTypes) && mealTypes.length > 0
        ? mealTypes.join(", ")
        : "breakfast, morning_snack, lunch, afternoon_snack, dinner";

      systemPrompt = `You are a friendly nutritionist assistant helping users modify ingredients across an entire weekly meal plan.
Language: ${lang}.

Available meal types in the plan: breakfast, morning_snack, lunch, afternoon_snack, dinner.
All ingredients currently in the plan (with occurrence count): ${ingredientsSummary}

You can help the user with TWO types of operations:

1) SUBSTITUTIONS — replace an existing ingredient with another one across recipes.
2) ADDITIONS — add a NEW ingredient to recipes (e.g. "add banana to all breakfasts").

Both operations can optionally target ONLY specific meal types (e.g. only breakfasts, only lunches).
Valid meal type values: "breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner".
If the user does not specify a meal type, apply to all meals.

IMPORTANT: When proposing changes, ALWAYS include a JSON block at the END of your response in this EXACT format:
\`\`\`changes
{
  "substitutions": [
    {"original": "ingredient name", "replacement": "new name", "quantity": "new qty or empty", "unit": "new unit or empty", "mealTypes": ["breakfast"]}
  ],
  "additions": [
    {"name": "ingredient name", "quantity": "amount", "unit": "unit (g, ml, un...)", "mealTypes": ["breakfast"]}
  ]
}
\`\`\`

Rules:
- "mealTypes" is OPTIONAL. Omit it or use [] to apply to ALL meals.
- For substitutions: empty "quantity" or "unit" means keep the original.
- For additions: "quantity" and "unit" are REQUIRED (sensible default portion).
- Use only the valid meal type values listed above.
- If the user only asks a general question without requesting changes, OMIT the \`\`\`changes block entirely.
- You can include only substitutions, only additions, or both.

Examples:

User: "Add banana to all breakfasts"
\`\`\`changes
{"additions": [{"name": "Banana", "quantity": "1", "unit": "un", "mealTypes": ["breakfast"]}]}
\`\`\`

User: "Replace oats with oat flour everywhere"
\`\`\`changes
{"substitutions": [{"original": "Aveia em flocos", "replacement": "Farinha de aveia", "quantity": "", "unit": ""}]}
\`\`\`

User: "Add chia seeds to breakfasts and snacks"
\`\`\`changes
{"additions": [{"name": "Sementes de chia", "quantity": "10", "unit": "g", "mealTypes": ["breakfast", "morning_snack", "afternoon_snack"]}]}
\`\`\`

Keep answers concise, practical and friendly. Briefly mention nutritional impact when relevant.
${NAMING_RULES}`;
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

Keep answers concise, practical and friendly. Always mention the approximate nutritional impact when suggesting substitutions.
${NAMING_RULES}`;
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

    // Parse blocks
    let substitutions: any = null;
    let additions: any = null;

    // New unified ```changes block (plan mode)
    const changesMatch = content.match(/```changes\s*\n([\s\S]*?)\n```/);
    if (changesMatch) {
      try {
        const parsed = JSON.parse(changesMatch[1]);
        substitutions = Array.isArray(parsed.substitutions) ? parsed.substitutions : null;
        additions = Array.isArray(parsed.additions) ? parsed.additions : null;
      } catch (_) {
        // ignore
      }
    }

    // Backwards compat: legacy ```substitutions block (single recipe + old plan)
    if (!substitutions) {
      const subMatch = content.match(/```substitutions\s*\n([\s\S]*?)\n```/);
      if (subMatch) {
        try {
          substitutions = JSON.parse(subMatch[1]);
        } catch (_) {
          // ignore
        }
      }
    }

    // Clean visible content
    const cleanContent = content
      .replace(/```changes\s*\n[\s\S]*?\n```/, "")
      .replace(/```substitutions\s*\n[\s\S]*?\n```/, "")
      .trim();

    return new Response(
      JSON.stringify({ reply: cleanContent, substitutions, additions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("recipe-chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to get response" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
