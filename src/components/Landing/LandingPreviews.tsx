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
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Surface } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Landing previews — Faithful, in-app UI compositions
 *
 * Goal: every preview shown on the landing page MUST look like the real
 * logged-in product. We reuse the same primitives the app uses (Surface,
 * Button, mono labels, neon accents, sharp corners, italic uppercase
 * headings) and the same Portuguese microcopy.
 *
 * No fake features. No invented screens. No English in PT previews.
 *
 * If the real app changes (PageHeader, Surface, Navigation), update those
 * primitives — these previews follow them automatically.
 */

/* ---------- Shared chrome ---------- */

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
}

/** Subtle device frame — marketing polish, real UI inside. */
export const PhoneFrame = ({ children, className }: PhoneFrameProps) => (
  <div className={cn("relative mx-auto max-w-[360px]", className)}>
    <div
      className="absolute -inset-10 pointer-events-none opacity-60"
      style={{
        background:
          "radial-gradient(closest-side, hsl(var(--neon-toxic) / 0.16), transparent 70%)",
      }}
    />
    <div className="relative rounded-[40px] border border-foreground/15 bg-card p-2 shadow-[0_30px_90px_-20px_hsl(var(--neon-ultra)/0.4)]">
      <div className="rounded-[32px] overflow-hidden bg-background border border-foreground/10">
        {children}
      </div>
    </div>
  </div>
);

/** Replica of the in-app PageHeader (icon + title + subtitle). */
const PreviewHeader = ({
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
  <header className="mb-4 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold tracking-tight truncate">{title}</h3>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
  </header>
);

/** Replica of the mobile bottom navigation (PT labels, FREE set). */
const PreviewBottomNav = ({
  active,
  pro = false,
}: {
  active: "habits" | "calendar" | "nutrition" | "shopping" | "profile";
  pro?: boolean;
}) => {
  const items = pro
    ? [
        { id: "habits", label: "Hábitos", icon: LayoutDashboard },
        { id: "calendar", label: "Calendário", icon: CalendarIcon },
        { id: "nutrition", label: "Nutrição", icon: Leaf },
        { id: "shopping", label: "Compras", icon: ShoppingCart },
        { id: "profile", label: "Perfil", icon: User },
      ]
    : [
        { id: "habits", label: "Hábitos", icon: LayoutDashboard },
        { id: "calendar", label: "Calendário", icon: CalendarIcon },
        { id: "profile", label: "Perfil", icon: User },
      ];

  return (
    <div className="border-t-2 border-foreground/10 bg-background/98 backdrop-blur-xl">
      <div className="flex items-center justify-around py-1 px-2">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <div
              key={item.id}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-2 text-[9px] font-bold uppercase italic tracking-wider",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <div className="absolute inset-x-2 -top-px h-0.5 bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
              )}
              <item.icon
                className={cn(
                  "h-4 w-4 not-italic",
                  isActive && "drop-shadow-[0_0_6px_hsl(var(--neon-toxic))]",
                )}
              />
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────── */
/* HABITS / TODAY — mirrors src/components/Dashboard/DayView.tsx          */
/* ─────────────────────────────────────────────────────────────────────── */

export const HabitsPreview = () => (
  <div className="flex flex-col h-[600px]">
    <div className="flex-1 px-4 pt-5 pb-4 space-y-5 overflow-hidden">
      {/* Operator telemetry strip (real app uses identical motif) */}
      <div className="flex items-center gap-2">
        <span className="size-2 bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--neon-toxic))]" />
        <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
          SISTEMA ATIVO · TERÇA, 28 DE ABRIL
        </span>
      </div>

      <div className="flex items-end justify-between">
        <h1 className="text-3xl font-black uppercase italic tracking-tighter leading-none">
          NÍVEL <span className="text-primary">07</span>
        </h1>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
            Sequência
          </p>
          <p className="text-xl font-black italic tabular-nums">23<span className="text-muted-foreground/60 text-sm">d</span></p>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground italic">A construir momentum.</p>

      {/* Habit cards — same Surface/MinimalHabitCard shape */}
      <div className="space-y-2">
        <Surface tone="active" size="default" className="flex items-center gap-3 min-h-[64px]">
          <div className="w-[3px] h-12 bg-primary shadow-[0_0_10px_hsl(var(--neon-toxic))]" />
          <div className="flex items-center justify-center w-10 h-10 border-2 border-primary bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.55)]">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-bold uppercase tracking-tight text-primary line-through decoration-primary/40">
              Treino matinal
            </span>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">06:30</p>
          </div>
        </Surface>

        <Surface tone="active" size="default" className="flex items-center gap-3 min-h-[64px]">
          <div className="w-[3px] h-12 bg-primary shadow-[0_0_10px_hsl(var(--neon-toxic))]" />
          <div className="flex items-center justify-center w-10 h-10 border-2 border-primary bg-primary text-primary-foreground shadow-[0_0_14px_hsl(var(--neon-toxic)/0.55)]">
            <Check className="h-5 w-5 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-bold uppercase tracking-tight text-primary line-through decoration-primary/40">
              Ler 20 min
            </span>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">07:15</p>
          </div>
        </Surface>

        <Surface tone="default" size="default" className="flex items-center gap-3 min-h-[64px]">
          <div className="w-[3px] h-10 bg-primary/50" />
          <div className="flex items-center justify-center w-10 h-10 border-2 border-foreground/20 bg-transparent" />
          <div className="flex-1 min-w-0">
            <span className="text-[13px] font-bold uppercase tracking-tight text-foreground">
              Trabalho profundo · 90 min
            </span>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">09:00</p>
          </div>
        </Surface>

        {/* Metric habit (reduce) — matches MinimalHabitCard "warning" tone */}
        <Surface tone="warning" size="default" className="flex items-center gap-3 min-h-[64px] overflow-hidden">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 bg-warning/10"
            style={{ width: "60%" }}
          />
          <div className="relative w-[3px] h-10 bg-warning/70" />
          <div className="relative flex items-center justify-center w-10 h-10 border-2 border-warning/40 bg-warning/5 text-warning">
            <TrendingDown className="h-5 w-5 stroke-[2.5]" />
          </div>
          <div className="relative flex-1 min-w-0">
            <span className="text-[13px] font-bold uppercase tracking-tight text-foreground">
              Café
            </span>
            <p className="text-[11px] font-mono tabular-nums text-warning/80 mt-0.5">
              3<span className="opacity-50">/5</span> chávenas
            </p>
          </div>
        </Surface>
      </div>

      <Button size="sm" variant="outline" className="w-full gap-2">
        <Plus className="h-4 w-4" />
        Novo hábito
      </Button>
    </div>

    <PreviewBottomNav active="habits" />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────── */
/* CALENDAR — mirrors src/pages/Calendario.tsx + MonthlyCalendar          */
/* ─────────────────────────────────────────────────────────────────────── */

export const CalendarPreview = () => {
  // 30 days; mark some complete / partial — same dot system as MonthlyCalendar
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const completePattern = new Set([1, 2, 3, 5, 6, 8, 9, 10, 11, 13, 14, 15, 16, 18, 20, 21, 22, 23, 25, 27, 28]);
  const partialPattern = new Set([4, 7, 12, 17, 19, 24, 26]);
  const todayDay = 28;

  return (
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 px-4 pt-5 pb-4 space-y-4 overflow-hidden">
        <PreviewHeader
          icon={CalendarIcon}
          title="Calendário"
          subtitle="Visualiza o teu progresso"
        />

        {/* Month telemetry hero — exact replica of Calendario.tsx hero */}
        <div className="border-2 border-primary/40 bg-card shadow-[4px_4px_0_0_hsl(var(--neon-ultra)/0.4)] p-4">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground mb-2">
            // CICLO · ABR 2026
          </p>
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
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
              <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                DIAS PERFEITOS
              </p>
              <p className="font-black italic uppercase tracking-tighter text-2xl tabular-nums">
                21<span className="text-muted-foreground/50 text-sm">/28</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-primary">
                  <Flame className="h-3 w-3" /> 23D EM SEQUÊNCIA
                </span>
                <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-accent">
                  <Sparkles className="h-3 w-3" /> PEAK
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar grid — mirrors MonthlyCalendar.tsx */}
        <div>
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
              <div key={i} className="py-1 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {/* Padding for first week */}
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

/* ─────────────────────────────────────────────────────────────────────── */
/* NUTRITION — mirrors src/pages/Nutricao.tsx                             */
/* ─────────────────────────────────────────────────────────────────────── */

export const NutritionPreview = () => (
  <div className="flex flex-col h-[600px]">
    <div className="flex-1 px-4 pt-5 pb-4 space-y-3 overflow-hidden">
      <PreviewHeader
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

      {/* Profile chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-foreground/10">
          Definição
        </span>
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          4 refeições
        </span>
        <span className="text-[9px] font-medium px-2 py-0.5 rounded-md border border-foreground/15 text-muted-foreground">
          2.200 kcal
        </span>
      </div>

      {/* Day selector */}
      <div className="flex items-center justify-between border-y border-foreground/10 py-2">
        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        <div className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Hoje</p>
          <p className="text-sm font-bold">Terça · 28 Abr</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Macros bar */}
      <Surface tone="subtle" size="compact" className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Kcal</p>
          <p className="font-black italic text-sm tabular-nums">2140</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Prot</p>
          <p className="font-black italic text-sm tabular-nums text-primary">168</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">HC</p>
          <p className="font-black italic text-sm tabular-nums">210</p>
        </div>
        <div className="text-center">
          <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">Gord</p>
          <p className="font-black italic text-sm tabular-nums">72</p>
        </div>
      </Surface>

      {/* Meal cards */}
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
              "flex items-center justify-center w-8 h-8 border-2 shrink-0",
              m.done
                ? "border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--neon-toxic)/0.5)]"
                : "border-foreground/20",
            )}>
              {m.done && <Check className="h-4 w-4 stroke-[3]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground">
                {m.meal}
              </p>
              <p className="text-[12px] font-semibold truncate">{m.item}</p>
            </div>
            <p className="font-mono text-[11px] text-primary tabular-nums shrink-0">{m.kcal}</p>
          </Surface>
        ))}
      </div>
    </div>

    <PreviewBottomNav active="nutrition" pro />
  </div>
);

/* ─────────────────────────────────────────────────────────────────────── */
/* SHOPPING — mirrors src/pages/Compras.tsx                               */
/* ─────────────────────────────────────────────────────────────────────── */

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
    <div className="flex flex-col h-[600px]">
      <div className="flex-1 px-4 pt-5 pb-4 space-y-3 overflow-hidden">
        <PreviewHeader
          icon={ShoppingCart}
          title="Compras"
          subtitle="Lista da semana"
          actions={
            <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-primary text-primary-foreground border-2 border-primary shadow-[3px_3px_0_0_hsl(var(--neon-ultra))]">
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />

        {/* Progress strip */}
        <Surface tone="subtle" size="compact" className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
              PROGRESSO
            </p>
            <p className="text-base font-black italic tabular-nums">3<span className="text-muted-foreground/50 text-xs">/7</span></p>
          </div>
          <div className="w-32 h-1.5 bg-foreground/10 overflow-hidden">
            <div className="h-full bg-primary shadow-[0_0_8px_hsl(var(--neon-toxic))]" style={{ width: "43%" }} />
          </div>
        </Surface>

        {/* Items */}
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

      <PreviewBottomNav active="shopping" pro />
    </div>
  );
};
