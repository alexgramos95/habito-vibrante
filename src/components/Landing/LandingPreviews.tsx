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
  Activity,
  Target,
  Zap,
  ListChecks,
  Trophy,
  Camera,
  ReceiptText,
} from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { BecomeLogo } from "@/components/Brand/BecomeLogo";
import { cn } from "@/lib/utils";

/* ───────── Shared micro-motion hooks ───────── */
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
 * Landing previews — Truthful clones of the real mobile PRO experience.
 *
 * These mirror the mobile shell exactly as captured in production
 * screenshots: a single brand row at the top, followed by a horizontal
 * icon-over-label nav row that includes Perfil. There is NO bottom nav
 * in the previews because the previews represent the mobile in-app top
 * navigation users see after login.
 */

/* ───────── Phone frame (marketing chrome only) ───────── */

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

export const PhoneFrame = ({ children, className }: PhoneFrameProps) => (
  <div className={cn("relative mx-auto w-full max-w-[380px] aspect-[390/844]", className)}>
    <div
      className="absolute inset-0 pointer-events-none opacity-60 blur-2xl"
      style={{
        background:
          "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.18), transparent 70%)",
      }}
    />
    <div className="relative h-full rounded-[44px] border border-foreground/15 bg-card p-2 shadow-[0_30px_90px_-20px_hsl(var(--neon-ultra)/0.45)]">
      <div className="h-full rounded-[36px] overflow-hidden bg-background border border-foreground/10 [&>*]:h-full">
        {children}
      </div>
    </div>
  </div>
);

/* ───────── Real mobile top navigation (1:1 with screenshots) ─────────
 * Row 1: BecomeLogo lockup ("B + BECOME") only — no profile chip.
 * Row 2: 5 nav items (Hábitos, Calendário, Nutrição, Compras, Perfil),
 *        icon-stacked-over-label, with a top neon underline + neon glow on
 *        the active item.
 */

const PreviewTopNav = ({
  active,
}: {
  active: "habits" | "calendar" | "nutrition" | "shopping" | "profile" | "none";
}) => {
  const items = [
    { id: "habits",    label: "HABITS",    icon: LayoutDashboard },
    { id: "calendar",  label: "CALENDAR",  icon: CalendarIcon },
    { id: "nutrition", label: "NUTRITION", icon: Leaf },
    { id: "shopping",  label: "SHOPPING",  icon: ShoppingCart },
    { id: "profile",   label: "PROFILE",   icon: User },
  ] as const;

  return (
    <div className="bg-background">
      {/* Brand row */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <BecomeLogo compact size="sm" />
        <span className="ml-2 text-base font-black uppercase italic tracking-tighter text-foreground">
          BECOME
        </span>
      </div>

      {/* Nav row */}
      <div className="flex items-stretch border-b border-foreground/10 px-1">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <div
              key={item.id}
              className={cn(
                "relative flex-1 flex flex-col items-center gap-1 py-2 text-[9px] font-black italic uppercase tracking-wider",
                isActive ? "text-primary" : "text-muted-foreground/80",
              )}
            >
              {isActive && (
                <span className="absolute inset-x-2 -top-px h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 not-italic",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--neon-toxic))]",
                )}
              />
              <span className="truncate max-w-full px-0.5">{item.label}</span>
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
  iconColor = "text-primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  iconColor?: string;
}) => (
  <header className="mb-4 flex items-start justify-between gap-3">
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <Icon className={cn("h-6 w-6 shrink-0", iconColor)} />
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground truncate leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground/80 mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </header>
);

/* ───────── Neon yellow icon button (real app action chip) ───────── */
const NeonIconButton = ({
  icon: Icon,
}: {
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <button className="flex items-center justify-center h-10 w-12 rounded-xl bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
    <Icon className="h-4 w-4" />
  </button>
);

/* ───────── Habit row (mirror of MinimalHabitCard) ───────── */

const PreviewHabitRow = ({
  name,
  time,
  done = false,
  metric,
  reduce = false,
  color = "hsl(var(--primary))",
  highlightActive = false,
}: {
  name: string;
  time?: string;
  done?: boolean;
  metric?: { count: number; goal: number; unit: string };
  reduce?: boolean;
  color?: string;
  highlightActive?: boolean;
}) => {
  const isMetric = !!metric;
  const fillPct = isMetric ? Math.min(100, (metric!.count / metric!.goal) * 100) : 0;
  const goalReached = isMetric && !reduce && metric!.count >= metric!.goal;
  const tone =
    isMetric ? (reduce ? "warning" : goalReached ? "active" : "default")
    : done || highlightActive ? "active"
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
            done ? "text-primary" : "text-foreground",
            time && done && "text-primary",
          )}
        >
          {name}{time && <span className="ml-2">{time}</span>}
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
        ) : null}
      </div>
    </Surface>
  );
};

/* ────────────────────────────────────────────────────────────────────
   1. HABITS — clone of real mobile Hábitos page
   ──────────────────────────────────────────────────────────────────── */

export const HabitsPreview = () => {
  // Micro-motion: second habit auto-completes ~1.6s after mount.
  const secondDone = useDelayedToggle(1600);
  const ritualsDone = secondDone ? 2 : 1;

  return (
    <div className="flex flex-col">
      <PreviewTopNav active="habits" />

      <div className="px-4 pt-5 pb-4 space-y-5">
        <PreviewPageHeader
          icon={LayoutDashboard}
          title="Habits"
          subtitle="5 habits today"
          actions={
            <>
              <NeonIconButton icon={ListChecks} />
              <NeonIconButton icon={Plus} />
            </>
          }
        />

        {/* Welcome / momentum hero */}
        <Surface tone="hero" size="hero" className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
              ACTIVE
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-[22px] font-bold tracking-tight leading-[1.15] text-foreground">
              Welcome back. Momentum is waiting.
            </h2>
            <p className="text-[13px] text-muted-foreground">
              You're more disciplined every day.
            </p>
          </div>

          {/* Stat trio */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Target, label: "CONSISTENCY", value: "62%" },
              { icon: Trophy, label: "WINS",        value: "8" },
              { icon: TrendingUp, label: "MOMENTUM", value: "62" },
            ].map((s) => (
              <div
                key={s.label}
                className="border border-foreground/10 bg-background/40 p-2.5 rounded-md"
              >
                <div className="flex items-center gap-1 mb-1">
                  <s.icon className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </span>
                </div>
                <p className="text-xl font-bold tabular-nums text-foreground leading-none">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <Button size="lg" className="w-full">
            START FIRST ACTION ›
          </Button>
        </Surface>

        {/* Rituals section */}
        <section className="space-y-2.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 px-1 transition-all duration-500">
            RITUALS · {ritualsDone}/3
          </p>
          <div className="space-y-2">
            <PreviewHabitRow name="MEDITATE" time="06:45" done color="hsl(265 70% 60%)" />
            <PreviewHabitRow name="READ 20 MIN" time="08:15" done={secondDone} color="hsl(195 80% 55%)" />
            <PreviewHabitRow name="JOURNAL" time="22:00" color="hsl(340 75% 60%)" />
          </div>
        </section>

        {/* Metrics section */}
        <section className="space-y-2.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/70 px-1">
            METRICS · 1/2 ON TRACK
          </p>
          <PreviewHabitRow
            name="Water"
            metric={{ count: 6, goal: 8, unit: "glasses" }}
            color="hsl(195 85% 55%)"
          />
        </section>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   2. CALENDAR — clone of real mobile Calendário page (Mês view)
   ──────────────────────────────────────────────────────────────────── */

export const CalendarPreview = () => {
  // Build April 2026: starts Wed (1=Wed), 30 days. Week starts Mon → 2 padding cells.
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const padCount = 2;
  const todayDay = 29;

  // Realistic data: ratios per day mostly 1/5, 1/4, 2/4 etc.
  const dayData: Record<number, { c: number; t: number }> = {
    1: { c: 3, t: 4 }, 2: { c: 4, t: 4 }, 3: { c: 2, t: 4 }, 4: { c: 1, t: 2 }, 5: { c: 2, t: 3 },
    6: { c: 4, t: 4 }, 7: { c: 3, t: 4 }, 8: { c: 4, t: 4 }, 9: { c: 2, t: 4 }, 10: { c: 3, t: 4 }, 11: { c: 2, t: 2 }, 12: { c: 3, t: 3 },
    13: { c: 4, t: 4 }, 14: { c: 3, t: 4 }, 15: { c: 4, t: 4 }, 16: { c: 4, t: 4 }, 17: { c: 2, t: 4 }, 18: { c: 1, t: 2 }, 19: { c: 3, t: 3 },
    20: { c: 4, t: 4 }, 21: { c: 3, t: 4 }, 22: { c: 4, t: 4 }, 23: { c: 3, t: 4 }, 24: { c: 4, t: 4 }, 25: { c: 2, t: 2 }, 26: { c: 2, t: 3 },
    27: { c: 4, t: 4 }, 28: { c: 4, t: 4 }, 29: { c: 3, t: 4 }, 30: { c: 0, t: 0 },
  };

  return (
    <div className="flex flex-col">
      <PreviewTopNav active="calendar" />

      <div className="px-4 pt-5 pb-4 space-y-4">
        <PreviewPageHeader
          icon={CalendarIcon}
          title="Calendar"
          subtitle="Track your progress"
          actions={
            <div className="inline-flex items-center gap-1 p-1 bg-secondary/60 border border-foreground/10 rounded-xl">
              {["DAY", "WEEK", "MONTH"].map((label) => {
                const isActive = label === "MONTH";
                return (
                  <span
                    key={label}
                    className={cn(
                      "h-7 px-2.5 inline-flex items-center justify-center rounded-lg font-bold uppercase italic tracking-tight text-[10px]",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]"
                        : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          }
        />

        {/* Cycle hero */}
        <div className="border-2 border-primary/50 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
            // CYCLE · APR 2026
          </p>
          <div className="flex items-center gap-4">
            <div className="relative h-[60px] w-[60px] shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--foreground) / 0.08)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15" fill="none"
                  stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(55 / 100) * 94.25} 94.25`}
                  style={{ filter: "drop-shadow(0 0 6px hsl(var(--neon-toxic)))" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-bold text-[12px] tabular-nums">55%</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                PERFECT DAYS
              </p>
              <p className="font-black italic tracking-tighter text-3xl tabular-nums leading-none mt-1">
                16<span className="text-muted-foreground/50 text-base">/29</span>
              </p>
            </div>
          </div>
        </div>

        {/* MonthSelector replica */}
        <div className="flex items-center justify-between gap-2 border-2 border-foreground/15 bg-card/60 p-1.5 shadow-[3px_3px_0_0_hsl(var(--neon-ultra)/0.3)]">
          <div className="flex h-8 w-8 items-center justify-center border border-foreground/20 bg-background/50">
            <ChevronLeft className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground/70">
              // CYCLE
            </span>
            <h2 className="font-black italic uppercase tracking-tighter text-base leading-none text-foreground">
              APRIL <span className="text-primary">2026</span>
            </h2>
          </div>
          <div className="flex h-8 w-8 items-center justify-center border border-foreground/20 bg-background/50">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
          <div className="flex h-8 items-center gap-1 border-2 border-primary/50 bg-primary/10 px-2 font-mono text-[9px] font-bold uppercase tracking-widest text-primary">
            <CalendarIcon className="h-2.5 w-2.5" />
            TODAY
          </div>
        </div>

        {/* Calendar grid */}
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d, i) => (
              <div key={i} className="py-1 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: padCount }).map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map((d) => {
              const data = dayData[d];
              const isToday = d === todayDay;
              const isFuture = d > todayDay;
              const hasData = data && data.t > 0;
              const isPartial = hasData && data.c > 0;
              return (
                <div
                  key={d}
                  className={cn(
                    "relative aspect-square flex flex-col items-center justify-center font-mono tabular-nums border rounded-sm",
                    isFuture && "opacity-30 border-transparent text-muted-foreground/50",
                    !isFuture && !isPartial && "border-transparent text-muted-foreground/40",
                    !isFuture && isPartial && "border-primary/40 bg-primary/15 text-primary",
                    isToday && "border-primary border-2 bg-primary/20 text-primary shadow-[0_0_8px_hsl(var(--neon-toxic)/0.3)]",
                  )}
                >
                  <span className="text-[12px] font-bold leading-none">{d}</span>
                  {!isFuture && hasData && (
                    <span className="text-[8px] opacity-70 leading-none mt-0.5">
                      {data.c}/{data.t}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary" /> Complete
            </span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-primary/40" /> Partial
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   3. NUTRITION
   ──────────────────────────────────────────────────────────────────── */

export const NutritionPreview = () => (
  <div className="flex flex-col">
    <PreviewTopNav active="nutrition" />

    <div className="px-4 pt-5 pb-4 space-y-3">
      <PreviewPageHeader
        icon={Leaf}
        title="Nutrition"
        subtitle="Personalized weekly plan"
        actions={
          <>
            <NeonIconButton icon={Settings2} />
            <NeonIconButton icon={ShoppingBasket} />
          </>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-foreground/10">
          Cutting
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          4 meals
        </span>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          2,200 kcal
        </span>
      </div>

      <div className="flex items-center justify-between border-y border-foreground/10 py-2">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Today</p>
          <p className="text-sm font-bold">Tue · Apr 28</p>
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
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Carbs</p>
          <p className="font-black italic text-sm tabular-nums">210</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Fat</p>
          <p className="font-black italic text-sm tabular-nums">72</p>
        </div>
      </Surface>

      <div className="space-y-2">
        {[
          { meal: "Breakfast", item: "Oats, berries, whey",        kcal: 420, done: true },
          { meal: "Lunch",     item: "Chicken, rice, vegetables",  kcal: 680, done: true },
          { meal: "Snack",     item: "Greek yogurt, almonds",      kcal: 320, done: false },
          { meal: "Dinner",    item: "Salmon, sweet potato",       kcal: 720, done: false },
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
  </div>
);

/* ────────────────────────────────────────────────────────────────────
   4. SHOPPING
   ──────────────────────────────────────────────────────────────────── */

export const ShoppingPreview = () => {
  const extraDone = useDelayedToggle(2000);
  const baseItems = [
    { name: "Chicken breast",   qty: "1.2 kg", cat: "Butcher",     done: true },
    { name: "Fresh salmon",     qty: "600 g",  cat: "Fishmonger",  done: true },
    { name: "Sweet potato",     qty: "1 kg",   cat: "Produce",     done: false, animate: true },
    { name: "Broccoli",         qty: "2 pcs",  cat: "Produce",     done: false },
    { name: "Greek yogurt",     qty: "4 pcs",  cat: "Dairy",       done: false },
    { name: "Almonds",          qty: "200 g",  cat: "Pantry",      done: false },
    { name: "Rolled oats",      qty: "500 g",  cat: "Pantry",      done: true },
  ];
  const items = baseItems.map((it) =>
    it.animate ? { ...it, done: extraDone } : it,
  );
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = (completed / total) * 100;

  return (
    <div className="flex flex-col">
      <PreviewTopNav active="shopping" />

      <div className="px-4 pt-5 pb-4 space-y-4">
        <PreviewPageHeader
          icon={ShoppingCart}
          title="Shopping"
          subtitle="Monthly: 142.80 €"
          actions={
            <>
              <NeonIconButton icon={ReceiptText} />
              <NeonIconButton icon={Plus} />
            </>
          }
        />

        {/* Weekly Telemetry Hero — mirrors INVENTÁRIO SEMANAL */}
        <div className="border-2 border-primary/40 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-3">
            // WEEKLY INVENTORY
          </p>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                TOTAL COST
              </p>
              <p className="font-black italic uppercase tracking-tighter text-2xl text-foreground tabular-nums">
                38.40 €
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                EXECUTED
              </p>
              <p className="font-black italic uppercase tracking-tighter text-xl text-primary tabular-nums">
                21.60 €
              </p>
            </div>
          </div>
          <div className="h-1.5 bg-foreground/5 border border-foreground/10 overflow-hidden">
            <div
              className="h-full bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic)/0.6)] transition-[width] duration-[900ms] ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mt-2 tabular-nums">
            {completed}/{total} ITEMS · {Math.round(pct)}%
          </p>
        </div>

        {/* Week selector */}
        <div className="flex items-center justify-between">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[12px] font-medium text-foreground">Week of April 27</p>
            <p className="text-[10px] font-bold text-primary">This week</p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-1.5">
          {items.map((item, i) => (
            <Surface
              key={i}
              tone={item.done ? "active" : "default"}
              size="compact"
              className="flex items-center gap-3"
            >
              <div className={cn(
                "flex items-center justify-center w-7 h-7 border-2 shrink-0 transition-all duration-300",
                item.done
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--neon-toxic)/0.5)]"
                  : "border-foreground/20",
              )}>
                <Check className={cn(
                  "h-4 w-4 stroke-[3] transition-all duration-300",
                  item.done ? "opacity-100 scale-100" : "opacity-0 scale-50",
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[12px] font-bold uppercase tracking-tight truncate transition-colors duration-300",
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
    </div>
  );
};

/* ────────────────────────────────────────────────────────────────────
   5. PROGRESS — clone of MonthView
   ──────────────────────────────────────────────────────────────────── */

export const ProgressPreview = () => {
  const data = [
    35, 42, 38, 50, 48, 55, 60, 58, 62, 70,
    65, 72, 78, 74, 80, 82, 78, 85, 88, 84,
    90, 92, 88, 94, 91, 95, 97, 93, 96, 98,
  ];
  const max = Math.max(...data);
  const w = 320;
  const h = 80;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - (v / max) * h}`).join(" ");
  const areaPath = `M0,${h} L${points} L${w},${h} Z`;
  const linePath = `M${points}`;

  const pulse = useLoopedToggle(1400, true);

  return (
    <div className="flex flex-col">
      <PreviewTopNav active="none" />

      <div className="px-4 pt-5 pb-4 space-y-5">
        <PreviewPageHeader
          icon={Activity}
          title="Progress"
          subtitle="Cycle reading"
        />

        <div className="flex items-center justify-between border-y-2 border-foreground/10 py-3">
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              CYCLE
            </p>
            <h2 className="text-xl font-black italic uppercase tracking-tighter">
              April 2026
            </h2>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              // CONSISTENCY
            </p>
            <span className="font-black italic tabular-nums text-primary text-lg drop-shadow-[0_0_8px_hsl(var(--neon-toxic))]">
              98%
            </span>
          </div>
          <Surface tone="subtle" size="compact" className="overflow-hidden">
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
              <defs>
                <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={areaPath} fill="url(#spark)" />
              <path
                d={linePath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: "drop-shadow(0 0 4px hsl(var(--neon-toxic)))" }}
              />
              <circle
                cx={w}
                cy={h - (data[data.length - 1] / max) * h}
                r={pulse ? 4 : 3}
                fill="hsl(var(--primary))"
                style={{
                  filter: "drop-shadow(0 0 6px hsl(var(--neon-toxic)))",
                  transition: "r 700ms ease-in-out",
                }}
              />
            </svg>
          </Surface>
        </div>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground px-1">
            // READING
          </p>
          <div className="border-l-2 border-primary/60 bg-card/50 p-3">
            <p className="text-[12px] text-foreground/90 leading-relaxed">
              Most consistent month so far. Training and reading sustained 23 days in a row.
            </p>
          </div>
          <div className="border-l-2 border-primary/60 bg-card/50 p-3">
            <p className="text-[12px] text-foreground/90 leading-relaxed">
              Coffee reduced by <span className="text-primary font-bold tabular-nums">38%</span> compared to the previous cycle.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Flame, label: "Streak", value: "23D" },
            { icon: TrendingUp, label: "Level", value: "07" },
            { icon: Target, label: "Days", value: "21/28" },
          ].map((k, i) => (
            <Surface key={i} tone="subtle" size="compact" className="text-center">
              <k.icon className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
              <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                {k.label}
              </p>
              <p className="font-black italic tabular-nums text-sm text-primary">
                {k.value}
              </p>
            </Surface>
          ))}
        </div>
      </div>
    </div>
  );
};
