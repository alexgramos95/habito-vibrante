import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReceiptItem {
  nome: string;
  quantidade: string;
  precoUnit: number | null;
  precoTotal: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Lovable AI with Gemini for vision + structured extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analisa este talão/recibo e extrai todos os itens de compra. Para cada item, identifica:
- nome: nome do produto (limpa abreviaturas se possível)
- quantidade: quantidade comprada (ex: "1 un", "2 L", "500g")
- precoUnit: preço unitário se visível (número ou null)
- precoTotal: preço total da linha (número)

Retorna APENAS um JSON array válido com os itens, sem texto adicional. Exemplo:
[{"nome":"Leite Meio Gordo","quantidade":"1 L","precoUnit":1.29,"precoTotal":1.29},{"nome":"Pão de Forma","quantidade":"1 un","precoUnit":null,"precoTotal":2.49}]

Se não conseguires identificar itens, retorna um array vazio: []`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de pedidos atingido. Tenta novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos AI esgotados. Contacta o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "[]";

    // Parse the AI response - it should be a JSON array
    let items: ReceiptItem[] = [];
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      items = JSON.parse(cleanContent);
      
      // Validate and clean the items
      items = items.filter((item: any) => 
        item && 
        typeof item.nome === 'string' && 
        item.nome.trim() !== '' &&
        typeof item.precoTotal === 'number'
      ).map((item: any) => ({
        nome: item.nome.trim(),
        quantidade: item.quantidade || "1 un",
        precoUnit: typeof item.precoUnit === 'number' ? item.precoUnit : null,
        precoTotal: item.precoTotal
      }));
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      // Return empty array if parsing fails
      items = [];
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.precoTotal || 0), 0);

    return new Response(
      JSON.stringify({ 
        items, 
        total,
        itemCount: items.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Receipt processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
