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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nContext";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

/* =============================================================
   ONBOARDING — Identity Hook → First Win → Commit
   Goal: <90s, 1 decision per screen, immediate momentum.
   ============================================================= */

type Step = "identity" | "obstacle" | "focus" | "first-win" | "commit";

const IDENTITY_OPTIONS = [
  { id: "disciplined", label: "More disciplined", desc: "Show up. Every day.", icon: Shield },
  { id: "healthier", label: "Healthier", desc: "Move, eat, sleep better.", icon: Heart },
  { id: "stronger", label: "Stronger mentally", desc: "Calm under pressure.", icon: Brain },
  { id: "organized", label: "Financially organized", desc: "In control of my money.", icon: DollarSign },
  { id: "productive", label: "More productive", desc: "Deep work, less noise.", icon: Target },
  { id: "consistent", label: "Calm & consistent", desc: "A steadier rhythm.", icon: Anchor },
];

const OBSTACLE_OPTIONS = [
  { id: "consistency", label: "Lack of consistency" },
  { id: "motivation", label: "Low motivation" },
  { id: "forgetfulness", label: "I forget" },
  { id: "structure", label: "No structure" },
  { id: "distractions", label: "Too many distractions" },
  { id: "quit", label: "Start strong, quit later" },
];

const FOCUS_OPTIONS = [
  { id: "habits", label: "Habits", icon: Flame, desc: "Daily systems." },
  { id: "fitness", label: "Fitness", icon: Dumbbell, desc: "Move with intent." },
  { id: "nutrition", label: "Nutrition", icon: Heart, desc: "Eat on protocol." },
  { id: "productivity", label: "Productivity", icon: Target, desc: "Deep work." },
  { id: "money", label: "Money", icon: DollarSign, desc: "Save & track." },
  { id: "reset", label: "Routine reset", icon: Wind, desc: "Sleep & calm." },
];

/** Habit suggestions grouped by focus — 1-click adds. */
const HABIT_SUGGESTIONS: Record<
  string,
  { id: string; name: string; icon: any; emoji: string; category: string; color: string }[]
> = {
  habits: [
    { id: "plan-tomorrow", name: "Plan tomorrow tonight", icon: BookOpen, emoji: "🗒️", category: "productivity", color: "#8b5cf6" },
    { id: "no-phone-am", name: "No phone first hour", icon: Sun, emoji: "📵", category: "focus", color: "#f59e0b" },
    { id: "read-5", name: "Read 5 pages", icon: BookOpen, emoji: "📚", category: "productivity", color: "#3b82f6" },
  ],
  fitness: [
    { id: "walk-10", name: "10-min walk", icon: Footprints, emoji: "🚶", category: "fitness", color: "#22c55e" },
    { id: "stretch", name: "5-min stretch", icon: Dumbbell, emoji: "🧘", category: "fitness", color: "#22c55e" },
    { id: "workout", name: "Train 30 min", icon: Dumbbell, emoji: "🏋️", category: "fitness", color: "#22c55e" },
  ],
  nutrition: [
    { id: "water-am", name: "Drink water on waking", icon: Droplet, emoji: "💧", category: "health", color: "#06b6d4" },
    { id: "protein", name: "Protein with every meal", icon: Heart, emoji: "🍳", category: "health", color: "#ef4444" },
    { id: "no-snack", name: "No snacking after 9pm", icon: Heart, emoji: "🌙", category: "health", color: "#6366f1" },
  ],
  productivity: [
    { id: "deep-work", name: "Deep work · 90 min", icon: Target, emoji: "🎯", category: "productivity", color: "#3b82f6" },
    { id: "single-task", name: "One task before email", icon: BookOpen, emoji: "✅", category: "productivity", color: "#3b82f6" },
    { id: "shutdown", name: "End-of-day shutdown", icon: Moon, emoji: "🛑", category: "productivity", color: "#64748b" },
  ],
  money: [
    { id: "save-2", name: "Save €2 daily", icon: Banknote, emoji: "💶", category: "finances", color: "#22c55e" },
    { id: "no-coffee-out", name: "Skip coffee out", icon: Coffee, emoji: "☕", category: "finances", color: "#a16207" },
    { id: "track-spend", name: "Log one expense", icon: DollarSign, emoji: "📊", category: "finances", color: "#22c55e" },
  ],
  reset: [
    { id: "sleep-12", name: "Sleep before midnight", icon: Moon, emoji: "😴", category: "sleep", color: "#6366f1" },
    { id: "wake-same", name: "Wake at the same time", icon: Sun, emoji: "🌅", category: "sleep", color: "#f59e0b" },
    { id: "breath", name: "5 min of breathing", icon: Wind, emoji: "🌬️", category: "mindfulness", color: "#8b5cf6" },
  ],
};

/* Map identity choice → identity vector words used elsewhere in app */
const IDENTITY_TO_VECTORS: Record<string, string[]> = {
  disciplined: ["Disciplined"],
  healthier: ["Healthy"],
  stronger: ["Resilient", "Focused"],
  organized: ["Wealthy"],
  productive: ["Focused"],
  consistent: ["Consistent", "Calm"],
};

/** Dynamic identity tagline — drives emotional buy-in on the final screen. */
const IDENTITY_TAGLINE: Record<string, string> = {
  disciplined: "Built for disciplined people.",
  healthier: "Built for stronger bodies.",
  stronger: "Built for steadier minds.",
  organized: "Built for clear-headed money.",
  productive: "Built for ambitious growth.",
  consistent: "Built for stronger routines.",
};

/* =============================================================
   COMPONENT
   ============================================================= */

const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { completeOnboarding } = useSubscription();

  const STEPS: Step[] = ["identity", "obstacle", "focus", "first-win", "commit"];

  const [step, setStep] = useState<Step>("identity");
  const [identity, setIdentity] = useState<string | null>(null);
  const [obstacle, setObstacle] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]); // max 2
  const [habits, setHabits] = useState<string[]>([]); // habit ids

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const goNext = () => {
    const i = stepIndex + 1;
    if (i < STEPS.length) setStep(STEPS[i]);
  };
  const goBack = () => {
    const i = stepIndex - 1;
    if (i >= 0) setStep(STEPS[i]);
  };

  /* Suggested habits = union of selected focuses (fallback: habits) */
  const suggestedHabits = useMemo(() => {
    const keys = focus.length ? focus : ["habits"];
    const seen = new Set<string>();
    const out: typeof HABIT_SUGGESTIONS["habits"] = [];
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

  /* Preselect first suggested habit so user never lands on commit empty-handed */
  const ensureDefaultHabit = (list: typeof suggestedHabits) => {
    setHabits((prev) => (prev.length === 0 && list[0] ? [list[0].id] : prev));
  };

  /* Auto-advance after a single-select tap (saves a tap on identity & obstacle) */
  const pickIdentity = (id: string) => {
    setIdentity(id);
    window.setTimeout(() => setStep("obstacle"), 220);
  };
  const pickObstacle = (id: string) => {
    setObstacle(id);
    window.setTimeout(() => setStep("focus"), 220);
  };

  const toggleFocus = (id: string) => {
    setFocus((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : prev.length < 2 ? [...prev, id] : prev,
    );
  };

  const toggleHabit = (id: string) => {
    setHabits((prev) => (prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id]));
  };

  /* Map current selections into payload labels for summary */
  const identityLabel = useMemo(
    () => IDENTITY_OPTIONS.find((o) => o.id === identity)?.label ?? "",
    [identity],
  );
  const focusLabels = useMemo(
    () => focus.map((f) => FOCUS_OPTIONS.find((o) => o.id === f)?.label).filter(Boolean) as string[],
    [focus],
  );
  const tagline = identity
    ? IDENTITY_TAGLINE[identity] ?? "Built for the person you're becoming."
    : "Built for the person you're becoming.";

  const handleComplete = () => {
    // Build habits payload — fall back to first suggestion so user lands with momentum
    const finalHabitIds = habits.length > 0 ? habits : suggestedHabits[0] ? [suggestedHabits[0].id] : [];
    const habitsToCreate = suggestedHabits
      .filter((h) => finalHabitIds.includes(h.id))
      .map((preset) => ({
        nome: preset.name,
        categoria: preset.category,
        cor: preset.color,
        active: true,
        scheduledDays: [],
      }));

    const identityVectors = identity ? IDENTITY_TO_VECTORS[identity] ?? [identityLabel] : [];

    const payload = {
      improvementAreas: focus,
      identityVectors,
      selectedPresets: finalHabitIds.map((id) => `habit-${id}`),
      identityChoice: identity,
      obstacle,
      tagline,
      habitsToCreate,
      trackersToCreate: [],
    };

    try {
      localStorage.setItem("become-onboarding-data", JSON.stringify(payload));
      localStorage.setItem("become-onboarding-complete", "true");
      localStorage.setItem("itero-onboarding-complete", "true");
      // First-session flag for activation banner / scroll-to-first-habit
      localStorage.setItem("become-first-session", "1");
    } catch {
      /* ignore */
    }

    completeOnboarding({
      improvementAreas: focus,
      identityVectors,
      selectedPresets: finalHabitIds.map((id) => `habit-${id}`),
    });

    navigate("/auth?next=trial&firstSession=1");
  };

  /* ---------- shared layout chrome ---------- */
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col antialiased relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, hsl(var(--neon-ultra) / 0.15), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, hsl(var(--neon-toxic) / 0.08), transparent 60%)",
        }}
      />

      {/* Top bar: progress + back */}
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
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Segmented progress */}
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

      {/* Step content */}
      <main className="relative z-10 flex-1 flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col">
          {step === "identity" && (
            <StepIdentity value={identity} onChange={pickIdentity} />
          )}
          {step === "obstacle" && (
            <StepObstacle value={obstacle} onChange={pickObstacle} />
          )}
          {step === "focus" && <StepFocus value={focus} onToggle={toggleFocus} onContinue={() => { ensureDefaultHabit(suggestedHabits); goNext(); }} />}
          {step === "first-win" && (
            <StepFirstWin
              suggestions={suggestedHabits}
              selected={habits}
              onToggle={toggleHabit}
              onContinue={goNext}
            />
          )}
          {step === "commit" && (
            <StepCommit
              identityLabel={identityLabel}
              focusLabels={focusLabels}
              habitCount={habits.length}
              firstHabitName={
                (suggestedHabits.find((h) => habits.includes(h.id)) || suggestedHabits[0])?.name ?? "Your first habit"
              }
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
   STEP 1 — Identity Hook
   ============================================================= */

const StepIdentity = ({
  value,
  onChange,
  onContinue,
}: {
  value: string | null;
  onChange: (id: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="text-center pt-4 pb-7">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        // Step 1 · Identity
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
        Who do you want<br />to become?
      </h1>
      <p className="text-sm text-muted-foreground/85">Pick the version of you that matters most.</p>
    </div>

    <div className="grid gap-2.5 mb-6">
      {IDENTITY_OPTIONS.map((opt, i) => {
        const Icon = opt.icon;
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "group flex items-center gap-4 p-4 text-left border-2 transition-all duration-200 active:scale-[0.985] min-h-[64px]",
              selected
                ? "border-primary bg-primary/[0.08] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.25)]"
                : "border-foreground/10 hover:border-foreground/25 bg-foreground/[0.015]",
            )}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div
              className={cn(
                "h-11 w-11 shrink-0 flex items-center justify-center border transition-all duration-200",
                selected
                  ? "border-primary bg-primary/15"
                  : "border-foreground/10 bg-foreground/[0.03] group-hover:border-foreground/25",
              )}
            >
              <Icon className={cn("h-5 w-5", selected ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-bold tracking-tight", selected && "text-primary")}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">{opt.desc}</p>
            </div>
            {selected && (
              <Check className="h-5 w-5 text-primary shrink-0 animate-completion-pop" />
            )}
          </button>
        );
      })}
    </div>

    <ContinueBar disabled={!value} onClick={onContinue} />
  </div>
);

/* =============================================================
   STEP 2 — Current Reality (obstacle)
   ============================================================= */

const StepObstacle = ({
  value,
  onChange,
  onContinue,
}: {
  value: string | null;
  onChange: (id: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="text-center pt-4 pb-7">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        // Step 2 · Honest check
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
        What usually<br />gets in your way?
      </h1>
      <p className="text-sm text-muted-foreground/85">No judgment. We design around it.</p>
    </div>

    <div className="grid gap-2.5 mb-6">
      {OBSTACLE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex items-center justify-between gap-3 p-4 border-2 text-left transition-all duration-200 active:scale-[0.985] min-h-[60px]",
              selected
                ? "border-primary bg-primary/[0.08] shadow-[0_0_24px_hsl(var(--neon-toxic)/0.22)]"
                : "border-foreground/10 hover:border-foreground/25 bg-foreground/[0.015]",
            )}
          >
            <span className={cn("text-base font-semibold tracking-tight", selected && "text-primary")}>
              {opt.label}
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

    <ContinueBar disabled={!value} onClick={onContinue} />
  </div>
);

/* =============================================================
   STEP 3 — Focus (max 2)
   ============================================================= */

const StepFocus = ({
  value,
  onToggle,
  onContinue,
}: {
  value: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="text-center pt-4 pb-7">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        // Step 3 · Focus
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
        Choose your<br />first focus.
      </h1>
      <p className="text-sm text-muted-foreground/85">Pick up to 2. Less is more.</p>
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
            <Icon
              className={cn(
                "h-5 w-5 transition-colors",
                selected ? "text-primary" : "text-muted-foreground",
              )}
            />
            <p className={cn("text-base font-bold tracking-tight", selected && "text-primary")}>
              {opt.label}
            </p>
            <p className="text-xs text-muted-foreground/75">{opt.desc}</p>
            {selected && (
              <Check className="h-4 w-4 text-primary absolute top-3 right-3 animate-completion-pop" />
            )}
          </button>
        );
      })}
    </div>

    <ContinueBar disabled={value.length === 0} onClick={onContinue} />
  </div>
);

/* =============================================================
   STEP 4 — Build First Win
   ============================================================= */

const StepFirstWin = ({
  suggestions,
  selected,
  onToggle,
  onContinue,
}: {
  suggestions: { id: string; name: string; emoji: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  onContinue: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
    <div className="text-center pt-4 pb-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-3">
        // Step 4 · First win
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-3 leading-tight">
        Pick your<br />first habit.
      </h1>
      <p className="text-sm text-muted-foreground/85">One tap. We handle the rest.</p>
    </div>

    <div className="grid gap-2.5 mb-6">
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
            <span className="text-2xl shrink-0" aria-hidden>
              {h.emoji}
            </span>
            <p className={cn("flex-1 text-base font-semibold tracking-tight", isOn && "text-primary")}>
              {h.name}
            </p>
            <div
              className={cn(
                "h-9 w-9 shrink-0 flex items-center justify-center border-2 transition-all",
                isOn ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 text-muted-foreground",
              )}
            >
              {isOn ? (
                <Check className="h-4 w-4 animate-completion-pop" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </div>
          </button>
        );
      })}
    </div>

    <p className="text-center text-xs text-muted-foreground/70 mb-4">
      You can add more — or skip and start with one. Small wins compound.
    </p>

    <ContinueBar
      label={selected.length === 0 ? "Skip for now" : `Continue · ${selected.length} selected`}
      disabled={false}
      onClick={onContinue}
    />
  </div>
);

/* =============================================================
   STEP 5 — Commitment
   ============================================================= */

const StepCommit = ({
  identityLabel,
  focusLabels,
  habitCount,
  onStart,
}: {
  identityLabel: string;
  focusLabels: string[];
  habitCount: number;
  onStart: () => void;
}) => (
  <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
    <div className="flex-1 flex flex-col items-center justify-center text-center pt-6 pb-8">
      <div
        className="mb-7 h-16 w-16 flex items-center justify-center bg-primary text-primary-foreground border-2 border-primary shadow-[0_0_40px_hsl(var(--neon-toxic)/0.55)]"
        style={{ animation: "float 4s ease-in-out infinite" }}
      >
        <Flame className="h-7 w-7" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-4">
        // Commitment
      </p>
      <h1 className="type-display text-3xl sm:text-4xl mb-4 leading-tight">
        Small actions.<br />
        <span className="text-primary" style={{ textShadow: "0 0 40px hsl(var(--neon-toxic) / 0.55)" }}>
          New identity.
        </span>
      </h1>
      <p className="text-sm text-muted-foreground/85 max-w-[34ch]">
        This is how everything changes. Quietly. Daily.
      </p>

      {/* Summary card */}
      <div className="w-full mt-8 border-2 border-foreground/10 bg-foreground/[0.02] p-5 text-left space-y-4">
        <SummaryRow label="You're becoming" value={identityLabel || "—"} />
        <SummaryRow
          label="First focus"
          value={focusLabels.length ? focusLabels.join(" + ") : "Habits"}
        />
        <SummaryRow
          label="First habits"
          value={habitCount > 0 ? `${habitCount} ready to go` : "We'll suggest one"}
        />
      </div>
    </div>

    <div className="space-y-3 pb-2">
      <Button
        size="lg"
        onClick={onStart}
        className="press-tactile w-full h-14 text-base font-bold gap-2 shadow-[0_0_40px_hsl(var(--neon-toxic)/0.5)] hover:shadow-[0_0_60px_hsl(var(--neon-toxic)/0.75)] hover:scale-[1.02] transition-all duration-300"
      >
        Start My Journey
        <ArrowRight className="h-5 w-5" />
      </Button>
      <p className="text-center text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60">
        7 days free · No card · Cancel anytime
      </p>
    </div>

    <style>{`
      @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
      @media (prefers-reduced-motion: reduce){ [style*="animation: float"]{animation:none!important} }
    `}</style>
  </div>
);

/* =============================================================
   Shared bits
   ============================================================= */

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-4">
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="text-sm font-bold tracking-tight text-right">{value}</p>
  </div>
);

const ContinueBar = ({
  onClick,
  disabled,
  label = "Continue",
}: {
  onClick: () => void;
  disabled: boolean;
  label?: string;
}) => (
  <div className="mt-auto pt-2 sticky bottom-0">
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "press-tactile w-full h-14 text-base font-bold gap-2 transition-all duration-300",
        !disabled &&
          "shadow-[0_0_36px_hsl(var(--neon-toxic)/0.45)] hover:shadow-[0_0_56px_hsl(var(--neon-toxic)/0.7)] hover:scale-[1.01]",
      )}
    >
      {label}
      <ArrowRight className="h-5 w-5" />
    </Button>
  </div>
);

export default Onboarding;
