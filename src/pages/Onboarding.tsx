import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Flame,
  Dumbbell,
  Brain,
  Heart,
  DollarSign,
  Moon,
  Target,
  Zap,
  Shield,
  Wind,
  Anchor,
  Check,
  Plus,
  Coffee,
  BookOpen,
  Droplet,
  Footprints,
  Banknote,
  Sun,
  Pencil,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n, type Locale } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { track, trackOnce } from "@/hooks/useAnalytics";
import { trackEvent } from "@/lib/canonicalEvents";
import { writeOnboardingDraft } from "@/lib/onboardingDraft";

/* =============================================================
   ONBOARDING — Identity Hook → First Win → Commit
   Fully bilingual (PT-PT / EN-US). The locale chosen in step 1
   ("language") drives BOTH the onboarding UI from step 2 onwards
   AND the names of the materialized habits/metrics. PT users see
   a fully native experience; EN users see a fully English one.
   ============================================================= */

type Step = "language" | "identity" | "obstacle" | "focus" | "first-win" | "metric" | "commit";

type Bilingual = { "pt-PT": string; "en-US": string };
const pick = (b: Bilingual, locale: Locale) => b[locale] ?? b["en-US"];

/* ---------- IDENTITY ---------- */
const IDENTITY_OPTIONS: { id: string; label: Bilingual; desc: Bilingual; icon: any }[] = [
  { id: "disciplined", label: { "en-US": "More disciplined", "pt-PT": "Mais disciplinado" }, desc: { "en-US": "Show up. Every day.", "pt-PT": "Aparecer. Todos os dias." }, icon: Shield },
  { id: "healthier",   label: { "en-US": "Healthier",         "pt-PT": "Mais saudável" },     desc: { "en-US": "Move, eat, sleep better.", "pt-PT": "Mover, comer, dormir melhor." }, icon: Heart },
  { id: "stronger",    label: { "en-US": "Stronger mentally", "pt-PT": "Mente mais forte" },  desc: { "en-US": "Calm under pressure.", "pt-PT": "Calmo sob pressão." }, icon: Brain },
  { id: "organized",   label: { "en-US": "Financially organized", "pt-PT": "Organização financeira" }, desc: { "en-US": "In control of my money.", "pt-PT": "No controlo do meu dinheiro." }, icon: DollarSign },
  { id: "productive",  label: { "en-US": "More productive",   "pt-PT": "Mais produtivo" },    desc: { "en-US": "Deep work, less noise.", "pt-PT": "Trabalho profundo, menos ruído." }, icon: Target },
  { id: "consistent",  label: { "en-US": "Calm & consistent", "pt-PT": "Calmo e consistente" }, desc: { "en-US": "A steadier rhythm.", "pt-PT": "Um ritmo mais estável." }, icon: Anchor },
];

/* ---------- OBSTACLE ---------- */
const OBSTACLE_OPTIONS: { id: string; label: Bilingual }[] = [
  { id: "consistency",   label: { "en-US": "Lack of consistency",   "pt-PT": "Falta de consistência" } },
  { id: "motivation",    label: { "en-US": "Low motivation",        "pt-PT": "Pouca motivação" } },
  { id: "forgetfulness", label: { "en-US": "I forget",              "pt-PT": "Esqueço-me" } },
  { id: "structure",     label: { "en-US": "No structure",          "pt-PT": "Sem estrutura" } },
  { id: "distractions",  label: { "en-US": "Too many distractions", "pt-PT": "Demasiadas distrações" } },
  { id: "quit",          label: { "en-US": "Start strong, quit later", "pt-PT": "Começo forte, desisto depois" } },
];

/* ---------- FOCUS ---------- */
const FOCUS_OPTIONS: { id: string; label: Bilingual; desc: Bilingual; icon: any }[] = [
  { id: "habits",       label: { "en-US": "Habits",        "pt-PT": "Hábitos" },       desc: { "en-US": "Daily systems.",  "pt-PT": "Sistemas diários." }, icon: Flame },
  { id: "fitness",      label: { "en-US": "Fitness",       "pt-PT": "Fitness" },        desc: { "en-US": "Move with intent.", "pt-PT": "Mover com intenção." }, icon: Dumbbell },
  { id: "nutrition",    label: { "en-US": "Nutrition",     "pt-PT": "Nutrição" },       desc: { "en-US": "Eat on protocol.", "pt-PT": "Comer com protocolo." }, icon: Heart },
  { id: "productivity", label: { "en-US": "Productivity",  "pt-PT": "Produtividade" },  desc: { "en-US": "Deep work.",     "pt-PT": "Trabalho profundo." }, icon: Target },
  { id: "money",        label: { "en-US": "Money",         "pt-PT": "Dinheiro" },       desc: { "en-US": "Save & track.",  "pt-PT": "Poupar e seguir." }, icon: DollarSign },
  { id: "reset",        label: { "en-US": "Routine reset", "pt-PT": "Reset de rotina" }, desc: { "en-US": "Sleep & calm.",  "pt-PT": "Sono e calma." }, icon: Wind },
];

/* ---------- HABIT SUGGESTIONS (stable IDs, localized names) ---------- */
type HabitPreset = {
  id: string;
  name: Bilingual;
  icon: any;
  emoji: string;
  category: string;
  color: string;
};

const HABIT_SUGGESTIONS: Record<string, HabitPreset[]> = {
  habits: [
    { id: "plan-tomorrow", name: { "en-US": "Plan tomorrow tonight", "pt-PT": "Planear o dia seguinte" }, icon: BookOpen, emoji: "🗒️", category: "productivity", color: "#8b5cf6" },
    { id: "no-phone-am",   name: { "en-US": "No phone first hour",   "pt-PT": "Sem telemóvel ao acordar" }, icon: Sun,      emoji: "📵", category: "focus",        color: "#f59e0b" },
    { id: "read-daily",    name: { "en-US": "Read daily",            "pt-PT": "Ler diariamente" },          icon: BookOpen, emoji: "📚", category: "productivity", color: "#3b82f6" },
  ],
  fitness: [
    { id: "walk-10",  name: { "en-US": "10-min walk",   "pt-PT": "Caminhar 10 minutos" }, icon: Footprints, emoji: "🚶", category: "fitness", color: "#22c55e" },
    { id: "stretch",  name: { "en-US": "5-min stretch", "pt-PT": "Alongar 5 minutos" },   icon: Dumbbell,   emoji: "🧘", category: "fitness", color: "#22c55e" },
    { id: "workout",  name: { "en-US": "Train 30 min",  "pt-PT": "Treinar 30 minutos" },  icon: Dumbbell,   emoji: "🏋️", category: "fitness", color: "#22c55e" },
  ],
  nutrition: [
    { id: "water-am", name: { "en-US": "Drink water on waking", "pt-PT": "Beber água ao acordar" },     icon: Droplet, emoji: "💧", category: "health", color: "#06b6d4" },
    { id: "protein",  name: { "en-US": "Protein every meal",    "pt-PT": "Proteína em cada refeição" }, icon: Heart,   emoji: "🍳", category: "health", color: "#ef4444" },
    { id: "no-snack", name: { "en-US": "No snacks after 9pm",   "pt-PT": "Sem snacks depois das 21h" }, icon: Heart,   emoji: "🌙", category: "health", color: "#6366f1" },
  ],
  productivity: [
    { id: "deep-work",   name: { "en-US": "Deep work · 90 min",   "pt-PT": "Foco profundo · 90 min" },     icon: Target,   emoji: "🎯", category: "productivity", color: "#3b82f6" },
    { id: "single-task", name: { "en-US": "One task before email", "pt-PT": "Uma tarefa antes do email" }, icon: BookOpen, emoji: "✅", category: "productivity", color: "#3b82f6" },
    { id: "shutdown",    name: { "en-US": "End-of-day shutdown",  "pt-PT": "Encerrar o dia" },             icon: Moon,     emoji: "🛑", category: "productivity", color: "#64748b" },
  ],
  money: [
    { id: "save-2",        name: { "en-US": "Save €2 daily",   "pt-PT": "Poupar €2 por dia" },     icon: Banknote,   emoji: "💶", category: "finances", color: "#22c55e" },
    { id: "no-coffee-out", name: { "en-US": "Skip coffee out", "pt-PT": "Café só em casa" },        icon: Coffee,    emoji: "☕", category: "finances", color: "#a16207" },
    { id: "track-spend",   name: { "en-US": "Log one expense", "pt-PT": "Registar uma despesa" },  icon: DollarSign, emoji: "📊", category: "finances", color: "#22c55e" },
  ],
  reset: [
    { id: "sleep-early", name: { "en-US": "Sleep early",            "pt-PT": "Dormir cedo" },              icon: Moon, emoji: "😴", category: "sleep",       color: "#6366f1" },
    { id: "wake-same",   name: { "en-US": "Wake at the same time",  "pt-PT": "Acordar à mesma hora" },     icon: Sun,  emoji: "🌅", category: "sleep",       color: "#f59e0b" },
    { id: "breath",      name: { "en-US": "5 min of breathing",     "pt-PT": "5 minutos a respirar" },     icon: Wind, emoji: "🌬️", category: "mindfulness", color: "#8b5cf6" },
  ],
};

/* ---------- METRIC SUGGESTIONS ---------- */
type MetricPreset = {
  id: string;
  name: Bilingual;
  emoji: string;
  type: "increase" | "reduce" | "boolean";
  unit: Bilingual;
  unitPlural: Bilingual;
};

const METRIC_SUGGESTIONS: MetricPreset[] = [
  { id: "water",      name: { "en-US": "Water",      "pt-PT": "Água" },      emoji: "💧", type: "increase", unit: { "en-US": "glass",  "pt-PT": "copo" },    unitPlural: { "en-US": "glasses",  "pt-PT": "copos" } },
  { id: "steps",      name: { "en-US": "Steps",      "pt-PT": "Passos" },    emoji: "👣", type: "increase", unit: { "en-US": "step",   "pt-PT": "passo" },   unitPlural: { "en-US": "steps",    "pt-PT": "passos" } },
  { id: "sleep",      name: { "en-US": "Sleep",      "pt-PT": "Sono" },      emoji: "😴", type: "increase", unit: { "en-US": "hour",   "pt-PT": "hora" },    unitPlural: { "en-US": "hours",    "pt-PT": "horas" } },
  { id: "reading",    name: { "en-US": "Reading",    "pt-PT": "Leitura" },   emoji: "📚", type: "increase", unit: { "en-US": "page",   "pt-PT": "página" },  unitPlural: { "en-US": "pages",    "pt-PT": "páginas" } },
  { id: "meditation", name: { "en-US": "Meditation", "pt-PT": "Meditação" }, emoji: "🧘", type: "increase", unit: { "en-US": "minute", "pt-PT": "minuto" },  unitPlural: { "en-US": "minutes",  "pt-PT": "minutos" } },
  { id: "smoking",    name: { "en-US": "Smoking",    "pt-PT": "Cigarros" },  emoji: "🚬", type: "reduce",   unit: { "en-US": "cig",    "pt-PT": "cigarro" }, unitPlural: { "en-US": "cigs",     "pt-PT": "cigarros" } },
  { id: "alcohol",    name: { "en-US": "Alcohol",    "pt-PT": "Álcool" },    emoji: "🍺", type: "reduce",   unit: { "en-US": "drink",  "pt-PT": "bebida" },  unitPlural: { "en-US": "drinks",   "pt-PT": "bebidas" } },
];

/* Identity vectors used elsewhere */
const IDENTITY_TO_VECTORS: Record<string, string[]> = {
  disciplined: ["Disciplined"],
  healthier: ["Healthy"],
  stronger: ["Resilient", "Focused"],
  organized: ["Wealthy"],
  productive: ["Focused"],
  consistent: ["Consistent", "Calm"],
};

const IDENTITY_TAGLINE: Record<string, Bilingual> = {
  disciplined: { "en-US": "Built for disciplined people.",     "pt-PT": "Feito para quem aparece todos os dias." },
  healthier:   { "en-US": "Built for stronger bodies.",        "pt-PT": "Feito para corpos mais fortes." },
  stronger:    { "en-US": "Built for steadier minds.",         "pt-PT": "Feito para mentes mais calmas." },
  organized:   { "en-US": "Built for clear-headed money.",     "pt-PT": "Feito para dinheiro com clareza." },
  productive:  { "en-US": "Built for ambitious growth.",       "pt-PT": "Feito para crescer com intenção." },
  consistent:  { "en-US": "Built for stronger routines.",      "pt-PT": "Feito para rotinas mais firmes." },
};

/* ---------- UI strings ---------- */
const UI: Record<string, Bilingual> = {
  back:            { "en-US": "Back",                         "pt-PT": "Voltar" },
  identityKicker:  { "en-US": "// Identity",                  "pt-PT": "// Identidade" },
  identityTitle1:  { "en-US": "Who do you want",              "pt-PT": "Quem queres" },
  identityTitle2:  { "en-US": "to become?",                   "pt-PT": "tornar-te?" },
  identityHint:    { "en-US": "Pick one. Tap to continue.",   "pt-PT": "Escolhe uma. Toca para avançar." },
  obstacleKicker:  { "en-US": "// Honest check",              "pt-PT": "// Verdade nua" },
  obstacleTitle1:  { "en-US": "What gets",                    "pt-PT": "O que te" },
  obstacleTitle2:  { "en-US": "in your way?",                 "pt-PT": "atrapalha?" },
  obstacleHint:    { "en-US": "We design around it.",         "pt-PT": "Desenhamos à volta disso." },
  focusKicker:     { "en-US": "// Step 3 · Focus",            "pt-PT": "// Passo 3 · Foco" },
  focusTitle1:     { "en-US": "Choose your",                  "pt-PT": "Escolhe o teu" },
  focusTitle2:     { "en-US": "first focus.",                 "pt-PT": "primeiro foco." },
  focusHint:       { "en-US": "Pick up to 2. Less is more.",  "pt-PT": "Até 2. Menos é mais." },
  firstWinKicker:  { "en-US": "// Step 4 · First win",        "pt-PT": "// Passo 4 · Primeira vitória" },
  firstWinTitle1:  { "en-US": "Pick your",                    "pt-PT": "Escolhe o teu" },
  firstWinTitle2:  { "en-US": "first habit.",                 "pt-PT": "primeiro hábito." },
  firstWinHint:    { "en-US": "One tap. We handle the rest.", "pt-PT": "Um toque. Nós tratamos do resto." },
  firstWinFooter:  { "en-US": "Small wins compound. Start with one — add more later.", "pt-PT": "Pequenos passos. Nova identidade." },
  metricKicker:    { "en-US": "// Step 5 · Metrics",          "pt-PT": "// Passo 5 · Métricas" },
  metricTitle1:    { "en-US": "Track what",                   "pt-PT": "Acompanha o que" },
  metricTitle2:    { "en-US": "matters.",                     "pt-PT": "te importa." },
  metricHint:      { "en-US": "Optional. Pick one to monitor — or skip.", "pt-PT": "Opcional. Escolhe uma — ou avança." },
  languageKicker:  { "en-US": "// Step 6 · Language",         "pt-PT": "// Passo 6 · Idioma" },
  commitKicker:    { "en-US": "// System ready",              "pt-PT": "// Sistema pronto" },
  commitTitle1:    { "en-US": "Your system",                  "pt-PT": "O teu sistema" },
  commitTitle2:    { "en-US": "is ready.",                    "pt-PT": "está pronto." },
  enter:           { "en-US": "Begin evolution",              "pt-PT": "Começar evolução" },
  trial:           { "en-US": "7 days free · No card · Cancel anytime", "pt-PT": "7 dias grátis · Sem cartão · Cancelas quando quiseres" },
  upNext:          { "en-US": "Up next · Today",              "pt-PT": "A seguir · Hoje" },
  yourFirstHabit:  { "en-US": "Your first habit",             "pt-PT": "O teu primeiro hábito" },
  continueLabel:   { "en-US": "Continue",                     "pt-PT": "Continuar" },
  selected:        { "en-US": "selected",                     "pt-PT": "selecionado(s)" },
  skip:            { "en-US": "Skip for now",                 "pt-PT": "Saltar por agora" },
  customHabit:     { "en-US": "Create custom habit",          "pt-PT": "Criar hábito personalizado" },
  customMetric:    { "en-US": "Create custom metric",         "pt-PT": "Criar métrica personalizada" },
  customHabitPh:   { "en-US": "e.g. Meditate 10 min",         "pt-PT": "ex: Meditar 10 min" },
  customMetricPh:  { "en-US": "e.g. Coffees per day",         "pt-PT": "ex: Cafés por dia" },
  customHabitTitle:  { "en-US": "Name your habit",            "pt-PT": "Nomeia o teu hábito" },
  customMetricTitle: { "en-US": "Name your metric",           "pt-PT": "Nomeia a tua métrica" },
  customSave:      { "en-US": "Save",                         "pt-PT": "Guardar" },
  customCancel:    { "en-US": "Cancel",                       "pt-PT": "Cancelar" },
  taglineFallback: { "en-US": "Built for the person you're becoming.", "pt-PT": "Feito para a pessoa que te estás a tornar." },
  // Commit summary
  summaryIdentity: { "en-US": "Identity",                     "pt-PT": "Identidade" },
  summaryHabits:   { "en-US": "Habits",                       "pt-PT": "Hábitos" },
  summaryMetrics:  { "en-US": "Metrics",                      "pt-PT": "Métricas" },
  summaryFocus:    { "en-US": "Focus",                        "pt-PT": "Foco" },
  commitMantra:    { "en-US": "Consistency beats motivation.", "pt-PT": "A consistência vence a motivação." },
  todayBegins:     { "en-US": "Today begins everything.",     "pt-PT": "Hoje começa tudo." },
};

/* =============================================================
   COMPONENT
   ============================================================= */

const Onboarding = () => {
  const navigate = useNavigate();
  const { locale, setLocale } = useI18n();
  const { completeOnboarding } = useSubscription();

  const STEPS: Step[] = ["identity", "obstacle", "focus", "first-win", "metric", "language", "commit"];

  const [step, setStep] = useState<Step>("identity");
  const [accountLocale, setAccountLocale] = useState<Locale>("en-US");
  const [identity, setIdentity] = useState<string | null>(null);
  const [obstacle, setObstacle] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [habits, setHabits] = useState<string[]>([]);
  const [customHabit, setCustomHabit] = useState<string>("");
  const [metrics, setMetrics] = useState<string[]>([]);
  const [customMetric, setCustomMetric] = useState<string>("");

  const stepIndex = STEPS.indexOf(step);

  const goNext = () => {
    const i = stepIndex + 1;
    if (i < STEPS.length) setStep(STEPS[i]);
  };
  const goBack = () => {
    const i = stepIndex - 1;
    if (i >= 0) setStep(STEPS[i]);
  };

  const suggestedHabits = useMemo(() => {
    const keys = focus.length ? focus : ["habits"];
    const seen = new Set<string>();
    const out: HabitPreset[] = [];
    keys.forEach((k) => {
      (HABIT_SUGGESTIONS[k] || []).forEach((h) => {
        if (!seen.has(h.id)) {
          seen.add(h.id);
          out.push(h);
        }
      });
    });
    return out.slice(0, 6);
  }, [focus]);

  const ensureDefaultHabit = (list: HabitPreset[]) => {
    setHabits((prev) => (prev.length === 0 && list[0] ? [list[0].id] : prev));
  };

  const pickLanguage = (lng: Locale) => {
    setAccountLocale(lng);
    try { setLocale(lng); } catch { /* ignore */ }
    window.setTimeout(() => setStep("commit"), 220);
  };
  const pickIdentity = (id: string) => {
    setIdentity(id);
    window.setTimeout(() => setStep("obstacle"), 220);
  };
  const pickObstacle = (id: string) => {
    setObstacle(id);
    window.setTimeout(() => setStep("focus"), 220);
  };

  const toggleFocus = (id: string) =>
    setFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : prev.length < 2 ? [...prev, id] : prev,
    );

  const toggleHabit = (id: string) =>
    setHabits((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));

  const toggleMetric = (id: string) =>
    setMetrics((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const identityLabel = useMemo(
    () => {
      const opt = IDENTITY_OPTIONS.find((o) => o.id === identity);
      return opt ? pick(opt.label, accountLocale) : "";
    },
    [identity],
  );
  const focusLabels = useMemo(
    () => focus
      .map((f) => FOCUS_OPTIONS.find((o) => o.id === f))
      .filter(Boolean)
      .map((o) => pick(o!.label, accountLocale)),
    [focus],
  );
  const tagline = identity
    ? pick(IDENTITY_TAGLINE[identity] ?? UI.taglineFallback, accountLocale)
    : pick(UI.taglineFallback, accountLocale);

  const handleComplete = () => {
    // Habits payload — localized names. Only includes presets the user
    // explicitly selected. NO automatic fallback (avoids creating habits
    // the user never chose).
    const habitsToCreate: Array<Record<string, unknown>> = suggestedHabits
      .filter((h) => habits.includes(h.id))
      .map((preset) => ({
        nome: pick(preset.name, accountLocale),
        categoria: preset.category,
        cor: preset.color,
        active: true,
        scheduledDays: [],
        mode: "simple",
      }));

    // Append custom habit (raw user input, not translated)
    const customHabitName = customHabit.trim();
    if (customHabitName) {
      habitsToCreate.push({
        nome: customHabitName,
        categoria: "habits",
        cor: "#8b5cf6",
        active: true,
        scheduledDays: [],
        mode: "simple",
      });
    }

    // Metrics are now unified into the habits model with mode: "metric".
    // The legacy trackersToCreate array is kept empty for backward-compat
    // with any other consumer, but real creation happens via habitsToCreate.
    const trackersToCreate: Array<Record<string, unknown>> = [];
    METRIC_SUGGESTIONS.filter((m) => metrics.includes(m.id)).forEach((m) => {
      habitsToCreate.push({
        nome: pick(m.name, accountLocale),
        categoria: "metrics",
        cor: "#8b5cf6",
        active: true,
        scheduledDays: [],
        mode: "metric",
        type: m.type,
        inputMode: m.type === "boolean" ? "binary" : "incremental",
        unitSingular: pick(m.unit, accountLocale),
        unitPlural: pick(m.unitPlural, accountLocale),
        baseline: 0,
        valuePerUnit: 0,
        icon: m.emoji,
        frequency: "daily",
      });
    });
    const customMetricName = customMetric.trim();
    if (customMetricName) {
      habitsToCreate.push({
        nome: customMetricName,
        categoria: "metrics",
        cor: "#8b5cf6",
        active: true,
        scheduledDays: [],
        mode: "metric",
        type: "increase",
        inputMode: "incremental",
        unitSingular: "",
        unitPlural: "",
        baseline: 0,
        valuePerUnit: 0,
        icon: "📊",
        frequency: "daily",
      });
    }
    const finalHabitIds = habits;

    const identityVectors = identity ? IDENTITY_TO_VECTORS[identity] ?? [identityLabel] : [];

    const payload = {
      locale: accountLocale,
      improvementAreas: focus,
      identityVectors,
      selectedPresets: finalHabitIds.map((id) => `habit-${id}`),
      identityChoice: identity,
      obstacle,
      tagline,
      habitsToCreate,
      trackersToCreate,
    };

    try {
      writeOnboardingDraft(payload);
      localStorage.setItem("become-onboarding-complete", "true");
      localStorage.setItem("itero-onboarding-complete", "true");
      localStorage.setItem("become-first-session", "1");
    } catch {
      /* ignore */
    }

    trackOnce("onboarding_completed", "onboarding_completed", {
      identity,
      obstacle,
      focusCount: focus.length,
      habitsSeeded: habitsToCreate.length,
      metricsSeeded: habitsToCreate.filter((h) => h.mode === "metric").length,
      customHabit: !!customHabitName,
      customMetric: !!customMetricName,
      locale: accountLocale,
    });
    if (habitsToCreate.length > 0) {
      trackOnce("first_habit_created", "first_habit_created", {
        source: "onboarding",
        count: habitsToCreate.length,
      });
    }

    completeOnboarding({
      improvementAreas: focus,
      identityVectors,
      selectedPresets: finalHabitIds.map((id) => `habit-${id}`),
    });

    navigate("/auth?next=trial&firstSession=1");
  };

  const selectedHabitNames = useMemo(() => {
    const names = suggestedHabits
      .filter((h) => habits.includes(h.id))
      .map((h) => pick(h.name, accountLocale));
    if (customHabit.trim()) names.push(customHabit.trim());
    return names;
  }, [suggestedHabits, habits, customHabit, accountLocale]);

  const selectedMetricNames = useMemo(() => {
    const names = METRIC_SUGGESTIONS
      .filter((m) => metrics.includes(m.id))
      .map((m) => pick(m.name, accountLocale));
    if (customMetric.trim()) names.push(customMetric.trim());
    return names;
  }, [metrics, customMetric, accountLocale]);

  const firstHabitName =
    selectedHabitNames[0] ??
    (suggestedHabits[0] ? pick(suggestedHabits[0].name, accountLocale) : pick(UI.yourFirstHabit, accountLocale));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--neon-ultra) / 0.15), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--neon-toxic) / 0.08), transparent 60%)",
        }}
      />

      <header className="relative z-20 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={goBack}
            disabled={stepIndex === 0}
            className={cn(
              "h-9 w-9 -ml-1.5 flex items-center justify-center rounded-full transition-all",
              stepIndex === 0
                ? "opacity-0 pointer-events-none"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 active:scale-95",
            )}
            aria-label={pick(UI.back, accountLocale)}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  i <= stepIndex
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic)/0.7)]"
                    : "bg-foreground/10",
                )}
              />
            ))}
          </div>

          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground tabular-nums w-9 text-right">
            {stepIndex + 1}/{STEPS.length}
          </span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
          {step === "language" && (
            <StepLanguage value={accountLocale} onChange={pickLanguage} />
          )}
          {step === "identity" && (
            <StepIdentity locale={accountLocale} value={identity} onChange={pickIdentity} />
          )}
          {step === "obstacle" && (
            <StepObstacle locale={accountLocale} value={obstacle} onChange={pickObstacle} />
          )}
          {step === "focus" && (
            <StepFocus
              locale={accountLocale}
              value={focus}
              onToggle={toggleFocus}
              onContinue={() => {
                ensureDefaultHabit(suggestedHabits);
                goNext();
              }}
            />
          )}
          {step === "first-win" && (
            <StepFirstWin
              locale={accountLocale}
              suggestions={suggestedHabits}
              selected={habits}
              onToggle={toggleHabit}
              customValue={customHabit}
              onCustomChange={setCustomHabit}
              onContinue={goNext}
            />
          )}
          {step === "metric" && (
            <StepMetric
              locale={accountLocale}
              selected={metrics}
              onToggle={toggleMetric}
              customValue={customMetric}
              onCustomChange={setCustomMetric}
              onContinue={goNext}
            />
          )}
          {step === "commit" && (
            <StepCommit
              locale={accountLocale}
              identityLabel={identityLabel}
              focusLabels={focusLabels}
              habitNames={selectedHabitNames}
              metricNames={selectedMetricNames}
              firstHabitName={firstHabitName}
              tagline={tagline}
              onStart={handleComplete}
            />
          )}
        </div>
      </main>
    </div>
  );
};

/* =============================================================
   STEP 0 — Language (always shown in English; sets account locale)
   ============================================================= */
const LANGUAGE_OPTIONS: { id: Locale; label: string; native: string; flag: string }[] = [
  { id: "en-US", label: "English",    native: "English",    flag: "🇬🇧" },
  { id: "pt-PT", label: "Portuguese", native: "Português",  flag: "🇵🇹" },
];

const StepLanguage = ({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (lng: Locale) => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="text-center pt-4 pb-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        // Step 6 · Language
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-2 leading-tight">
        Choose your language
      </h1>
      <p className="text-sm text-muted-foreground/80">
        We tailor everything to it.
      </p>
    </div>

    <div className="grid gap-2.5 mb-6">
      {LANGUAGE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center gap-4 p-4 text-left border-2 transition-all duration-150 active:scale-[0.985] min-h-[64px]",
              selected
                ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.3)]"
                : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
            )}
          >
            <span className="text-2xl shrink-0" aria-hidden>{opt.flag}</span>
            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-bold tracking-tight", selected && "text-primary")}>
                {opt.native}
              </p>
              <p className="text-xs text-muted-foreground/75 mt-0.5">{opt.label}</p>
            </div>
            {selected && <Check className="h-5 w-5 text-primary shrink-0 animate-completion-pop" />}
          </button>
        );
      })}
    </div>
  </div>
);

/* =============================================================
   STEP 1 — Identity
   ============================================================= */
const StepIdentity = ({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: string | null;
  onChange: (id: string) => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="text-center pt-4 pb-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        {pick(UI.identityKicker, locale)}
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-2 leading-tight">
        {pick(UI.identityTitle1, locale)}<br />{pick(UI.identityTitle2, locale)}
      </h1>
      <p className="text-sm text-muted-foreground/80">{pick(UI.identityHint, locale)}</p>
    </div>

    <div className="grid gap-2.5 mb-6">
      {IDENTITY_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "group flex items-center gap-4 p-4 text-left border-2 transition-all duration-150 active:scale-[0.985] min-h-[64px]",
              selected
                ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.3)]"
                : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
            )}
          >
            <div
              className={cn(
                "h-11 w-11 shrink-0 flex items-center justify-center border transition-all duration-150",
                selected
                  ? "border-primary bg-primary/15"
                  : "border-foreground/10 bg-foreground/[0.03] group-hover:border-foreground/30",
              )}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-bold tracking-tight", selected && "text-primary")}>
                {pick(opt.label, locale)}
              </p>
              <p className="text-xs text-muted-foreground/75 mt-0.5">{pick(opt.desc, locale)}</p>
            </div>
            {selected && <Check className="h-5 w-5 text-primary shrink-0 animate-completion-pop" />}
          </button>
        );
      })}
    </div>
  </div>
);

/* =============================================================
   STEP 2 — Obstacle
   ============================================================= */
const StepObstacle = ({
  locale,
  value,
  onChange,
}: {
  locale: Locale;
  value: string | null;
  onChange: (id: string) => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="text-center pt-4 pb-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        {pick(UI.obstacleKicker, locale)}
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-2 leading-tight">
        {pick(UI.obstacleTitle1, locale)}<br />{pick(UI.obstacleTitle2, locale)}
      </h1>
      <p className="text-sm text-muted-foreground/80">{pick(UI.obstacleHint, locale)}</p>
    </div>

    <div className="grid gap-2.5 mb-6">
      {OBSTACLE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center justify-between gap-3 p-4 border-2 text-left transition-all duration-150 active:scale-[0.985] min-h-[60px]",
              selected
                ? "border-primary bg-primary/[0.10] shadow-[0_0_28px_hsl(var(--neon-toxic)/0.28)]"
                : "border-foreground/10 hover:border-foreground/30 bg-foreground/[0.015]",
            )}
          >
            <span className={cn("text-base font-semibold tracking-tight", selected && "text-primary")}>
              {pick(opt.label, locale)}
            </span>
            {selected ? (
              <Check className="h-5 w-5 text-primary animate-completion-pop" />
            ) : (
              <div className="h-5 w-5 border-2 border-foreground/15" />
            )}
          </button>
        );
      })}
    </div>
  </div>
);

/* =============================================================
   STEP 3 — Focus
   ============================================================= */
const StepFocus = ({
  locale,
  value,
  onToggle,
  onContinue,
}: {
  locale: Locale;
  value: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="text-center pt-4 pb-7">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        {pick(UI.focusKicker, locale)}
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
        {pick(UI.focusTitle1, locale)}<br />{pick(UI.focusTitle2, locale)}
      </h1>
      <p className="text-sm text-muted-foreground/85">{pick(UI.focusHint, locale)}</p>
    </div>

    <div className="grid grid-cols-2 gap-2.5 mb-6">
      {FOCUS_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value.includes(opt.id);
        const disabled = !selected && value.length >= 2;
        return (
          <button
            key={opt.id}
            onClick={() => !disabled && onToggle(opt.id)}
            disabled={disabled}
            className={cn(
              "flex flex-col items-start gap-2 p-4 border-2 text-left transition-all duration-200 active:scale-[0.98] min-h-[110px] relative",
              selected
                ? "border-primary bg-primary/[0.08] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.22)]"
                : disabled
                  ? "border-foreground/5 bg-foreground/[0.01] opacity-40"
                  : "border-foreground/10 hover:border-foreground/25 bg-foreground/[0.015]",
            )}
          >
            <Icon className={cn("h-5 w-5 transition-colors", selected ? "text-primary" : "text-muted-foreground")} />
            <p className={cn("text-base font-bold tracking-tight", selected && "text-primary")}>
              {pick(opt.label, locale)}
            </p>
            <p className="text-xs text-muted-foreground/75">{pick(opt.desc, locale)}</p>
            {selected && (
              <Check className="h-4 w-4 text-primary absolute top-3 right-3 animate-completion-pop" />
            )}
          </button>
        );
      })}
    </div>

    <ContinueBar locale={locale} disabled={value.length === 0} onClick={onContinue} />
  </div>
);

/* =============================================================
   STEP 4 — First habit (with custom)
   ============================================================= */
const StepFirstWin = ({
  locale,
  suggestions,
  selected,
  onToggle,
  customValue,
  onCustomChange,
  onContinue,
}: {
  locale: Locale;
  suggestions: HabitPreset[];
  selected: string[];
  onToggle: (id: string) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  onContinue: () => void;
}) => {
  const [showCustom, setShowCustom] = useState<boolean>(!!customValue);
  const totalCount = selected.length + (customValue.trim() ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-center pt-4 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
          {pick(UI.firstWinKicker, locale)}
        </p>
        <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
          {pick(UI.firstWinTitle1, locale)}<br />{pick(UI.firstWinTitle2, locale)}
        </h1>
        <p className="text-sm text-muted-foreground/85">{pick(UI.firstWinHint, locale)}</p>
      </div>

      <div className="grid gap-2.5 mb-3">
        {suggestions.map((h) => {
          const isOn = selected.includes(h.id);
          return (
            <button
              key={h.id}
              onClick={() => onToggle(h.id)}
              className={cn(
                "flex items-center gap-4 p-4 border-2 text-left transition-all duration-200 active:scale-[0.985] min-h-[64px]",
                isOn
                  ? "border-primary bg-primary/[0.08] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.22)]"
                  : "border-foreground/10 hover:border-foreground/25 bg-foreground/[0.015]",
              )}
            >
              <span className="text-2xl shrink-0" aria-hidden>{h.emoji}</span>
              <p className={cn("flex-1 text-base font-semibold tracking-tight", isOn && "text-primary")}>
                {pick(h.name, locale)}
              </p>
              <div
                className={cn(
                  "h-9 w-9 shrink-0 flex items-center justify-center border-2 transition-all",
                  isOn ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 text-muted-foreground",
                )}
              >
                {isOn ? <Check className="h-4 w-4 animate-completion-pop" /> : <Plus className="h-4 w-4" />}
              </div>
            </button>
          );
        })}

        {/* Custom habit */}
        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-4 p-4 border-2 border-dashed border-foreground/20 hover:border-primary text-left transition-all duration-200 active:scale-[0.985] min-h-[64px] bg-foreground/[0.01]"
          >
            <span className="text-2xl shrink-0" aria-hidden>✏️</span>
            <p className="flex-1 text-base font-semibold tracking-tight text-muted-foreground">
              {pick(UI.customHabit, locale)}
            </p>
            <div className="h-9 w-9 shrink-0 flex items-center justify-center border-2 border-foreground/15 text-muted-foreground">
              <Plus className="h-4 w-4" />
            </div>
          </button>
        ) : (
          <div className="border-2 border-primary/40 bg-primary/[0.04] p-4 flex items-center gap-3">
            <Pencil className="h-5 w-5 text-primary shrink-0" />
            <Input
              autoFocus
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder={pick(UI.customHabitPh, locale)}
              maxLength={60}
              className="flex-1"
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground/70 mb-4">
        {pick(UI.firstWinFooter, locale)}
      </p>

      <ContinueBar
        locale={locale}
        label={
          totalCount === 0
            ? pick(UI.skip, locale)
            : `${pick(UI.continueLabel, locale)} · ${totalCount} ${pick(UI.selected, locale)}`
        }
        disabled={false}
        onClick={onContinue}
      />
    </div>
  );
};

/* =============================================================
   STEP 5 — Metrics (with custom)
   ============================================================= */
const StepMetric = ({
  locale,
  selected,
  onToggle,
  customValue,
  onCustomChange,
  onContinue,
}: {
  locale: Locale;
  selected: string[];
  onToggle: (id: string) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  onContinue: () => void;
}) => {
  const [showCustom, setShowCustom] = useState<boolean>(!!customValue);
  const totalCount = selected.length + (customValue.trim() ? 1 : 0);

  return (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-center pt-4 pb-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
          {pick(UI.metricKicker, locale)}
        </p>
        <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
          {pick(UI.metricTitle1, locale)}<br />{pick(UI.metricTitle2, locale)}
        </h1>
        <p className="text-sm text-muted-foreground/85">{pick(UI.metricHint, locale)}</p>
      </div>

      <div className="grid gap-2.5 mb-3">
        {METRIC_SUGGESTIONS.map((m) => {
          const isOn = selected.includes(m.id);
          return (
            <button
              key={m.id}
              onClick={() => onToggle(m.id)}
              className={cn(
                "flex items-center gap-4 p-4 border-2 text-left transition-all duration-200 active:scale-[0.985] min-h-[64px]",
                isOn
                  ? "border-primary bg-primary/[0.08] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.22)]"
                  : "border-foreground/10 hover:border-foreground/25 bg-foreground/[0.015]",
              )}
            >
              <span className="text-2xl shrink-0" aria-hidden>{m.emoji}</span>
              <p className={cn("flex-1 text-base font-semibold tracking-tight", isOn && "text-primary")}>
                {pick(m.name, locale)}
              </p>
              <div
                className={cn(
                  "h-9 w-9 shrink-0 flex items-center justify-center border-2 transition-all",
                  isOn ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 text-muted-foreground",
                )}
              >
                {isOn ? <Check className="h-4 w-4 animate-completion-pop" /> : <Plus className="h-4 w-4" />}
              </div>
            </button>
          );
        })}

        {!showCustom ? (
          <button
            onClick={() => setShowCustom(true)}
            className="flex items-center gap-4 p-4 border-2 border-dashed border-foreground/20 hover:border-primary text-left transition-all duration-200 active:scale-[0.985] min-h-[64px] bg-foreground/[0.01]"
          >
            <span className="text-2xl shrink-0" aria-hidden>📊</span>
            <p className="flex-1 text-base font-semibold tracking-tight text-muted-foreground">
              {pick(UI.customMetric, locale)}
            </p>
            <div className="h-9 w-9 shrink-0 flex items-center justify-center border-2 border-foreground/15 text-muted-foreground">
              <Plus className="h-4 w-4" />
            </div>
          </button>
        ) : (
          <div className="border-2 border-primary/40 bg-primary/[0.04] p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary shrink-0" />
            <Input
              autoFocus
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              placeholder={pick(UI.customMetricPh, locale)}
              maxLength={60}
              className="flex-1"
            />
          </div>
        )}
      </div>

      <ContinueBar
        locale={locale}
        label={
          totalCount === 0
            ? pick(UI.skip, locale)
            : `${pick(UI.continueLabel, locale)} · ${totalCount} ${pick(UI.selected, locale)}`
        }
        disabled={false}
        onClick={onContinue}
      />
    </div>
  );
};

/* =============================================================
   STEP 6 — Commit
   ============================================================= */
const StepCommit = ({
  locale,
  identityLabel,
  focusLabels,
  habitNames,
  metricNames,
  firstHabitName,
  tagline,
  onStart,
}: {
  locale: Locale;
  identityLabel: string;
  focusLabels: string[];
  habitNames: string[];
  metricNames: string[];
  firstHabitName: string;
  tagline: string;
  onStart: () => void;
}) => {
  const summaryRows: { label: string; value: string; icon: any }[] = [];
  if (identityLabel) {
    summaryRows.push({
      label: pick(UI.summaryIdentity, locale),
      value: identityLabel,
      icon: Sparkles,
    });
  }
  if (focusLabels.length > 0) {
    summaryRows.push({
      label: pick(UI.summaryFocus, locale),
      value: focusLabels.join(" · "),
      icon: Target,
    });
  }
  if (habitNames.length > 0) {
    summaryRows.push({
      label: `${pick(UI.summaryHabits, locale)} · ${habitNames.length}`,
      value: habitNames.join(" · "),
      icon: Flame,
    });
  }
  if (metricNames.length > 0) {
    summaryRows.push({
      label: `${pick(UI.summaryMetrics, locale)} · ${metricNames.length}`,
      value: metricNames.join(" · "),
      icon: Activity,
    });
  }

  return (
    <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
      <div className="flex-1 flex flex-col items-center text-center pt-4 pb-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 -m-3 rounded-full bg-primary/20 blur-2xl animate-pulse" aria-hidden />
          <div
            className="relative h-16 w-16 flex items-center justify-center bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_50px_hsl(var(--neon-toxic)/0.7)]"
            style={{ animation: "float 4s ease-in-out infinite" }}
          >
            <Flame className="h-7 w-7" />
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
          {pick(UI.commitKicker, locale)}
        </p>
        <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
          {pick(UI.commitTitle1, locale)}<br />
          <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--neon-toxic) / 0.6)" }}>
            {pick(UI.commitTitle2, locale)}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground/85 max-w-[34ch] italic">{tagline}</p>

        {/* Personalized summary */}
        <div className="w-full mt-7 border border-foreground/10 divide-y divide-foreground/10">
          {summaryRows.map((row, i) => (
            <div
              key={row.label}
              className="bg-background p-4 flex items-start gap-3 text-left animate-in fade-in slide-in-from-bottom-1"
              style={{ animationDelay: `${120 + i * 90}ms`, animationFillMode: "both" }}
            >
              <div className="h-9 w-9 shrink-0 border border-primary/40 bg-primary/[0.08] flex items-center justify-center">
                <row.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-1">
                  {row.label}
                </p>
                <p className="text-sm font-bold tracking-tight text-foreground leading-snug break-words">
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Up-next pointer */}
        <div
          className="w-full mt-4 border-2 border-primary/40 bg-primary/[0.06] p-4 text-left flex items-center gap-3 animate-in fade-in slide-in-from-bottom-1"
          style={{ animationDelay: `${120 + summaryRows.length * 90 + 80}ms`, animationFillMode: "both" }}
        >
          <div className="h-9 w-9 shrink-0 border-2 border-primary bg-primary/15 flex items-center justify-center">
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-widest text-primary mb-0.5">
              {pick(UI.upNext, locale)}
            </p>
            <p className="text-sm font-bold tracking-tight truncate">{firstHabitName}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-primary shrink-0" />
        </div>

        <p className="mt-5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground/70">
          {pick(UI.todayBegins, locale)} · {pick(UI.commitMantra, locale)}
        </p>
      </div>

      <div className="space-y-2 pb-2">
        <Button
          size="lg"
          onClick={onStart}
          className="w-full gap-2"
        >
          {pick(UI.enter, locale)}
          <ArrowRight className="h-5 w-5" />
        </Button>
        <p className="text-center text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60">
          {pick(UI.trial, locale)}
        </p>
      </div>

      <style>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @media (prefers-reduced-motion: reduce){ [style*="animation: float"]{animation:none!important} }
      `}</style>
    </div>
  );
};

/* =============================================================
   Shared
   ============================================================= */
const ContinueBar = ({
  locale,
  onClick,
  disabled,
  label,
}: {
  locale: Locale;
  onClick: () => void;
  disabled: boolean;
  label?: string;
}) => (
  <div className="mt-auto pt-2 sticky bottom-0">
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className="w-full gap-2"
    >
      {label ?? pick(UI.continueLabel, locale)}
      <ArrowRight className="h-5 w-5" />
    </Button>
  </div>
);

export default Onboarding;
