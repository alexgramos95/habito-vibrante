import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Check } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyMealPlan, Recipe, Ingredient } from "@/data/nutritionTypes";

interface GlobalSubstitution {
  original: string;
  replacement: string;
  quantity: string;
  unit: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  substitutions?: GlobalSubstitution[] | null;
  applied?: boolean;
  matchCount?: number;
}

interface PlanChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WeeklyMealPlan;
  locale: string;
  onUpdatePlan?: (updated: WeeklyMealPlan) => void;
}

const SUGGESTIONS_PT = [
  "Quero trocar aveia em flocos por farinha de aveia em todas as receitas",
  "Substitui o leite por bebida de aveia em todo o plano",
  "Posso trocar o azeite por óleo de coco?",
];

const SUGGESTIONS_EN = [
  "Replace oats with oat flour in all recipes",
  "Swap milk for oat milk across the entire plan",
  "Can I replace olive oil with coconut oil?",
];

export function PlanChatDrawer({ open, onOpenChange, plan, locale, onUpdatePlan }: PlanChatDrawerProps) {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestions = lang === "pt" ? SUGGESTIONS_PT : SUGGESTIONS_EN;

  // Collect all unique ingredients across the plan
  const allIngredients = (() => {
    const map = new Map<string, { name: string; quantity: string; unit: string; count: number }>();
    for (const day of plan.days) {
      for (const meal of day.meals) {
        for (const ing of meal.recipe.ingredients) {
          const key = ing.name.toLowerCase();
          const existing = map.get(key);
          if (existing) {
            existing.count++;
          } else {
            map.set(key, { name: ing.name, quantity: ing.quantity, unit: ing.unit, count: 1 });
          }
        }
      }
    }
    return Array.from(map.values());
  })();

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput("");
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const countMatches = (subs: GlobalSubstitution[]) => {
    let count = 0;
    for (const day of plan.days) {
      for (const meal of day.meals) {
        for (const ing of meal.recipe.ingredients) {
          if (subs.some(s => s.original.toLowerCase() === ing.name.toLowerCase())) {
            count++;
          }
        }
      }
    }
    return count;
  };

  const applySubstitutions = (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg.substitutions || !onUpdatePlan) return;

    const newDays = plan.days.map(day => {
      const newMeals = day.meals.map(meal => {
        const newIngredients = meal.recipe.ingredients.map(ing => {
          const sub = msg.substitutions!.find(
            s => s.original.toLowerCase() === ing.name.toLowerCase()
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
        const updatedRecipe: Recipe = { ...meal.recipe, ingredients: newIngredients };
        return { ...meal, recipe: updatedRecipe };
      });

      const totalMacros = {
        calories: newMeals.reduce((s, m) => s + m.recipe.macros.calories, 0),
        protein: newMeals.reduce((s, m) => s + m.recipe.macros.protein, 0),
        carbs: newMeals.reduce((s, m) => s + m.recipe.macros.carbs, 0),
        fat: newMeals.reduce((s, m) => s + m.recipe.macros.fat, 0),
      };

      return { ...day, meals: newMeals, totalMacros };
    });

    const updatedPlan: WeeklyMealPlan = { ...plan, days: newDays, isCustomized: true };
    onUpdatePlan(updatedPlan);

    setMessages(prev =>
      prev.map((m, i) => (i === msgIndex ? { ...m, applied: true } : m))
    );

    toast({
      title: lang === "pt" ? "Plano atualizado" : "Plan updated",
      description:
        lang === "pt"
          ? "Os ingredientes foram substituídos em todas as receitas."
          : "Ingredients were substituted across all recipes.",
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const ingredientsSummary = allIngredients
        .map(i => `${i.name} (${i.count}x)`)
        .join(", ");

      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: {
          planMode: true,
          ingredientsSummary,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
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

      const subs = data.substitutions || null;
      const matchCount = subs ? countMatches(subs) : 0;

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          substitutions: subs,
          matchCount,
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
          <DrawerTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            {lang === "pt" ? "Chat do Plano" : "Plan Chat"}
          </DrawerTitle>
          <p className="text-[11px] text-muted-foreground">
            {lang === "pt"
              ? "Altera ingredientes em todas as receitas do plano de uma só vez"
              : "Change ingredients across all recipes in your plan at once"}
          </p>
        </DrawerHeader>

        <div className="flex flex-col min-h-0 flex-1 px-4 pb-4" style={{ maxHeight: '60vh' }}>
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

                  {msg.role === "assistant" &&
                    msg.substitutions &&
                    msg.substitutions.length > 0 &&
                    onUpdatePlan && (
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
                              ? `Aplicar em ${msg.matchCount} ocorrência(s)`
                              : `Apply to ${msg.matchCount} occurrence(s)`}
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

          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
              placeholder={
                lang === "pt"
                  ? "Ex: trocar aveia em flocos por farinha de aveia..."
                  : "E.g. replace oats with oat flour..."
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
