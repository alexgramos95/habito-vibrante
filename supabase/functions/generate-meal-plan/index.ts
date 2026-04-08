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
    const { profile, dayOfWeek, locale } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lang = locale === "pt" ? "português" : "English";
    const goalMap: Record<string, string> = {
      weight_loss: "perda de peso / weight loss",
      muscle_gain: "ganho muscular / muscle gain",
      maintenance: "manutenção de peso / weight maintenance",
      energy: "mais energia / more energy",
      general_health: "saúde geral / general health",
    };

    const mealTypes = profile.mealsPerDay === 5
      ? ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]
      : profile.mealsPerDay === 4
        ? ["breakfast", "lunch", "afternoon_snack", "dinner"]
        : ["breakfast", "lunch", "dinner"];

    const restrictions = (profile.restrictions || [])
      .filter((r: string) => r !== "none")
      .join(", ") || "nenhuma / none";

    const calorieNote = profile.calorieTarget
      ? `Target: ~${profile.calorieTarget} kcal/day.`
      : "";
    const macroNote = profile.proteinTarget
      ? `Macros target: ~${profile.proteinTarget}g protein, ~${profile.carbTarget || "flexible"}g carbs, ~${profile.fatTarget || "flexible"}g fat.`
      : "";

    const systemPrompt = `You are an expert nutritionist creating personalized meal plans. 
Reply ONLY with valid JSON, no markdown, no explanation.
Language for recipe names and instructions: ${lang}.
${calorieNote} ${macroNote}`;

    const userPrompt = `Create a meal plan for ${dayOfWeek} with these meals: ${mealTypes.join(", ")}.

Profile:
- Goal: ${goalMap[profile.goal] || profile.goal}
- Dietary restrictions: ${restrictions}
- Allergies: ${(profile.allergies || []).join(", ") || "none"}
- Preferences: ${(profile.preferences || []).join(", ") || "none"}

Return JSON with this exact structure:
{
  "meals": [
    {
      "type": "breakfast|morning_snack|lunch|afternoon_snack|dinner",
      "recipe": {
        "name": "string",
        "prepTime": number,
        "cookTime": number,
        "servings": 1,
        "difficulty": "easy|medium|hard",
        "ingredients": [
          { "name": "string", "quantity": "string", "unit": "string", "category": "string" }
        ],
        "instructions": ["step 1", "step 2"],
        "macros": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number },
        "tags": ["tag1", "tag2"],
        "imageEmoji": "emoji"
      }
    }
  ]
}

Make recipes practical, varied, and nutritionally balanced for the stated goal.`;

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
    let content = aiResult.choices?.[0]?.message?.content || "";

    // Strip markdown code fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    const parsed = JSON.parse(content);

    // Add IDs to recipes
    parsed.meals = parsed.meals.map((meal: any, i: number) => ({
      ...meal,
      recipe: {
        ...meal.recipe,
        id: `ai_${Date.now()}_${i}`,
        isAIGenerated: true,
      },
    }));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-meal-plan error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate meal plan" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
