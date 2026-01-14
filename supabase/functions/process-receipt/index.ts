import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedItem {
  name: string;
  quantity: number;
  price: number;
}

// Keywords to skip (totals, tax, etc.)
const SKIP_KEYWORDS = [
  'total', 'subtotal', 'iva', 'nif', 'contribuinte', 'troco', 'pago', 'euros',
  'multibanco', 'visa', 'mastercard', 'débito', 'crédito', 'fatura', 'recibo',
  'obrigado', 'volte sempre', 'data:', 'hora:', 'caixa', 'operador'
];

function shouldSkipLine(line: string): boolean {
  const lower = line.toLowerCase();
  return SKIP_KEYWORDS.some(kw => lower.includes(kw));
}

function parsePrice(priceStr: string): number | null {
  // Handle both comma and dot as decimal separators
  const cleaned = priceStr.replace(/[€\s]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function fallbackParser(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 3) continue;
    if (shouldSkipLine(trimmed)) continue;
    
    // Try to match: something followed by a price (number with optional decimals)
    // Pattern: "Product name 1,50" or "Product name 1.50" or "Product name €1,50"
    const priceMatch = trimmed.match(/^(.+?)\s+[€]?(\d+[,.]?\d*)\s*[€]?$/);
    
    if (priceMatch) {
      const name = priceMatch[1].trim();
      const price = parsePrice(priceMatch[2]);
      
      if (name && name.length >= 2 && price !== null && price > 0 && price < 1000) {
        items.push({
          name: name,
          quantity: 1,
          price: price
        });
      }
    }
  }
  
  return items;
}

function extractJsonFromText(text: string): string | null {
  // Try to find JSON array or object in the text
  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) return arrayMatch[0];
  
  const objectMatch = text.match(/\{[\s\S]*?"items"[\s\S]*?\}/);
  if (objectMatch) return objectMatch[0];
  
  return null;
}

function normalizeItems(rawItems: any[]): ParsedItem[] {
  return rawItems
    .filter((item: any) => {
      if (!item || typeof item !== 'object') return false;
      const name = item.name || item.nome || '';
      return typeof name === 'string' && name.trim().length >= 2;
    })
    .map((item: any) => {
      const name = (item.name || item.nome || '').trim();
      const quantity = typeof item.quantity === 'number' ? item.quantity : 
                       typeof item.quantidade === 'number' ? item.quantidade : 1;
      let price = item.price ?? item.precoTotal ?? item.preco ?? 0;
      
      // Handle string prices with comma
      if (typeof price === 'string') {
        price = parsePrice(price) ?? 0;
      }
      
      return {
        name,
        quantity: Math.max(1, Math.round(quantity)),
        price: typeof price === 'number' ? price : 0
      };
    })
    .filter(item => item.price > 0 && item.price < 10000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image data is required", items: [] }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured", items: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiPrompt = `Analyze this receipt/ticket image and extract all purchased items.

For each item, extract:
- name: product name (clean up abbreviations)
- quantity: number of units (default to 1 if unclear)
- price: total price for this line item (as a number)

IMPORTANT: Return ONLY a valid JSON object in this exact format, with no additional text:
{"items":[{"name":"Product Name","quantity":1,"price":1.99}]}

Skip lines containing: TOTAL, IVA, NIF, SUBTOTAL, or payment info.
If you cannot identify any items, return: {"items":[]}`;

    console.log("Calling AI gateway for receipt processing...");

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
              { type: "text", text: aiPrompt },
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
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a few minutes.", items: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Contact support.", items: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Error processing image", items: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const rawContent = aiResponse.choices?.[0]?.message?.content || "";
    
    // Log raw response for debugging
    console.log("Raw AI response:", rawContent);

    let items: ParsedItem[] = [];

    // Try to parse as JSON first
    try {
      let cleanContent = rawContent.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      // Try direct parse
      let parsed: any;
      try {
        parsed = JSON.parse(cleanContent);
      } catch {
        // Try to extract JSON from the text
        const extracted = extractJsonFromText(cleanContent);
        if (extracted) {
          parsed = JSON.parse(extracted);
        }
      }

      if (parsed) {
        // Handle both { items: [...] } and [...] formats
        const rawItems = Array.isArray(parsed) ? parsed : (parsed.items || []);
        items = normalizeItems(rawItems);
        console.log("Parsed items from JSON:", items.length);
      }
    } catch (parseError) {
      console.error("JSON parsing failed, trying fallback parser:", parseError);
    }

    // If JSON parsing failed or returned no items, try fallback
    if (items.length === 0) {
      console.log("Attempting fallback text parsing...");
      items = fallbackParser(rawContent);
      console.log("Fallback parsed items:", items.length);
    }

    console.log("Final items count:", items.length);

    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Receipt processing error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", items: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});