import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, Ingredient } from "@/data/nutritionTypes";

interface Substitution {
  original: string;
  replacement: string;
  quantity: string;
  unit: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  substitutions?: Substitution[] | null;
  applied?: boolean;
}

interface RecipeChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe;
  locale: string;
  onUpdateRecipe?: (updated: Recipe) => void;
}

const SUGGESTIONS_PT = [
  "Posso substituir algum ingrediente por uma opção mais saudável?",
  "Tenho intolerância à lactose, o que posso usar?",
  "Como posso aumentar a proteína desta receita?",
];

const SUGGESTIONS_EN = [
  "Can I substitute any ingredient for a healthier option?",
  "I'm lactose intolerant, what can I use instead?",
  "How can I increase the protein in this recipe?",
];

export function RecipeChatDrawer({ open, onOpenChange, recipe, locale, onUpdateRecipe }: RecipeChatDrawerProps) {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestions = lang === "pt" ? SUGGESTIONS_PT : SUGGESTIONS_EN;

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open, recipe.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const applySubstitutions = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.substitutions || !onUpdateRecipe) return;

    const newIngredients = recipe.ingredients.map((ing) => {
      const sub = msg.substitutions!.find(
        (s) => s.original.toLowerCase() === ing.name.toLowerCase()
      );
      if (sub) {
        return {
          ...ing,
          name: sub.replacement,
          quantity: sub.quantity || ing.quantity,
          unit: sub.unit || ing.unit,
        } as Ingredient;
      }
      return ing;
    });

    let updatedRecipe: Recipe = { ...recipe, ingredients: newIngredients };
    onUpdateRecipe(updatedRecipe);

    setMessages((prev) =>
      prev.map((m, i) => (i === msgIndex ? { ...m, applied: true } : m))
    );

    toast({
      title: lang === "pt" ? "Receita atualizada" : "Recipe updated",
      description:
        lang === "pt"
          ? "A regenerar instruções de preparação..."
          : "Regenerating preparation steps...",
    });

    // Regenerate instructions to match new ingredients
    try {
      const { data, error } = await supabase.functions.invoke(
        "regenerate-instructions",
        {
          body: {
            recipeName: updatedRecipe.name,
            mealType: updatedRecipe.mealType,
            ingredients: updatedRecipe.ingredients,
            locale: lang,
          },
        },
      );
      if (!error && Array.isArray(data?.instructions) && data.instructions.length > 0) {
        updatedRecipe = { ...updatedRecipe, instructions: data.instructions };
        onUpdateRecipe(updatedRecipe);
        toast({
          title: lang === "pt" ? "Instruções atualizadas" : "Instructions updated",
          description:
            lang === "pt"
              ? "Preparação ajustada aos novos ingredientes."
              : "Steps adjusted to the new ingredients.",
        });
      }
    } catch (err) {
      console.error("regenerate-instructions failed", err);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: {
          recipe: {
            name: recipe.name,
            ingredients: recipe.ingredients,
            macros: recipe.macros,
          },
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          locale: lang,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: lang === "pt" ? "Erro" : "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          substitutions: data.substitutions || null,
        },
      ]);
    } catch (err: any) {
      toast({
        title: lang === "pt" ? "Erro" : "Error",
        description:
          lang === "pt"
            ? "Não foi possível obter resposta."
            : "Failed to get response.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              {recipe.imageEmoji} {recipe.name}
            </DrawerTitle>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lang === "pt"
              ? "Pergunta sobre substituições — podes aplicar as sugestões diretamente"
              : "Ask about substitutions — you can apply suggestions directly"}
          </p>
        </DrawerHeader>

        <div className="flex flex-col min-h-0 flex-1 px-4 pb-4" style={{ maxHeight: '60vh' }}>
          {/* Messages */}
          <ScrollArea className="flex-1 pr-2 min-h-0" ref={scrollRef}>
            <div className="space-y-3 py-2">
              {messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center mb-3">
                    {lang === "pt" ? "Sugestões rápidas:" : "Quick suggestions:"}
                  </p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="w-full text-left text-xs p-2.5 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i}>
                  <div
                    className={cn(
                      "text-xs rounded-xl px-3 py-2 max-w-[85%] whitespace-pre-wrap",
                      msg.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.content}
                  </div>

                  {/* Apply substitution button */}
                  {msg.role === "assistant" &&
                    msg.substitutions &&
                    msg.substitutions.length > 0 &&
                    onUpdateRecipe && (
                      <div className="mt-1.5 max-w-[85%]">
                        {msg.applied ? (
                          <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium px-1">
                            <Check className="h-3 w-3" />
                            {lang === "pt" ? "Aplicado" : "Applied"}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            className="text-[11px] h-7 gap-1.5"
                            onClick={() => applySubstitutions(i)}
                          >
                            <Check className="h-3 w-3" />
                            {lang === "pt"
                              ? `Aplicar ${msg.substitutions.length} substituição(ões)`
                              : `Apply ${msg.substitutions.length} substitution(s)`}
                          </Button>
                        )}
                      </div>
                    )}
                </div>
              ))}

              {loading && (
                <div className="bg-muted rounded-xl px-3 py-2 max-w-[85%] flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {lang === "pt" ? "A pensar..." : "Thinking..."}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder={
                lang === "pt"
                  ? "Escreve a tua pergunta..."
                  : "Type your question..."
              }
              className="text-xs h-9"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-9 w-9 shrink-0"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
