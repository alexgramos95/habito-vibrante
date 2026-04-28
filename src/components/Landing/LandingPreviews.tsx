import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Leaf,
  ShoppingCart,
  LayoutDashboard,
  User,
  Settings2,
  ShoppingBasket,
  Check,
  Flame,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  Zap,
  Activity,
  Target,
} from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";
import { cn } from "@/lib/utils";

/* ───────── Shared micro-motion hooks ─────────
 * Loops every ~5–7s so previews feel alive without becoming distracting.
 * Respects prefers-reduced-motion via CSS in animations themselves.
 */
const useLoopedToggle = (period = 5200, initial = false) => {
  const [on, setOn] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => setOn((v) => !v), period);
    return () => clearInterval(t);
  }, [period]);
  return on;
};

const useDelayedToggle = (delay: number, initial = false) => {
  const [on, setOn] = useState(initial);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return on;
};

/**
 * Landing previews — Truthful clones of the logged-in PRO experience.
 *
 * Hard rules:
 *  - Reuse real primitives (Surface, Button, BecomeLogo).
 *  - Mirror the real mobile chrome: BecomeLogo top bar (h-14 + container),
 *    PageHeader-style screen titles, and the actual bottom Navigation.
 *  - Copy the real directives, momentum copy, and metric card chrome from
 *    DayView + MinimalHabitCard.
 *  - Always render the PRO bottom nav (5 items) — landing sells PRO.
 *  - PT-PT only.
 *
 * If a primitive changes in the app (Surface tones, button radii, neon glow,
 * BecomeLogo lockup), these previews follow automatically.
 */

/* ───────── Phone frame (marketing chrome only) ───────── */

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const PhoneFrame = ({ children, className }: PhoneFrameProps) => (
  <div className={cn("relative mx-auto w-full max-w-[380px]", className)}>
    <div
      className="absolute -inset-10 pointer-events-none opacity-60"
      style={{
        background:
          "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.18), transparent 70%)",
      }}
    />
    <div className="relative rounded-[44px] border border-foreground/15 bg-card p-2 shadow-[0_30px_90px_-20px_hsl(var(--neon-ultra)/0.45)]">
      <div className="rounded-[36px] overflow-hidden bg-background border border-foreground/10">
        {children}
      </div>
    </div>
  </div>
);

/* ───────── Real app top bar (mirrors Navigation desktop chrome,
              compacted to mobile) ───────── */

const PreviewTopBar = () => (
  <div className="border-b border-foreground/10 bg-background/95 backdrop-blur-xl">
    <div className="flex h-14 items-center justify-between px-4">
      <div className="flex items-center gap-2.5">
        <BecomeLogo compact size="sm" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-black uppercase italic tracking-tighter text-foreground">
            becoMe
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/60">
            Operador
          </span>
        </div>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-foreground/15 bg-card text-[11px] font-black italic">
        M
      </div>
    </div>
  </div>
);

/* ───────── Real app bottom nav (clone of Navigation mobile) ───────── */

const PreviewBottomNav = ({
  active,
}: {
  active: "habits" | "calendar" | "nutrition" | "shopping" | "profile" | "none";
}) => {
  const items = [
    { id: "habits",    label: "Hábitos",    icon: LayoutDashboard },
    { id: "calendar",  label: "Calendário", icon: CalendarIcon },
    { id: "nutrition", label: "Nutrição",   icon: Leaf },
    { id: "shopping",  label: "Compras",    icon: ShoppingCart },
    { id: "profile",   label: "Perfil",     icon: User },
  ] as const;

  return (
    <div className="border-t-2 border-foreground/10 bg-background/98 backdrop-blur-xl">
      <div className="flex items-center justify-around py-1 px-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <div
              key={item.id}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-2.5 py-2 text-[10px] font-bold uppercase italic tracking-wider",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <div className="absolute inset-x-2 -top-px h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 not-italic",
                  isActive && "scale-110 drop-shadow-[0_0_6px_hsl(var(--neon-toxic))]",
                )}
              />
              <span className="truncate max-w-[64px]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ───────── PageHeader replica (icon tile + title + subtitle + actions) ───────── */

const PreviewPageHeader = ({
  icon: Icon,
  title,
  subtitle,
  actions,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) => (
  <header className="mb-5 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground/80 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
  </header>
);

/* ───────── Reusable real-shape habit row (mirror of MinimalHabitCard) ───────── */

const PreviewHabitRow = ({
  name,
  time,
  done = false,
  metric,
  reduce = false,
  color = "hsl(var(--primary))",
}: {
  name: string;
  time?: string;
  done?: boolean;
  metric?: { count: number; goal: number; unit: string };
  reduce?: boolean;
  color?: string;
}) => {
  const isMetric = !!metric;
  const fillPct = isMetric ? Math.min(100, (metric!.count / metric!.goal) * 100) : 0;
  const goalReached = isMetric && !reduce && metric!.count >= metric!.goal;
  const tone =
    isMetric ? (reduce ? "warning" : goalReached ? "active" : "default")
    : done ? "active"
    : "default";

  return (
    <Surface tone={tone} size="default" className="flex items-center gap-4 min-h-[72px]">
      {isMetric && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0",
            reduce ? "bg-warning/10" : "bg-primary/10",
          )}
          style={{ width: `${fillPct}%` }}
        />
      )}

      <div
        className={cn(
          "relative w-[3px] shrink-0 transition-all duration-300",
          done ? "h-12" : "h-10",
        )}
        style={{
          backgroundColor: color,
          opacity: done ? 1 : 0.55,
          boxShadow: done ? `0 0 10px ${color}` : undefined,
        }}
      />

      {isMetric ? (
        <div
          className={cn(
            "relative flex items-center justify-center w-11 h-11 border-2 shrink-0",
            reduce
              ? "border-warning/40 bg-warning/5 text-warning"
              : goalReached
              ? "bg-primary border-primary text-primary-foreground"
              : "border-foreground/20 bg-transparent text-foreground/60",
          )}
        >
          {reduce ? (
            <TrendingDown className="h-5 w-5 stroke-[2.5]" />
          ) : (
            <TrendingUp className="h-5 w-5 stroke-[2.5]" />
          )}
        </div>
      ) : (
        <div
          className={cn(
            "relative flex items-center justify-center w-11 h-11 border-2 shrink-0 transition-all duration-300",
            done
              ? "bg-primary border-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.55)]"
              : "border-foreground/20 bg-transparent",
          )}
        >
          <Check className={cn(
            "h-5 w-5 stroke-[3] transition-all duration-300",
            done ? "opacity-100 scale-100 animate-completion-pop" : "opacity-0 scale-75",
          )} />
        </div>
      )}

      <div className="relative flex-1 min-w-0 flex flex-col gap-0.5">
        <span
          className={cn(
            "text-left font-bold uppercase tracking-tight text-[14px] leading-tight",
            done ? "text-primary line-through decoration-primary/40" : "text-foreground",
          )}
        >
          {name}
        </span>
        {isMetric ? (
          <span
            className={cn(
              "text-[11px] font-mono tabular-nums tracking-tight",
              reduce ? "text-warning/80" : goalReached ? "text-primary" : "text-muted-foreground",
            )}
          >
            {metric!.count}
            <span className="opacity-50">/{metric!.goal}</span> {metric!.unit}
          </span>
        ) : time ? (
          <span className="font-mono text-[10px] text-muted-foreground">{time}</span>
        ) : null}
      </div>
    </Surface>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   1. HABITS / TODAY — clone of DayView (operator telemetry + directive +
   subsystems)
   ════════════════════════════════════════════════════════════════════════ */

export const HabitsPreview = () => {
  // Micro-motion: third habit auto-completes ~1.6s after mount,
  // momentum bar then advances 50% → 75%.
  const thirdDone = useDelayedToggle(1600);
  const momentumPct = thirdDone ? 75 : 50;
  const momentumLabel = thirdDone ? "3/4" : "2/4";
  return (
  <div className="flex flex-col">
    <PreviewTopBar />

    <div className="px-4 pt-5 pb-4 space-y-7">
      {/* Operator telemetry header */}
      <header className="space-y-5 border-b border-foreground/10 pb-6">
        <div className="flex items-center gap-3">
          <span className="size-2 bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            SISTEMA ATIVO · TERÇA, 28 DE ABRIL
          </span>
        </div>

        <div className="flex items-end justify-between gap-4">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
            NÍVEL{" "}
            <span className="text-primary drop-shadow-[0_0_8px_hsl(var(--neon-toxic))] tabular-nums">
              07
            </span>
          </h1>
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60">
              STREAK
            </div>
            <div className="text-2xl font-black italic tabular-nums text-accent drop-shadow-[0_0_8px_hsl(var(--neon-ultra))]">
              23<span className="text-xs text-muted-foreground/60 ml-1 not-italic">D</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-foreground tracking-tight">
              A construir momentum.
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 tabular-nums transition-all duration-500">
              {momentumLabel}
            </span>
          </div>
          <div className="h-1.5 bg-foreground/[0.06] relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-primary shadow-[0_0_12px_hsl(var(--neon-toxic)/0.7)] transition-[width] duration-[900ms] ease-out"
              style={{ width: `${momentumPct}%` }}
            />
          </div>
        </div>
      </header>

      {/* Directive — main mission */}
      <section className="relative">
        <div className="absolute -top-3 left-4 bg-background px-2 z-10">
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            DIRETIVA_MATINAL
          </span>
        </div>
        <div className="border-2 border-primary/50 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <span className="inline-block bg-primary text-primary-foreground px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest">
                PRIORIDADE
              </span>
              <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-tight">
                Trabalho profundo · 90 min
              </h2>
              <p className="text-[12px] text-muted-foreground leading-snug">
                Sistema em operação. Cumpre as ações pendentes antes do reset.
              </p>
            </div>
            <Zap className="h-7 w-7 text-primary shrink-0 drop-shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
          </div>
          <Button size="lg" className="w-full">
            EXECUTAR PROTOCOLO
          </Button>
        </div>
      </section>

      {/* Subsystems */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
            SUBSISTEMAS
          </span>
          <div className="h-px flex-1 bg-foreground/10" />
        </div>

        <div className="space-y-2">
          <PreviewHabitRow name="Treino matinal" time="06:30" done />
          <PreviewHabitRow name="Ler 20 min" time="07:15" done />
          <PreviewHabitRow name="Meditar" time="08:00" done={thirdDone} />
          <PreviewHabitRow name="Café" reduce metric={{ count: 3, goal: 5, unit: "chávenas" }} />
        </div>
      </section>
    </div>

    <PreviewBottomNav active="habits" />
  </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   2. CALENDAR — clone of Calendario monthly view
   ════════════════════════════════════════════════════════════════════════ */

export const CalendarPreview = () => {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const completePattern = new Set([1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 18, 20, 21, 22, 23, 25, 27, 28]);
  const partialPattern = new Set([4, 7, 12, 17, 19, 24, 26]);
  const todayDay = 28;

  return (
    <div className="flex flex-col">
      <PreviewTopBar />

      <div className="px-4 pt-5 pb-4 space-y-4">
        <PreviewPageHeader
          icon={CalendarIcon}
          title="Calendário"
          subtitle="Visualiza o teu progresso"
        />

        {/* Cycle hero (Calendario.tsx hero replica) */}
        <Surface tone="hero" size="hero" className="border-2 border-primary/40 shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)]">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2.5">
            // CICLO · ABR 2026
          </p>
          <div className="flex items-center gap-4">
            <div className="relative h-[68px] w-[68px] shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(89 / 100) * 94.25} 94.25`}
                  style={{ filter: "drop-shadow(0 0 6px hsl(var(--neon-toxic)))" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-black italic text-sm tabular-nums">89%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                DIAS PERFEITOS
              </p>
              <p className="font-black italic uppercase tracking-tighter text-2xl tabular-nums leading-none mt-1">
                21<span className="text-muted-foreground/50 text-sm">/28</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-primary">
                  <Flame className="h-3 w-3" /> 23D EM SEQUÊNCIA
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-accent">
                  <Sparkles className="h-3 w-3" /> PEAK
                </span>
              </div>
            </div>
          </div>
        </Surface>

        {/* Calendar grid — mirror of MonthlyCalendar */}
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
              <div key={i} className="py-1 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 1 }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map((d) => {
              const isComplete = completePattern.has(d);
              const isPartial = partialPattern.has(d);
              const isToday = d === todayDay;
              const isFuture = d > todayDay;
              return (
                <div
                  key={d}
                  className={cn(
                    "relative aspect-square flex items-center justify-center font-mono text-[10px] font-bold tabular-nums border",
                    isFuture && "opacity-30 border-foreground/5",
                    !isFuture && !isComplete && !isPartial && "border-foreground/10 bg-card/30 text-muted-foreground",
                    isPartial && "border-primary/40 bg-primary/15 text-primary",
                    isComplete && "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--neon-toxic)/0.5)]",
                    isToday && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                  )}
                >
                  {d}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PreviewBottomNav active="calendar" />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════
   3. NUTRITION — clone of Nutricao day view
   ════════════════════════════════════════════════════════════════════════ */

export const NutritionPreview = () => (
  <div className="flex flex-col">
    <PreviewTopBar />

    <div className="px-4 pt-5 pb-4 space-y-3">
      <PreviewPageHeader
        icon={Leaf}
        title="Nutrição"
        subtitle="Plano semanal personalizado"
        actions={
          <>
            <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
              <ShoppingBasket className="h-3.5 w-3.5" />
            </button>
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-foreground/10">
          Definição
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          4 refeições
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          2.200 kcal
        </span>
      </div>

      <div className="flex items-center justify-between border-y border-foreground/10 py-2">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Hoje</p>
          <p className="text-sm font-bold">Terça · 28 Abr</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <Surface tone="subtle" size="compact" className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Kcal</p>
          <p className="font-black italic text-sm tabular-nums">2140</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Prot</p>
          <p className="font-black italic text-sm tabular-nums text-primary">168</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">HC</p>
          <p className="font-black italic text-sm tabular-nums">210</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Gord</p>
          <p className="font-black italic text-sm tabular-nums">72</p>
        </div>
      </Surface>

      <div className="space-y-2">
        {[
          { meal: "Pequeno-almoço", item: "Aveia, frutos vermelhos, whey", kcal: 420, done: true },
          { meal: "Almoço", item: "Frango, arroz, legumes", kcal: 680, done: true },
          { meal: "Lanche", item: "Iogurte grego, amêndoas", kcal: 320, done: false },
          { meal: "Jantar", item: "Salmão, batata-doce", kcal: 720, done: false },
        ].map((m, i) => (
          <Surface
            key={i}
            tone={m.done ? "active" : "default"}
            size="compact"
            className="flex items-center gap-3"
          >
            <div className={cn(
              "flex items-center justify-center w-9 h-9 border-2 shrink-0",
              m.done
                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--neon-toxic)/0.5)]"
                : "border-foreground/20",
            )}>
              {m.done && <Check className="h-4 w-4 stroke-[3]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {m.meal}
              </p>
              <p className="text-[12px] font-semibold truncate">{m.item}</p>
            </div>
            <p className="font-mono text-[11px] text-primary tabular-nums shrink-0">{m.kcal}</p>
          </Surface>
        ))}
      </div>
    </div>

    <PreviewBottomNav active="nutrition" />
  </div>
);

/* ════════════════════════════════════════════════════════════════════════
   4. SHOPPING — clone of Compras
   ════════════════════════════════════════════════════════════════════════ */

export const ShoppingPreview = () => {
  const items = [
    { name: "Peito de frango", qty: "1.2 kg", cat: "Talho", done: true },
    { name: "Salmão fresco", qty: "600 g", cat: "Peixaria", done: true },
    { name: "Batata-doce", qty: "1 kg", cat: "Frutas e Legumes", done: false },
    { name: "Brócolos", qty: "2 un", cat: "Frutas e Legumes", done: false },
    { name: "Iogurte grego", qty: "4 un", cat: "Lacticínios", done: false },
    { name: "Amêndoas", qty: "200 g", cat: "Mercearia", done: false },
    { name: "Aveia integral", qty: "500 g", cat: "Mercearia", done: true },
  ];

  return (
    <div className="flex flex-col">
      <PreviewTopBar />

      <div className="px-4 pt-5 pb-4 space-y-3">
        <PreviewPageHeader
          icon={ShoppingCart}
          title="Compras"
          subtitle="Lista da semana"
          actions={
            <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />

        <Surface tone="subtle" size="compact" className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              PROGRESSO
            </p>
            <p className="text-base font-black italic tabular-nums">
              3<span className="text-muted-foreground/50 text-xs">/7</span>
            </p>
          </div>
          <div className="w-32 h-1.5 bg-foreground/10 overflow-hidden">
            <div className="h-full bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" style={{ width: "43%" }} />
          </div>
        </Surface>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <Surface
              key={i}
              tone={item.done ? "active" : "default"}
              size="compact"
              className="flex items-center gap-3"
            >
              <div className={cn(
                "flex items-center justify-center w-7 h-7 border-2 shrink-0",
                item.done
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--neon-toxic)/0.5)]"
                  : "border-foreground/20",
              )}>
                {item.done && <Check className="h-4 w-4 stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[12px] font-bold uppercase tracking-tight truncate",
                  item.done && "text-primary line-through decoration-primary/40",
                )}>
                  {item.name}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground truncate">
                  {item.cat}
                </p>
              </div>
              <p className="font-mono text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {item.qty}
              </p>
            </Surface>
          ))}
        </div>
      </div>

      <PreviewBottomNav active="shopping" />
    </div>
  );
};
