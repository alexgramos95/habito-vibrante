import { useState, useEffect, useMemo, useCallback } from "react";
import { format, startOfWeek, addDays } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  UtensilsCrossed, Leaf, ChefHat, ShoppingBasket, Sparkles, 
  ChevronLeft, ChevronRight, Settings2, Loader2, RefreshCw,
  Clock, Flame, Dumbbell, Wheat, Droplets, Check, X, Plus, MessageCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/I18nContext";
import { useSubscription } from "@/hooks/useSubscription";
import { Navigation } from "@/components/Layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GatedOverlay } from "@/components/Premium/GatedOverlay";
import { RecipeChatDrawer } from "@/components/Nutrition/RecipeChatDrawer";
import {
  NutritionProfile, NutritionGoal, DietaryRestriction, MealType,
  Recipe, DayMealPlan, WeeklyMealPlan, ShoppingListItem,
  MEAL_TYPE_LABELS, NUTRITION_GOALS, DIETARY_RESTRICTIONS,
  DEFAULT_NUTRITION_PROFILE, BASE_RECIPES, INGREDIENT_CATEGORIES,
} from "@/data/nutritionTypes";

const WEEKDAYS_PT = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const WEEKDAYS_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const STORAGE_KEY_PROFILE = "become_nutrition_profile";
const STORAGE_KEY_PLAN = "become_meal_plan";

// ─── Profile Setup Modal ───
const ProfileSetupModal = ({
  open, onOpenChange, profile, onSave, locale,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: NutritionProfile;
  onSave: (p: NutritionProfile) => void;
  locale: string;
}) => {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [local, setLocal] = useState<NutritionProfile>({ ...profile });

  const toggleRestriction = (r: DietaryRestriction) => {
    if (r === "none") {
      setLocal(p => ({ ...p, restrictions: ["none"] }));
    } else {
      setLocal(p => {
        const without = p.restrictions.filter(x => x !== "none" && x !== r);
        const has = p.restrictions.includes(r);
        const next = has ? without : [...without, r];
        return { ...p, restrictions: next.length ? next : ["none"] };
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {lang === "pt" ? "Perfil Nutricional" : "Nutrition Profile"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt"
              ? "Personaliza o teu plano de refeições"
              : "Customize your meal plan"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Goal */}
          <div className="space-y-2">
            <Label>{lang === "pt" ? "Objetivo" : "Goal"}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(NUTRITION_GOALS[lang]) as NutritionGoal[]).map(g => (
                <button
                  key={g}
                  onClick={() => setLocal(p => ({ ...p, goal: g }))}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm font-medium transition-all text-left",
                    local.goal === g
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {NUTRITION_GOALS[lang][g]}
                </button>
              ))}
            </div>
          </div>

          {/* Restrictions */}
          <div className="space-y-2">
            <Label>{lang === "pt" ? "Restrições Alimentares" : "Dietary Restrictions"}</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(DIETARY_RESTRICTIONS[lang]) as DietaryRestriction[]).map(r => (
                <button
                  key={r}
                  onClick={() => toggleRestriction(r)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    local.restrictions.includes(r)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {DIETARY_RESTRICTIONS[lang][r]}
                </button>
              ))}
            </div>
          </div>

          {/* Meals per day */}
          <div className="space-y-2">
            <Label>{lang === "pt" ? "Refeições por dia" : "Meals per day"}</Label>
            <div className="flex gap-2">
              {[3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setLocal(p => ({ ...p, mealsPerDay: n }))}
                  className={cn(
                    "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all",
                    local.mealsPerDay === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Calorie target */}
          <div className="space-y-2">
            <Label>{lang === "pt" ? "Objetivo calórico (kcal/dia)" : "Calorie target (kcal/day)"}</Label>
            <Input
              type="number"
              placeholder="ex: 2000"
              value={local.calorieTarget || ""}
              onChange={e => setLocal(p => ({ ...p, calorieTarget: e.target.value ? parseInt(e.target.value) : undefined }))}
            />
          </div>

          {/* Macro targets */}
          <div className="space-y-2">
            <Label>{lang === "pt" ? "Macros alvo (g/dia)" : "Macro targets (g/day)"}</Label>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span className="text-xs text-muted-foreground">{lang === "pt" ? "Proteína" : "Protein"}</span>
                <Input
                  type="number"
                  placeholder="120"
                  value={local.proteinTarget || ""}
                  onChange={e => setLocal(p => ({ ...p, proteinTarget: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{lang === "pt" ? "Hidratos" : "Carbs"}</span>
                <Input
                  type="number"
                  placeholder="200"
                  value={local.carbTarget || ""}
                  onChange={e => setLocal(p => ({ ...p, carbTarget: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
              </div>
              <div>
                <span className="text-xs text-muted-foreground">{lang === "pt" ? "Gordura" : "Fat"}</span>
                <Input
                  type="number"
                  placeholder="60"
                  value={local.fatTarget || ""}
                  onChange={e => setLocal(p => ({ ...p, fatTarget: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
              </div>
            </div>
          </div>

          <Button className="w-full" onClick={() => {
            onSave({ ...local, updatedAt: new Date().toISOString() });
            onOpenChange(false);
          }}>
            {lang === "pt" ? "Guardar perfil" : "Save profile"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Recipe Card ───
const RecipeCard = ({
  recipe, mealType, locale, onSwap, onUpdateRecipe,
}: {
  recipe: Recipe;
  mealType: MealType;
  locale: string;
  onSwap?: () => void;
  onUpdateRecipe?: (updated: Recipe) => void;
}) => {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [expanded, setExpanded] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <Card className="overflow-hidden transition-all">
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <CardContent className="p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl shrink-0">
              {recipe.imageEmoji || "🍽️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                  {MEAL_TYPE_LABELS[lang]?.[mealType] || mealType}
                </span>
                {recipe.isAIGenerated && (
                  <Sparkles className="h-3 w-3 text-primary/60" />
                )}
              </div>
              <h4 className="text-sm font-semibold leading-tight truncate">{recipe.name}</h4>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {recipe.prepTime + recipe.cookTime}min
                </span>
                <span className="flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {recipe.macros.calories}kcal
                </span>
                <span className="flex items-center gap-1">
                  <Dumbbell className="h-3 w-3" />
                  {recipe.macros.protein}g
                </span>
              </div>
            </div>
            {onSwap && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={e => { e.stopPropagation(); onSwap(); }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </button>

      {expanded && (
        <div className="border-t border-border px-3.5 pb-3.5">
          {/* Macros bar */}
          <div className="grid grid-cols-4 gap-2 py-3">
            {[
              { label: "Kcal", value: recipe.macros.calories, icon: Flame, color: "text-orange-500" },
              { label: lang === "pt" ? "Prot" : "Prot", value: `${recipe.macros.protein}g`, icon: Dumbbell, color: "text-blue-500" },
              { label: lang === "pt" ? "Hidr" : "Carbs", value: `${recipe.macros.carbs}g`, icon: Wheat, color: "text-amber-500" },
              { label: lang === "pt" ? "Gord" : "Fat", value: `${recipe.macros.fat}g`, icon: Droplets, color: "text-purple-500" },
            ].map(m => (
              <div key={m.label} className="text-center">
                <m.icon className={cn("h-3.5 w-3.5 mx-auto mb-0.5", m.color)} />
                <div className="text-xs font-semibold">{m.value}</div>
                <div className="text-[10px] text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Ingredients */}
          <div className="mb-3">
            <h5 className="text-xs font-semibold mb-1.5">
              {lang === "pt" ? "Ingredientes" : "Ingredients"}
            </h5>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-1">
                  <span className="text-foreground font-medium">{ing.quantity} {ing.unit}</span>
                  <span>{ing.name}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h5 className="text-xs font-semibold mb-1.5">
              {lang === "pt" ? "Preparação" : "Instructions"}
            </h5>
            <ol className="space-y-1">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tags */}
          {recipe.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {recipe.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Chat button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-3 text-xs gap-1.5"
            onClick={() => setChatOpen(true)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {lang === "pt" ? "Substituir ingredientes" : "Substitute ingredients"}
          </Button>
        </div>
      )}

      <RecipeChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        recipe={recipe}
        locale={locale}
        onUpdateRecipe={onUpdateRecipe}
      />
    </Card>
  );
};

// ─── Shopping List Modal ───
const ShoppingListModal = ({
  open, onOpenChange, plan, locale,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  plan: WeeklyMealPlan | null;
  locale: string;
}) => {
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const [items, setItems] = useState<ShoppingListItem[]>([]);

  useEffect(() => {
    if (!plan) return;
    const ingredientMap = new Map<string, ShoppingListItem>();
    plan.days.forEach(day =>
      day.meals.forEach(meal =>
        meal.recipe.ingredients.forEach(ing => {
          const key = ing.name.toLowerCase();
          if (ingredientMap.has(key)) {
            const existing = ingredientMap.get(key)!;
            // Simple: just keep first quantity, don't merge
            ingredientMap.set(key, existing);
          } else {
            ingredientMap.set(key, {
              ingredient: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category || "Outros",
              checked: false,
            });
          }
        })
      )
    );
    setItems(Array.from(ingredientMap.values()).sort((a, b) => a.category.localeCompare(b.category)));
  }, [plan]);

  const toggleItem = (idx: number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const grouped = useMemo(() => {
    const groups: Record<string, ShoppingListItem[]> = {};
    items.forEach(item => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [items]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            {lang === "pt" ? "Lista de Compras" : "Shopping List"}
          </DialogTitle>
          <DialogDescription>
            {lang === "pt"
              ? "Ingredientes para a semana"
              : "Ingredients for the week"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {Object.entries(grouped).map(([cat, catItems]) => (
              <div key={cat}>
                <h4 className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wider">{cat}</h4>
                <div className="space-y-1">
                  {catItems.map((item, idx) => {
                    const globalIdx = items.indexOf(item);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleItem(globalIdx)}
                        className={cn(
                          "flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm transition-all",
                          item.checked ? "opacity-50 line-through" : "hover:bg-secondary"
                        )}
                      >
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                          item.checked ? "bg-primary border-primary" : "border-border"
                        )}>
                          {item.checked && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <span className="flex-1 text-left">{item.ingredient}</span>
                        <span className="text-xs text-muted-foreground">{item.quantity} {item.unit}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ───
const Nutricao = () => {
  const { locale } = useI18n();
  const { subscription, trialStatus } = useSubscription();
  const { toast } = useToast();
  const lang = locale.startsWith("pt") ? "pt" : "en";
  const hasPro = subscription.plan === "pro" || trialStatus.isActive;

  const [profile, setProfile] = useState<NutritionProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PROFILE);
    return saved ? JSON.parse(saved) : DEFAULT_NUTRITION_PROFILE;
  });
  const [plan, setPlan] = useState<WeeklyMealPlan | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PLAN);
    return saved ? JSON.parse(saved) : null;
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);

  const weekdays = lang === "pt" ? WEEKDAYS_PT : WEEKDAYS_EN;
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  // Save profile
  const saveProfile = useCallback((p: NutritionProfile) => {
    setProfile(p);
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(p));
    toast({
      title: lang === "pt" ? "Perfil atualizado" : "Profile updated",
      description: lang === "pt" ? "As tuas preferências foram guardadas" : "Your preferences were saved",
    });
  }, [lang, toast]);

  // Save plan
  useEffect(() => {
    if (plan) localStorage.setItem(STORAGE_KEY_PLAN, JSON.stringify(plan));
  }, [plan]);

  // Generate plan with AI (PRO) or base recipes (FREE)
  const generatePlan = useCallback(async (dayIndex?: number) => {
    setIsGenerating(true);

    if (!hasPro) {
      // FREE: use base recipes
      const days: DayMealPlan[] = [];
      const mealTypes: MealType[] = profile.mealsPerDay === 5
        ? ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]
        : profile.mealsPerDay === 4
          ? ["breakfast", "lunch", "afternoon_snack", "dinner"]
          : ["breakfast", "lunch", "dinner"];

      for (let i = 0; i < 7; i++) {
        const date = format(addDays(weekStart, i), "yyyy-MM-dd");
        const meals = mealTypes.map(type => {
          const matching = BASE_RECIPES.filter(r => r.mealType === type);
          const recipe = matching[Math.floor(Math.random() * matching.length)] || BASE_RECIPES[0];
          return { type, recipe };
        });
        const totalMacros = {
          calories: meals.reduce((s, m) => s + m.recipe.macros.calories, 0),
          protein: meals.reduce((s, m) => s + m.recipe.macros.protein, 0),
          carbs: meals.reduce((s, m) => s + m.recipe.macros.carbs, 0),
          fat: meals.reduce((s, m) => s + m.recipe.macros.fat, 0),
        };
        days.push({ date, meals, totalMacros });
      }

      setPlan({
        id: `plan_${Date.now()}`,
        weekStart: format(weekStart, "yyyy-MM-dd"),
        days,
        profile,
        generatedAt: new Date().toISOString(),
        isCustomized: false,
      });
      setIsGenerating(false);
      return;
    }

    // PRO: use AI
    try {
      const daysToGenerate = dayIndex !== undefined ? [dayIndex] : [0, 1, 2, 3, 4, 5, 6];
      const existingDays = plan?.days || new Array(7).fill(null);
      const newDays: (DayMealPlan | null)[] = [...existingDays];

      const invokeWithTimeout = async (body: any, timeoutMs = 30000) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
            body,
          });
          clearTimeout(timer);
          if (error) throw new Error(error.message || "Edge function error");
          if (data?.error) throw new Error(data.error);
          return data;
        } catch (err: any) {
          clearTimeout(timer);
          if (err.name === "AbortError") throw new Error("Timeout (30s)");
          throw err;
        }
      };

      const generateDay = async (idx: number): Promise<{ idx: number; day: DayMealPlan }> => {
        const date = format(addDays(weekStart, idx), "yyyy-MM-dd");
        const data = await invokeWithTimeout({ profile, dayOfWeek: weekdays[idx], locale: lang });

        const meals = (data.meals || []).map((m: any) => ({
          type: m.type,
          recipe: { ...m.recipe, id: m.recipe.id || `ai_${Date.now()}_${Math.random()}` },
        }));
        const totalMacros = {
          calories: meals.reduce((s: number, m: any) => s + (m.recipe.macros?.calories || 0), 0),
          protein: meals.reduce((s: number, m: any) => s + (m.recipe.macros?.protein || 0), 0),
          carbs: meals.reduce((s: number, m: any) => s + (m.recipe.macros?.carbs || 0), 0),
          fat: meals.reduce((s: number, m: any) => s + (m.recipe.macros?.fat || 0), 0),
        };
        return { idx, day: { date, meals, totalMacros } };
      };

      let successCount = 0;
      for (const idx of daysToGenerate) {
        try {
          setGeneratingProgress(
            lang === "pt"
              ? `A gerar ${weekdays[idx]}… (${successCount + 1}/${daysToGenerate.length})`
              : `Generating ${weekdays[idx]}… (${successCount + 1}/${daysToGenerate.length})`
          );
          if (successCount > 0) {
            await new Promise(r => setTimeout(r, 1500));
          }
          const result = await generateDay(idx);
          newDays[result.idx] = result.day;
          successCount++;
        } catch (dayErr: any) {
          console.warn(`Failed to generate day ${idx}, using base recipes:`, dayErr.message);
          // Fallback to base recipes for this day
          const date = format(addDays(weekStart, idx), "yyyy-MM-dd");
          const mealTypes: MealType[] = profile.mealsPerDay === 5
            ? ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner"]
            : profile.mealsPerDay === 4
              ? ["breakfast", "lunch", "afternoon_snack", "dinner"]
              : ["breakfast", "lunch", "dinner"];
          const meals = mealTypes.map(type => {
            const matching = BASE_RECIPES.filter(r => r.mealType === type);
            const recipe = matching[Math.floor(Math.random() * matching.length)] || BASE_RECIPES[0];
            return { type, recipe };
          });
          const totalMacros = {
            calories: meals.reduce((s, m) => s + m.recipe.macros.calories, 0),
            protein: meals.reduce((s, m) => s + m.recipe.macros.protein, 0),
            carbs: meals.reduce((s, m) => s + m.recipe.macros.carbs, 0),
            fat: meals.reduce((s, m) => s + m.recipe.macros.fat, 0),
          };
          newDays[idx] = { date, meals, totalMacros };
        }
      }

      // Fill any nulls with empty
      const finalDays = newDays.map((d, i) => d || {
        date: format(addDays(weekStart, i), "yyyy-MM-dd"),
        meals: [],
        totalMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      });

      setPlan({
        id: `plan_${Date.now()}`,
        weekStart: format(weekStart, "yyyy-MM-dd"),
        days: finalDays,
        profile,
        generatedAt: new Date().toISOString(),
        isCustomized: dayIndex !== undefined,
      });

      if (successCount < daysToGenerate.length) {
        toast({
          title: lang === "pt" ? "Plano parcialmente gerado" : "Plan partially generated",
          description: lang === "pt" 
            ? `${successCount}/${daysToGenerate.length} dias com IA. Os restantes usam receitas base.`
            : `${successCount}/${daysToGenerate.length} days with AI. Others use base recipes.`,
        });
      }
    } catch (err: any) {
      console.error("Meal plan generation error:", err);
      toast({
        title: lang === "pt" ? "Erro ao gerar plano" : "Error generating plan",
        description: err.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingProgress("");
    }
  }, [hasPro, profile, weekStart, weekdays, plan, lang, toast]);

  const currentDay = plan?.days?.[selectedDay];

  // Daily total macros
  const dailyTotals = currentDay?.totalMacros || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <div className="page-container">
      <Navigation />
      <div className="page-content pb-24 md:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Leaf className="h-5 w-5 text-primary" />
              {lang === "pt" ? "Nutrição" : "Nutrition"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "pt" ? "Plano semanal personalizado" : "Personalized weekly plan"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowProfile(true)}>
              <Settings2 className="h-4 w-4" />
            </Button>
            {plan && (
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowShopping(true)}>
                <ShoppingBasket className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Profile summary chips */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="secondary" className="text-[10px]">
            {NUTRITION_GOALS[lang][profile.goal]}
          </Badge>
          {profile.restrictions.filter(r => r !== "none").map(r => (
            <Badge key={r} variant="outline" className="text-[10px]">
              {DIETARY_RESTRICTIONS[lang][r]}
            </Badge>
          ))}
          <Badge variant="outline" className="text-[10px]">
            {profile.mealsPerDay} {lang === "pt" ? "refeições" : "meals"}
          </Badge>
          {profile.calorieTarget && (
            <Badge variant="outline" className="text-[10px]">
              {profile.calorieTarget} kcal
            </Badge>
          )}
        </div>

        {/* No plan yet */}
        {!plan && (
          <Card className="text-center py-12">
            <CardContent className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  {lang === "pt" ? "Cria o teu plano semanal" : "Create your weekly plan"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                  {lang === "pt"
                    ? "Define o teu perfil e gera receitas personalizadas para a semana"
                    : "Set your profile and generate personalized recipes for the week"}
                </p>
              </div>
              <div className="flex flex-col gap-2 items-center">
                <Button onClick={() => setShowProfile(true)} variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-1.5" />
                  {lang === "pt" ? "Configurar perfil" : "Setup profile"}
                </Button>
                <Button onClick={() => generatePlan()} disabled={isGenerating} className="gap-1.5">
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isGenerating && generatingProgress
                    ? generatingProgress
                    : lang === "pt" ? "Gerar plano semanal" : "Generate weekly plan"}
                </Button>
              </div>
              {!hasPro && (
                <p className="text-[11px] text-muted-foreground">
                  {lang === "pt"
                    ? "Versão gratuita: receitas base. PRO: receitas por IA personalizadas."
                    : "Free: base recipes. PRO: AI-personalized recipes."}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Plan view */}
        {plan && (
          <>
            {/* Day tabs */}
            <div className="mb-4">
              <ScrollArea className="w-full">
                <div className="flex gap-1.5 pb-1">
                  {weekdays.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDay(i)}
                      className={cn(
                        "shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all min-w-[60px]",
                        selectedDay === i
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div>{day.slice(0, 3)}</div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Daily macros summary */}
            <Card className="mb-4">
              <CardContent className="p-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <Flame className="h-4 w-4 mx-auto text-orange-500 mb-0.5" />
                    <div className="text-sm font-bold">{dailyTotals.calories}</div>
                    <div className="text-[10px] text-muted-foreground">kcal</div>
                  </div>
                  <div>
                    <Dumbbell className="h-4 w-4 mx-auto text-blue-500 mb-0.5" />
                    <div className="text-sm font-bold">{dailyTotals.protein}g</div>
                    <div className="text-[10px] text-muted-foreground">{lang === "pt" ? "Prot" : "Prot"}</div>
                  </div>
                  <div>
                    <Wheat className="h-4 w-4 mx-auto text-amber-500 mb-0.5" />
                    <div className="text-sm font-bold">{dailyTotals.carbs}g</div>
                    <div className="text-[10px] text-muted-foreground">{lang === "pt" ? "Hidr" : "Carbs"}</div>
                  </div>
                  <div>
                    <Droplets className="h-4 w-4 mx-auto text-purple-500 mb-0.5" />
                    <div className="text-sm font-bold">{dailyTotals.fat}g</div>
                    <div className="text-[10px] text-muted-foreground">{lang === "pt" ? "Gord" : "Fat"}</div>
                  </div>
                </div>
                {profile.calorieTarget && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>{dailyTotals.calories} / {profile.calorieTarget} kcal</span>
                      <span>{Math.round((dailyTotals.calories / profile.calorieTarget) * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (dailyTotals.calories / profile.calorieTarget) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meals */}
            <div className="space-y-2.5 mb-4">
              {currentDay?.meals?.length ? (
                currentDay.meals.map((meal, i) => (
                  <RecipeCard
                    key={`${meal.type}-${i}`}
                    recipe={meal.recipe}
                    mealType={meal.type}
                    locale={locale}
                    onSwap={hasPro ? () => generatePlan(selectedDay) : undefined}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {lang === "pt" ? "Nenhuma refeição para este dia" : "No meals for this day"}
                </div>
              )}
            </div>

            {/* Regenerate button */}
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => generatePlan()}
                disabled={isGenerating}
                className="gap-1.5"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {lang === "pt" ? "Regenerar semana" : "Regenerate week"}
              </Button>
            </div>

            {/* PRO gating overlay for AI features */}
            {!hasPro && (
              <div className="mt-4">
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <Sparkles className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium">
                      {lang === "pt"
                        ? "Receitas personalizadas por IA disponíveis no PRO"
                        : "AI-personalized recipes available on PRO"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lang === "pt"
                        ? "Receitas adaptadas aos teus objetivos, restrições e preferências"
                        : "Recipes tailored to your goals, restrictions and preferences"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <ProfileSetupModal
        open={showProfile}
        onOpenChange={setShowProfile}
        profile={profile}
        onSave={saveProfile}
        locale={locale}
      />
      <ShoppingListModal
        open={showShopping}
        onOpenChange={setShowShopping}
        plan={plan}
        locale={locale}
      />
    </div>
  );
};

export default Nutricao;
