import { useState, useRef, useEffect } from "react";
import { MessageCircle, Send, Loader2, Check, Plus, ArrowRightLeft } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { WeeklyMealPlan, Recipe, Ingredient, MealType } from "@/data/nutritionTypes";

interface GlobalSubstitution {
  original: string;
  replacement: string;
  quantity: string;
  unit: string;
  mealTypes?: MealType[];
}

interface GlobalAddition {
  name: string;
  quantity: string;
  unit: string;
  mealTypes?: MealType[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  substitutions?: GlobalSubstitution[] | null;
  additions?: GlobalAddition[] | null;
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
  "Adiciona uma banana a todos os pequenos-almoços",
  "Trocar aveia em flocos por farinha de aveia em todas as receitas",
  "Adiciona sementes de chia aos pequenos-almoços e snacks",
];

const SUGGESTIONS_EN = [
  "Add a banana to all breakfasts",
  "Replace oats with oat flour in all recipes",
  "Add chia seeds to breakfasts and snacks",
];

const MEAL_TYPE_LABELS_PT: Record<MealType, string> = {
  breakfast: "pequeno-almoço",
  morning_snack: "snack manhã",
  lunch: "almoço",
  afternoon_snack: "snack tarde",
  dinner: "jantar",
};

const MEAL_TYPE_LABELS_EN: Record<MealType, string> = {
  breakfast: "breakfast",
  morning_snack: "morning snack",
  lunch: "lunch",
  afternoon_snack: "afternoon snack",
  dinner: "dinner",
};

export function PlanChatDrawer({ open, onOpenChange, plan, locale, onUpdatePlan }: PlanChatDrawerProps) {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestions = lang === "pt" ? SUGGESTIONS_PT : SUGGESTIONS_EN;
  const mealLabels = lang === "pt" ? MEAL_TYPE_LABELS_PT : MEAL_TYPE_LABELS_EN;

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

  const matchesMealType = (mealType: MealType, filter?: MealType[]) => {
    if (!filter || filter.length === 0) return true;
    return filter.includes(mealType);
  };

  const countMatches = (
    subs: GlobalSubstitution[] | null,
    adds: GlobalAddition[] | null,
  ) => {
    let count = 0;
    for (const day of plan.days) {
      for (const meal of day.meals) {
        const mealType = meal.type;
        // Substitutions: count ingredient occurrences within filtered meals
        if (subs) {
          for (const ing of meal.recipe.ingredients) {
            if (
              subs.some(
                s =>
                  s.original.toLowerCase() === ing.name.toLowerCase() &&
                  matchesMealType(mealType, s.mealTypes),
              )
            ) {
              count++;
            }
          }
        }
        // Additions: count meals that match the filter for each addition
        if (adds) {
          for (const a of adds) {
            if (matchesMealType(mealType, a.mealTypes)) {
              count++;
            }
          }
        }
      }
    }
    return count;
  };

  const applyChanges = (msgIndex: number) => {
    const msg = messages[msgIndex];
    if ((!msg.substitutions && !msg.additions) || !onUpdatePlan) return;

    const subs = msg.substitutions || [];
    const adds = msg.additions || [];

    const newDays = plan.days.map(day => {
      const newMeals = day.meals.map(meal => {
        const mealType = meal.type;

        // Step 1: substitutions
        let newIngredients: Ingredient[] = meal.recipe.ingredients.map(ing => {
          const sub = subs.find(
            s =>
              s.original.toLowerCase() === ing.name.toLowerCase() &&
              matchesMealType(mealType, s.mealTypes),
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

        // Step 2: additions (skip if already present by name)
        const existingNames = new Set(newIngredients.map(i => i.name.toLowerCase()));
        for (const a of adds) {
          if (!matchesMealType(mealType, a.mealTypes)) continue;
          if (existingNames.has(a.name.toLowerCase())) continue;
          newIngredients.push({
            name: a.name,
            quantity: a.quantity || "1",
            unit: a.unit || "un",
          } as Ingredient);
          existingNames.add(a.name.toLowerCase());
        }

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
          ? "As alterações foram aplicadas ao plano."
          : "Changes were applied to the plan.",
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

      const mealTypesPresent = Array.from(
        new Set(plan.days.flatMap(d => d.meals.map(m => m.type))),
      );

      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: {
          planMode: true,
          ingredientsSummary,
          mealTypes: mealTypesPresent,
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

      const subs: GlobalSubstitution[] | null = data.substitutions || null;
      const adds: GlobalAddition[] | null = data.additions || null;
      const matchCount = subs || adds ? countMatches(subs, adds) : 0;

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          substitutions: subs,
          additions: adds,
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

  const renderChangeSummary = (msg: ChatMessage) => {
    const parts: string[] = [];
    if (msg.substitutions && msg.substitutions.length > 0) {
      for (const s of msg.substitutions) {
        const scope = s.mealTypes && s.mealTypes.length > 0
          ? ` (${s.mealTypes.map(mt => mealLabels[mt]).join(", ")})`
          : "";
        parts.push(
          lang === "pt"
            ? `↔ ${s.original} → ${s.replacement}${scope}`
            : `↔ ${s.original} → ${s.replacement}${scope}`,
        );
      }
    }
    if (msg.additions && msg.additions.length > 0) {
      for (const a of msg.additions) {
        const scope = a.mealTypes && a.mealTypes.length > 0
          ? ` (${a.mealTypes.map(mt => mealLabels[mt]).join(", ")})`
          : "";
        parts.push(`+ ${a.quantity} ${a.unit} ${a.name}${scope}`);
      }
    }
    return parts;
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
              ? "Substitui ou adiciona ingredientes em todas as receitas (ou só num tipo de refeição)"
              : "Replace or add ingredients across all recipes (or just a meal type)"}
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

              {messages.map((msg, i) => {
                const summary = msg.role === "assistant" ? renderChangeSummary(msg) : [];
                const hasChanges =
                  msg.role === "assistant" &&
                  ((msg.substitutions && msg.substitutions.length > 0) ||
                    (msg.additions && msg.additions.length > 0));

                return (
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

                    {hasChanges && onUpdatePlan && (
                      <div className="mt-1.5 max-w-[85%] space-y-1.5">
                        {summary.length > 0 && (
                          <div className="text-[11px] text-muted-foreground space-y-0.5 px-1">
                            {summary.map((line, idx) => (
                              <div key={idx} className="flex items-start gap-1">
                                {line.startsWith("+") ? (
                                  <Plus className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                ) : (
                                  <ArrowRightLeft className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                                )}
                                <span>{line.replace(/^[+↔]\s*/, "")}</span>
                              </div>
                            ))}
                          </div>
                        )}
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
                            onClick={() => applyChanges(i)}
                          >
                            <Check className="h-3 w-3" />
                            {lang === "pt"
                              ? `Aplicar a ${msg.matchCount} refeição(ões)`
                              : `Apply to ${msg.matchCount} meal(s)`}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

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
                  ? "Ex: adiciona banana aos pequenos-almoços..."
                  : "E.g. add banana to all breakfasts..."
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
