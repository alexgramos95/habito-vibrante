// Edge function: substitute-ingredient
// Given an ingredient name and the user's nutrition restrictions, returns a
// suitable substitute (name + suggested quantity + unit + category) using Lovable AI.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const ingredientName: string = body?.ingredientName ?? "";
    const restrictions: string[] = Array.isArray(body?.restrictions) ? body.restrictions : [];
    const goal: string = body?.goal ?? "general_health";
    const locale: string = body?.locale ?? "pt-PT";
    const lang = locale.startsWith("pt") ? "pt" : "en";

    if (!ingredientName.trim()) {
      return new Response(
        JSON.stringify({ error: "ingredientName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = lang === "pt"
      ? "És um nutricionista. Sugere o melhor substituto para um ingrediente, respeitando restrições alimentares e o objetivo do utilizador. Devolve sempre quantidade e unidade equivalentes em valor nutricional. Não repitas o ingrediente original."
      : "You are a nutritionist. Suggest the best substitute for an ingredient, respecting dietary restrictions and the user's goal. Always return an equivalent nutritional quantity and unit. Never repeat the original ingredient.";

    const userPrompt = lang === "pt"
      ? `Ingrediente a substituir: "${ingredientName}".\nRestrições: ${restrictions.join(", ") || "nenhuma"}.\nObjetivo: ${goal}.\nResponde via tool call.`
      : `Ingredient to replace: "${ingredientName}".\nRestrictions: ${restrictions.join(", ") || "none"}.\nGoal: ${goal}.\nReply via tool call.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_substitute",
              description: "Return a single substitute ingredient with equivalent nutritional value.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: lang === "pt" ? "Nome do ingrediente substituto" : "Substitute ingredient name" },
                  quantity: { type: "string", description: lang === "pt" ? "Quantidade equivalente" : "Equivalent quantity" },
                  unit: { type: "string", description: lang === "pt" ? "Unidade (g, ml, un, etc)" : "Unit (g, ml, un, etc)" },
                  category: { type: "string", description: lang === "pt" ? "Categoria de mercearia (ex: Vegetais, Lacticínios, Cereais)" : "Grocery category (e.g. Vegetables, Dairy, Grains)" },
                  reason: { type: "string", description: lang === "pt" ? "Razão curta (1 frase)" : "Short reason (1 sentence)" },
                },
                required: ["name", "quantity", "unit", "category", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_substitute" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: lang === "pt" ? "Limite de pedidos atingido. Tenta novamente em breve." : "Rate limit exceeded, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: lang === "pt" ? "Créditos de IA esgotados." : "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText.slice(0, 300));
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      return new Response(JSON.stringify({ error: "No substitute returned" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: { name: string; quantity: string; unit: string; category: string; reason: string };
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (e) {
      console.error("Failed to parse tool args:", e);
      return new Response(JSON.stringify({ error: "Invalid AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("substitute-ingredient error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
